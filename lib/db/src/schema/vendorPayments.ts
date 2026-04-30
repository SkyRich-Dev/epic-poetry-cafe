import { pgTable, text, serial, integer, doublePrecision, timestamp } from "drizzle-orm/pg-core";
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
  purchaseId: integer("purchase_id").notNull().references(() => purchasesTable.id),
  allocatedAmount: doublePrecision("allocated_amount").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

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
