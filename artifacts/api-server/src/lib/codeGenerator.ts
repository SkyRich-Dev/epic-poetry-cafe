import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

const counters: Record<string, number> = {};

export async function generateCode(prefix: string, table: string): Promise<string> {
  const result = await db.execute(sql.raw(`SELECT COUNT(*) as count FROM ${table}`));
  const count = Number((result.rows[0] as any).count) + 1;
  return `${prefix}${String(count).padStart(4, "0")}`;
}
