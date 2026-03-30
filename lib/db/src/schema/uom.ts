import { pgTable, text, serial, boolean, integer, doublePrecision } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const uomTable = pgTable("uom", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  abbreviation: text("abbreviation").notNull(),
  baseUomId: integer("base_uom_id"),
  conversionFactor: doublePrecision("conversion_factor").notNull().default(1),
  active: boolean("active").notNull().default(true),
});

export const insertUomSchema = createInsertSchema(uomTable).omit({ id: true });
export type InsertUom = z.infer<typeof insertUomSchema>;
export type Uom = typeof uomTable.$inferSelect;
