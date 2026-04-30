import { pgTable, text, serial, integer, doublePrecision, timestamp, check, uniqueIndex } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { vendorsTable } from "./vendors";
import { purchasesTable } from "./purchases";
import { expensesTable } from "./expenses";

export const vendorPaymentsTable = pgTable("vendor_payments", {
  id: serial("id").primaryKey(),
  paymentNo: text("payment_no").notNull().unique(),
  vendorId: integer("vendor_id").notNull().references(() => vendorsTable.id),
  paymentDate: text("payment_date").notNull(),
  paymentMethod: text("payment_method").notNull(),
  transactionReference: text("transaction_reference"),
  totalAmount: doublePrecision("total_amount").notNull(),
  remarks: text("remarks"),
  paymentProof: text("payment_proof"),
  createdBy: integer("created_by"),
  approvedBy: integer("approved_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const vendorPaymentAllocationsTable = pgTable("vendor_payment_allocations", {
  id: serial("id").primaryKey(),
  vendorPaymentId: integer("vendor_payment_id").notNull().references(() => vendorPaymentsTable.id),
  // Exactly one of purchaseId / expenseId is set per row.
  // The DB CHECK below enforces this XOR invariant for any insert path.
  purchaseId: integer("purchase_id").references(() => purchasesTable.id),
  expenseId: integer("expense_id").references(() => expensesTable.id),
  allocatedAmount: doublePrecision("allocated_amount").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => ({
  exactlyOneRef: check(
    "vendor_payment_allocations_exactly_one_ref",
    sql`(${table.purchaseId} IS NOT NULL)::int + (${table.expenseId} IS NOT NULL)::int = 1`,
  ),
  positiveAmount: check(
    "vendor_payment_allocations_positive_amount",
    sql`${table.allocatedAmount} > 0`,
  ),
  // Belt-and-suspenders: even if the API aggregator misses dedup, the DB will
  // refuse two allocation rows for the same target on the same payment.
  uqPurchase: uniqueIndex("vp_alloc_unique_purchase")
    .on(table.vendorPaymentId, table.purchaseId)
    .where(sql`${table.purchaseId} IS NOT NULL`),
  uqExpense: uniqueIndex("vp_alloc_unique_expense")
    .on(table.vendorPaymentId, table.expenseId)
    .where(sql`${table.expenseId} IS NOT NULL`),
}));

export const vendorLedgerTable = pgTable("vendor_ledger", {
  id: serial("id").primaryKey(),
  vendorId: integer("vendor_id").notNull().references(() => vendorsTable.id),
  transactionDate: text("transaction_date").notNull(),
  transactionType: text("transaction_type").notNull(),
  referenceType: text("reference_type"),
  referenceId: integer("reference_id"),
  debit: doublePrecision("debit").notNull().default(0),
  credit: doublePrecision("credit").notNull().default(0),
  runningBalance: doublePrecision("running_balance").notNull().default(0),
  description: text("description"),
  remarks: text("remarks"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
