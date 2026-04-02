import React, { useState } from 'react';
import { useListSales, useCreateSalesEntry, useListMenuItems } from '@workspace/api-client-react';
import { PageHeader, Button, Input, Label, Select, Modal, formatCurrency, formatDate, DateFilter, VerifyButton, apiVerify, apiUnverify } from '../components/ui-extras';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../lib/auth';

export default function Sales() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const isViewer = user?.role === 'viewer';
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const params = { ...(fromDate ? { fromDate } : {}), ...(toDate ? { toDate } : {}) };
  const { data: sales, isLoading } = useListSales(Object.keys(params).length ? params : undefined);
  const { data: menuItems } = useListMenuItems({ active: true });
  const createMut = useCreateSalesEntry();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [formData, setFormData] = useState({ salesDate: new Date().toISOString().split('T')[0], menuItemId: 0, quantity: 1, sellingPrice: 0, channel: 'DINE_IN' });
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: number; name: string } | null>(null);

  const handleItemSelect = (id: number) => {
    const item = menuItems?.find(m => m.id === id);
    setFormData({ ...formData, menuItemId: id, sellingPrice: item?.sellingPrice || 0 });
  };

  const openCreate = () => { setEditId(null); setFormData({ salesDate: new Date().toISOString().split('T')[0], menuItemId: 0, quantity: 1, sellingPrice: 0, channel: 'DINE_IN' }); setIsModalOpen(true); };
  const openEdit = (s: any) => { setEditId(s.id); setFormData({ salesDate: s.salesDate, menuItemId: s.menuItemId, quantity: Number(s.quantity), sellingPrice: Number(s.sellingPrice), channel: s.channel }); setIsModalOpen(true); };

  const handleSave = async () => {
    try {
      const base = import.meta.env.BASE_URL || '/';
      const token = localStorage.getItem('token');
      if (editId) {
        await fetch(`${base}api/sales/${editId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify(formData) });
      } else {
        await createMut.mutateAsync({ data: formData as any });
      }
      queryClient.invalidateQueries({ queryKey: ['/api/sales'] });
      setIsModalOpen(false);
    } catch(e) { console.error(e); }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      const base = import.meta.env.BASE_URL || '/';
      const token = localStorage.getItem('token');
      await fetch(`${base}api/sales/${deleteConfirm.id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
      queryClient.invalidateQueries({ queryKey: ['/api/sales'] });
      setDeleteConfirm(null);
    } catch(e) { console.error(e); }
  };

  const handleVerify = async (id: number) => { await apiVerify('sales', id); queryClient.invalidateQueries({ queryKey: ['/api/sales'] }); };
  const handleUnverify = async (id: number) => { await apiUnverify('sales', id); queryClient.invalidateQueries({ queryKey: ['/api/sales'] }); };

  return (
    <div className="space-y-6">
      <PageHeader title="Sales Entry" description="Log daily aggregated sales or individual receipts">
        {!isViewer && <Button onClick={openCreate}><Plus size={18}/> Log Sales</Button>}
      </PageHeader>

      <DateFilter fromDate={fromDate} toDate={toDate} onChange={(f, t) => { setFromDate(f); setToDate(t); }} />

      <div className="table-container">
        <table className="w-full text-sm text-left">
          <thead className="bg-muted text-muted-foreground border-b font-medium uppercase text-xs tracking-wider">
            <tr>
              <th className="px-6 py-4">Date</th>
              <th className="px-6 py-4">Item</th>
              <th className="px-6 py-4">Channel</th>
              <th className="px-6 py-4 text-right">Qty</th>
              <th className="px-6 py-4 text-right">Price</th>
              <th className="px-6 py-4 text-right">Total</th>
              <th className="px-6 py-4 text-center">Verified</th>
              {!isViewer && <th className="px-6 py-4 text-right">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              <tr><td colSpan={8} className="px-6 py-8 text-center text-muted-foreground">Loading sales...</td></tr>
            ) : sales?.length === 0 ? (
              <tr><td colSpan={8} className="px-6 py-8 text-center text-muted-foreground">No sales recorded.</td></tr>
            ) : sales?.map((s: any) => (
              <tr key={s.id} className="table-row-hover">
                <td className="px-6 py-4 text-muted-foreground">{formatDate(s.salesDate)}</td>
                <td className="px-6 py-4 font-medium text-foreground">{s.menuItemName}</td>
                <td className="px-6 py-4">{s.channel.replace('_', ' ')}</td>
                <td className="px-6 py-4 text-right">{Number(s.quantity).toFixed(2)}</td>
                <td className="px-6 py-4 text-right">{formatCurrency(s.sellingPrice)}</td>
                <td className="px-6 py-4 text-right font-medium text-emerald-600">{formatCurrency(s.totalAmount)}</td>
                <td className="px-6 py-4 text-center"><VerifyButton verified={!!s.verified} isAdmin={isAdmin} onVerify={() => handleVerify(s.id)} onUnverify={() => handleUnverify(s.id)} /></td>
                {!isViewer && (
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => openEdit(s)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="Edit"><Pencil size={14}/></button>
                      {isAdmin && <button onClick={() => setDeleteConfirm({ id: s.id, name: s.menuItemName })} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 text-muted-foreground hover:text-red-600 transition-colors" title="Delete"><Trash2 size={14}/></button>}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editId ? "Edit Sales Entry" : "Log Sales Entry"}
        footer={<><Button variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button><Button onClick={handleSave} disabled={createMut.isPending || !formData.menuItemId}>{editId ? 'Update' : 'Save Entry'}</Button></>}>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Date</Label><Input type="date" value={formData.salesDate} onChange={(e:any) => setFormData({...formData, salesDate: e.target.value})} /></div>
            <div><Label>Sales Channel</Label><Select value={formData.channel} onChange={(e:any) => setFormData({...formData, channel: e.target.value})}><option value="DINE_IN">Dine In</option><option value="TAKEAWAY">Takeaway</option><option value="DELIVERY">Delivery</option></Select></div>
          </div>
          <div><Label>Menu Item</Label><Select value={formData.menuItemId} onChange={(e:any) => handleItemSelect(Number(e.target.value))}><option value={0}>Select Item...</option>{menuItems?.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</Select></div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Quantity Sold</Label><Input type="number" value={formData.quantity} onChange={(e:any) => setFormData({...formData, quantity: Number(e.target.value)})} /></div>
            <div><Label>Effective Price</Label><Input type="number" step="0.01" value={formData.sellingPrice} onChange={(e:any) => setFormData({...formData, sellingPrice: Number(e.target.value)})} /></div>
          </div>
          <div className="p-4 mt-4 bg-primary/10 rounded-xl border border-primary/20 flex justify-between items-center">
            <span className="font-semibold text-primary">Entry Total:</span>
            <span className="text-xl font-display font-bold text-primary">{formatCurrency(formData.quantity * formData.sellingPrice)}</span>
          </div>
        </div>
      </Modal>

      <Modal isOpen={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Delete Sales Entry"
        footer={<><Button variant="ghost" onClick={() => setDeleteConfirm(null)}>Cancel</Button><Button variant="danger" onClick={handleDelete}>Delete</Button></>}>
        <p className="py-2 text-sm text-muted-foreground">Are you sure you want to delete the sales entry for <span className="font-semibold text-foreground">{deleteConfirm?.name}</span>?</p>
      </Modal>
    </div>
  );
}
