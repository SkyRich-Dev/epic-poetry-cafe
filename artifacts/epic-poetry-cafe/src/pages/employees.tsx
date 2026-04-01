import React, { useState, useEffect, useCallback } from 'react';
import { customFetch } from '@workspace/api-client-react/custom-fetch';
import { PageHeader, Button, Input, Label, Modal, formatCurrency } from '../components/ui-extras';
import { Plus, Pencil, Trash2, UserPlus, Clock, Users, CalendarDays, Briefcase, IndianRupee } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { useToast } from '@/hooks/use-toast';

const BASE = import.meta.env.BASE_URL || '/';

async function apiFetch(path: string, opts?: any) {
  const res = await customFetch(`${BASE}api/${path}`, opts);
  return res as any;
}

type Employee = {
  id: number; code: string; name: string; contactNumber?: string;
  position: string; salary?: number; employmentType?: string; active?: boolean;
};
type Shift = { id: number; name: string; startTime: string; endTime: string; active: boolean };
type SalaryRecord = {
  id: number; employeeId: number; employeeName: string; employeeCode: string;
  month: number; year: number; baseSalary: number; totalDaysInMonth: number;
  presentDays: number; halfDays: number; paidLeaves: number; unpaidLeaves: number;
  weekOffs: number; absentDays: number; deductions: number; netSalary: number;
};

const POSITIONS = ['Barista', 'Chef', 'Cashier', 'Waiter', 'Manager', 'Helper', 'Cleaner', 'Delivery Boy', 'Other'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export default function EmployeesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const isAdmin = user?.role === 'admin';
  const [tab, setTab] = useState<'employees' | 'shifts' | 'salary'>('employees');

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [salaryRecords, setSalaryRecords] = useState<SalaryRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const [empModal, setEmpModal] = useState(false);
  const [editingEmp, setEditingEmp] = useState<Employee | null>(null);
  const [empForm, setEmpForm] = useState({ name: '', contactNumber: '', position: 'Barista', salary: '', employmentType: 'full-time' });

  const [shiftModal, setShiftModal] = useState(false);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const [shiftForm, setShiftForm] = useState({ name: '', startTime: '09:00', endTime: '17:00' });

  const [salaryMonth, setSalaryMonth] = useState(new Date().getMonth() + 1);
  const [salaryYear, setSalaryYear] = useState(new Date().getFullYear());

  const loadEmployees = useCallback(async () => {
    setLoading(true);
    try { const data = await apiFetch('employees'); setEmployees(data); } catch { }
    setLoading(false);
  }, []);

  const loadShifts = useCallback(async () => {
    try { const data = await apiFetch('shifts'); setShifts(data); } catch { }
  }, []);

  const loadSalary = useCallback(async () => {
    try { const data = await apiFetch('salary'); setSalaryRecords(data); } catch { }
  }, []);

  useEffect(() => {
    loadEmployees();
    loadShifts();
    if (isAdmin) loadSalary();
  }, [loadEmployees, loadShifts, loadSalary, isAdmin]);

  const saveEmployee = async () => {
    if (!empForm.name || !empForm.position) { toast({ title: 'Error', description: 'Name and position required', variant: 'destructive' }); return; }
    const body: any = { ...empForm, salary: Number(empForm.salary) || 0 };
    if (editingEmp) {
      body.active = editingEmp.active;
      await apiFetch(`employees/${editingEmp.id}`, { method: 'PATCH', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } });
      toast({ title: 'Employee updated' });
    } else {
      await apiFetch('employees', { method: 'POST', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } });
      toast({ title: 'Employee added' });
    }
    setEmpModal(false); setEditingEmp(null);
    setEmpForm({ name: '', contactNumber: '', position: 'Barista', salary: '', employmentType: 'full-time' });
    loadEmployees();
  };

  const deleteEmployee = async (id: number) => {
    if (!confirm('Delete this employee?')) return;
    await apiFetch(`employees/${id}`, { method: 'DELETE' });
    toast({ title: 'Employee deleted' }); loadEmployees();
  };

  const openEditEmp = (emp: Employee) => {
    setEditingEmp(emp);
    setEmpForm({ name: emp.name, contactNumber: emp.contactNumber || '', position: emp.position, salary: String(emp.salary || 0), employmentType: emp.employmentType || 'full-time' });
    setEmpModal(true);
  };

  const saveShift = async () => {
    if (!shiftForm.name || !shiftForm.startTime || !shiftForm.endTime) { toast({ title: 'Error', description: 'All fields required', variant: 'destructive' }); return; }
    if (editingShift) {
      await apiFetch(`shifts/${editingShift.id}`, { method: 'PATCH', body: JSON.stringify(shiftForm), headers: { 'Content-Type': 'application/json' } });
      toast({ title: 'Shift updated' });
    } else {
      await apiFetch('shifts', { method: 'POST', body: JSON.stringify(shiftForm), headers: { 'Content-Type': 'application/json' } });
      toast({ title: 'Shift added' });
    }
    setShiftModal(false); setEditingShift(null);
    setShiftForm({ name: '', startTime: '09:00', endTime: '17:00' });
    loadShifts();
  };

  const deleteShift = async (id: number) => {
    if (!confirm('Delete this shift?')) return;
    await apiFetch(`shifts/${id}`, { method: 'DELETE' });
    toast({ title: 'Shift deleted' }); loadShifts();
  };

  const generateSalary = async () => {
    try {
      const result = await apiFetch('salary/generate', {
        method: 'POST',
        body: JSON.stringify({ month: salaryMonth, year: salaryYear }),
        headers: { 'Content-Type': 'application/json' },
      });
      toast({ title: `Salary generated for ${result.length} employee(s)` });
      loadSalary();
    } catch { toast({ title: 'Error generating salary', variant: 'destructive' }); }
  };

  const deleteSalaryRecord = async (id: number) => {
    if (!confirm('Delete this salary record?')) return;
    await apiFetch(`salary/${id}`, { method: 'DELETE' });
    toast({ title: 'Salary record deleted' }); loadSalary();
  };

  const filteredSalary = salaryRecords.filter(s => s.month === salaryMonth && s.year === salaryYear);

  const tabs = isAdmin
    ? [{ key: 'employees' as const, label: 'Employees', icon: Users }, { key: 'shifts' as const, label: 'Shifts', icon: Clock }, { key: 'salary' as const, label: 'Salary', icon: IndianRupee }]
    : [{ key: 'employees' as const, label: 'Employees', icon: Users }, { key: 'shifts' as const, label: 'Shifts', icon: Clock }];

  return (
    <div>
      <PageHeader title="Employee Management" subtitle="Manage employees, shifts, and compensation" />

      <div className="flex gap-1 mb-6 bg-muted rounded-lg p-1 w-fit">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${tab === t.key ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
            <t.icon size={16} /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'employees' && (
        <div>
          {isAdmin && (
            <div className="flex justify-end mb-4">
              <Button onClick={() => { setEditingEmp(null); setEmpForm({ name: '', contactNumber: '', position: 'Barista', salary: '', employmentType: 'full-time' }); setEmpModal(true); }}>
                <UserPlus size={16} className="mr-2" /> Add Employee
              </Button>
            </div>
          )}
          <div className="bg-card rounded-xl border shadow-sm overflow-x-auto">
            <table className="w-full">
              <thead><tr className="border-b bg-muted/50">
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-muted-foreground uppercase">Code</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-muted-foreground uppercase">Name</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-muted-foreground uppercase">Position</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-muted-foreground uppercase">Type</th>
                {isAdmin && <th className="px-6 py-3.5 text-left text-xs font-semibold text-muted-foreground uppercase">Contact</th>}
                {isAdmin && <th className="px-6 py-3.5 text-right text-xs font-semibold text-muted-foreground uppercase">Salary</th>}
                <th className="px-6 py-3.5 text-center text-xs font-semibold text-muted-foreground uppercase">Status</th>
                {isAdmin && <th className="px-6 py-3.5 text-center text-xs font-semibold text-muted-foreground uppercase">Actions</th>}
              </tr></thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8} className="px-6 py-12 text-center text-muted-foreground">Loading...</td></tr>
                ) : employees.length === 0 ? (
                  <tr><td colSpan={8} className="px-6 py-12 text-center text-muted-foreground">No employees yet</td></tr>
                ) : employees.map(emp => (
                  <tr key={emp.id} className="border-b hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4 font-mono text-sm">{emp.code}</td>
                    <td className="px-6 py-4 font-medium">{emp.name}</td>
                    <td className="px-6 py-4">{emp.position}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${emp.employmentType === 'full-time' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                        {emp.employmentType === 'full-time' ? 'Full Time' : 'Part Time'}
                      </span>
                    </td>
                    {isAdmin && <td className="px-6 py-4">{emp.contactNumber || '-'}</td>}
                    {isAdmin && <td className="px-6 py-4 text-right font-numbers">{formatCurrency(emp.salary)}</td>}
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${emp.active !== false ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                        {emp.active !== false ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    {isAdmin && (
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => openEditEmp(emp)} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"><Pencil size={15} /></button>
                          <button onClick={() => deleteEmployee(emp.id)} className="p-1.5 rounded-lg hover:bg-red-50 transition-colors text-muted-foreground hover:text-red-600"><Trash2 size={15} /></button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Modal isOpen={empModal} onClose={() => setEmpModal(false)} title={editingEmp ? 'Edit Employee' : 'Add Employee'}>
            <div className="space-y-4">
              <div><Label>Name *</Label><Input value={empForm.name} onChange={e => setEmpForm({ ...empForm, name: e.target.value })} placeholder="Employee name" /></div>
              <div><Label>Contact Number</Label><Input value={empForm.contactNumber} onChange={e => setEmpForm({ ...empForm, contactNumber: e.target.value })} placeholder="Phone number" /></div>
              <div><Label>Position *</Label>
                <select className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" value={empForm.position} onChange={e => setEmpForm({ ...empForm, position: e.target.value })}>
                  {POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div><Label>Monthly Salary (₹)</Label><Input type="number" value={empForm.salary} onChange={e => setEmpForm({ ...empForm, salary: e.target.value })} placeholder="0" /></div>
              <div><Label>Employment Type</Label>
                <select className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" value={empForm.employmentType} onChange={e => setEmpForm({ ...empForm, employmentType: e.target.value })}>
                  <option value="full-time">Full Time</option>
                  <option value="part-time">Part Time</option>
                </select>
              </div>
              {editingEmp && (
                <div><Label>Status</Label>
                  <select className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" value={editingEmp.active !== false ? 'active' : 'inactive'} onChange={e => setEditingEmp({ ...editingEmp, active: e.target.value === 'active' })}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <Button onClick={saveEmployee} className="flex-1">{editingEmp ? 'Update' : 'Add'} Employee</Button>
                <Button variant="outline" onClick={() => setEmpModal(false)} className="flex-1">Cancel</Button>
              </div>
            </div>
          </Modal>
        </div>
      )}

      {tab === 'shifts' && (
        <div>
          {isAdmin && (
            <div className="flex justify-end mb-4">
              <Button onClick={() => { setEditingShift(null); setShiftForm({ name: '', startTime: '09:00', endTime: '17:00' }); setShiftModal(true); }}>
                <Clock size={16} className="mr-2" /> Add Shift
              </Button>
            </div>
          )}
          <div className="bg-card rounded-xl border shadow-sm overflow-x-auto">
            <table className="w-full">
              <thead><tr className="border-b bg-muted/50">
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-muted-foreground uppercase">Shift Name</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-muted-foreground uppercase">Start Time</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-muted-foreground uppercase">End Time</th>
                <th className="px-6 py-3.5 text-center text-xs font-semibold text-muted-foreground uppercase">Status</th>
                {isAdmin && <th className="px-6 py-3.5 text-center text-xs font-semibold text-muted-foreground uppercase">Actions</th>}
              </tr></thead>
              <tbody>
                {shifts.length === 0 ? (
                  <tr><td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">No shifts configured</td></tr>
                ) : shifts.map(s => (
                  <tr key={s.id} className="border-b hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4 font-medium">{s.name}</td>
                    <td className="px-6 py-4">{s.startTime}</td>
                    <td className="px-6 py-4">{s.endTime}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${s.active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                        {s.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    {isAdmin && (
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => { setEditingShift(s); setShiftForm({ name: s.name, startTime: s.startTime, endTime: s.endTime }); setShiftModal(true); }} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"><Pencil size={15} /></button>
                          <button onClick={() => deleteShift(s.id)} className="p-1.5 rounded-lg hover:bg-red-50 transition-colors text-muted-foreground hover:text-red-600"><Trash2 size={15} /></button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Modal isOpen={shiftModal} onClose={() => setShiftModal(false)} title={editingShift ? 'Edit Shift' : 'Add Shift'}>
            <div className="space-y-4">
              <div><Label>Shift Name *</Label><Input value={shiftForm.name} onChange={e => setShiftForm({ ...shiftForm, name: e.target.value })} placeholder="e.g. Morning Shift" /></div>
              <div><Label>Start Time *</Label><Input type="time" value={shiftForm.startTime} onChange={e => setShiftForm({ ...shiftForm, startTime: e.target.value })} /></div>
              <div><Label>End Time *</Label><Input type="time" value={shiftForm.endTime} onChange={e => setShiftForm({ ...shiftForm, endTime: e.target.value })} /></div>
              <div className="flex gap-3 pt-2">
                <Button onClick={saveShift} className="flex-1">{editingShift ? 'Update' : 'Add'} Shift</Button>
                <Button variant="outline" onClick={() => setShiftModal(false)} className="flex-1">Cancel</Button>
              </div>
            </div>
          </Modal>
        </div>
      )}

      {tab === 'salary' && isAdmin && (
        <div>
          <div className="flex flex-wrap gap-3 items-end mb-4">
            <div>
              <Label>Month</Label>
              <select className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" value={salaryMonth} onChange={e => setSalaryMonth(Number(e.target.value))}>
                {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
              </select>
            </div>
            <div>
              <Label>Year</Label>
              <Input type="number" value={salaryYear} onChange={e => setSalaryYear(Number(e.target.value))} className="w-24" />
            </div>
            <Button onClick={generateSalary}><IndianRupee size={16} className="mr-2" /> Generate Salary</Button>
          </div>
          <div className="bg-card rounded-xl border shadow-sm overflow-x-auto">
            <table className="w-full">
              <thead><tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Employee</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase">Base Salary</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase">Days</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase">Present</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase">Half Days</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase">Paid Leave</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase">Unpaid</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase">Week Off</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase">Absent</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase">Deductions</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase">Net Salary</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase">Actions</th>
              </tr></thead>
              <tbody>
                {filteredSalary.length === 0 ? (
                  <tr><td colSpan={12} className="px-6 py-12 text-center text-muted-foreground">No salary records for {MONTHS[salaryMonth - 1]} {salaryYear}. Click "Generate Salary" to compute.</td></tr>
                ) : filteredSalary.map(s => (
                  <tr key={s.id} className="border-b hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3"><div className="font-medium">{s.employeeName}</div><div className="text-xs text-muted-foreground">{s.employeeCode}</div></td>
                    <td className="px-4 py-3 text-right font-numbers">{formatCurrency(s.baseSalary)}</td>
                    <td className="px-4 py-3 text-right">{s.totalDaysInMonth}</td>
                    <td className="px-4 py-3 text-right">{s.presentDays}</td>
                    <td className="px-4 py-3 text-right">{s.halfDays}</td>
                    <td className="px-4 py-3 text-right">{s.paidLeaves}</td>
                    <td className="px-4 py-3 text-right">{s.unpaidLeaves}</td>
                    <td className="px-4 py-3 text-right">{s.weekOffs}</td>
                    <td className="px-4 py-3 text-right">{s.absentDays}</td>
                    <td className="px-4 py-3 text-right font-numbers text-red-600">{formatCurrency(s.deductions)}</td>
                    <td className="px-4 py-3 text-right font-numbers font-semibold text-emerald-700">{formatCurrency(s.netSalary)}</td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => deleteSalaryRecord(s.id)} className="p-1.5 rounded-lg hover:bg-red-50 transition-colors text-muted-foreground hover:text-red-600"><Trash2 size={15} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
