import React, { useState, useMemo } from 'react';
import { useGetStockOverview, useSaveStockSnapshot, useListCategories } from '@workspace/api-client-react';
import { PageHeader, Button, Input, Label, Select, Modal, formatCurrency, Badge } from '../components/ui-extras';
import { PackageSearch, AlertCircle, Save, Search } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

export default function Inventory() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: stock, isLoading } = useGetStockOverview();
  const { data: categories } = useListCategories({ type: 'ingredient' });
  const saveMut = useSaveStockSnapshot();
  
  const [isSnapshotOpen, setIsSnapshotOpen] = useState(false);
  const [snapshotDate, setSnapshotDate] = useState(new Date().toISOString().split('T')[0]);
  const [snapshotLines, setSnapshotLines] = useState<Record<number, number>>({});
  const [search, setSearch] = useState('');
  const [filterCategoryId, setFilterCategoryId] = useState<number | 'all' | 'low'>('all');
  const [sortBy, setSortBy] = useState<'name-asc' | 'name-desc' | 'stock-asc' | 'stock-desc' | 'category' | 'status'>('name-asc');

  const filteredStock = useMemo(() => {
    if (!stock) return [];
    const q = search.trim().toLowerCase();
    let rows = (stock as any[]).filter((s: any) => {
      if (filterCategoryId === 'low') {
        if (!s.lowStock) return false;
      } else if (filterCategoryId !== 'all') {
        if ((s.categoryId ?? null) !== filterCategoryId) return false;
      }
      if (!q) return true;
      return s.ingredientName?.toLowerCase().includes(q);
    });
    rows = [...rows].sort((a: any, b: any) => {
      switch (sortBy) {
        case 'name-asc': return (a.ingredientName || '').localeCompare(b.ingredientName || '');
        case 'name-desc': return (b.ingredientName || '').localeCompare(a.ingredientName || '');
        case 'stock-asc': return (a.currentStock || 0) - (b.currentStock || 0);
        case 'stock-desc': return (b.currentStock || 0) - (a.currentStock || 0);
        case 'category': return (a.categoryName || 'zzzz').localeCompare(b.categoryName || 'zzzz') || (a.ingredientName || '').localeCompare(b.ingredientName || '');
        case 'status': return Number(!!b.lowStock) - Number(!!a.lowStock) || (a.ingredientName || '').localeCompare(b.ingredientName || '');
        default: return 0;
      }
    });
    return rows;
  }, [stock, search, filterCategoryId, sortBy]);

  const openSnapshot = () => {
    const initial: Record<number, number> = {};
    stock?.forEach(s => { initial[s.ingredientId] = s.currentStock; });
    setSnapshotLines(initial);
    setIsSnapshotOpen(true);
  };

  const handleSaveSnapshot = async () => {
    try {
      const items = Object.entries(snapshotLines).map(([id, qty]) => ({
        ingredientId: Number(id),
        closingQty: qty
      }));
      await saveMut.mutateAsync({ data: { snapshotDate, items } });
      queryClient.invalidateQueries({ queryKey: ['/api/inventory/stock-overview'] });
      setIsSnapshotOpen(false);
      toast({ title: 'Stock snapshot saved' });
    } catch(e: any) { toast({ title: 'Failed to save snapshot', description: e.message, variant: 'destructive' }); }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Inventory Overview" description="Real-time theoretical stock levels based on purchases and sales">
        <Button onClick={openSnapshot}><PackageSearch size={18}/> End of Day Count</Button>
      </PageHeader>

      <div className="flex flex-wrap items-end gap-3" data-testid="inventory-filters">
        <div className="flex-1 min-w-[220px]">
          <Label>Search</Label>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              data-testid="input-search-inventory"
              className="pl-9"
              placeholder="Search ingredient..."
              value={search}
              onChange={(e: any) => setSearch(e.target.value)}
            />
          </div>
        </div>
        <div className="w-56">
          <Label>Category</Label>
          <Select
            data-testid="select-filter-category"
            value={String(filterCategoryId)}
            onChange={(e: any) => {
              const v = e.target.value;
              setFilterCategoryId(v === 'all' || v === 'low' ? v : Number(v));
            }}
          >
            <option value="all">All categories</option>
            <option value="low">Low stock only</option>
            {categories?.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </div>
        <div className="w-56">
          <Label>Sort by</Label>
          <Select
            data-testid="select-sort-by"
            value={sortBy}
            onChange={(e: any) => setSortBy(e.target.value as any)}
          >
            <option value="name-asc">Name (A &rarr; Z)</option>
            <option value="name-desc">Name (Z &rarr; A)</option>
            <option value="stock-asc">Stock (low &rarr; high)</option>
            <option value="stock-desc">Stock (high &rarr; low)</option>
            <option value="category">Category</option>
            <option value="status">Status (low stock first)</option>
          </Select>
        </div>
      </div>

      <div className="table-container">
        <table className="w-full text-sm text-left">
          <thead className="bg-muted text-muted-foreground border-b font-medium uppercase text-xs tracking-wider">
            <tr>
              <th className="px-6 py-4">Ingredient</th>
              <th className="px-6 py-4">Category</th>
              <th className="px-6 py-4 text-right">Current Stock</th>
              <th className="px-6 py-4">UOM</th>
              <th className="px-6 py-4 text-right">Reorder Lvl</th>
              <th className="px-6 py-4 text-center">Status</th>
              <th className="px-6 py-4 text-right">Stock Value</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border" data-testid="inventory-table-body">
            {isLoading ? (
              <tr><td colSpan={7} className="px-6 py-8 text-center text-muted-foreground">Loading stock...</td></tr>
            ) : filteredStock.length === 0 ? (
               <tr><td colSpan={7} className="px-6 py-8 text-center text-muted-foreground">No ingredients match your filters.</td></tr>
            ) : filteredStock.map((s: any) => (
              <tr key={s.ingredientId} className="table-row-hover">
                <td className="px-6 py-4 font-medium text-foreground">{s.ingredientName}</td>
                <td className="px-6 py-4 text-muted-foreground">{s.categoryName || '-'}</td>
                <td className="px-6 py-4 text-right font-display font-semibold text-base">{s.currentStock.toFixed(2)}</td>
                <td className="px-6 py-4 text-muted-foreground">{s.stockUom}</td>
                <td className="px-6 py-4 text-right text-muted-foreground">{s.reorderLevel}</td>
                <td className="px-6 py-4 text-center">
                  {s.lowStock ? (
                    <Badge variant="danger" className="gap-1"><AlertCircle size={12}/> Low Stock</Badge>
                  ) : (
                    <Badge variant="success">Optimal</Badge>
                  )}
                </td>
                <td className="px-6 py-4 text-right text-muted-foreground">{formatCurrency(s.stockValue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal isOpen={isSnapshotOpen} onClose={() => setIsSnapshotOpen(false)} title="End of Day Physical Count" maxWidth="max-w-2xl"
        footer={<><Button variant="ghost" onClick={() => setIsSnapshotOpen(false)}>Cancel</Button><Button onClick={handleSaveSnapshot} disabled={saveMut.isPending}><Save size={16}/> Save Count</Button></>}>
        <div className="space-y-6 py-2">
          <div className="bg-transparent p-4 rounded-xl border border-border flex items-center justify-between">
            <div>
              <h4 className="font-semibold text-foreground">Snapshot Date</h4>
              <p className="text-xs text-muted-foreground">Record the actual physical stock to adjust theoretical values.</p>
            </div>
            <Input type="date" max={new Date().toISOString().split('T')[0]} className="w-auto" value={snapshotDate} onChange={(e:any) => setSnapshotDate(e.target.value)} />
          </div>

          <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
            {stock?.map(s => (
              <div key={s.ingredientId} className="flex items-center justify-between p-3 border border-border/50 rounded-xl bg-card">
                <div className="flex-1">
                  <p className="font-medium text-foreground">{s.ingredientName}</p>
                  <p className="text-xs text-muted-foreground">Theoretical: {s.currentStock.toFixed(2)} {s.stockUom}</p>
                </div>
                <div className="flex items-center gap-3">
                  <Input 
                    type="number" 
                    step="0.01"
                    className="w-32 text-right"
                    value={snapshotLines[s.ingredientId] ?? ''} 
                    onChange={(e:any) => setSnapshotLines({...snapshotLines, [s.ingredientId]: Number(e.target.value)})}
                  />
                  <span className="text-sm text-muted-foreground w-8">{s.stockUom}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Modal>
    </div>
  );
}
