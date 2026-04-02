import React, { useState } from 'react';
import { useListVendors, useCreateVendor } from '@workspace/api-client-react';
import { PageHeader, Button, Input, Label, Modal, Badge } from '../components/ui-extras';
import { Plus, Phone, Mail, Pencil, Trash2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../lib/auth';

const emptyForm = { name: '', contactPerson: '', mobile: '', email: '', active: true };

export default function Vendors() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const isViewer = user?.role === 'viewer';
  const { data: vendors, isLoading } = useListVendors();
  const createMut = useCreateVendor();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [formData, setFormData] = useState(emptyForm);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: number; name: string } | null>(null);

  const openCreate = () => { setEditId(null); setFormData(emptyForm); setIsModalOpen(true); };
  const openEdit = (v: any) => {
    setEditId(v.id);
    setFormData({ name: v.name, contactPerson: v.contactPerson || '', mobile: v.mobile || '', email: v.email || '', active: v.active ?? true });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    try {
      const base = import.meta.env.BASE_URL || '/';
      const token = localStorage.getItem('token');
      if (editId) {
        await fetch(`${base}api/vendors/${editId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify(formData) });
      } else {
        await createMut.mutateAsync({ data: formData as any });
      }
      queryClient.invalidateQueries({ queryKey: ['/api/vendors'] });
      setIsModalOpen(false);
    } catch(e) { console.error(e); }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      const base = import.meta.env.BASE_URL || '/';
      const token = localStorage.getItem('token');
      await fetch(`${base}api/vendors/${deleteConfirm.id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
      queryClient.invalidateQueries({ queryKey: ['/api/vendors'] });
      setDeleteConfirm(null);
    } catch(e) { console.error(e); }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Vendors" description="Manage your suppliers and distributors">
        {!isViewer && <Button onClick={openCreate}><Plus size={18}/> Add Vendor</Button>}
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? <p className="text-muted-foreground">Loading...</p> : vendors?.map(v => (
          <div key={v.id} className="bg-card border border-border rounded-2xl p-6 hover:shadow-lg transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-display font-bold text-lg text-foreground">{v.name}</h3>
                <p className="text-xs text-muted-foreground font-mono mt-1">{v.code}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={v.active ? "success" : "neutral"}>{v.active ? 'Active' : 'Inactive'}</Badge>
                {!isViewer && (
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(v)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="Edit"><Pencil size={14}/></button>
                    {isAdmin && <button onClick={() => setDeleteConfirm({ id: v.id, name: v.name })} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 text-muted-foreground hover:text-red-600 transition-colors" title="Delete"><Trash2 size={14}/></button>}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2 mt-6">
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <span className="font-semibold">{v.contactPerson?.charAt(0) || 'C'}</span>
                </div>
                <span className="font-medium text-foreground">{v.contactPerson || 'No Contact Person'}</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground ml-11">
                <Phone size={14} /> {v.mobile || 'No phone'}
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground ml-11">
                <Mail size={14} /> {v.email || 'No email'}
              </div>
            </div>
          </div>
        ))}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editId ? "Edit Vendor" : "Add Vendor"}
        footer={<><Button variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button><Button onClick={handleSave} disabled={createMut.isPending}>{editId ? 'Update' : 'Save'}</Button></>}>
        <div className="space-y-4 py-2">
          <div><Label>Company Name</Label><Input value={formData.name} onChange={(e:any) => setFormData({...formData, name: e.target.value})} /></div>
          <div><Label>Contact Person</Label><Input value={formData.contactPerson} onChange={(e:any) => setFormData({...formData, contactPerson: e.target.value})} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Mobile</Label><Input value={formData.mobile} onChange={(e:any) => setFormData({...formData, mobile: e.target.value})} /></div>
            <div><Label>Email</Label><Input type="email" value={formData.email} onChange={(e:any) => setFormData({...formData, email: e.target.value})} /></div>
          </div>
        </div>
      </Modal>

      <Modal isOpen={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Delete Vendor"
        footer={<><Button variant="ghost" onClick={() => setDeleteConfirm(null)}>Cancel</Button><Button variant="danger" onClick={handleDelete}>Delete</Button></>}>
        <p className="py-2 text-sm text-muted-foreground">Are you sure you want to delete <span className="font-semibold text-foreground">{deleteConfirm?.name}</span>? This cannot be undone.</p>
      </Modal>
    </div>
  );
}
