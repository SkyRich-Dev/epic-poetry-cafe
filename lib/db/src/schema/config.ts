import { pgTable, text, serial, integer, doublePrecision } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const systemConfigTable = pgTable("system_config", {
  id: serial("id").primaryKey(),
  costingMethod: text("costing_method").notNull().default("weighted_average"),
  currency: text("currency").notNull().default("INR"),
  decimalPrecision: integer("decimal_precision").notNull().default(2),
  businessDayCloseTime: text("business_day_close_time").notNull().default("23:00"),
  wasteThresholdPercent: doublePrecision("waste_threshold_percent").notNull().default(5),
  lowStockAlertDays: integer("low_stock_alert_days").notNull().default(3),
  dailyAllocationMethod: text("daily_allocation_method").notNull().default("equal_daily"),
  taxRate: doublePrecision("tax_rate").notNull().default(0),
  pettyCashOpeningBalance: doublePrecision("petty_cash_opening_balance").notNull().default(0),
});

export const insertConfigSchema = createInsertSchema(systemConfigTable).omit({ id: true });
export type InsertConfig = z.infer<typeof insertConfigSchema>;
export type SystemConfig = typeof systemConfigTable.$inferSelect;
