export function getTodayISO(): string {
  return new Date().toISOString().split("T")[0];
}

export function isFutureDate(dateStr: string): boolean {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  return dateStr > getTodayISO();
}

export function validateNotFutureDate(dateStr: string, fieldName = "Date"): string | null {
  if (isFutureDate(dateStr)) {
    return `${fieldName} cannot be in the future. Today is ${getTodayISO()}.`;
  }
  return null;
}

export function isValidIsoDate(dateStr: string): boolean {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const [y, m, d] = dateStr.split("-").map(Number);
  if (m < 1 || m > 12 || d < 1 || d > 31) return false;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}
