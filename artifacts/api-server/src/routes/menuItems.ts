import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, menuItemsTable, recipeLinesTable, categoriesTable, ingredientsTable, systemConfigTable } from "@workspace/db";
import { ListMenuItemsResponse, CreateMenuItemBody, GetMenuItemParams, UpdateMenuItemParams, UpdateMenuItemBody, GetRecipeParams, SaveRecipeParams, SaveRecipeBody, GetMenuItemCostingParams } from "@workspace/api-zod";
import { authMiddleware } from "../lib/auth";
import { createAuditLog } from "../lib/audit";
import { generateCode } from "../lib/codeGenerator";

const router: IRouter = Router();

async function getIngredientCost(ingredientId: number): Promise<number> {
  const configs = await db.select().from(systemConfigTable);
  const config = configs[0];
  const [ing] = await db.select().from(ingredientsTable).where(eq(ingredientsTable.id, ingredientId));
  if (!ing) return 0;
  const method = config?.costingMethod || "weighted_average";
  if (method === "latest") return ing.latestCost;
  if (method === "standard") return ing.currentCost;
  return ing.weightedAvgCost;
}

async function calculateItemCost(menuItemId: number): Promise<{ ingredientCost: number; packagingCost: number; total: number }> {
  const lines = await db.select().from(recipeLinesTable).where(eq(recipeLinesTable.menuItemId, menuItemId));
  let ingredientCost = 0;
  let packagingCost = 0;
  for (const line of lines) {
    const costPerUnit = await getIngredientCost(line.ingredientId);
    const netQty = line.quantity * (1 + (line.wastagePercent || 0) / 100);
    const lineCost = costPerUnit * netQty;
    ingredientCost += lineCost;
  }
  return { ingredientCost, packagingCost, total: ingredientCost + packagingCost };
}

router.get("/menu-items", async (_req, res): Promise<void> => {
  const items = await db
    .select({
      id: menuItemsTable.id,
      code: menuItemsTable.code,
      name: menuItemsTable.name,
      categoryId: menuItemsTable.categoryId,
      categoryName: categoriesTable.name,
      description: menuItemsTable.description,
      sellingPrice: menuItemsTable.sellingPrice,
      dineInPrice: menuItemsTable.dineInPrice,
      takeawayPrice: menuItemsTable.takeawayPrice,
      deliveryPrice: menuItemsTable.deliveryPrice,
      active: menuItemsTable.active,
      createdAt: menuItemsTable.createdAt,
    })
    .from(menuItemsTable)
    .leftJoin(categoriesTable, eq(menuItemsTable.categoryId, categoriesTable.id));

  const result = [];
  for (const item of items) {
    const costing = await calculateItemCost(item.id);
    const margin = item.sellingPrice - costing.total;
    const marginPercent = item.sellingPrice > 0 ? (margin / item.sellingPrice) * 100 : 0;
    result.push({
      ...item,
      productionCost: costing.total,
      margin,
      marginPercent,
    });
  }

  res.json(ListMenuItemsResponse.parse(result));
});

router.post("/menu-items", authMiddleware, async (req, res): Promise<void> => {
  const parsed = CreateMenuItemBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const code = await generateCode("MNU", "menu_items");
  const [item] = await db.insert(menuItemsTable).values({ ...parsed.data, code }).returning();
  await createAuditLog("menu_items", item.id, "create", null, item);
  res.status(201).json({
    ...item,
    categoryName: null,
    productionCost: 0,
    margin: item.sellingPrice,
    marginPercent: 100,
  });
});

router.get("/menu-items/:id", async (req, res): Promise<void> => {
  const params = GetMenuItemParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const [item] = await db
    .select({
      id: menuItemsTable.id,
      code: menuItemsTable.code,
      name: menuItemsTable.name,
      categoryId: menuItemsTable.categoryId,
      categoryName: categoriesTable.name,
      description: menuItemsTable.description,
      sellingPrice: menuItemsTable.sellingPrice,
      dineInPrice: menuItemsTable.dineInPrice,
      takeawayPrice: menuItemsTable.takeawayPrice,
      deliveryPrice: menuItemsTable.deliveryPrice,
      active: menuItemsTable.active,
      createdAt: menuItemsTable.createdAt,
    })
    .from(menuItemsTable)
    .leftJoin(categoriesTable, eq(menuItemsTable.categoryId, categoriesTable.id))
    .where(eq(menuItemsTable.id, params.data.id));

  if (!item) { res.status(404).json({ error: "Not found" }); return; }

  const costing = await calculateItemCost(item.id);
  const margin = item.sellingPrice - costing.total;
  const marginPercent = item.sellingPrice > 0 ? (margin / item.sellingPrice) * 100 : 0;

  const recipeLines = await db
    .select({
      id: recipeLinesTable.id,
      menuItemId: recipeLinesTable.menuItemId,
      ingredientId: recipeLinesTable.ingredientId,
      ingredientName: ingredientsTable.name,
      quantity: recipeLinesTable.quantity,
      uom: recipeLinesTable.uom,
      wastagePercent: recipeLinesTable.wastagePercent,
      mandatory: recipeLinesTable.mandatory,
      stage: recipeLinesTable.stage,
      notes: recipeLinesTable.notes,
    })
    .from(recipeLinesTable)
    .leftJoin(ingredientsTable, eq(recipeLinesTable.ingredientId, ingredientsTable.id))
    .where(eq(recipeLinesTable.menuItemId, params.data.id));

  const enrichedLines = [];
  for (const line of recipeLines) {
    const costPerUnit = await getIngredientCost(line.ingredientId);
    const netQty = line.quantity * (1 + (line.wastagePercent || 0) / 100);
    enrichedLines.push({
      ...line,
      netQuantity: netQty,
      costPerUnit,
      lineCost: costPerUnit * netQty,
    });
  }

  res.json({
    item: { ...item, productionCost: costing.total, margin, marginPercent },
    recipe: enrichedLines,
  });
});

router.patch("/menu-items/:id", authMiddleware, async (req, res): Promise<void> => {
  const params = UpdateMenuItemParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdateMenuItemBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [old] = await db.select().from(menuItemsTable).where(eq(menuItemsTable.id, params.data.id));
  const [item] = await db.update(menuItemsTable).set(parsed.data).where(eq(menuItemsTable.id, params.data.id)).returning();
  if (!item) { res.status(404).json({ error: "Not found" }); return; }
  await createAuditLog("menu_items", item.id, "update", old, item);
  const costing = await calculateItemCost(item.id);
  const margin = item.sellingPrice - costing.total;
  const marginPercent = item.sellingPrice > 0 ? (margin / item.sellingPrice) * 100 : 0;
  res.json({ ...item, categoryName: null, productionCost: costing.total, margin, marginPercent });
});

router.get("/menu-items/:id/recipe", async (req, res): Promise<void> => {
  const params = GetRecipeParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const lines = await db
    .select({
      id: recipeLinesTable.id,
      menuItemId: recipeLinesTable.menuItemId,
      ingredientId: recipeLinesTable.ingredientId,
      ingredientName: ingredientsTable.name,
      quantity: recipeLinesTable.quantity,
      uom: recipeLinesTable.uom,
      wastagePercent: recipeLinesTable.wastagePercent,
      mandatory: recipeLinesTable.mandatory,
      stage: recipeLinesTable.stage,
      notes: recipeLinesTable.notes,
    })
    .from(recipeLinesTable)
    .leftJoin(ingredientsTable, eq(recipeLinesTable.ingredientId, ingredientsTable.id))
    .where(eq(recipeLinesTable.menuItemId, params.data.id));

  const enrichedLines = [];
  for (const line of lines) {
    const costPerUnit = await getIngredientCost(line.ingredientId);
    const netQty = line.quantity * (1 + (line.wastagePercent || 0) / 100);
    enrichedLines.push({ ...line, netQuantity: netQty, costPerUnit, lineCost: costPerUnit * netQty });
  }
  res.json(enrichedLines);
});

router.put("/menu-items/:id/recipe", authMiddleware, async (req, res): Promise<void> => {
  const params = SaveRecipeParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = SaveRecipeBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  await db.delete(recipeLinesTable).where(eq(recipeLinesTable.menuItemId, params.data.id));

  const insertedLines = [];
  for (const line of parsed.data.lines) {
    const [inserted] = await db.insert(recipeLinesTable).values({
      menuItemId: params.data.id,
      ingredientId: line.ingredientId,
      quantity: line.quantity,
      uom: line.uom,
      wastagePercent: line.wastagePercent ?? 0,
      mandatory: line.mandatory ?? true,
      stage: line.stage,
      notes: line.notes,
    }).returning();

    const [ing] = await db.select().from(ingredientsTable).where(eq(ingredientsTable.id, line.ingredientId));
    const costPerUnit = await getIngredientCost(line.ingredientId);
    const netQty = inserted.quantity * (1 + (inserted.wastagePercent || 0) / 100);
    insertedLines.push({
      ...inserted,
      ingredientName: ing?.name ?? "",
      netQuantity: netQty,
      costPerUnit,
      lineCost: costPerUnit * netQty,
    });
  }

  await createAuditLog("recipes", params.data.id, "update", null, { lines: insertedLines.length });
  res.json(insertedLines);
});

router.get("/menu-items/:id/costing", async (req, res): Promise<void> => {
  const params = GetMenuItemCostingParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const [item] = await db.select().from(menuItemsTable).where(eq(menuItemsTable.id, params.data.id));
  if (!item) { res.status(404).json({ error: "Not found" }); return; }

  const lines = await db
    .select({
      id: recipeLinesTable.id,
      ingredientId: recipeLinesTable.ingredientId,
      ingredientName: ingredientsTable.name,
      quantity: recipeLinesTable.quantity,
      uom: recipeLinesTable.uom,
      wastagePercent: recipeLinesTable.wastagePercent,
    })
    .from(recipeLinesTable)
    .leftJoin(ingredientsTable, eq(recipeLinesTable.ingredientId, ingredientsTable.id))
    .where(eq(recipeLinesTable.menuItemId, params.data.id));

  let ingredientCost = 0;
  const costingLines = [];
  for (const line of lines) {
    const costPerUnit = await getIngredientCost(line.ingredientId);
    const netQty = line.quantity * (1 + (line.wastagePercent || 0) / 100);
    const lineCost = costPerUnit * netQty;
    ingredientCost += lineCost;
    costingLines.push({
      ingredientId: line.ingredientId,
      ingredientName: line.ingredientName ?? "",
      quantity: netQty,
      uom: line.uom,
      costPerUnit,
      lineCost,
    });
  }

  const margin = item.sellingPrice - ingredientCost;
  const marginPercent = item.sellingPrice > 0 ? (margin / item.sellingPrice) * 100 : 0;

  res.json({
    menuItemId: item.id,
    itemName: item.name,
    sellingPrice: item.sellingPrice,
    ingredientCost,
    packagingCost: 0,
    totalProductionCost: ingredientCost,
    margin,
    marginPercent,
    lines: costingLines,
  });
});

export default router;
