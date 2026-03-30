import { db, auditLogsTable } from "@workspace/db";

export async function createAuditLog(module: string, recordId: number, action: string, oldValue: any, newValue: any, changedBy?: string) {
  await db.insert(auditLogsTable).values({
    module,
    recordId,
    action,
    oldValue: oldValue ? JSON.stringify(oldValue) : null,
    newValue: newValue ? JSON.stringify(newValue) : null,
    changedBy,
  });
}
