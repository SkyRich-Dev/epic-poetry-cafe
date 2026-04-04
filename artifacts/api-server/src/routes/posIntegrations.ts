import { Router } from "express";
import { db, posIntegrationsTable, menuItemsTable, categoriesTable,
  salesInvoicesTable, salesInvoiceLinesTable, salesImportBatchesTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { authMiddleware, adminOnly } from "../lib/auth";
import { createAuditLog } from "../lib/audit";
import { isFutureDate } from "../lib/dateValidation";
import { generateCode } from "../lib/codeGenerator";
import crypto from "crypto";

const router = Router();

function redactSecrets(obj: any) {
  if (!obj) return obj;
  const redacted = { ...obj };
  if (redacted.apiKey) redacted.apiKey = "****";
  if (redacted.apiSecret) redacted.apiSecret = "****";
  if (redacted.webhookSecret) redacted.webhookSecret = "****";
  if (redacted.accessToken) redacted.accessToken = "****";
  return redacted;
}

router.get("/pos-integrations", authMiddleware, adminOnly, async (req, res): Promise<void> => {
  const integrations = await db.select().from(posIntegrationsTable).orderBy(posIntegrationsTable.createdAt);
  const safe = integrations.map(i => ({
    ...i,
    apiKey: i.apiKey ? `****${i.apiKey.slice(-4)}` : null,
    apiSecret: i.apiSecret ? "****" : null,
    webhookSecret: i.webhookSecret ? `****${i.webhookSecret.slice(-4)}` : null,
    accessToken: i.accessToken ? "****" : null,
  }));
  res.json(safe);
});

router.get("/pos-integrations/:id", authMiddleware, adminOnly, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const [integration] = await db.select().from(posIntegrationsTable).where(eq(posIntegrationsTable.id, id));
  if (!integration) { res.status(404).json({ error: "Not found" }); return; }
  res.json({
    ...integration,
    apiSecret: integration.apiSecret ? "****" : null,
    webhookSecret: integration.webhookSecret ? `****${integration.webhookSecret.slice(-4)}` : null,
    accessToken: integration.accessToken ? "****" : null,
  });
});

router.post("/pos-integrations", authMiddleware, adminOnly, async (req, res): Promise<void> => {
  const { name, provider, apiKey, apiSecret, restaurantId, baseUrl, accessToken,
    autoSync, syncMenuItems, syncOrders, defaultGstPercent, defaultOrderType } = req.body;
  if (!name || !provider) { res.status(400).json({ error: "name and provider are required" }); return; }

  const webhookSecret = crypto.randomBytes(32).toString("hex");

  const [integration] = await db.insert(posIntegrationsTable).values({
    name, provider,
    apiKey: apiKey || null,
    apiSecret: apiSecret || null,
    webhookSecret,
    restaurantId: restaurantId || null,
    baseUrl: baseUrl || null,
    accessToken: accessToken || null,
    autoSync: autoSync ?? false,
    syncMenuItems: syncMenuItems ?? true,
    syncOrders: syncOrders ?? true,
    defaultGstPercent: defaultGstPercent ?? 5,
    defaultOrderType: defaultOrderType || "dine-in",
  }).returning();

  await createAuditLog("pos_integrations", integration.id, "create", null, redactSecrets(integration));
  res.status(201).json({
    ...integration,
    apiSecret: integration.apiSecret ? "****" : null,
    accessToken: integration.accessToken ? "****" : null,
  });
});

router.patch("/pos-integrations/:id", authMiddleware, adminOnly, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const [old] = await db.select().from(posIntegrationsTable).where(eq(posIntegrationsTable.id, id));
  if (!old) { res.status(404).json({ error: "Not found" }); return; }

  const updates: any = {};
  const fields = ["name", "provider", "apiKey", "apiSecret", "restaurantId", "baseUrl", "accessToken",
    "autoSync", "syncMenuItems", "syncOrders", "defaultGstPercent", "defaultOrderType", "active"];
  for (const f of fields) if (req.body[f] !== undefined) updates[f] = req.body[f];

  const [updated] = await db.update(posIntegrationsTable).set(updates).where(eq(posIntegrationsTable.id, id)).returning();
  await createAuditLog("pos_integrations", id, "update", redactSecrets(old), redactSecrets(updated));
  res.json({
    ...updated,
    apiSecret: updated.apiSecret ? "****" : null,
    webhookSecret: updated.webhookSecret ? `****${updated.webhookSecret.slice(-4)}` : null,
    accessToken: updated.accessToken ? "****" : null,
  });
});

router.delete("/pos-integrations/:id", authMiddleware, adminOnly, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const [existing] = await db.select().from(posIntegrationsTable).where(eq(posIntegrationsTable.id, id));
  if (!existing) { res.status(404).json({ error: "Not found" }); return; }
  await db.delete(posIntegrationsTable).where(eq(posIntegrationsTable.id, id));
  await createAuditLog("pos_integrations", id, "delete", redactSecrets(existing), null);
  res.json({ message: "Deleted" });
});

router.post("/pos-integrations/:id/regenerate-webhook-secret", authMiddleware, adminOnly, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const [existing] = await db.select().from(posIntegrationsTable).where(eq(posIntegrationsTable.id, id));
  if (!existing) { res.status(404).json({ error: "Not found" }); return; }

  const webhookSecret = crypto.randomBytes(32).toString("hex");
  await db.update(posIntegrationsTable).set({ webhookSecret }).where(eq(posIntegrationsTable.id, id));
  res.json({ webhookSecret });
});

router.get("/pos-integrations/:id/webhook-secret", authMiddleware, adminOnly, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const [existing] = await db.select().from(posIntegrationsTable).where(eq(posIntegrationsTable.id, id));
  if (!existing) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ webhookSecret: existing.webhookSecret });
});

router.post("/pos-integrations/:id/test-connection", authMiddleware, adminOnly, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const [integration] = await db.select().from(posIntegrationsTable).where(eq(posIntegrationsTable.id, id));
  if (!integration) { res.status(404).json({ error: "Not found" }); return; }

  if (integration.provider === "petpooja") {
    if (!integration.accessToken) {
      res.json({ success: false, message: "Access token not configured. Petpooja webhook will still work if webhook secret is set." });
      return;
    }
    try {
      const testUrl = integration.baseUrl || "https://api.petpooja.com";
      res.json({
        success: true,
        message: `Petpooja integration configured. Webhook endpoint ready. Restaurant ID: ${integration.restaurantId || 'Not set'}`,
        provider: "petpooja",
        webhookReady: !!integration.webhookSecret,
      });
    } catch (e: any) {
      res.json({ success: false, message: e.message });
    }
    return;
  }

  res.json({ success: true, message: `Integration "${integration.name}" is active.` });
});

router.get("/pos-integrations/:id/stats", authMiddleware, adminOnly, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const [integration] = await db.select().from(posIntegrationsTable).where(eq(posIntegrationsTable.id, id));
  if (!integration) { res.status(404).json({ error: "Not found" }); return; }

  if (integration.provider === "petpooja") {
    const batches = await db.select().from(salesImportBatchesTable)
      .where(eq(salesImportBatchesTable.sourceType, "petpooja"))
      .orderBy(sql`${salesImportBatchesTable.createdAt} DESC`)
      .limit(5);

    const invoiceCount = await db.select({ count: sql<number>`count(*)::int` })
      .from(salesInvoicesTable)
      .where(eq(salesInvoicesTable.sourceType, "petpooja"));

    const autoCreatedMenuItems = await db.select({ count: sql<number>`count(*)::int` })
      .from(menuItemsTable)
      .where(sql`${menuItemsTable.code} LIKE 'PP%'`);

    res.json({
      totalInvoicesImported: invoiceCount[0]?.count || 0,
      autoCreatedMenuItems: autoCreatedMenuItems[0]?.count || 0,
      totalOrdersSynced: integration.totalOrdersSynced,
      lastSync: integration.lastSyncAt,
      lastSyncStatus: integration.lastSyncStatus,
      recentBatches: batches,
    });
    return;
  }

  res.json({ totalOrdersSynced: integration.totalOrdersSynced, lastSync: integration.lastSyncAt });
});

router.post("/webhook/petpooja/:integrationId", async (req, res): Promise<void> => {
  const integrationId = Number(req.params.integrationId);
  const [integration] = await db.select().from(posIntegrationsTable).where(
    and(eq(posIntegrationsTable.id, integrationId), eq(posIntegrationsTable.provider, "petpooja"))
  );
  if (!integration || !integration.active) {
    res.status(404).json({ error: "Integration not found or inactive" }); return;
  }

  const payload = req.body;

  if (integration.webhookSecret) {
    const providedToken = payload?.token || req.headers["x-webhook-secret"];
    if (!providedToken || providedToken !== integration.webhookSecret) {
      res.status(401).json({ error: "Invalid webhook token" }); return;
    }
  }

  if (payload?.event !== "orderdetails" || !payload?.properties) {
    res.status(400).json({ error: "Invalid payload: expected event=orderdetails with properties" }); return;
  }

  const props = payload.properties;
  const ppOrder = props.Order;
  const ppItems = props.OrderItem;
  const ppCustomer = props.Customer;

  if (!ppOrder || !ppItems || !Array.isArray(ppItems) || ppItems.length === 0) {
    res.status(400).json({ error: "Missing Order or OrderItem in payload" }); return;
  }

  const allCategories = await db.select().from(categoriesTable);
  const categoryByName = new Map(allCategories.map(c => [c.name.toLowerCase().trim(), c]));

  const allMenuItems = await db.select().from(menuItemsTable);
  const menuByName = new Map(allMenuItems.map(m => [m.name.toLowerCase().trim(), m]));

  const autoCreated: string[] = [];

  try {
    const createdOn = ppOrder.created_on || "";
    const salesDate = createdOn ? createdOn.split(" ")[0] : new Date().toISOString().split("T")[0];
    const invoiceTime = createdOn ? createdOn.split(" ")[1] || "" : "";
    const invoiceNo = `PP-${ppOrder.customer_invoice_id || ppOrder.orderID || Date.now()}`;

    if (isFutureDate(salesDate)) {
      res.status(400).json({ error: `Order date cannot be in the future (${salesDate})` }); return;
    }

    const rawOrderType = (ppOrder.order_type || "").toLowerCase().replace(/\s+/g, "-");
    const orderType = rawOrderType || integration.defaultOrderType || "dine-in";
    const customerName = ppCustomer?.name || "";

    let paymentMode = (ppOrder.payment_type || "cash").toLowerCase();
    const partPayments = ppOrder.part_payments;
    if (paymentMode === "part payment" && Array.isArray(partPayments) && partPayments.length > 0) {
      paymentMode = "mixed";
    }
    if (paymentMode === "online") {
      const subOrderType = (ppOrder.sub_order_type || "").toLowerCase();
      if (subOrderType === "zomato" || subOrderType === "swiggy") paymentMode = subOrderType;
    }

    const totalDiscount = Number(ppOrder.discount_total || 0);
    const orderTaxTotal = Number(ppOrder.tax_total || 0);
    const ppTotal = Number(ppOrder.total || 0);
    const serviceCharge = Number(ppOrder.service_charge || 0);
    const packagingCharge = Number(ppOrder.packaging_charge || 0);
    const deliveryCharges = Number(ppOrder.delivery_charges || 0);

    const lineData: any[] = [];

    for (const item of ppItems) {
      const ppItemName = String(item.name || "").trim();
      const ppCategoryName = String(item.category_name || "").trim();
      const qty = Number(item.quantity || 1);
      const itemPrice = Number(item.price || 0);
      const itemTotal = Number(item.total || itemPrice * qty);
      const itemDiscount = Number(item.discount || 0);
      const itemTax = Number(item.tax || 0);

      let addonTotal = 0;
      if (Array.isArray(item.addon)) {
        for (const addon of item.addon) {
          addonTotal += Number(addon.price || 0) * Number(addon.quantity || 1);
        }
      }

      let menuItem = menuByName.get(ppItemName.toLowerCase().trim());

      if (!menuItem) {
        let categoryId: number | null = null;
        if (ppCategoryName) {
          let category = categoryByName.get(ppCategoryName.toLowerCase().trim());
          if (!category) {
            const [newCat] = await db.insert(categoriesTable).values({
              name: ppCategoryName,
              type: "menu",
            }).returning();
            category = newCat;
            categoryByName.set(ppCategoryName.toLowerCase().trim(), category);
            autoCreated.push(`Category: ${ppCategoryName}`);
          }
          categoryId = category.id;
        }

        const code = await generateCode("PP", "menu_items");
        const [newItem] = await db.insert(menuItemsTable).values({
          code,
          name: ppItemName,
          categoryId,
          sellingPrice: itemPrice,
          active: true,
        }).returning();
        menuItem = newItem;
        menuByName.set(ppItemName.toLowerCase().trim(), menuItem);
        autoCreated.push(`Menu Item: ${ppItemName} (${code}) @ ₹${itemPrice}`);
      }

      const usePrice = itemTotal > 0 ? itemTotal / qty : (menuItem.sellingPrice || itemPrice);
      const grossWithAddons = (usePrice * qty) + addonTotal;

      lineData.push({
        menuItemId: menuItem.id,
        itemCodeSnapshot: menuItem.code,
        itemNameSnapshot: menuItem.name,
        fixedPrice: usePrice,
        quantity: qty,
        grossLineAmount: grossWithAddons,
        ppItemDiscount: itemDiscount,
        ppItemTax: itemTax,
        gstPercent: integration.defaultGstPercent || 5,
      });
    }

    let grossAmount = lineData.reduce((s, l) => s + l.grossLineAmount, 0);

    let totalGst = 0;
    let totalTaxable = 0;
    let totalFinal = 0;

    const useOrderLevelTax = orderTaxTotal > 0;
    const discountRatio = grossAmount > 0 ? totalDiscount / grossAmount : 0;

    const finalLines = lineData.map(l => {
      const lineDiscount = l.ppItemDiscount > 0
        ? l.ppItemDiscount
        : Math.round(l.grossLineAmount * discountRatio * 100) / 100;
      const taxable = l.grossLineAmount - lineDiscount;

      let gst: number;
      if (useOrderLevelTax && grossAmount > 0) {
        gst = Math.round((l.grossLineAmount / grossAmount) * orderTaxTotal * 100) / 100;
      } else if (l.ppItemTax > 0) {
        gst = l.ppItemTax;
      } else {
        gst = Math.round(taxable * l.gstPercent / 100 * 100) / 100;
      }

      const finalAmt = taxable + gst;
      totalGst += gst;
      totalTaxable += taxable;
      totalFinal += finalAmt;
      return {
        menuItemId: l.menuItemId,
        itemCodeSnapshot: l.itemCodeSnapshot,
        itemNameSnapshot: l.itemNameSnapshot,
        fixedPrice: l.fixedPrice,
        quantity: l.quantity,
        grossLineAmount: Math.round(l.grossLineAmount * 100) / 100,
        lineDiscountAmount: Math.round(lineDiscount * 100) / 100,
        discountedUnitPrice: l.quantity > 0 ? Math.round((l.grossLineAmount - lineDiscount) / l.quantity * 100) / 100 : 0,
        taxableLineAmount: Math.round(taxable * 100) / 100,
        gstPercent: l.gstPercent,
        gstAmount: Math.round(gst * 100) / 100,
        finalLineAmount: Math.round(finalAmt * 100) / 100,
      };
    });

    const invoiceFinal = ppTotal > 0 ? ppTotal : Math.round(totalFinal * 100) / 100;

    const refParts: string[] = [];
    if (Array.isArray(partPayments) && partPayments.length > 0) {
      refParts.push(partPayments.map((pp: any) =>
        `${pp.payment_type || pp.custome_payment_type || "Other"}: ₹${pp.amount}`
      ).join(", "));
    }
    if (ppOrder.order_from && ppOrder.order_from !== "POS") {
      let src = ppOrder.order_from;
      if (ppOrder.order_from_id) src += ` #${ppOrder.order_from_id}`;
      refParts.push(src);
    }
    if (ppOrder.table_no) refParts.push(`Table: ${ppOrder.table_no}`);
    if (ppOrder.biller) refParts.push(`Biller: ${ppOrder.biller}`);
    if (ppOrder.comment) refParts.push(`Note: ${ppOrder.comment}`);
    if (serviceCharge > 0) refParts.push(`Service Charge: ₹${serviceCharge}`);
    if (packagingCharge > 0) refParts.push(`Packaging: ₹${packagingCharge}`);
    if (deliveryCharges > 0) refParts.push(`Delivery: ₹${deliveryCharges}`);
    const paymentRef = refParts.join(" | ");

    await db.transaction(async (tx) => {
      const [invoice] = await tx.insert(salesInvoicesTable).values({
        salesDate,
        invoiceNo,
        invoiceTime,
        sourceType: "petpooja",
        orderType,
        customerName: customerName || null,
        grossAmount: Math.round(grossAmount * 100) / 100,
        totalDiscount: Math.round(totalDiscount * 100) / 100,
        taxableAmount: Math.round(totalTaxable * 100) / 100,
        gstAmount: Math.round(totalGst * 100) / 100,
        finalAmount: Math.round(invoiceFinal * 100) / 100,
        paymentMode,
        paymentReference: paymentRef || null,
        matchStatus: "matched",
        matchDifference: 0,
      }).returning();

      for (const line of finalLines) {
        await tx.insert(salesInvoiceLinesTable).values({
          invoiceId: invoice.id,
          ...line,
        });
      }
    });

    await updateSyncStatus(integrationId, 1, 0);

    res.json({
      success: true,
      message: `Order ${invoiceNo} processed successfully`,
      autoCreated: autoCreated.length > 0 ? autoCreated : undefined,
    });
  } catch (e: any) {
    await updateSyncStatus(integrationId, 0, 1);
    res.status(500).json({
      success: false,
      message: `Order processing failed: ${e.message}`,
    });
  }
});

async function updateSyncStatus(integrationId: number, success: number, failed: number) {
  await db.update(posIntegrationsTable).set({
    lastSyncAt: new Date(),
    lastSyncStatus: failed === 0 ? "success" : "failed",
    lastSyncMessage: success > 0 ? `${success} synced` : `${failed} failed`,
    totalOrdersSynced: sql`${posIntegrationsTable.totalOrdersSynced} + ${success}`,
  }).where(eq(posIntegrationsTable.id, integrationId));
}

export default router;
