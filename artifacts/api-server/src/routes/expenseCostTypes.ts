import { Router, type IRouter } from "express";
import { eq, asc, sql } from "drizzle-orm";
import { db, expenseCostTypesTable, expensesTable } from "@workspace/db";
import { authMiddleware, adminOnly } from "../lib/auth";
import { createAuditLog } from "../lib/audit";

const router: IRouter = Router();

function normalizeCode(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const v = raw.trim().toUpperCase().replace(/[^A-Z0-9_]+/g, "_").replace(/^_+|_+$/g, "");
  if (!v || v.length > 40) return null;
  return v;
}

router.get("/expense-cost-types", authMiddleware, async (req, res): Promise<void> => {
  const includeInactive = req.query.includeInactive === "1" || req.query.includeInactive === "true";
  const role = (req as any).userRole;
  // Non-admin callers only ever see active rows; admin can opt-in to see all.
  const showAll = includeInactive && role === "admin";
  const rows = showAll
    ? await db.select().from(expenseCostTypesTable).orderBy(asc(expenseCostTypesTable.sortOrder), asc(expenseCostTypesTable.label))
    : await db.select().from(expenseCostTypesTable).where(eq(expenseCostTypesTable.isActive, true)).orderBy(asc(expenseCostTypesTable.sortOrder), asc(expenseCostTypesTable.label));
  res.json(rows);
});

router.post("/expense-cost-types", authMiddleware, adminOnly, async (req, res): Promise<void> => {
  const code = normalizeCode(req.body?.code);
  const label = typeof req.body?.label === "string" ? req.body.label.trim() : "";
  const description = typeof req.body?.description === "string" ? req.body.description.trim() || null : null;
  const sortOrder = Number.isFinite(Number(req.body?.sortOrder)) ? Math.floor(Number(req.body.sortOrder)) : 0;
  const isActive = req.body?.isActive === false ? false : true;

  if (!code) { res.status(400).json({ error: "Code is required (letters, numbers, underscores)." }); return; }
  if (!label) { res.status(400).json({ error: "Label is required." }); return; }

  const existing = await db.select({ id: expenseCostTypesTable.id }).from(expenseCostTypesTable).where(eq(expenseCostTypesTable.code, code)).limit(1);
  if (existing.length > 0) { res.status(409).json({ error: `Code "${code}" already exists.` }); return; }

  const [row] = await db.insert(expenseCostTypesTable).values({ code, label, description, sortOrder, isActive, isSystem: false }).returning();
  await createAuditLog("expense_cost_types", row.id, "create", null, row);
  res.json(row);
});

router.patch("/expense-cost-types/:id", authMiddleware, adminOnly, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [current] = await db.select().from(expenseCostTypesTable).where(eq(expenseCostTypesTable.id, id)).limit(1);
  if (!current) { res.status(404).json({ error: "Not found" }); return; }

  const updates: Record<string, unknown> = {};

  if (req.body?.code !== undefined) {
    if (current.isSystem) { res.status(409).json({ error: "Cannot change code of a system cost type." }); return; }
    const code = normalizeCode(req.body.code);
    if (!code) { res.status(400).json({ error: "Invalid code." }); return; }
    if (code !== current.code) {
      // Block renaming a code that historical expenses already reference;
      // otherwise those expense rows orphan to a non-existent cost type and
      // their labels disappear from reports. Use case-insensitive match
      // because legacy expense rows store the code in lowercase.
      const [{ count: inUse }] = await db.select({ count: sql<number>`count(*)::int` }).from(expensesTable).where(sql`lower(${expensesTable.costType}) = lower(${current.code})`);
      if (Number(inUse) > 0) {
        res.status(409).json({ error: `Cannot change code: ${inUse} expense(s) already use "${current.code}". Create a new cost type instead.` });
        return;
      }
      const dup = await db.select({ id: expenseCostTypesTable.id }).from(expenseCostTypesTable).where(eq(expenseCostTypesTable.code, code)).limit(1);
      if (dup.length > 0) { res.status(409).json({ error: `Code "${code}" already exists.` }); return; }
      updates.code = code;
    }
  }

  if (req.body?.label !== undefined) {
    const label = typeof req.body.label === "string" ? req.body.label.trim() : "";
    if (!label) { res.status(400).json({ error: "Label cannot be empty." }); return; }
    updates.label = label;
  }

  if (req.body?.description !== undefined) {
    const d = typeof req.body.description === "string" ? req.body.description.trim() : "";
    updates.description = d || null;
  }

  if (req.body?.sortOrder !== undefined) {
    const n = Number(req.body.sortOrder);
    if (!Number.isFinite(n)) { res.status(400).json({ error: "Invalid sortOrder." }); return; }
    updates.sortOrder = Math.floor(n);
  }

  if (req.body?.isActive !== undefined) {
    updates.isActive = req.body.isActive === true;
  }

  if (Object.keys(updates).length === 0) { res.json(current); return; }

  const [row] = await db.update(expenseCostTypesTable).set(updates).where(eq(expenseCostTypesTable.id, id)).returning();
  await createAuditLog("expense_cost_types", id, "update", current, row);
  res.json(row);
});

router.delete("/expense-cost-types/:id", authMiddleware, adminOnly, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [current] = await db.select().from(expenseCostTypesTable).where(eq(expenseCostTypesTable.id, id)).limit(1);
  if (!current) { res.status(404).json({ error: "Not found" }); return; }

  if (current.isSystem) {
    res.status(409).json({ error: "Cannot delete a system cost type. You can deactivate it instead." });
    return;
  }

  // Case-insensitive match — legacy expense rows store the code in lowercase
  // while master rows are uppercase. Without lower() the in-use guard would
  // miss legacy data and admins could delete a cost type still in use.
  const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(expensesTable).where(sql`lower(${expensesTable.costType}) = lower(${current.code})`);
  if (Number(count) > 0) {
    res.status(409).json({ error: `Cannot delete: ${count} expense(s) use this cost type. Deactivate it instead.` });
    return;
  }

  await db.delete(expenseCostTypesTable).where(eq(expenseCostTypesTable.id, id));
  await createAuditLog("expense_cost_types", id, "delete", current, null);
  res.json({ success: true });
});

export default router;
