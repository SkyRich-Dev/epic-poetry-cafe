import { pgTable, serial, text, boolean, integer, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const expenseCostTypesTable = pgTable(
  "expense_cost_types",
  {
    id: serial("id").primaryKey(),
    code: text("code").notNull(),
    label: text("label").notNull(),
    description: text("description"),
    isActive: boolean("is_active").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    isSystem: boolean("is_system").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    codeUnique: uniqueIndex("expense_cost_types_code_unique").on(t.code),
  }),
);
