import React, { useState } from 'react';
import { useListIngredients, useCreateIngredient, useUpdateIngredient, useListCategories } from '@workspace/api-client-react';
import { PageHeader, Button, Input, Label, Select, Modal, Badge, formatCurrency } from '../components/ui-extras';
import { Plus, Edit } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

export default function Ingredients() {
  const queryClient = useQueryClient();
  const { data: ingredients, isLoading } = useListIngredients();
  const { data: categories } = useListCategories({ type: 'ingredient' });
  const createMut = useCreateIngredient();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ 
    name: '', categoryId: 0, stockUom: 'g', purchaseUom: 'kg', recipeUom: 'g',
    conversionFactor: 1000, currentCost: 0, reorderLevel: 0, active: true
  });

  const openCreate = () => {
    setFormData({ name: '', categoryId: categories?.[0]?.id || 0, stockUom: 'g', purchaseUom: 'kg', recipeUom: 'g', conversionFactor: 1000, currentCost: 0, reorderLevel: 0, active: true });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    try {
      await createMut.mutateAsync({ data: formData as any });
      queryClient.invalidateQueries({ queryKey: ['/api/ingredients'] });
      setIsModalOpen(false);
    } catch(e) { console.error(e); }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Ingredients Master" description="Manage raw materials and their measurement units">
        <Button onClick={openCreate}><Plus size={18}/> Add Ingredient</Button>
      </PageHeader>

      <div className="table-container">
        <table className="w-full text-sm text-left">
          <thead className="bg-muted text-muted-foreground border-b font-medium uppercase text-xs tracking-wider">
            <tr>
              <th className="px-6 py-4">Code</th>
              <th className="px-6 py-4">Name</th>
              <th className="px-6 py-4">Category</th>
              <th className="px-6 py-4">Base UOM</th>
              <th className="px-6 py-4 text-right">Avg Cost</th>
              <th className="px-6 py-4 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              <tr><td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">Loading...</td></tr>
            ) : ingredients?.map(item => (
              <tr key={item.id} className="table-row-hover">
                <td className="px-6 py-4 font-mono text-xs text-muted-foreground">{item.code}</td>
                <td className="px-6 py-4 font-medium text-foreground">{item.name}</td>
                <td className="px-6 py-4 text-muted-foreground">{item.categoryName || '-'}</td>
                <td className="px-6 py-4 text-muted-foreground">{item.stockUom}</td>
                <td className="px-6 py-4 text-right font-medium">{formatCurrency(item.weightedAvgCost)}</td>
                <td className="px-6 py-4 text-center">
                  <Badge variant={item.active ? "success" : "neutral"}>{item.active ? 'Active' : 'Inactive'}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add Ingredient"
        footer={<><Button variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button><Button onClick={handleSave} disabled={createMut.isPending}>Save</Button></>}>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Name</Label>
              <Input value={formData.name} onChange={(e:any) => setFormData({...formData, name: e.target.value})} placeholder="e.g. Arabica Beans" />
            </div>
            <div>
              <Label>Category</Label>
              <Select value={formData.categoryId} onChange={(e:any) => setFormData({...formData, categoryId: Number(e.target.value)})}>
                <option value={0}>Select Category</option>
                {categories?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Stock UOM</Label>
              <Input value={formData.stockUom} onChange={(e:any) => setFormData({...formData, stockUom: e.target.value})} placeholder="e.g. g" />
            </div>
            <div>
              <Label>Purchase UOM</Label>
              <Input value={formData.purchaseUom} onChange={(e:any) => setFormData({...formData, purchaseUom: e.target.value})} placeholder="e.g. kg" />
            </div>
            <div>
              <Label>Recipe UOM</Label>
              <Input value={formData.recipeUom} onChange={(e:any) => setFormData({...formData, recipeUom: e.target.value})} placeholder="e.g. g" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
             <div>
              <Label>Conversion (Purch to Stock)</Label>
              <Input type="number" value={formData.conversionFactor} onChange={(e:any) => setFormData({...formData, conversionFactor: Number(e.target.value)})} placeholder="e.g. 1000" />
              <p className="text-[10px] text-muted-foreground mt-1">1 Purchase UOM = X Stock UOM</p>
            </div>
            <div>
              <Label>Est. Cost (Per Stock UOM)</Label>
              <Input type="number" step="0.01" value={formData.currentCost} onChange={(e:any) => setFormData({...formData, currentCost: Number(e.target.value)})} />
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
