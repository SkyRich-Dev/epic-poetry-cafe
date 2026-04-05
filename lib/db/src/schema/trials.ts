import { pgTable, text, serial, integer, doublePrecision, timestamp, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { categoriesTable } from "./categories";
import { ingredientsTable } from "./ingredients";

export const trialsTable = pgTable("trials", {
  id: serial("id").primaryKey(),
  trialCode: text("trial_code").notNull().unique(),
  proposedItemName: text("proposed_item_name").notNull(),
  categoryId: integer("category_id").references(() => categoriesTable.id),
  targetCost: doublePrecision("target_cost"),
  targetSellingPrice: doublePrecision("target_selling_price"),
  status: text("status").notNull().default("draft"),
  notes: text("notes"),
  createdBy: integer("created_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const trialVersionsTable = pgTable("trial_versions", {
  id: serial("id").primaryKey(),
  trialId: integer("trial_id").notNull().references(() => trialsTable.id, { onDelete: "cascade" }),
  versionNumber: integer("version_number").notNull(),
  trialDate: date("trial_date").notNull().defaultNow(),
  batchSize: doublePrecision("batch_size").notNull(),
  yieldQty: doublePrecision("yield_qty").notNull(),
  yieldUom: text("yield_uom").notNull(),
  prepTime: integer("prep_time"),
  totalCost: doublePrecision("total_cost").notNull().default(0),
  costPerUnit: doublePrecision("cost_per_unit").notNull().default(0),
  status: text("status").notNull().default("draft"),
  tasteScore: doublePrecision("taste_score"),
  appearanceScore: doublePrecision("appearance_score"),
  consistencyScore: doublePrecision("consistency_score"),
  notes: text("notes"),
  inventoryDeducted: integer("inventory_deducted").notNull().default(1),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const trialIngredientLinesTable = pgTable("trial_ingredient_lines", {
  id: serial("id").primaryKey(),
  trialVersionId: integer("trial_version_id").notNull().references(() => trialVersionsTable.id, { onDelete: "cascade" }),
  ingredientId: integer("ingredient_id").notNull().references(() => ingredientsTable.id),
  plannedQty: doublePrecision("planned_qty").notNull(),
  actualQty: doublePrecision("actual_qty").notNull(),
  uom: text("uom").notNull(),
  wastageQty: doublePrecision("wastage_qty").notNull().default(0),
  costPerUnit: doublePrecision("cost_per_unit").notNull().default(0),
  totalCost: doublePrecision("total_cost").notNull().default(0),
});

export const insertTrialSchema = createInsertSchema(trialsTable).omit({ id: true, trialCode: true, createdAt: true, updatedAt: true });
export type InsertTrial = z.infer<typeof insertTrialSchema>;
export type Trial = typeof trialsTable.$inferSelect;

export const insertTrialVersionSchema = createInsertSchema(trialVersionsTable).omit({ id: true, createdAt: true });
export type InsertTrialVersion = z.infer<typeof insertTrialVersionSchema>;
export type TrialVersion = typeof trialVersionsTable.$inferSelect;

export const insertTrialIngredientLineSchema = createInsertSchema(trialIngredientLinesTable).omit({ id: true });
export type InsertTrialIngredientLine = z.infer<typeof insertTrialIngredientLineSchema>;
export type TrialIngredientLine = typeof trialIngredientLinesTable.$inferSelect;
