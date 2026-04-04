# Software Requirements Specification (SRS)
# Epic Poetry Cafe - Operations Management System

**Version:** 1.0
**Date:** April 4, 2026
**Prepared By:** Epic Poetry Cafe Development Team

---

## 1. Introduction

### 1.1 Purpose
This document defines the complete software requirements for the Epic Poetry Cafe Operations Management System. It serves as the authoritative reference for all functional and non-functional requirements, intended for stakeholders, developers, testers, and future maintainers.

### 1.2 Scope
The system is a web-based cafe operations management platform covering vendor management, ingredient tracking, recipe costing, purchasing, expense management, inventory control, sales invoice management, waste tracking, R&D trials, employee & attendance management, salary generation, daily settlements, petty cash, POS integration, analytics, and reporting.

### 1.3 Definitions & Abbreviations
| Term | Definition |
|:---|:---|
| POS | Point of Sale |
| GST | Goods and Services Tax |
| UOM | Unit of Measure |
| COGS | Cost of Goods Sold |
| P&L | Profit and Loss |
| RBAC | Role-Based Access Control |
| JWT | JSON Web Token |
| WAC | Weighted Average Cost |
| EOD | End of Day |

### 1.4 System Overview
All sales flow through invoices only (via Petpooja POS integration or manual entry). The system tracks the complete lifecycle from procurement to sale, providing real-time financial and operational analytics. It replaces spreadsheet-based tracking with a unified digital system.

---

## 2. Overall Description

### 2.1 Product Perspective
The system is a standalone web application designed for use by cafe owners, managers, and operational staff. It integrates with Petpooja POS for automated sales data import and supports Excel bulk imports for historical data migration.

### 2.2 User Roles

| Role | Description | Access Level |
|:---|:---|:---|
| **Admin (Owner)** | Full system access. Can create/manage users, verify records, generate salaries, access analytics, and manage system configuration. | All modules |
| **Manager** | Operational access. Can record transactions, manage attendance, view reports. Cannot access admin settings or user management. | All operational modules |
| **Viewer** | Read-only access. Can view data but cannot create, edit, or delete records. | View-only on operational modules |

### 2.3 Operating Environment
- **Platform:** Web browser (Chrome, Firefox, Safari, Edge)
- **Server:** Node.js 24+ on Linux
- **Database:** PostgreSQL 16+
- **Deployment:** Replit cloud hosting

### 2.4 Constraints
- Single-cafe deployment (not multi-tenant)
- Internet connection required for all operations
- All monetary values are in Indian Rupees (INR)
- Date inputs cannot be set to future dates

---

## 3. Functional Requirements

### 3.1 Authentication & User Management

#### FR-AUTH-01: User Login
- System shall authenticate users via username and password.
- Passwords are hashed using PBKDF2 with random salt (100,000 iterations, SHA-512).
- On successful login, system issues a JWT token valid for 7 days.
- System supports legacy SHA-256 password hash migration.

#### FR-AUTH-02: Session Management
- JWT tokens are stored in browser localStorage.
- All API requests include the Bearer token in the Authorization header.
- Expired tokens redirect to the login page.

#### FR-AUTH-03: Role-Based Access Control
- Three roles: admin, manager, viewer.
- Admin-only features: user management, system configuration, salary generation, inventory adjustments, analytics, trials, audit logs, data backup.
- Viewer role is read-only across all modules.

#### FR-AUTH-04: Password Management
- Users can change their own password (requires current password verification).
- Admins can reset any user's password.

---

### 3.2 Category Management

#### FR-CAT-01: Category CRUD
- Categories support two types: `menu` (for menu items) and `ingredient` (for raw materials).
- Fields: name, type, description, sort order, active status.

#### FR-CAT-02: Deletion Protection
- Categories with linked menu items or ingredients cannot be deleted.
- System returns a descriptive error message indicating the blocking reference.

---

### 3.3 Vendor Management

#### FR-VND-01: Vendor Directory
- Fields: name, code (auto-generated VND####), contact person, mobile, email, address, GST number, payment terms, credit days, active status.

#### FR-VND-02: Vendor Finance Tracking
- System tracks total purchases, total payments, pending amounts, and overdue bills per vendor.
- Vendor list can be filtered by: all, with dues, overdue.

#### FR-VND-03: Vendor-Ingredient Mapping
- Each ingredient can be mapped to one or more vendors with vendor-specific pricing, UOM, conversion factor, lead time, and minimum order quantity.

#### FR-VND-04: Vendor Deletion Protection
- Vendors with purchase records cannot be deleted.
- FK constraint violations are caught and return user-friendly error messages.

---

### 3.4 Ingredient Management

#### FR-ING-01: Ingredient Master
- Fields: name, code (auto-generated ING####), category, stock/purchase/recipe UOM, conversion factor, current cost, weighted average cost, latest cost, reorder level, current stock, perishable flag, shelf life days.

#### FR-ING-02: UOM Conversion
- System supports three UOM contexts: stock (storage), purchase (vendor invoices), recipe (production).
- Conversion factor defines the relationship (e.g., 1 kg = 1000 g).

#### FR-ING-03: Stock Tracking
- Current stock is automatically updated by purchases (+), waste (-), and adjustments (+/-).
- Weighted average cost is recalculated on each purchase.

#### FR-ING-04: Ingredient Deletion Protection
- Ingredients used in recipes or purchase lines cannot be deleted.
- FK constraint violations are caught gracefully.

---

### 3.5 Menu Item & Recipe Management

#### FR-MENU-01: Menu Item Master
- Fields: name, code (auto-generated MENU####), category, selling price, dine-in/takeaway/delivery prices, active status.

#### FR-MENU-02: Recipe Builder
- Each menu item has a recipe composed of ingredient lines.
- Recipe line fields: ingredient, quantity, UOM, wastage percentage, mandatory flag.
- Empty recipe lines (ingredientId = 0) are filtered out on save.

#### FR-MENU-03: Production Cost Calculation (Costing Engine)
- Cost per ingredient = (weightedAvgCost / conversionFactor) x quantity x (1 + wastagePercent/100).
- Total production cost = sum of all ingredient costs.
- Margin = sellingPrice - productionCost.
- Margin percentage = (margin / sellingPrice) x 100.

#### FR-MENU-04: Menu Item Deletion Protection
- Menu items with sales invoice records cannot be deleted. System suggests deactivation instead.
- FK constraint violations are caught gracefully.

#### FR-MENU-05: Admin Verification
- Menu items support a maker-checker verification workflow.
- Only admins can verify/unverify records.

---

### 3.6 Purchase Management

#### FR-PUR-01: Purchase Recording
- Fields: vendor, purchase date, invoice number, payment mode, payment status, line items.
- Each line: ingredient, quantity, unit rate, tax percentage.
- Purchase number is auto-generated (PUR####).

#### FR-PUR-02: Stock & Cost Update on Purchase
- On purchase creation, each ingredient's current stock is increased by the line quantity.
- Weighted average cost is recalculated: newAvg = (oldTotal + newQtyValue) / newTotalStock.
- Latest cost is updated to the line unit rate.

#### FR-PUR-03: Purchase Deletion with Stock Reversal
- When a purchase is deleted, ingredient stock is reduced by the purchased quantities.
- Stock cannot go below zero (clamped to Math.max(0, ...)).
- Verified purchases can only be deleted by admins.

#### FR-PUR-04: Vendor Ledger Integration
- Purchases create debit entries in the vendor ledger with running balance.

#### FR-PUR-05: Form Validation
- Vendor selection is required.
- At least one line item with quantity > 0 is required.
- Purchase date cannot be in the future.

---

### 3.7 Sales Invoice Management

#### FR-SALE-01: Invoice Creation
- All sales flow through invoices. No standalone "quick sales" exist.
- Fields: sales date, invoice number (auto-generated or manual), time, order type (dine-in/takeaway/delivery/online), payment mode, customer name, GST inclusive flag, discount, line items.
- Each line: menu item, quantity, GST percentage.

#### FR-SALE-02: GST & Discount Calculation
- Gross amount = sum of (quantity x sellingPrice) for all lines.
- Discount is allocated proportionally across lines.
- If GST inclusive: taxableAmount = lineAmount / (1 + gstPercent/100).
- If GST exclusive: taxableAmount = lineAmount, gstAmount = lineAmount x gstPercent/100.
- Final amount = taxableAmount + gstAmount for each line.

#### FR-SALE-03: Sales Views
- **Invoices tab**: List of all invoices with detail modal.
- **Items tab**: Aggregated item-wise sales summary.
- **Daily tab**: Day-by-day sales summary with mismatch indicators.
- **Consumption tab**: Theoretical ingredient consumption based on recipes.

#### FR-SALE-04: Invoice Deletion
- Verified invoices can only be deleted by admins.
- Line items are cascade-deleted with the invoice.

#### FR-SALE-05: Form Validation
- At least one line item with menuItemId > 0 and quantity > 0 is required.
- Sales date cannot be in the future.

---

### 3.8 Expense Management

#### FR-EXP-01: Expense Recording
- Fields: date, amount, cost type (Fixed/Variable/Utility), description, payment mode.
- Expense number is auto-generated (EXP####).

#### FR-EXP-02: Petty Cash Linking
- Expenses with petty cash payment mode are auto-linked to petty cash ledger entries.

#### FR-EXP-03: Form Validation
- Amount must be greater than zero.
- Description is required.
- Date cannot be in the future.

---

### 3.9 Waste Management

#### FR-WST-01: Waste Recording
- Supports two waste types: raw ingredient and prepared menu item.
- Fields: waste date, type, ingredient/menu item, quantity, UOM, reason, department, notes.
- Waste number is auto-generated (WST####).

#### FR-WST-02: Cost Value Calculation
- Ingredient waste: costValue = weightedAvgCost x quantity.
- Menu item waste: costValue = sum of recipe ingredient costs (with wastage & conversion factors).

#### FR-WST-03: Stock Deduction on Waste
- Ingredient waste deducts from current stock (clamped to minimum 0).
- Menu item waste does not directly deduct ingredient stock (cost calculation only).

#### FR-WST-04: Stock Restoration on Waste Deletion
- Deleting an ingredient-type waste entry restores the wasted quantity to ingredient stock.

#### FR-WST-05: Form Validation
- Ingredient selection is required when waste type is "ingredient".
- Quantity must be greater than zero.
- Date cannot be in the future.

---

### 3.10 Inventory Management

#### FR-INV-01: Stock Overview
- Displays real-time theoretical stock levels for all active ingredients.
- Shows current stock, reorder level, weighted average cost, and latest cost.
- Low stock alerts when current stock falls below reorder level.

#### FR-INV-02: End-of-Day Stock Snapshots
- Admin-only feature to record physical stock counts.
- Fields: snapshot date, list of ingredient closing quantities.
- Calculates consumed quantity = opening stock + purchases - closing stock.
- Snapshot date cannot be in the future.

#### FR-INV-03: Stock Adjustments
- Admin-only feature for manual stock corrections.
- Types: increase or decrease.
- Negative stock is prevented (system rejects adjustments that would result in negative stock).
- Creates audit log entry.

---

### 3.11 Daily Sales Settlement

#### FR-SET-01: Settlement Recording
- Records daily cash reconciliation against POS net sales.
- Fields: settlement date, remarks, payment mode lines (Cash, Card, QR, UPI, Bank Transfer, Swiggy, Zomato, Other).
- Each line: payment mode, amount, reference note.

#### FR-SET-02: Reconciliation
- System auto-calculates net sales from sales invoices for the settlement date.
- Difference = total settlement - net sales.
- Difference types: matched (zero), shortage (negative), excess (positive).

#### FR-SET-03: Verification Workflow
- Admin can verify settlements.
- Verified settlements cannot be modified or deleted by non-admin users.

---

### 3.12 Petty Cash Management

#### FR-PC-01: Petty Cash Ledger
- Transaction types: receipt (money in), expense (money out), adjustment.
- Fields: date, type, amount, method, counterparty name, category, description.
- System maintains a running balance.

#### FR-PC-02: Balance Protection
- Negative balance protection: system validates sufficient balance before recording expenses.

#### FR-PC-03: Auto-Linking with Expenses
- Petty cash expense transactions auto-create linked records in the main expenses table.

---

### 3.13 Employee & Attendance Management

#### FR-EMP-01: Employee Master
- Fields: name, code (auto-generated), designation, department, employment type, salary, shift, mobile, address, date of joining, active status.

#### FR-EMP-02: Shift Management
- Fields: shift name, start time, end time.
- Each employee is assigned to a shift.

#### FR-EMP-03: Attendance Tracking
- Daily attendance with statuses: present, half-day, absent, week-off.
- Monthly attendance summary with day counts per status.

#### FR-EMP-04: Leave Management
- Leave types supported (casual, sick, privilege, etc.).
- Leave recording with date range and reason.

#### FR-EMP-05: Salary Generation
- Admin-only monthly salary generation.
- Calculation based on base salary, present days, half-days, deductions.
- Payment status tracking and payment proof upload (PDF/image).

---

### 3.14 POS Integration

#### FR-POS-01: Petpooja Integration
- Webhook endpoint for receiving POS sales data.
- Automatic item mapping between Petpooja menu items and system menu items.
- Admin UI for managing item mappings.

#### FR-POS-02: General POS Integrations
- Support for Petpooja, POSist, UrbanPiper, and custom POS providers.
- Secure webhook handling via public URL prefix.
- Integration configuration stored in database.

---

### 3.15 Bulk Data Import

#### FR-UPL-01: Excel Upload
- Supported import types: sales, purchases, expenses, sales invoices, Petpooja data.
- Row-by-row validation with error reporting.
- Name-matching for vendors, ingredients, and menu items.
- Future date prevention on all imported dates.

#### FR-UPL-02: Template Download
- System provides downloadable Excel templates for each import type.

---

### 3.16 Trials & R&D

#### FR-TRD-01: Trial Management
- Admin-only feature for new recipe experimentation.
- Fields: proposed item name, target cost, target selling price, trial code (auto-generated).
- Version tracking for iterative testing.

#### FR-TRD-02: Trial Approval
- Approved trials can be converted into menu item recipes.
- Status workflow: draft -> testing -> approved/rejected.

---

### 3.17 Analytics & Reporting

#### FR-RPT-01: Dashboard
- Role-based dashboard views:
  - **Owner (Admin)**: Full P&L, settlements, vendor payables, trend charts.
  - **Manager**: Daily operational metrics, sales trends, low stock alerts.
- Summary cards: today's sales, pending expenses, low stock count.

#### FR-RPT-02: Item Profitability Analysis
- Revenue, production cost, gross profit, and margin percentage per menu item.
- Cost-to-sale ratio classification (green/yellow/red).

#### FR-RPT-03: Waste Analysis
- Total waste cost, waste-to-sales percentage.
- Breakdown by ingredient and menu item with top reasons.

#### FR-RPT-04: Consumption Variance
- Comparison of actual consumption (from stock snapshots) vs theoretical consumption (from recipes x sales).
- Variance percentage per ingredient.

#### FR-RPT-05: Daily P&L
- Gross Profit = Total Sales - Material Cost.
- Operating Profit = Gross Profit - Waste Cost - Allocated Expenses.

#### FR-RPT-06: Report Export
- CSV export capability for various report types.

---

### 3.18 System Administration

#### FR-SYS-01: System Configuration
- Configurable settings: currency, tax rate, costing method, business name.
- Admin-only access.

#### FR-SYS-02: Audit Logs
- All create, update, delete operations are logged with old/new values.
- Filterable by module, date range.
- Admin-only access.

#### FR-SYS-03: Data Backup
- Full database backup download in JSON format.
- Admin-only access.

---

## 4. Non-Functional Requirements

### 4.1 Performance
- API response time < 500ms for standard CRUD operations.
- Dashboard loads within 2 seconds.
- Supports up to 50 concurrent users.

### 4.2 Security
- PBKDF2 password hashing with random salt (100,000 iterations).
- JWT tokens with HMAC-SHA256 signing.
- Parameterized SQL queries (no raw SQL interpolation).
- Role-based access control at both API and UI levels.
- Timing-safe password comparison to prevent timing attacks.

### 4.3 Data Integrity
- Cascading delete guards prevent orphaned records.
- Negative stock protection on inventory adjustments.
- Purchase/waste deletion properly reverses stock changes.
- Maker-checker verification workflow for critical records.
- Future date prevention on all date inputs (frontend and backend).

### 4.4 Usability
- Responsive web design (desktop primary).
- Toast notifications for all user actions (success and error).
- Confirmation dialogs for destructive actions.
- Loading states during data fetches.
- Consistent date and currency formatting (en-IN locale, INR).

### 4.5 Reliability
- Automatic database seeding for initial setup.
- Graceful error handling with descriptive messages.
- Health check endpoint for monitoring.

### 4.6 Maintainability
- OpenAPI specification with auto-generated client code.
- Zod validation schemas shared between client and server.
- Monorepo structure with clear package boundaries.

---

## 5. Data Requirements

### 5.1 Entity Relationship Summary

```
users
categories ──< menu_items ──< recipe_lines >── ingredients
                                                    │
categories ──< ingredients ──< purchase_lines >── purchases >── vendors
                    │                                              │
                    ├──< waste_entries                              ├──< vendor_payments
                    ├──< stock_snapshots                           ├──< vendor_ledger
                    ├──< stock_adjustments                         └──< ingredient_vendor_mapping
                    └──< ingredient_vendor_mapping

menu_items ──< sales_invoice_lines >── sales_invoices
menu_items ──< petpooja_item_mappings

employees ──< attendance
employees ──< leaves
employees ──< salary_records
shifts ──< employees

daily_sales_settlements ──< settlement_lines

petty_cash_ledger >── expenses

system_config (singleton)
audit_logs
pos_integrations
trials ──< trial_versions ──< trial_ingredient_lines
```

### 5.2 Key Data Volumes (Expected)
| Entity | Expected Volume |
|:---|:---|
| Menu Items | 50-200 |
| Ingredients | 50-300 |
| Vendors | 10-50 |
| Sales Invoices | 50-200/day |
| Purchases | 5-20/week |
| Employees | 5-30 |

---

## 6. Interface Requirements

### 6.1 User Interface
- Single-page application with sidebar navigation.
- Login page with branded cafe imagery.
- Dashboard as the landing page after authentication.
- Modal-based forms for create/edit operations.
- Date range filters on all transaction list pages.

### 6.2 External Interfaces
- **Petpooja POS**: Webhook receiver at `POST /api/webhook/petpooja/:integrationId`.
- **Excel Import**: Multi-part file upload for bulk data migration.

---

## 7. Appendices

### Appendix A: Auto-Generated Code Prefixes
| Entity | Prefix | Example |
|:---|:---|:---|
| Vendor | VND | VND0001 |
| Ingredient | ING | ING0001 |
| Menu Item | MENU | MENU0001 |
| Purchase | PUR | PUR0001 |
| Expense | EXP | EXP0001 |
| Waste Entry | WST | WST0001 |
| Sales Invoice | INV | INV0001 |
| Employee | EMP | EMP0001 |
| Trial | TRL | TRL0001 |

### Appendix B: Payment Modes
- Cash, Card, UPI, Wallet, Mixed, Bank Transfer, Swiggy, Zomato

### Appendix C: Order Types
- Dine-in, Takeaway, Delivery, Online
