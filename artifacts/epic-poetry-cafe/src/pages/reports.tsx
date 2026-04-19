import React, { useEffect, useMemo, useState } from 'react';
import { PageHeader, Button, Input, Label, Select, formatCurrency } from '../components/ui-extras';
import { Download, FileBarChart, FileSpreadsheet, FileText, Loader2, Play, Search, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const BASE = import.meta.env.BASE_URL || '/';

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function apiFetchJson<T = any>(path: string): Promise<T> {
  const res = await fetch(`${BASE}api/${path}`, { headers: authHeaders() });
  if (!res.ok) throw new Error(await res.text() || `Request failed (${res.status})`);
  return res.json();
}

async function downloadReport(key: string, from: string, to: string, format: 'xlsx' | 'pdf') {
  const params = new URLSearchParams({ from, to, format });
  const res = await fetch(`${BASE}api/reports/run/${encodeURIComponent(key)}?${params.toString()}`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(await res.text() || `Download failed (${res.status})`);
  const blob = await res.blob();
  const ext = format === 'xlsx' ? 'xlsx' : 'pdf';
  const filename = `${key}_${from}_${to}.${ext}`;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

type RegistryItem = { key: string; title: string; category: string; adminOnly?: boolean };

type ColType = 'text' | 'number' | 'currency' | 'date' | 'percent';
type ReportColumn = { key: string; label: string; type?: ColType; width?: number };
type ReportResult = {
  title: string;
  subtitle?: string;
  columns: ReportColumn[];
  rows: Record<string, unknown>[];
  summary?: { label: string; value: string | number }[];
  period?: { from: string; to: string; label: string };
};

function todayISO(): string { return new Date().toISOString().split('T')[0]; }
function daysAgo(n: number): string {
  const d = new Date(); d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().split('T')[0];
}

function fmtCell(v: unknown, type?: ColType): string {
  if (v === null || v === undefined || v === '') return '—';
  if (type === 'currency') return formatCurrency(Number(v));
  if (type === 'percent') return `${Number(v).toFixed(2)}%`;
  if (type === 'number') return Number(v).toLocaleString('en-IN');
  return String(v);
}

const CATEGORY_ORDER = ['Sales', 'Purchase', 'Inventory', 'Recipe', 'Expense', 'HR', 'Financial', 'Operational'];

export default function Reports() {
  const { toast } = useToast();
  const [registry, setRegistry] = useState<RegistryItem[] | null>(null);
  const [registryError, setRegistryError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [from, setFrom] = useState<string>(daysAgo(30));
  const [to, setTo] = useState<string>(todayISO());
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<ReportResult | null>(null);
  const [runError, setRunError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<'xlsx' | 'pdf' | null>(null);

  useEffect(() => {
    let cancelled = false;
    apiFetchJson<RegistryItem[]>('reports/registry')
      .then((list) => {
        if (cancelled) return;
        setRegistry(list);
        if (list.length > 0) setSelectedKey(list[0].key);
      })
      .catch((err) => {
        if (cancelled) return;
        setRegistryError(err?.message ?? 'Could not load report list');
      });
    return () => { cancelled = true; };
  }, []);

  const grouped = useMemo(() => {
    if (!registry) return new Map<string, RegistryItem[]>();
    const filtered = registry.filter((r) => {
      if (activeCategory !== 'All' && r.category !== activeCategory) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        return r.title.toLowerCase().includes(q) || r.key.toLowerCase().includes(q);
      }
      return true;
    });
    const map = new Map<string, RegistryItem[]>();
    for (const r of filtered) {
      const arr = map.get(r.category) ?? [];
      arr.push(r);
      map.set(r.category, arr);
    }
    return map;
  }, [registry, search, activeCategory]);

  const allCategories = useMemo(() => {
    if (!registry) return [];
    const set = new Set<string>();
    registry.forEach((r) => set.add(r.category));
    const arr = Array.from(set);
    arr.sort((a, b) => {
      const ai = CATEGORY_ORDER.indexOf(a); const bi = CATEGORY_ORDER.indexOf(b);
      if (ai === -1 && bi === -1) return a.localeCompare(b);
      if (ai === -1) return 1; if (bi === -1) return -1;
      return ai - bi;
    });
    return arr;
  }, [registry]);

  const selected = useMemo(
    () => registry?.find((r) => r.key === selectedKey) ?? null,
    [registry, selectedKey],
  );

  const handleRun = async () => {
    if (!selected) return;
    setRunning(true); setRunError(null); setResult(null);
    try {
      const params = new URLSearchParams({ from, to, format: 'json' });
      const data = await apiFetchJson<ReportResult>(
        `reports/run/${encodeURIComponent(selected.key)}?${params.toString()}`,
      );
      setResult(data);
    } catch (err: any) {
      setRunError(err?.message ?? 'Could not run report');
      toast({ title: 'Report failed', description: err?.message ?? 'Try a different date range', variant: 'destructive' });
    } finally {
      setRunning(false);
    }
  };

  const handleDownload = async (format: 'xlsx' | 'pdf') => {
    if (!selected) return;
    setDownloading(format);
    try {
      await downloadReport(selected.key, from, to, format);
    } catch (err: any) {
      toast({ title: 'Download failed', description: err?.message ?? 'Please try again', variant: 'destructive' });
    } finally {
      setDownloading(null);
    }
  };

  const setQuickRange = (preset: 'today' | '7d' | '30d' | 'mtd' | '90d') => {
    const today = todayISO();
    if (preset === 'today') { setFrom(today); setTo(today); return; }
    if (preset === '7d') { setFrom(daysAgo(6)); setTo(today); return; }
    if (preset === '30d') { setFrom(daysAgo(29)); setTo(today); return; }
    if (preset === '90d') { setFrom(daysAgo(89)); setTo(today); return; }
    if (preset === 'mtd') {
      const d = new Date();
      const first = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-01`;
      setFrom(first); setTo(today);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description="49 ready-to-run operational, financial, and audit reports — preview on screen or export to Excel / PDF."
      />

      <div className="grid grid-cols-1 lg:grid-cols-[320px,1fr] gap-6">
        {/* LEFT: Report picker */}
        <div className="bg-card border border-border rounded-2xl shadow-sm p-4 space-y-3 self-start lg:sticky lg:top-4 max-h-[calc(100vh-2rem)] overflow-y-auto">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search reports…"
              value={search}
              onChange={(e: any) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="flex flex-wrap gap-1.5">
            <CategoryPill label="All" active={activeCategory === 'All'} onClick={() => setActiveCategory('All')} />
            {allCategories.map((c) => (
              <CategoryPill key={c} label={c} active={activeCategory === c} onClick={() => setActiveCategory(c)} />
            ))}
          </div>

          {registryError ? (
            <div className="flex items-start gap-2 text-sm text-destructive p-3 bg-destructive/10 rounded-lg">
              <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
              <span>{registryError}</span>
            </div>
          ) : !registry ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-6 justify-center">
              <Loader2 size={14} className="animate-spin" /> Loading reports…
            </div>
          ) : grouped.size === 0 ? (
            <div className="text-sm text-muted-foreground py-6 text-center">
              No reports match your search.
            </div>
          ) : (
            <div className="space-y-3">
              {Array.from(grouped.entries())
                .sort(([a], [b]) => {
                  const ai = CATEGORY_ORDER.indexOf(a); const bi = CATEGORY_ORDER.indexOf(b);
                  if (ai === -1 && bi === -1) return a.localeCompare(b);
                  if (ai === -1) return 1; if (bi === -1) return -1;
                  return ai - bi;
                })
                .map(([category, items]) => (
                  <div key={category}>
                    <div className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground px-2 mb-1">
                      {category} <span className="opacity-60">· {items.length}</span>
                    </div>
                    <div className="space-y-0.5">
                      {items.map((r) => {
                        const active = r.key === selectedKey;
                        return (
                          <button
                            key={r.key}
                            type="button"
                            onClick={() => { setSelectedKey(r.key); setResult(null); setRunError(null); }}
                            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition flex items-start gap-2 ${
                              active
                                ? 'bg-primary text-primary-foreground font-semibold shadow-sm'
                                : 'hover:bg-muted text-foreground'
                            }`}
                          >
                            <FileBarChart
                              size={14}
                              className={`mt-0.5 flex-shrink-0 ${active ? '' : 'text-muted-foreground'}`}
                            />
                            <span className="flex-1 leading-snug">{r.title}</span>
                            {r.adminOnly ? (
                              <span className={`text-[10px] uppercase tracking-wider font-semibold flex-shrink-0 mt-0.5 ${
                                active ? 'opacity-80' : 'text-muted-foreground'
                              }`}>
                                Admin
                              </span>
                            ) : null}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* RIGHT: Run + result */}
        <div className="space-y-6 min-w-0">
          <div className="bg-card border border-border rounded-2xl shadow-sm p-6 space-y-5">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center flex-shrink-0">
                <FileBarChart size={22} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                  {selected?.category ?? 'Select a report'}
                </div>
                <h2 className="text-xl md:text-2xl font-display font-bold text-foreground truncate">
                  {selected?.title ?? 'No report selected'}
                </h2>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>From date</Label>
                <Input type="date" value={from} max={to} onChange={(e: any) => setFrom(e.target.value)} />
              </div>
              <div>
                <Label>To date</Label>
                <Input type="date" value={to} min={from} max={todayISO()} onChange={(e: any) => setTo(e.target.value)} />
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <QuickRange label="Today" onClick={() => setQuickRange('today')} />
              <QuickRange label="Last 7 days" onClick={() => setQuickRange('7d')} />
              <QuickRange label="Last 30 days" onClick={() => setQuickRange('30d')} />
              <QuickRange label="Month to date" onClick={() => setQuickRange('mtd')} />
              <QuickRange label="Last 90 days" onClick={() => setQuickRange('90d')} />
            </div>

            <div className="flex flex-wrap gap-3 pt-2 border-t border-border">
              <Button onClick={handleRun} disabled={!selected || running} className="h-11 px-5">
                {running ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
                {running ? 'Running…' : 'Run report'}
              </Button>
              <Button
                onClick={() => handleDownload('xlsx')}
                disabled={!selected || downloading !== null}
                variant="outline"
                className="h-11 px-5"
              >
                {downloading === 'xlsx' ? <Loader2 size={16} className="animate-spin" /> : <FileSpreadsheet size={16} />}
                Excel
              </Button>
              <Button
                onClick={() => handleDownload('pdf')}
                disabled={!selected || downloading !== null}
                variant="outline"
                className="h-11 px-5"
              >
                {downloading === 'pdf' ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
                PDF
              </Button>
            </div>
          </div>

          {runError ? (
            <div className="bg-destructive/10 border border-destructive/30 rounded-2xl p-4 flex items-start gap-3 text-sm text-destructive">
              <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold mb-0.5">Couldn't run this report</div>
                <div className="opacity-90">{runError}</div>
              </div>
            </div>
          ) : null}

          {result ? <ReportPreview result={result} /> : null}

          {!result && !runError && !running ? (
            <div className="bg-muted/30 border border-dashed border-border rounded-2xl p-10 text-center">
              <FileBarChart className="mx-auto text-muted-foreground mb-3" size={36} />
              <div className="font-semibold text-foreground mb-1">
                Pick a report and hit "Run"
              </div>
              <div className="text-sm text-muted-foreground">
                You can preview the data here, then download it as Excel or PDF for sharing.
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function CategoryPill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-2.5 py-1 rounded-full text-xs font-semibold transition ${
        active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/70'
      }`}
    >
      {label}
    </button>
  );
}

function QuickRange({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-xs px-3 py-1.5 rounded-lg border border-border bg-background hover:bg-muted text-foreground transition"
    >
      {label}
    </button>
  );
}

function ReportPreview({ result }: { result: ReportResult }) {
  const rowCount = result.rows.length;
  const showRows = result.rows.slice(0, 200);
  const truncated = rowCount > showRows.length;
  return (
    <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-border flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="font-display font-bold text-foreground">{result.title}</div>
          {result.period?.label ? (
            <div className="text-xs text-muted-foreground mt-0.5">{result.period.label}</div>
          ) : null}
          {result.subtitle ? (
            <div className="text-xs text-muted-foreground mt-0.5">{result.subtitle}</div>
          ) : null}
        </div>
        <div className="text-xs text-muted-foreground">
          {rowCount.toLocaleString('en-IN')} {rowCount === 1 ? 'row' : 'rows'}
          {truncated ? ` · showing first ${showRows.length}` : ''}
        </div>
      </div>

      {result.summary && result.summary.length > 0 ? (
        <div className="px-5 py-4 border-b border-border bg-muted/20 flex flex-wrap gap-x-8 gap-y-3">
          {result.summary.map((s, i) => (
            <div key={i}>
              <div className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">
                {s.label}
              </div>
              <div className="font-display font-bold text-foreground text-lg">
                {typeof s.value === 'number' ? s.value.toLocaleString('en-IN') : s.value}
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {rowCount === 0 ? (
        <div className="p-10 text-center text-sm text-muted-foreground">
          No rows for this period. Try a different date range.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-foreground">
              <tr>
                {result.columns.map((c) => (
                  <th
                    key={c.key}
                    className={`px-3 py-2.5 font-semibold text-xs uppercase tracking-wider whitespace-nowrap ${
                      c.type === 'number' || c.type === 'currency' || c.type === 'percent'
                        ? 'text-right'
                        : 'text-left'
                    }`}
                  >
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {showRows.map((row, i) => (
                <tr key={i} className="border-t border-border hover:bg-muted/20">
                  {result.columns.map((c) => (
                    <td
                      key={c.key}
                      className={`px-3 py-2 whitespace-nowrap ${
                        c.type === 'number' || c.type === 'currency' || c.type === 'percent'
                          ? 'text-right tabular-nums'
                          : 'text-left'
                      }`}
                    >
                      {fmtCell(row[c.key], c.type)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {truncated ? (
        <div className="px-5 py-3 border-t border-border bg-muted/20 text-xs text-muted-foreground flex items-center gap-2">
          <Download size={12} /> Showing first {showRows.length} rows on screen — download Excel or PDF for the full {rowCount.toLocaleString('en-IN')} rows.
        </div>
      ) : null}
    </div>
  );
}
