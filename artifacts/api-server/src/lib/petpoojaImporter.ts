import { db, posIntegrationsTable, menuItemsTable, categoriesTable,
  salesInvoicesTable, salesInvoiceLinesTable, customersTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { isFutureDate } from "./dateValidation";
import { generateCode } from "./codeGenerator";
import type { PosIntegration } from "./posProviders";

const PETPOOJA_SOURCE = "petpooja";

export interface ImportInput {
  ppOrder: any;
  ppItems: any[];
  ppCustomer?: any;
  integration: PosIntegration;
}

export interface ImportResult {
  created: boolean;
  invoiceNo: string;
  autoCreated: string[];
  reason?: string;
}

export async function importPetpoojaOrder(input: ImportInput): Promise<ImportResult> {
  const { ppOrder, ppItems, ppCustomer, integration } = input;

  if (!ppOrder || !Array.isArray(ppItems) || ppItems.length === 0) {
    throw new Error("Missing Order or OrderItem in payload");
  }

  const orderRef = String(ppOrder.customer_invoice_id || ppOrder.orderID || ppOrder.order_id || "").trim();
  if (!orderRef) {
    throw new Error("Order is missing both customer_invoice_id and orderID — cannot create a stable invoice number");
  }
  const invoiceNo = `PP-${orderRef}`;

  const existing = await db.select({ id: salesInvoicesTable.id })
    .from(salesInvoicesTable)
    .where(and(eq(salesInvoicesTable.invoiceNo, invoiceNo), eq(salesInvoicesTable.sourceType, PETPOOJA_SOURCE)))
    .limit(1);
  if (existing.length > 0) {
    return { created: false, invoiceNo, autoCreated: [], reason: "already_imported" };
  }

  const createdOn = ppOrder.created_on || "";
  const salesDate = createdOn ? createdOn.split(" ")[0] : new Date().toISOString().split("T")[0];
  const invoiceTime = createdOn ? createdOn.split(" ")[1] || "" : "";
  if (isFutureDate(salesDate)) {
    throw new Error(`Order date cannot be in the future (${salesDate})`);
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

  const allCategories = await db.select().from(categoriesTable);
  const categoryByName = new Map(allCategories.map(c => [c.name.toLowerCase().trim(), c]));
  const allMenuItems = await db.select().from(menuItemsTable);
  const menuByName = new Map(allMenuItems.map(m => [m.name.toLowerCase().trim(), m]));
  const autoCreated: string[] = [];
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

  try {
    await db.transaction(async (tx) => {
      const [invoice] = await tx.insert(salesInvoicesTable).values({
        salesDate,
        invoiceNo,
        invoiceTime,
        sourceType: PETPOOJA_SOURCE,
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
  } catch (e: any) {
    // Postgres unique violation = concurrent import already created this invoice. Treat as already_imported.
    const code = e?.code || e?.cause?.code;
    const msg = String(e?.message || "");
    if (code === "23505" || msg.includes("sales_invoices_source_invoice_unique") || msg.includes("duplicate key")) {
      return { created: false, invoiceNo, autoCreated: [], reason: "already_imported" };
    }
    throw e;
  }

  await db.update(posIntegrationsTable).set({
    lastSyncAt: new Date(),
    lastSyncStatus: "success",
    lastSyncMessage: "1 synced",
    totalOrdersSynced: sql`${posIntegrationsTable.totalOrdersSynced} + 1`,
  }).where(eq(posIntegrationsTable.id, integration.id));

  return { created: true, invoiceNo, autoCreated };
}

export interface UpsertCustomerInput {
  name?: string | null;
  phone?: string | null;
  email?: string | null;
}

export async function upsertPetpoojaCustomer(c: UpsertCustomerInput): Promise<"created" | "updated" | "skipped"> {
  const phone = (c.phone || "").trim();
  const name = (c.name || "").trim();
  if (!phone || !name) return "skipped";
  const existing = await db.select({ id: customersTable.id }).from(customersTable).where(eq(customersTable.phone, phone)).limit(1);
  if (existing.length > 0) {
    await db.update(customersTable).set({
      name,
      email: c.email || undefined,
    }).where(eq(customersTable.id, existing[0].id));
    return "updated";
  }
  await db.insert(customersTable).values({
    name,
    phone,
    email: c.email || null,
  });
  return "created";
}
