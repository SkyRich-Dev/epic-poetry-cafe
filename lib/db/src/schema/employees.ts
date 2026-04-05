import { pgTable, text, serial, boolean, integer, doublePrecision, timestamp } from "drizzle-orm/pg-core";

export const employeesTable = pgTable("employees", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  contactNumber: text("contact_number"),
  position: text("position").notNull(),
  salary: doublePrecision("salary").notNull().default(0),
  employmentType: text("employment_type").notNull().default("full-time"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const shiftsTable = pgTable("shifts", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const attendanceTable = pgTable("attendance", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").references(() => employeesTable.id).notNull(),
  attendanceDate: text("attendance_date").notNull(),
  shiftId: integer("shift_id").references(() => shiftsTable.id),
  status: text("status").notNull().default("present"),
  markedBy: integer("marked_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const leavesTable = pgTable("leaves", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").references(() => employeesTable.id).notNull(),
  leaveDate: text("leave_date").notNull(),
  leaveType: text("leave_type").notNull().default("paid"),
  reason: text("reason"),
  approvedBy: integer("approved_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const salaryRecordsTable = pgTable("salary_records", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").references(() => employeesTable.id).notNull(),
  month: integer("month").notNull(),
  year: integer("year").notNull(),
  baseSalary: doublePrecision("base_salary").notNull(),
  totalDaysInMonth: integer("total_days_in_month").notNull(),
  presentDays: doublePrecision("present_days").notNull().default(0),
  halfDays: integer("half_days").notNull().default(0),
  paidLeaves: integer("paid_leaves").notNull().default(0),
  unpaidLeaves: integer("unpaid_leaves").notNull().default(0),
  weekOffs: integer("week_offs").notNull().default(0),
  paidWeekOffs: integer("paid_week_offs").notNull().default(0),
  excessWeekOffs: integer("excess_week_offs").notNull().default(0),
  absentDays: integer("absent_days").notNull().default(0),
  absentPenaltyMultiplier: doublePrecision("absent_penalty_multiplier").notNull().default(1),
  deductions: doublePrecision("deductions").notNull().default(0),
  netSalary: doublePrecision("net_salary").notNull().default(0),
  paymentStatus: text("payment_status").notNull().default("pending"),
  paymentProofUrl: text("payment_proof_url"),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  paidBy: integer("paid_by"),
  generatedAt: timestamp("generated_at", { withTimezone: true }).notNull().defaultNow(),
});
