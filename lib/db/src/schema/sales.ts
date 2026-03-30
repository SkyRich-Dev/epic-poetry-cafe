import { pgTable, text, serial, integer, doublePrecision, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { menuItemsTable } from "./menuItems";

export const salesEntriesTable = pgTable("sales_entries", {
  id: serial("id").primaryKey(),
  salesDate: text("sales_date").notNull(),
  menuItemId: integer("menu_item_id").notNull().references(() => menuItemsTable.id),
  quantity: doublePrecision("quantity").notNull(),
  sellingPrice: doublePrecision("selling_price").notNull(),
  totalAmount: doublePrecision("total_amount").notNull().default(0),
  discount: doublePrecision("discount").notNull().default(0),
  channel: text("channel").notNull().default("dine-in"),
  notes: text("notes"),
  createdBy: integer("created_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertSalesEntrySchema = createInsertSchema(salesEntriesTable).omit({ id: true, totalAmount: true, createdAt: true, updatedAt: true });
export type InsertSalesEntry = z.infer<typeof insertSalesEntrySchema>;
export type SalesEntry = typeof salesEntriesTable.$inferSelect;
