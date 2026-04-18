export function formatCurrency(value: number | string | null | undefined): string {
  const n = typeof value === "string" ? Number(value) : value ?? 0;
  if (!Number.isFinite(n)) return "₹0";
  const abs = Math.abs(n);
  let str: string;
  if (abs >= 10_00_00_000) str = `${(n / 1_00_00_000).toFixed(2)}Cr`;
  else if (abs >= 1_00_000) str = `${(n / 1_00_000).toFixed(2)}L`;
  else if (abs >= 1000) str = `${(n / 1000).toFixed(1)}K`;
  else str = String(Math.round(n));
  return `₹${str}`;
}

export function formatCurrencyExact(value: number | string | null | undefined): string {
  const n = typeof value === "string" ? Number(value) : value ?? 0;
  if (!Number.isFinite(n)) return "₹0";
  return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

export function formatNumber(value: number | string | null | undefined): string {
  const n = typeof value === "string" ? Number(value) : value ?? 0;
  if (!Number.isFinite(n)) return "0";
  return n.toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatTime(value: string | Date | null | undefined): string {
  if (!value) return "";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatRelative(value: string | Date | null | undefined): string {
  if (!value) return "";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "";
  const diff = Date.now() - d.getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(d);
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function daysAgoISO(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}
