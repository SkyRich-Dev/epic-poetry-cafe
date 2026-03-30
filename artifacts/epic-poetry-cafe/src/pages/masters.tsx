import React, { useState } from 'react';
import { useListCategories, useCreateCategory, useListUom, useGetConfig } from '@workspace/api-client-react';
import { PageHeader, Button, Input, Label, Modal, Badge } from '../components/ui-extras';
import { Settings, Plus } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

export default function Masters() {
  const queryClient = useQueryClient();
  const { data: categories } = useListCategories();
  const { data: uoms } = useListUom();
  const { data: config } = useGetConfig();
  const createCatMut = useCreateCategory();
  
  const [catModal, setCatModal] = useState(false);
  const [catForm, setCatForm] = useState({ name: '', type: 'ingredient', active: true });

  const handleSaveCat = async () => {
    try {
      await createCatMut.mutateAsync({ data: catForm as any });
      queryClient.invalidateQueries({ queryKey: ['/api/categories'] });
      setCatModal(false);
    } catch(e) {}
  }

  return (
    <div className="space-y-8">
      <PageHeader title="Masters & Configuration" description="Manage system classifications and global settings" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Categories */}
        <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden flex flex-col">
          <div className="p-6 border-b border-border flex justify-between items-center bg-muted/20">
            <h3 className="font-display font-semibold text-lg">Categories</h3>
            <Button size="sm" variant="outline" onClick={() => setCatModal(true)}><Plus size={14}/> Add</Button>
          </div>
          <div className="p-0 flex-1 max-h-[400px] overflow-y-auto">
            <table className="w-full text-sm text-left">
              <tbody className="divide-y divide-border">
                {categories?.map(c => (
                  <tr key={c.id} className="hover:bg-muted/40 transition-colors">
                    <td className="px-6 py-3 font-medium">{c.name}</td>
                    <td className="px-6 py-3 text-right"><Badge variant="neutral">{c.type}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* System Config */}
        <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
          <div className="p-6 border-b border-border flex items-center gap-3 bg-muted/20">
            <Settings className="text-primary" size={20}/>
            <h3 className="font-display font-semibold text-lg">System Configuration</h3>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex justify-between py-2 border-b border-border/50">
              <span className="text-muted-foreground">Currency</span>
              <span className="font-medium">{config?.currency || 'USD'}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-border/50">
              <span className="text-muted-foreground">Costing Method</span>
              <span className="font-medium">{config?.costingMethod || 'Weighted Average'}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-border/50">
              <span className="text-muted-foreground">EOD Close Time</span>
              <span className="font-medium">{config?.businessDayCloseTime || '23:59:59'}</span>
            </div>
            <div className="mt-6 pt-4 text-center">
               <Button variant="outline" className="w-full">Edit Configuration</Button>
            </div>
          </div>
        </div>
      </div>

      <Modal isOpen={catModal} onClose={() => setCatModal(false)} title="Add Category"
        footer={<><Button variant="ghost" onClick={() => setCatModal(false)}>Cancel</Button><Button onClick={handleSaveCat}>Save</Button></>}>
        <div className="space-y-4 py-2">
          <div><Label>Name</Label><Input value={catForm.name} onChange={(e:any) => setCatForm({...catForm, name: e.target.value})} /></div>
          <div>
            <Label>Type</Label>
            <select className="flex h-11 w-full rounded-xl border border-input bg-background px-4 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" value={catForm.type} onChange={(e:any) => setCatForm({...catForm, type: e.target.value})}>
              <option value="ingredient">Ingredient</option>
              <option value="menu">Menu Item</option>
              <option value="expense">Expense</option>
            </select>
          </div>
        </div>
      </Modal>
    </div>
  );
}
