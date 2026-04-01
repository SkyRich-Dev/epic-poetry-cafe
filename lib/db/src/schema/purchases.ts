import { pgTable, text, serial, boolean, integer, doublePrecision, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { vendorsTable } from "./vendors";
import { ingredientsTable } from "./ingredients";

export const purchasesTable = pgTable("purchases", {
  id: serial("id").primaryKey(),
  purchaseNumber: text("purchase_number").notNull().unique(),
  purchaseDate: text("purchase_date").notNull(),
  vendorId: integer("vendor_id").notNull().references(() => vendorsTable.id),
  invoiceNumber: text("invoice_number"),
  paymentMode: text("payment_mode"),
  paymentStatus: text("payment_status").notNull().default("pending"),
  totalAmount: doublePrecision("total_amount").notNull().default(0),
  notes: text("notes"),
  createdBy: integer("created_by"),
  verified: boolean("verified").notNull().default(false),
  verifiedBy: integer("verified_by"),
  verifiedAt: timestamp("verified_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const purchaseLinesTable = pgTable("purchase_lines", {
  id: serial("id").primaryKey(),
  purchaseId: integer("purchase_id").notNull().references(() => purchasesTable.id),
  ingredientId: integer("ingredient_id").notNull().references(() => ingredientsTable.id),
  quantity: doublePrecision("quantity").notNull(),
  purchaseUom: text("purchase_uom").notNull().default("unit"),
  unitRate: doublePrecision("unit_rate").notNull(),
  taxPercent: doublePrecision("tax_percent").notNull().default(0),
  lineTotal: doublePrecision("line_total").notNull().default(0),
});

export const insertPurchaseSchema = createInsertSchema(purchasesTable).omit({ id: true, purchaseNumber: true, totalAmount: true, createdAt: true, updatedAt: true });
export type InsertPurchase = z.infer<typeof insertPurchaseSchema>;
export type Purchase = typeof purchasesTable.$inferSelect;

export const insertPurchaseLineSchema = createInsertSchema(purchaseLinesTable).omit({ id: true });
export type InsertPurchaseLine = z.infer<typeof insertPurchaseLineSchema>;
export type PurchaseLine = typeof purchaseLinesTable.$inferSelect;
