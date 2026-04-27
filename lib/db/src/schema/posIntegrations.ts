import { pgTable, text, serial, boolean, integer, timestamp, date, index } from "drizzle-orm/pg-core";

export const posIntegrationsTable = pgTable("pos_integrations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  provider: text("provider").notNull().default("petpooja"),
  apiKey: text("api_key"),
  apiSecret: text("api_secret"),
  webhookSecret: text("webhook_secret"),
  restaurantId: text("restaurant_id"),
  baseUrl: text("base_url"),
  accessToken: text("access_token"),
  autoSync: boolean("auto_sync").notNull().default(false),
  syncMenuItems: boolean("sync_menu_items").notNull().default(true),
  syncOrders: boolean("sync_orders").notNull().default(true),
  defaultGstPercent: integer("default_gst_percent").notNull().default(5),
  defaultOrderType: text("default_order_type").notNull().default("dine-in"),
  active: boolean("active").notNull().default(true),
  lastSyncAt: timestamp("last_sync_at", { withTimezone: true }),
  lastSyncStatus: text("last_sync_status"),
  lastSyncMessage: text("last_sync_message"),
  totalOrdersSynced: integer("total_orders_synced").notNull().default(0),
  lastManualFetchAt: timestamp("last_manual_fetch_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const posSyncLogsTable = pgTable("pos_sync_logs", {
  id: serial("id").primaryKey(),
  integrationId: integer("integration_id").notNull().references(() => posIntegrationsTable.id, { onDelete: "cascade" }),
  dataType: text("data_type").notNull(),
  status: text("status").notNull(),
  recordCount: integer("record_count").notNull().default(0),
  errorCount: integer("error_count").notNull().default(0),
  fromDate: date("from_date"),
  toDate: date("to_date"),
  message: text("message"),
  triggeredBy: text("triggered_by"),
  durationMs: integer("duration_ms"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  byIntegration: index("pos_sync_logs_by_integration_idx").on(t.integrationId, t.createdAt),
}));
