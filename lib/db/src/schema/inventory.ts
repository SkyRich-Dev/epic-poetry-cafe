import { pgTable, text, serial, integer, doublePrecision, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { ingredientsTable } from "./ingredients";

export const stockSnapshotsTable = pgTable("stock_snapshots", {
  id: serial("id").primaryKey(),
  snapshotDate: text("snapshot_date").notNull(),
  ingredientId: integer("ingredient_id").notNull().references(() => ingredientsTable.id),
  openingQty: doublePrecision("opening_qty").notNull().default(0),
  inwardQty: doublePrecision("inward_qty").notNull().default(0),
  consumedQty: doublePrecision("consumed_qty").notNull().default(0),
  wasteQty: doublePrecision("waste_qty").notNull().default(0),
  trialQty: doublePrecision("trial_qty").notNull().default(0),
  closingQty: doublePrecision("closing_qty").notNull().default(0),
  stockValue: doublePrecision("stock_value").notNull().default(0),
});

export const stockAdjustmentsTable = pgTable("stock_adjustments", {
  id: serial("id").primaryKey(),
  ingredientId: integer("ingredient_id").notNull().references(() => ingredientsTable.id),
  adjustmentType: text("adjustment_type").notNull(),
  quantity: doublePrecision("quantity").notNull(),
  reason: text("reason").notNull(),
  createdBy: integer("created_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertStockSnapshotSchema = createInsertSchema(stockSnapshotsTable).omit({ id: true });
export type InsertStockSnapshot = z.infer<typeof insertStockSnapshotSchema>;
export type StockSnapshot = typeof stockSnapshotsTable.$inferSelect;

export const insertStockAdjustmentSchema = createInsertSchema(stockAdjustmentsTable).omit({ id: true, createdAt: true });
export type InsertStockAdjustment = z.infer<typeof insertStockAdjustmentSchema>;
export type StockAdjustment = typeof stockAdjustmentsTable.$inferSelect;
