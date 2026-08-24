// ============================================================
// VoteCapsule™ — My Campaign Budget (Candidate Portal)
// Phase 14B — Budget overview + IEBC compliance + expense entry
// ============================================================
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { DollarSign, TrendingUp, Plus, X, AlertTriangle, CheckCircle } from 'lucide-react';
import { campaignApi } from '../api/campaignApi';
import { PageErrorBoundary } from '../components/PageErrorBoundary';

function useMyCampaign() {
  const { data: campaigns = [] } = useQuery({
    queryKey: ['my-campaigns'],
    queryFn:  () => campaignApi.list({ candidate: true }).then((r) => r.data?.data ?? r.data ?? []),
  });
  return campaigns.find((c: any) => c.status === 'active') ?? campaigns[0] ?? null;
}

const CATEGORY_COLORS = ['#f59e0b','#3b82f6','#8b5cf6','#10b981','#ef4444','#06b6d4','#6b7280','#ec4899'];

const EXPENSE_CATEGORIES = [
  'transport','fuel','printing','branding','events','venues',
  'equipment','communications','staff','volunteers','accommodation',
  'meals','logistics','media','digital_advertising','outdoor_advertising',
  'office','security','miscellaneous',
];

function IEBCGauge({ pct }: { pct: number }) {
  const color = pct >= 95 ? '#ef4444' : pct >= 80 ? '#f59e0b' : '#10b981';
  return (
    <div className="flex flex-col items-center">
      <div className="relative w-28 h-28">
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
          <circle cx="50" cy="50" r="40" fill="none" stroke="#e5e7eb" strokeWidth="10" />
          <circle cx="50" cy="50" r="40" fill="none" stroke={color} strokeWidth="10"
            strokeDasharray={`${Math.min(pct, 100) * 2.51} 251`} strokeLinecap="round" />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-bold text-gray-900">{pct}%</span>
          <span className="text-[10px] text-gray-500">of limit</span>
        </div>
      </div>
      <p className={`text-xs font-semibold mt-1.5 ${pct >= 95 ? 'text-red-600' : pct >= 80 ? 'text-amber-600' : 'text-emerald-600'}`}>
        {pct >= 95 ? '⚠ CRITICAL' : pct >= 80 ? '⚠ WARNING' : '✓ COMPLIANT'}
      </p>
    </div>
  );
}

function AddExpenseModal({ campaignId, onClose }: { campaignId: string; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    description: '', amount: '', categoryCode: 'events',
    expenseDate: new Date().toISOString().split('T')[0],
    paymentMethod: 'mpesa', paymentReference: '', payeeName: '',
    wardCode: '',
  });

  const mut = useMutation({
    mutationFn: (data: any) => campaignApi.budget.recordExpense(campaignId, data),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: ['my-budget'] });
      qc.invalidateQueries({ queryKey: ['my-expenses'] });
      qc.invalidateQueries({ queryKey: ['my-iebc'] });
      onClose();
    },
  });

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b">
          <h3 className="text-base font-semibold text-gray-900">Record Expense</h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); mut.mutate({ ...form, amount: parseFloat(form.amount) }); }} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
            <input className="vc-input" required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="e.g. Rally venue hire — Mwiki" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount (KES) *</label>
              <input type="number" className="vc-input" required min="0" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0.00" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
              <input type="date" className="vc-input" required value={form.expenseDate} onChange={(e) => setForm({ ...form, expenseDate: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
              <select className="vc-input" value={form.categoryCode} onChange={(e) => setForm({ ...form, categoryCode: e.target.value })}>
                {EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{c.replace(/_/g,' ')}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
              <select className="vc-input" value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}>
                {['mpesa','bank_transfer','cash','cheque','card'].map((m) => <option key={m} value={m}>{m.replace(/_/g,' ')}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Payee Name</label>
            <input className="vc-input" value={form.payeeName} onChange={(e) => setForm({ ...form, payeeName: e.target.value })} placeholder="Vendor or supplier name" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reference No.</label>
              <input className="vc-input" value={form.paymentReference} onChange={(e) => setForm({ ...form, paymentReference: e.target.value })} placeholder="M-Pesa / cheque ref" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ward Code</label>
              <input className="vc-input" value={form.wardCode} onChange={(e) => setForm({ ...form, wardCode: e.target.value })} placeholder="e.g. 0101" maxLength={4} />
            </div>
          </div>
          {mut.isError && <p className="text-sm text-red-600">Failed to record expense. Please try again.</p>}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 vc-btn-secondary">Cancel</button>
            <button type="submit" disabled={mut.isPending} className="flex-1 vc-btn-primary">
              {mut.isPending ? 'Saving…' : 'Record Expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function MyBudgetContent(): React.JSX.Element {
  const qc       = useQueryClient();
  const campaign = useMyCampaign();
  const [showExpense, setExpense] = useState(false);
  const [tab, setTab]             = useState<'overview' | 'expenses'>('overview');

  const { data: budget } = useQuery({
    queryKey: ['my-budget', campaign?.id],
    queryFn:  () => campaign ? campaignApi.budget.get(campaign.id).then((r) => r.data?.data ?? r.data) : null,
    enabled:  !!campaign?.id,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['my-budget-categories', campaign?.id],
    queryFn:  () => campaign ? campaignApi.budget.categories(campaign.id).then((r) => r.data?.data ?? r.data ?? []) : [],
    enabled:  !!campaign?.id,
  });

  const { data: iebc } = useQuery({
    queryKey: ['my-iebc', campaign?.id],
    queryFn:  () => campaign ? campaignApi.budget.iebc(campaign.id).then((r) => r.data?.data ?? r.data) : null,
    enabled:  !!campaign?.id,
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ['my-expenses', campaign?.id],
    queryFn:  () => campaign ? campaignApi.budget.listExpenses(campaign.id, { limit: 20 }).then((r) => r.data?.data ?? r.data ?? []) : [],
    enabled:  !!campaign?.id,
  });

  const iebcPct   = Math.round(iebc?.limitPercentageUsed ?? 0);
  const chartData = categories.slice(0, 8).map((cat: any) => ({
    name:  cat.categoryName?.replace(/_/g,' ') ?? cat.code,
    spent: cat.spent ?? 0,
    allocated: cat.allocated ?? 0,
  }));

  const fmt = (n: number) => n >= 1_000_000
    ? `KES ${(n/1_000_000).toFixed(1)}M`
    : n >= 1_000
    ? `KES ${(n/1_000).toFixed(0)}K`
    : `KES ${n.toLocaleString()}`;

  if (!campaign) return (
    <div className="vc-card text-center py-16">
      <DollarSign className="w-12 h-12 text-gray-300 mx-auto mb-3" />
      <p className="text-gray-500">No active campaign found.</p>
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Campaign Budget</h2>
          <p className="text-sm text-gray-500 mt-1">{campaign.name}</p>
        </div>
        <button onClick={() => setExpense(true)} className="vc-btn-primary inline-flex items-center gap-2 text-sm">
          <Plus className="w-4 h-4" /> Record Expense
        </button>
      </div>

      {/* Budget Summary + IEBC */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 vc-card">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Budget Summary</h3>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Allocated',  value: fmt(budget?.totalAllocated  ?? 0), color: 'text-gray-900' },
              { label: 'Committed',  value: fmt(budget?.totalCommitted  ?? 0), color: 'text-blue-600' },
              { label: 'Spent',      value: fmt(budget?.totalSpent      ?? 0), color: 'text-amber-600' },
              { label: 'Remaining',  value: fmt(budget?.totalRemaining  ?? 0), color: 'text-emerald-600' },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500">{label}</p>
                <p className={`text-base font-bold mt-0.5 ${color}`}>{value}</p>
              </div>
            ))}
          </div>
          {budget && (
            <div className="mt-4">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>Budget used</span>
                <span>{budget.totalAllocated > 0 ? Math.round((budget.totalSpent / budget.totalAllocated) * 100) : 0}%</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div
                  className="h-2 rounded-full bg-amber-500 transition-all"
                  style={{ width: `${budget.totalAllocated > 0 ? Math.min((budget.totalSpent / budget.totalAllocated) * 100, 100) : 0}%` }}
                />
              </div>
            </div>
          )}
        </div>

        <div className="vc-card flex flex-col items-center justify-center">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">IEBC Limit</h3>
          <IEBCGauge pct={iebcPct} />
          {iebc && (
            <p className="text-xs text-gray-500 mt-2 text-center">
              Limit: {fmt(iebc.limitAmount ?? 0)}
            </p>
          )}
          {iebcPct >= 80 && (
            <div className={`mt-2 flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-lg ${iebcPct >= 95 ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'}`}>
              <AlertTriangle className="w-3 h-3" />
              {iebcPct >= 95 ? 'Near legal limit' : 'Approaching limit'}
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        {(['overview', 'expenses'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors capitalize ${tab === t ? 'border-amber-500 text-amber-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {t === 'expenses' ? `Recent Expenses (${expenses.length})` : 'By Category'}
          </button>
        ))}
      </div>

      {/* Category Chart */}
      {tab === 'overview' && (
        <div className="space-y-4">
          {chartData.length > 0 ? (
            <div className="vc-card">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Spend by Category</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v/1000).toFixed(0)}K`} />
                  <Tooltip formatter={(v: any) => [`KES ${v.toLocaleString()}`, 'Spent']} />
                  <Bar dataKey="spent" radius={[4,4,0,0]}>
                    {chartData.map((_: any, i: number) => <Cell key={i} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="vc-card text-center py-10">
              <TrendingUp className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-400">No budget categories set up yet</p>
            </div>
          )}

          {categories.length > 0 && (
            <div className="vc-card p-0 overflow-hidden">
              <div className="divide-y divide-gray-50">
                {categories.map((cat: any, i: number) => {
                  const pct = cat.allocated > 0 ? Math.min(Math.round((cat.spent / cat.allocated) * 100), 100) : 0;
                  return (
                    <div key={cat.id ?? i} className="p-3.5">
                      <div className="flex items-center justify-between mb-1.5">
                        <p className="text-sm font-medium text-gray-900 capitalize">{(cat.categoryName ?? cat.code ?? '').replace(/_/g,' ')}</p>
                        <p className="text-xs text-gray-500">{fmt(cat.spent ?? 0)} / {fmt(cat.allocated ?? 0)}</p>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-1.5">
                        <div className="h-1.5 rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Expenses Tab */}
      {tab === 'expenses' && (
        <div className="vc-card p-0 overflow-hidden">
          {expenses.length === 0 ? (
            <div className="text-center py-12">
              <DollarSign className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-400">No expenses recorded yet</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {expenses.map((exp: any) => (
                <div key={exp.id} className="flex items-center gap-3 p-3.5">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${exp.status === 'approved' ? 'bg-emerald-500' : exp.status === 'rejected' ? 'bg-red-500' : 'bg-amber-400'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{exp.description}</p>
                    <p className="text-xs text-gray-500 mt-0.5 capitalize">
                      {(exp.categoryCode ?? '').replace(/_/g,' ')} · {exp.expenseDate ? new Date(exp.expenseDate).toLocaleDateString('en-KE') : '—'}
                      {exp.paymentMethod && <span> · {exp.paymentMethod.replace(/_/g,' ')}</span>}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold text-gray-900">KES {(exp.amount ?? 0).toLocaleString()}</p>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${exp.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : exp.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                      {exp.status ?? 'pending'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {showExpense && <AddExpenseModal campaignId={campaign.id} onClose={() => setExpense(false)} />}
    </div>
  );
}

export function MyBudgetPage() {
  return (
    <PageErrorBoundary page="My Campaign Budget">
      <MyBudgetContent />
    </PageErrorBoundary>
  );
}
