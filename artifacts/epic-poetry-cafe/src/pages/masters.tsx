import React, { useState, useEffect } from 'react';
import { useListCategories, useCreateCategory, useListUom, useGetConfig, useUpdateConfig } from '@workspace/api-client-react';
import { PageHeader, Button, Input, Label, Modal, Badge } from '../components/ui-extras';
import { Settings, Plus } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

const DEFAULT_CONFIG = {
  costingMethod: 'weighted_average',
  currency: 'INR',
  decimalPrecision: 2,
  businessDayCloseTime: '23:00',
  wasteThresholdPercent: 5,
  lowStockAlertDays: 3,
  dailyAllocationMethod: 'equal_daily',
  taxRate: 0,
};

export default function Masters() {
  const queryClient = useQueryClient();
  const { data: categories } = useListCategories();
  const { data: uoms } = useListUom();
  const { data: config } = useGetConfig();
  const createCatMut = useCreateCategory();
  const updateConfigMut = useUpdateConfig();
  
  const [catModal, setCatModal] = useState(false);
  const [catForm, setCatForm] = useState({ name: '', type: 'ingredient', active: true });
  const [configModal, setConfigModal] = useState(false);
  const [configForm, setConfigForm] = useState(DEFAULT_CONFIG);
  const [configError, setConfigError] = useState<string | null>(null);

  useEffect(() => {
    if (config) {
      setConfigForm({
        costingMethod: config.costingMethod || 'weighted_average',
        currency: config.currency || 'INR',
        decimalPrecision: config.decimalPrecision ?? 2,
        businessDayCloseTime: config.businessDayCloseTime || '23:00',
        wasteThresholdPercent: config.wasteThresholdPercent ?? 5,
        lowStockAlertDays: config.lowStockAlertDays ?? 3,
        dailyAllocationMethod: config.dailyAllocationMethod || 'equal_daily',
        taxRate: config.taxRate ?? 0,
      });
    }
  }, [config]);

  const handleSaveCat = async () => {
    try {
      await createCatMut.mutateAsync({ data: catForm as any });
      queryClient.invalidateQueries({ queryKey: ['/api/categories'] });
      setCatModal(false);
    } catch(e) {}
  }

  const handleSaveConfig = async () => {
    setConfigError(null);
    try {
      await updateConfigMut.mutateAsync({ data: configForm as any });
      queryClient.invalidateQueries({ queryKey: ['/api/config'] });
      setConfigModal(false);
    } catch(e: any) {
      setConfigError(e?.message || 'Failed to save configuration');
    }
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
              <span className="font-medium">{config?.currency || 'INR'}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-border/50">
              <span className="text-muted-foreground">Costing Method</span>
              <span className="font-medium capitalize">{(config?.costingMethod || 'weighted_average').replace(/_/g, ' ')}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-border/50">
              <span className="text-muted-foreground">Decimal Precision</span>
              <span className="font-medium">{config?.decimalPrecision ?? 2}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-border/50">
              <span className="text-muted-foreground">EOD Close Time</span>
              <span className="font-medium">{config?.businessDayCloseTime || '23:00'}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-border/50">
              <span className="text-muted-foreground">Waste Threshold</span>
              <span className="font-medium">{Number(config?.wasteThresholdPercent ?? 5).toFixed(2)}%</span>
            </div>
            <div className="flex justify-between py-2 border-b border-border/50">
              <span className="text-muted-foreground">Low Stock Alert</span>
              <span className="font-medium">{config?.lowStockAlertDays ?? 3} days</span>
            </div>
            <div className="flex justify-between py-2 border-b border-border/50">
              <span className="text-muted-foreground">Daily Allocation</span>
              <span className="font-medium capitalize">{(config?.dailyAllocationMethod || 'equal_daily').replace(/_/g, ' ')}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-border/50">
              <span className="text-muted-foreground">Default Tax Rate</span>
              <span className="font-medium">{Number(config?.taxRate ?? 0).toFixed(2)}%</span>
            </div>
            <div className="mt-6 pt-4 text-center">
               <Button variant="outline" className="w-full" onClick={() => setConfigModal(true)}>Edit Configuration</Button>
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

      <Modal isOpen={configModal} onClose={() => { setConfigModal(false); setConfigError(null); }} title="Edit System Configuration" maxWidth="max-w-lg"
        footer={<>
          <Button variant="ghost" onClick={() => { setConfigModal(false); setConfigError(null); }}>Cancel</Button>
          <Button onClick={handleSaveConfig} disabled={updateConfigMut.isPending}>
            {updateConfigMut.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </>}>
        <div className="space-y-5 py-2">
          {configError && (
            <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-xl p-3 text-red-600 text-sm">{configError}</div>
          )}
          <div>
            <Label>Costing Method</Label>
            <select className="flex h-11 w-full rounded-xl border border-input bg-background px-4 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={configForm.costingMethod} onChange={(e:any) => setConfigForm({...configForm, costingMethod: e.target.value})}>
              <option value="weighted_average">Weighted Average</option>
              <option value="latest">Latest Cost</option>
              <option value="standard">Standard Cost</option>
            </select>
          </div>
          <div>
            <Label>Currency</Label>
            <Input value={configForm.currency} onChange={(e:any) => setConfigForm({...configForm, currency: e.target.value})} placeholder="INR" />
          </div>
          <div>
            <Label>Decimal Precision</Label>
            <Input type="number" min={0} max={6} value={configForm.decimalPrecision} onChange={(e:any) => setConfigForm({...configForm, decimalPrecision: Number(e.target.value)})} />
          </div>
          <div>
            <Label>Business Day Close Time</Label>
            <Input type="time" value={configForm.businessDayCloseTime} onChange={(e:any) => setConfigForm({...configForm, businessDayCloseTime: e.target.value})} />
          </div>
          <div>
            <Label>Waste Threshold (%)</Label>
            <Input type="number" step="0.5" min={0} value={configForm.wasteThresholdPercent} onChange={(e:any) => setConfigForm({...configForm, wasteThresholdPercent: Number(e.target.value)})} />
          </div>
          <div>
            <Label>Low Stock Alert (days)</Label>
            <Input type="number" min={1} max={30} value={configForm.lowStockAlertDays} onChange={(e:any) => setConfigForm({...configForm, lowStockAlertDays: Number(e.target.value)})} />
          </div>
          <div>
            <Label>Daily Allocation Method</Label>
            <select className="flex h-11 w-full rounded-xl border border-input bg-background px-4 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={configForm.dailyAllocationMethod} onChange={(e:any) => setConfigForm({...configForm, dailyAllocationMethod: e.target.value})}>
              <option value="equal_daily">Equal Daily</option>
              <option value="weighted">Weighted</option>
            </select>
          </div>
          <div>
            <Label>Default Tax Rate (%)</Label>
            <Input type="number" step="0.5" min={0} value={configForm.taxRate} onChange={(e:any) => setConfigForm({...configForm, taxRate: Number(e.target.value)})} />
          </div>
        </div>
      </Modal>
    </div>
  );
}
