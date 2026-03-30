import { pgTable, text, serial, integer, doublePrecision, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { ingredientsTable } from "./ingredients";
import { menuItemsTable } from "./menuItems";
import { categoriesTable } from "./categories";

export const wasteEntriesTable = pgTable("waste_entries", {
  id: serial("id").primaryKey(),
  wasteNumber: text("waste_number").notNull().unique(),
  wasteDate: text("waste_date").notNull(),
  wasteType: text("waste_type").notNull(),
  ingredientId: integer("ingredient_id").references(() => ingredientsTable.id),
  menuItemId: integer("menu_item_id").references(() => menuItemsTable.id),
  categoryId: integer("category_id").references(() => categoriesTable.id),
  reason: text("reason"),
  quantity: doublePrecision("quantity").notNull(),
  uom: text("uom").notNull(),
  costValue: doublePrecision("cost_value").notNull().default(0),
  department: text("department"),
  notes: text("notes"),
  approvalStatus: text("approval_status").notNull().default("pending"),
  approvedBy: integer("approved_by"),
  createdBy: integer("created_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertWasteEntrySchema = createInsertSchema(wasteEntriesTable).omit({ id: true, wasteNumber: true, costValue: true, createdAt: true, updatedAt: true });
export type InsertWasteEntry = z.infer<typeof insertWasteEntrySchema>;
export type WasteEntry = typeof wasteEntriesTable.$inferSelect;
