/**
 * Payment-mode normalisation.
 *
 * Different write paths store paymentMode in different shapes:
 *   - UI form selects use SCREAMING_SNAKE: "PETTY_CASH", "BANK_TRANSFER"
 *   - POS imports / Excel uploads usually arrive lowercased: "cash", "card"
 *   - Hand-typed pettyCash module stores "Petty Cash" (Title + space)
 *
 * If we group by the raw value, the same logical mode fragments into 2-3
 * separate rows in reports / decision engine. This helper produces a single
 * canonical token so aggregations group correctly regardless of source.
 *
 * Canonical tokens are lowercase with words separated by underscores, e.g.:
 *   "cash", "card", "upi", "bank_transfer", "petty_cash", "credit",
 *   "zomato", "swiggy", "online", "mixed", "other"
 */
export function normalizePaymentMode(value: string | null | undefined): string {
  if (!value) return "other";
  return String(value).toLowerCase().trim().replace(/[\s\-]+/g, "_");
}

/** True when the (any-cased) value represents a petty-cash payment. */
export function isPettyCashMode(value: string | null | undefined): boolean {
  return normalizePaymentMode(value) === "petty_cash";
}
