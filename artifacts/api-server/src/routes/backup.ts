import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { authMiddleware, adminOnly } from "../lib/auth";

const router: IRouter = Router();

router.get("/backup/download", authMiddleware, adminOnly, async (_req, res): Promise<void> => {
  const tables = [
    "users", "categories", "uom", "config",
    "vendors", "ingredients", "menu_items", "recipe_lines",
    "purchases", "purchase_items",
    "expenses", "sales_entries",
    "waste_entries", "trial_batches", "trial_batch_items",
    "inventory_adjustments", "stock_snapshots",
    "audit_logs", "daily_sales_settlements",
    "petty_cash_ledger",
    "employees", "shifts", "attendance", "leaves", "salary_records",
  ];

  const backup: Record<string, any[]> = {};

  for (const table of tables) {
    try {
      const result = await db.execute(sql.raw(`SELECT * FROM "${table}"`));
      backup[table] = result.rows as any[];
    } catch {
      backup[table] = [];
    }
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const filename = `epic-poetry-cafe-backup-${timestamp}.json`;

  res.setHeader("Content-Type", "application/json");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.send(JSON.stringify(backup, null, 2));
});

export default router;
