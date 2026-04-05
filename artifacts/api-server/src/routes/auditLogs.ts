import { Router, type IRouter } from "express";
import { eq, and, gte, lte, desc, sql, like } from "drizzle-orm";
import { db, auditLogsTable } from "@workspace/db";
import { ListAuditLogsQueryParams } from "@workspace/api-zod";
import { authMiddleware, adminOnly } from "../lib/auth";

const router: IRouter = Router();

router.get("/audit-logs", authMiddleware, adminOnly, async (req, res): Promise<void> => {
  const query = ListAuditLogsQueryParams.safeParse(req.query);
  const limit = query.success && query.data.limit ? query.data.limit : 50;
  const offset = query.success && query.data.offset ? query.data.offset : 0;

  const conditions = [];
  if (query.success && query.data.module) {
    conditions.push(eq(auditLogsTable.module, query.data.module));
  }

  const fromDate = req.query.fromDate as string | undefined;
  const toDate = req.query.toDate as string | undefined;
  const action = req.query.action as string | undefined;
  const changedBy = req.query.changedBy as string | undefined;

  if (fromDate) {
    conditions.push(gte(auditLogsTable.changedAt, new Date(fromDate)));
  }
  if (toDate) {
    const end = new Date(toDate);
    end.setDate(end.getDate() + 1);
    conditions.push(lte(auditLogsTable.changedAt, end));
  }
  if (action) {
    conditions.push(eq(auditLogsTable.action, action));
  }
  if (changedBy) {
    conditions.push(like(auditLogsTable.changedBy, `%${changedBy}%`));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const logs = whereClause
    ? await db.select().from(auditLogsTable).where(whereClause).orderBy(desc(auditLogsTable.changedAt)).limit(limit).offset(offset)
    : await db.select().from(auditLogsTable).orderBy(desc(auditLogsTable.changedAt)).limit(limit).offset(offset);

  const countResult = whereClause
    ? await db.select({ count: sql<number>`count(*)` }).from(auditLogsTable).where(whereClause)
    : await db.select({ count: sql<number>`count(*)` }).from(auditLogsTable);

  const total = Number(countResult[0]?.count || 0);

  res.json({ total, items: logs });
});

export default router;
