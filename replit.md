# Epic Poetry Cafe - Operations Management System

## Overview

The Epic Poetry Cafe Operations Management System is a comprehensive solution designed to streamline and manage all critical aspects of cafe operations. Its primary purpose is to enhance efficiency, reduce waste, and improve profitability by providing modules for vendor management, ingredient tracking, recipe costing, purchasing, expense management, inventory control, sales, waste management, R&D/trials, and robust financial analytics. The system aims to provide real-time insights into the cafe's performance, support informed decision-making, and automate tedious manual processes, ultimately contributing to a more sustainable and profitable business.

## User Preferences

I want you to act as a senior software engineer. I prefer detailed explanations and a collaborative approach. Before making any major changes or implementing new features, please discuss the approach and design choices with me. I appreciate clean, maintainable code with good test coverage. Do not make changes to files within the `lib/api-spec/` and `lib/api-client-react/` directories unless specifically instructed, as these are generated.

## System Architecture

The system is built as a monorepo utilizing `pnpm workspaces` for managing various components. It uses Node.js 24 and TypeScript 5.9.

**Frontend:**
- Developed with React and Vite, located in `artifacts/epic-poetry-cafe`.
- Provides a comprehensive UI with pages for login, dashboard, various operational modules, reports, and administrative masters.
- Implements an `AuthContext` for JWT token management in `localStorage`.
- Features a role-based dashboard: "Owner's Dashboard" for admins with full P&L, settlements, vendor payables, and detailed trend charts (recharts); "Operations Dashboard" for managers/viewers focusing on daily operational metrics.
- UI/UX includes a sidebar and topbar layout.
- Access control is implemented at the route level, displaying "Access Restricted" for non-authorized users.
- Date input fields enforce `max={today}` to prevent future date entries.

**Backend:**
- An Express 5 API server, located in `artifacts/api-server`.
- Uses PostgreSQL with Drizzle ORM for data persistence, defining over 22 tables.
- Implements a custom JWT authentication scheme (HMAC-SHA256) with `SESSION_SECRET` and role-based access control (`admin`, `manager`, `viewer`). Password hashing uses PBKDF2 with random salt (legacy SHA256 fallback for migration).
- All API routes are prefixed with `/api`. Global auth middleware protects most routes, with exceptions for `/api/healthz` and `/api/auth/login`.
- `Orval` is used for API client code generation from an OpenAPI specification, generating React Query hooks (`lib/api-client-react/`) and Zod schemas (`lib/api-zod/`).
- Validation is handled using `Zod`.
- Uses `esbuild` for CJS bundle builds.
- Critical operations in modules like sales, purchases, and expenses have an Admin Verification system (`verified`, `verifiedBy`, `verifiedAt` columns) with specific API endpoints for verification and unverification.
- Implements a robust `Costing Engine` that supports weighted average (default), latest, or standard cost methods, accounting for UOM conversions.
- Features auto-generation of unique codes for various entities (e.g., VND0001, ING0001).
- Database transactions are used for atomicity in critical import processes (e.g., sales invoices, Petpooja data).
- `PATCH` operations automatically use `.partial()` schemas for flexible updates.
- Centralized date validation helper (`validateNotFutureDate`) on the backend.
- Uploaded payment proofs for salary are served via authenticated routes.

**Key Features:**
- **Inventory Management**: Purchases auto-update stock and weighted average costs; waste auto-deducts from stock. Purchase/waste deletion properly reverses stock changes. Negative stock is prevented on inventory adjustments. Deletion of vendors, ingredients, categories, and menu items is guarded against referential usage.
- **Trial Management**: Approved R&D trials can be converted into menu item recipes.
- **Daily Sales Settlement**: Reconciliation of daily sales against payment collections with admin verification.
- **Petty Cash Management**: Comprehensive ledger with running balance, negative balance protection, and auto-linking with expenses.
- **Daily P&L**: Real-time calculation of profit and loss.
- **Consumption Variance**: Comparison of actual vs. theoretical ingredient usage.
- **Bulk Data Import**: Excel upload for sales, purchases, expenses, and sales invoices with row-by-row validation and name-matching.
- **POS Integration**: Specialized integration for Petpooja POS data import with automatic item mapping and a dedicated admin UI. Also supports general POS integrations (Petpooja, POSist, UrbanPiper, custom) with secure webhook handling.
- **Employee Management**: CRUD operations for employees, shifts, attendance tracking (present, half-day, absent, week-off), and leave management.
- **Salary Generation**: Admin-only feature calculating net salary based on attendance and leaves, with payment status tracking and proof upload.
- **Vendor Finance Tracking**: Bill-wise payment recording, ledger tracking (debit/credit/running balance), aging analysis, and payment proof uploads.
- **Sales Invoice Module**: All sales flow through invoices (Petpooja POS or manual entry). Features line items, GST calculation, proportional discount allocation, match verification, and item/daily/consumption analytics. Quick Sales have been fully removed — all backend calculations (dashboard, P&L, reports, settlements, consumption variance) source from `sales_invoices` + `sales_invoice_lines`.

## External Dependencies

- **Database**: PostgreSQL
- **ORM**: Drizzle ORM
- **API Framework**: Express 5
- **Frontend Framework**: React
- **Build Tool**: Vite, esbuild
- **Package Manager**: pnpm
- **Validation Library**: Zod (`zod/v4`), `drizzle-zod`
- **API Code Generation**: Orval (from OpenAPI spec)
- **POS Systems**: Petpooja, POSist, UrbanPiper (integrations are planned/supported)