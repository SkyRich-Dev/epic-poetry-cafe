import React, { useState } from 'react';
import { useListVendors, useCreateVendor } from '@workspace/api-client-react';
import { PageHeader, Button, Input, Label, Modal, Badge } from '../components/ui-extras';
import { Plus, Phone, Mail } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

export default function Vendors() {
  const queryClient = useQueryClient();
  const { data: vendors, isLoading } = useListVendors();
  const createMut = useCreateVendor();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', contactPerson: '', mobile: '', email: '', active: true });

  const handleSave = async () => {
    try {
      await createMut.mutateAsync({ data: formData as any });
      queryClient.invalidateQueries({ queryKey: ['/api/vendors'] });
      setIsModalOpen(false);
    } catch(e) { console.error(e); }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Vendors" description="Manage your suppliers and distributors">
        <Button onClick={() => setIsModalOpen(true)}><Plus size={18}/> Add Vendor</Button>
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? <p className="text-muted-foreground">Loading...</p> : vendors?.map(v => (
          <div key={v.id} className="bg-card border border-border rounded-2xl p-6 hover:shadow-lg transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-display font-bold text-lg text-foreground">{v.name}</h3>
                <p className="text-xs text-muted-foreground font-mono mt-1">{v.code}</p>
              </div>
              <Badge variant={v.active ? "success" : "neutral"}>{v.active ? 'Active' : 'Inactive'}</Badge>
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

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add Vendor"
        footer={<><Button variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button><Button onClick={handleSave} disabled={createMut.isPending}>Save</Button></>}>
        <div className="space-y-4 py-2">
          <div><Label>Company Name</Label><Input value={formData.name} onChange={(e:any) => setFormData({...formData, name: e.target.value})} /></div>
          <div><Label>Contact Person</Label><Input value={formData.contactPerson} onChange={(e:any) => setFormData({...formData, contactPerson: e.target.value})} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Mobile</Label><Input value={formData.mobile} onChange={(e:any) => setFormData({...formData, mobile: e.target.value})} /></div>
            <div><Label>Email</Label><Input type="email" value={formData.email} onChange={(e:any) => setFormData({...formData, email: e.target.value})} /></div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
