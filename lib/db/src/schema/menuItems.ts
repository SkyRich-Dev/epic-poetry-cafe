import { pgTable, text, serial, boolean, integer, doublePrecision, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { categoriesTable } from "./categories";
import { ingredientsTable } from "./ingredients";

export const menuItemsTable = pgTable("menu_items", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  categoryId: integer("category_id").references(() => categoriesTable.id),
  description: text("description"),
  sellingPrice: doublePrecision("selling_price").notNull().default(0),
  dineInPrice: doublePrecision("dine_in_price"),
  takeawayPrice: doublePrecision("takeaway_price"),
  deliveryPrice: doublePrecision("delivery_price"),
  onlinePrice: doublePrecision("online_price"),
  active: boolean("active").notNull().default(true),
  verified: boolean("verified").notNull().default(false),
  verifiedBy: integer("verified_by"),
  verifiedAt: timestamp("verified_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const recipeLinesTable = pgTable("recipe_lines", {
  id: serial("id").primaryKey(),
  menuItemId: integer("menu_item_id").notNull().references(() => menuItemsTable.id),
  ingredientId: integer("ingredient_id").notNull().references(() => ingredientsTable.id),
  quantity: doublePrecision("quantity").notNull(),
  uom: text("uom").notNull(),
  wastagePercent: doublePrecision("wastage_percent").notNull().default(0),
  mandatory: boolean("mandatory").notNull().default(true),
  stage: text("stage"),
  notes: text("notes"),
});

export const insertMenuItemSchema = createInsertSchema(menuItemsTable).omit({ id: true, code: true, createdAt: true, updatedAt: true });
export type InsertMenuItem = z.infer<typeof insertMenuItemSchema>;
export type MenuItem = typeof menuItemsTable.$inferSelect;

export const insertRecipeLineSchema = createInsertSchema(recipeLinesTable).omit({ id: true });
export type InsertRecipeLine = z.infer<typeof insertRecipeLineSchema>;
export type RecipeLine = typeof recipeLinesTable.$inferSelect;
