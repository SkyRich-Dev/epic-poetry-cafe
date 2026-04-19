# Platr — QA Checklist

Derived from the Platr Testing Strategy. Each item is a discrete, verifiable
check mapped to a real module / route in this codebase. Use the checkbox
column to track coverage as you go.

Legend:
- **Module** — frontend page (`artifacts/epic-poetry-cafe/src/pages`) and/or
  backend route (`artifacts/api-server/src/routes`).
- **Severity** — `B` blocker, `C` critical, `H` high, `M` medium, `L` low.
- **How** — quick hint on how to verify.

---

## 1. Authentication & Access Control
Module: `auth.ts` / `login.tsx` / `users.ts`

| Done | Severity | Check | How |
|---|---|---|---|
| ☐ | B | Login with valid credentials succeeds | admin/admin123, manager/manager123 |
| ☐ | B | Login with invalid credentials fails with clear message | wrong password returns 401 |
| ☐ | C | JWT is stored and sent on subsequent requests | check Network tab `Authorization: Bearer …` |
| ☐ | C | Owner role sees Admin section in sidebar; Viewer does not | log in as each role |
| ☐ | C | `adminOnly` endpoints reject non-admins with 403 | curl as non-admin to e.g. `/decision/financial/*` |
| ☐ | H | Token expiry forces re-login | shorten `JWT_EXPIRY` and wait |
| ☐ | H | Logout clears local session and redirects to `/` | sidebar Logout button |
| ☐ | H | Change-password modal validates current password | wrong current password → error |
| ☐ | M | Direct URL to a protected page when logged out → login | `/dashboard` while signed out |

---

## 2. Sales Module
Module: `salesInvoices.ts`, `sales.ts` / `sales.tsx`

### 2.1 Invoice-based sales
| Done | Severity | Check | How |
|---|---|---|---|
| ☐ | C | Create invoice manually with multiple lines | Sales → New Invoice |
| ☐ | C | Invoice number must be unique | re-submit same number → 409 |
| ☐ | C | GST is computed correctly per line and summed on invoice | inclusive vs exclusive both produce same final |
| ☐ | C | Invoice-level discount allocates proportionally to lines | check `lineDiscountAllocated` field |
| ☐ | C | Item-level discount aggregates into invoice discount | totals reconcile |
| ☐ | C | Payment mode captured (cash / card / UPI / credit) | filter by mode and verify counts |
| ☐ | H | Edit existing invoice updates totals everywhere it appears | sales report, dashboard, decision engine |
| ☐ | H | Delete invoice removes related sale-lines (no orphans) | DB check |

### 2.2 Excel & POS import
| Done | Severity | Check | How |
|---|---|---|---|
| ☐ | C | Excel upload parses required columns | sample file in `attached_assets/` |
| ☐ | C | Petpooja-style POS payload import | `posIntegrations.ts` |
| ☐ | C | Duplicate invoice numbers in upload are skipped, not errored | re-upload same file |
| ☐ | H | Missing required field → row reported as failed with row number | partial-success response |
| ☐ | H | Wrong item mapping is logged in `auditLogs` | check audit table |

### 2.3 Matching & integrity
| Done | Severity | Check | How |
|---|---|---|---|
| ☐ | C | `Σ line totals == invoice total` (within rounding tolerance) | data-integrity query |
| ☐ | C | Item-based daily totals == sum of invoice lines for the day | cross-check |
| ☐ | H | Mismatches surface in Decision Engine → Revenue Leakage | `/decision/revenue/leakage` |

---

## 3. Settlement Module
Module: `settlements.ts` / `settlements.tsx`

| Done | Severity | Check | How |
|---|---|---|---|
| ☐ | C | Enter cash/card/UPI settlement values | New Settlement |
| ☐ | C | Total settlement reconciles against day’s sales | mismatch flag turns red |
| ☐ | C | Short / excess delta is calculated and stored | check `varianceAmount` |
| ☐ | C | Duplicate settlement for same date+mode is prevented | unique constraint |
| ☐ | H | Settlement status transitions: pending → verified | role-gated |
| ☐ | H | Settlement mismatch trend appears in Decision Engine → Financial | `/decision/financial/settlement-mismatch` |

---

## 4. Petty Cash Module
Module: `pettyCash.ts` / `petty-cash.tsx`

| Done | Severity | Check | How |
|---|---|---|---|
| ☐ | C | Receipt entry increases petty-cash balance | running balance updates |
| ☐ | C | Expense entry decreases petty-cash balance | same row visible |
| ☐ | C | Petty-cash balance never goes negative without explicit override | guard at write |
| ☐ | C | Expense paid from petty cash creates linked petty-cash row | check FK `pettyCashId` |
| ☐ | H | Editing the linked expense updates the petty-cash row | edit and re-check balance |
| ☐ | H | Deleting the expense rolls back the petty-cash entry | delete and re-check balance |

---

## 5. Expense Module
Module: `expenses.ts` / `expenses.tsx`

| Done | Severity | Check | How |
|---|---|---|---|
| ☐ | C | Create expense with payment mode selection | cash / bank / petty-cash |
| ☐ | C | Edit expense updates ledger totals | dashboard total reflects edit |
| ☐ | C | Delete expense rolls back any linked petty-cash / vendor-payment row | check both directions |
| ☐ | H | Expense report grouped by category sums to total expenses | report = grand total |

---

## 6. Vendor Module
Module: `vendors.ts`, `vendorPayments.ts`, `purchases.ts` / `vendors.tsx`, `vendor-detail.tsx`, `purchases.tsx`

| Done | Severity | Check | How |
|---|---|---|---|
| ☐ | C | Create vendor; cannot duplicate by phone+name | unique check |
| ☐ | C | Purchase entry generates a bill | Purchases → New |
| ☐ | C | Payment entry allocates against bill(s) | full and partial allocation |
| ☐ | C | `Σ allocations ≤ bill total` always | server-side guard |
| ☐ | C | Multi-bill allocation distributes correctly | one payment, two bills |
| ☐ | C | Payment proof file upload works and is downloadable | PDF/image |
| ☐ | H | Vendor ledger = `Σ purchases − Σ payments` | open vendor detail |
| ☐ | H | Overdue bills surface in Decision Engine → Vendor Risk | `/decision/financial/vendor-risk` |
| ☐ | H | Reversing a payment restores bill pending amount | delete payment |

---

## 7. Inventory Module
Module: `inventory.ts`, `ingredients.ts` / `inventory.tsx`, `ingredients.tsx`

| Done | Severity | Check | How |
|---|---|---|---|
| ☐ | C | Manual stock update changes on-hand qty | log entry created |
| ☐ | C | Sales consumption deducts ingredient stock per recipe | stock drops post-sale |
| ☐ | H | Stock aging report renders with age buckets | Reports |
| ☐ | H | Low-stock alert fires when qty < reorder threshold | Decision Engine → Alerts |
| ☐ | H | Dead-stock (no movement N days) surfaces correctly | `/decision/inventory/dead-stock` |
| ☐ | M | Negative stock is blocked unless explicitly allowed | DB constraint |

> Skipped per spec: Expiry tracking (no expiry field on ingredients).

---

## 8. Waste Module
Module: `waste.ts` / `waste.tsx`

| Done | Severity | Check | How |
|---|---|---|---|
| ☐ | C | Waste entry (raw / semi / final) is recorded | Waste page |
| ☐ | C | Waste cost = qty × ingredient cost | check `costAmount` |
| ☐ | C | Waste deducts ingredient stock | inventory reflects |
| ☐ | H | Waste report by category and reason | Reports |

---

## 9. Customer Module
Module: `customers.ts` / `customers.tsx`

| Done | Severity | Check | How |
|---|---|---|---|
| ☐ | C | Customer auto-created from POS / sales by phone | duplicates prevented |
| ☐ | C | Visit count, last-visit, total spend recompute correctly | `recompute-all` |
| ☐ | H | Top item per customer shown in detail | customer drawer |
| ☐ | H | CLV value matches Decision Engine output | `/decision/customer/clv` |

---

## 10. Business Logic — Critical
| Done | Severity | Check | How |
|---|---|---|---|
| ☐ | C | Recipe cost rolls up through semi-prepared items | menu item cost ≈ Σ ingredient cost |
| ☐ | C | Cost change on an ingredient propagates to all recipes | edit ingredient cost → recipe re-priced |
| ☐ | C | Theoretical vs actual consumption variance is computed | `/decision/inventory/consumption-variance` |
| ☐ | C | Inclusive-vs-exclusive GST produces consistent grand totals | invoice maths |
| ☐ | C | Discount line/invoice consistency: re-saving an invoice doesn't drift totals | re-save and diff |

---

## 11. Data Integrity (DB sweeps)
| Done | Severity | Check | How |
|---|---|---|---|
| ☐ | C | No duplicate invoice numbers | `SELECT invoice_no, COUNT(*) … HAVING COUNT(*)>1` |
| ☐ | C | No orphan sale lines (no parent invoice) | LEFT JOIN check |
| ☐ | C | No vendor payments without a vendor | FK check |
| ☐ | C | No settlements without a sales day | FK check |
| ☐ | H | All `createdAt`/`updatedAt` are present and sane | nulls / future dates |

---

## 12. Decision Engine
Module: `decision.ts` / `decision.tsx` (8 tabs, 17 endpoints)

| Done | Severity | Check | How |
|---|---|---|---|
| ☐ | C | Each tab loads without console errors | Overview / Revenue / Customer / Operational / Inventory / Financial / Predictive / Alerts |
| ☐ | C | `Revenue Leakage` correctly identifies invoices with discount > threshold | sample data |
| ☐ | C | `Profit Comparison` & `Item Matrix` sum to global totals | reconcile |
| ☐ | C | `CLV` & `Churn` use the same customer set | counts match |
| ☐ | C | `Kitchen Load` aggregates by hour of day | bar chart non-empty on a sales day |
| ☐ | C | `Consumption Variance` flags ingredients with > X% deviation | seed an outlier |
| ☐ | C | `Settlement Mismatch` matches what Settlements page shows | cross-check single date |
| ☐ | C | `Vendor Risk` lists overdue vendors only | aged > N days |
| ☐ | H | `Predictive Sales` returns numeric forecast (no NaN/Infinity) | `/decision/predictive/sales` |
| ☐ | H | `Alerts` deduplicates same alert in same window | trigger twice |
| ☐ | H | `adminOnly` financial tabs reject non-admin (403) | curl as manager |

> Skipped per spec: expiry risk, order delay, table turnover (no underlying data).

---

## 13. UI / UX
| Done | Severity | Check | How |
|---|---|---|---|
| ☐ | H | Sidebar logo readable; active item orange | login screen + dashboard |
| ☐ | H | Page header shows cafe name (uppercase eyebrow) on every page | spot-check 5 pages |
| ☐ | H | Forms surface validation errors inline | submit empty form |
| ☐ | H | Loading and empty states render (no blank screens) | throttle network |
| ☐ | M | Layout responsive at 1280, 1024, 768, 400 | resize browser |
| ☐ | M | Tables paginate / virtualise on > 1k rows | seed and scroll |
| ☐ | L | Dark text on cream is AA contrast | accessibility audit |

---

## 14. Mobile App (Expo)
Module: `artifacts/epic-poetry-mobile`

| Done | Severity | Check | How |
|---|---|---|---|
| ☐ | C | Login flow on device | Expo Go |
| ☐ | C | Dashboard renders with live API data | charts populate |
| ☐ | H | Offline → online retry succeeds | airplane mode toggle |
| ☐ | H | Background → foreground keeps session | background app, return |
| ☐ | H | API base URL respects `getApiUrl()` | not hard-coded |

---

## 15. Performance
| Done | Severity | Check | How |
|---|---|---|---|
| ☐ | H | API p95 < 400 ms on dashboard endpoints | server timing logs |
| ☐ | H | Decision-engine endpoints < 1.5 s for 90-day windows | profile |
| ☐ | H | Frontend route transitions feel instant (< 150 ms TTI) | Lighthouse |
| ☐ | M | No memory leak after 10 min on dashboard | Chrome perf |

---

## 16. Security
| Done | Severity | Check | How |
|---|---|---|---|
| ☐ | C | Drizzle parameterised queries — no string concat with user input | code review |
| ☐ | C | File upload restricts mime/size and stores under random name | `multer` config |
| ☐ | C | All write routes require auth (no public POSTs) | grep `router.post` for missing `authMiddleware` |
| ☐ | H | Brute-force / rate limit on `/auth/login` | hit 100× and confirm 429 (or document as gap) |
| ☐ | H | Sensitive fields (password hash, tokens) never returned in API | response shape audit |

---

## 17. Edge Cases
| Done | Severity | Check | How |
|---|---|---|---|
| ☐ | H | Zero-sales day → reports render with empty states, not crashes | pick a future date |
| ☐ | H | Very large numbers (₹ 99,99,99,999) format correctly | Indian locale |
| ☐ | H | Concurrent updates to same record handled (last-write-wins or 409) | two tabs |
| ☐ | M | Negative qty / negative price rejected at API | curl with -1 |

---

## 18. Pre-Production Go-Live
| Done | Severity | Check | How |
|---|---|---|---|
| ☐ | B | All `B` & `C` rows above are ☑ | this doc |
| ☐ | B | DB migrations applied on prod (`drizzle-kit push`) | run on prod DB |
| ☐ | B | Secrets present (`JWT_SECRET`, `DATABASE_URL`, `SESSION_SECRET`) | env check |
| ☐ | B | Backup job verified at least once | `backup.ts` |
| ☐ | C | Logs ship to a persistent location | review pino transport |
| ☐ | C | Health check `/health` returns 200 | curl |
| ☐ | C | Mobile app points at production API | env at build |
