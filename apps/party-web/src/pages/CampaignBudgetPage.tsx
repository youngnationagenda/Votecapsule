// ============================================================
// VoteCapsule™ — Campaign Budget (Party Portal)
// Phase 14B — Budget dashboard with IEBC compliance gauge
// ============================================================
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { RadialBarChart, RadialBar, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';
import { DollarSign, TrendingUp, AlertTriangle, Plus, X, CheckCircle } from 'lucide-react';
import { campaignApi } from '../api/campaignApi';
import { PageErrorBoundary } from '../components/PageErrorBoundary';

const CATEGORY_COLORS = ['#7c3aed','#2563eb','#059669','#d97706','#dc2626','#0891b2','#6b7280','#ec4899'];

function IEBCGauge({ pct }: { pct: number }) {
  const color = pct >= 95 ? '#dc2626' : pct >= 80 ? '#d97706' : '#059669';
  return (
    <div className="flex flex-col items-center">
      <div className="relative w-32 h-32">
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
          <circle cx="50" cy="50" r="40" fill="none" stroke="#e5e7eb" strokeWidth="10" />
          <circle cx="50" cy="50" r="40" fill="none" stroke={color} strokeWidth="10"
            strokeDasharray={`${Math.min(pct, 100) * 2.51} 251`} strokeLinecap="round" />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-gray-900">{pct}%</span>
          <span className="text-xs text-gray-500">of limit</span>
        </div>
      </div>
      <p className={`text-sm font-semibold mt-2 ${pct >= 95 ? 'text-red-600' : pct >= 80 ? 'text-amber-600' : 'text-emerald-600'}`}>
        {pct >= 95 ? '⚠ CRITICAL' : pct >= 80 ? '⚠ WARNING' : '✓ OK'}
      </p>
    </div>
  );
}

function CampaignBudgetContent(): React.JSX.Element {
  const qc = useQueryClient();
  const [showExpense, setExpense] = useState(false);
  const [expenseForm, setExpenseForm] = useState({ description: '', amount: '', categoryCode: 'events', paymentMethod: 'cash', wardCode: '' });

  const { data: campaigns = [] } = useQuery({ queryKey: ['campaigns'], queryFn: () => campaignApi.list().then((r) => r.data?.data ?? r.data ?? []) });
  const campaign = campaigns.find((c: any) => c.status === 'active') ?? campaigns[0];

  const { data: budget } = useQuery({
    queryKey: ['campaign-budget', campaign?.id],
    queryFn: () => campaign ? campaignApi.budget.get(campaign.id).then((r) => r.data?.data ?? r.data) : null,
    enabled: !!campaign?.id,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['campaign-budget-categories', campaign?.id],
    queryFn: () => campaign ? campaignApi.budget.categories(campaign.id).then((r) => r.data?.data ?? r.data ?? []) : [],
    enabled: !!campaign?.id,
  });

  const { data: iebcStatus } = useQuery({
    queryKey: ['campaign-iebc', campaign?.id],
    queryFn: () => campaign ? campaignApi.budget.iebc(campaign.id).then((r) => r.data?.data ?? r.data) : null,
    enabled: !!campaign?.id,
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ['campaign-expenses', campaign?.id],
    queryFn: () => campaign ? campaignApi.budget.listExpenses(campaign.id).then((r) => r.data?.data ?? r.data ?? []) : [],
    enabled: !!campaign?.id,
  });

  const expenseMut = useMutation({
    mutationFn: (data: any) => campaignApi.budget.recordExpense(campaign.id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['campaign-budget'] }); qc.invalidateQueries({ queryKey: ['campaign-expenses'] }); setExpense(false); },
  });

  const fmt = (n: number) => `KES ${Number(n ?? 0).toLocaleString()}`;

  const chartData = categories.map((cat: any, i: number) => ({
    name: cat.categoryCode,
    allocated: Number(cat.allocated),
    spent: Number(cat.spent),
    fill: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Campaign Budget</h2>
          <p className="text-sm text-gray-500 mt-1">Budget tracking and IEBC compliance</p>
        </div>
        <button onClick={() => setExpense(true)} className="vc-btn-primary inline-flex items-center gap-2 text-sm">
          <Plus className="w-4 h-4" /> Log Expense
        </button>
      </div>

      {budget ? (
        <>
          {/* Budget Overview */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Total Allocated', value: fmt(budget.totalAllocated), icon: DollarSign, color: 'text-violet-600', bg: 'bg-violet-50' },
              { label: 'Total Spent',     value: fmt(budget.totalSpent),     icon: TrendingUp,   color: 'text-red-600',    bg: 'bg-red-50' },
              { label: 'Remaining',       value: fmt(budget.totalRemaining ?? (budget.totalAllocated - budget.totalSpent)), icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
              { label: 'IEBC Limit',      value: budget.iebcSpendingLimit ? fmt(budget.iebcSpendingLimit) : 'Not set', icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50' },
            ].map(({ label, value, icon: Icon, color, bg }) => (
              <div key={label} className="vc-stat-card">
                <div className="flex items-start justify-between">
                  <div><p className="text-sm text-gray-500">{label}</p><p className="text-lg font-bold text-gray-900 mt-1">{value}</p></div>
                  <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center flex-shrink-0`}><Icon className={`w-5 h-5 ${color}`} /></div>
                </div>
              </div>
            ))}
          </div>

          {/* IEBC Gauge + Category Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="vc-card flex flex-col items-center justify-center py-4">
              <h3 className="text-base font-semibold text-gray-900 mb-4">IEBC Limit Used</h3>
              <IEBCGauge pct={iebcStatus?.percentageUsed ?? 0} />
              {iebcStatus?.iebcSpendingLimit && (
                <p className="text-xs text-gray-500 mt-3 text-center">
                  Spent {fmt(budget.totalSpent)} of {fmt(iebcStatus.iebcSpendingLimit)} limit
                </p>
              )}
            </div>
            <div className="vc-card lg:col-span-2">
              <h3 className="text-base font-semibold text-gray-900 mb-4">Spend by Category</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v) => `KES ${Number(v).toLocaleString()}`} />
                  <Bar dataKey="allocated" name="Allocated" fill="#e0d7ff" radius={[4,4,0,0]} />
                  <Bar dataKey="spent" name="Spent" radius={[4,4,0,0]}>
                    {chartData.map((entry: any, i: number) => <Cell key={i} fill={entry.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Recent Expenses */}
          <div className="vc-card">
            <h3 className="text-base font-semibold text-gray-900 mb-4">Recent Expenses</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-left text-xs font-semibold text-gray-500 uppercase border-b">
                  <th className="pb-2 pr-4">Description</th><th className="pb-2 pr-4">Amount</th>
                  <th className="pb-2 pr-4">Category</th><th className="pb-2 pr-4">Payment</th><th className="pb-2">Date</th>
                </tr></thead>
                <tbody className="divide-y divide-gray-100">
                  {expenses.slice(0, 10).map((e: any) => (
                    <tr key={e.id} className="hover:bg-gray-50">
                      <td className="py-2 pr-4 text-gray-900">{e.description}</td>
                      <td className="py-2 pr-4 font-semibold text-gray-900">{fmt(e.amount)}</td>
                      <td className="py-2 pr-4"><span className="vc-badge bg-violet-100 text-violet-700">{e.sourceType ?? 'MANUAL'}</span></td>
                      <td className="py-2 pr-4 text-gray-600 capitalize">{e.paymentMethod}</td>
                      <td className="py-2 text-gray-500">{new Date(e.expenseDate).toLocaleDateString()}</td>
                    </tr>
                  ))}
                  {expenses.length === 0 && <tr><td colSpan={5} className="py-6 text-center text-gray-400">No expenses recorded yet</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div className="vc-card text-center py-16">
          <DollarSign className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-700 mb-2">No budget set up</h3>
          <p className="text-sm text-gray-500">Budget will be created automatically when you log your first expense.</p>
        </div>
      )}

      {/* Expense Modal */}
      {showExpense && campaign && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-semibold">Log Expense</h3>
              <button onClick={() => setExpense(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
                <input className="vc-input" required value={expenseForm.description} onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount (KES) *</label>
                  <input type="number" className="vc-input" required value={expenseForm.amount} onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select className="vc-input" value={expenseForm.categoryCode} onChange={(e) => setExpenseForm({ ...expenseForm, categoryCode: e.target.value })}>
                    {['transport','fuel','printing','branding','events','communications','personnel','other'].map((c) => (
                      <option key={c} value={c} className="capitalize">{c}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
                  <select className="vc-input" value={expenseForm.paymentMethod} onChange={(e) => setExpenseForm({ ...expenseForm, paymentMethod: e.target.value })}>
                    {['cash','mpesa','bank','cheque'].map((m) => <option key={m} className="capitalize">{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ward Code</label>
                  <input className="vc-input" value={expenseForm.wardCode} onChange={(e) => setExpenseForm({ ...expenseForm, wardCode: e.target.value })} />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setExpense(false)} className="flex-1 vc-btn-secondary">Cancel</button>
                <button
                  onClick={() => expenseMut.mutate({ ...expenseForm, amount: parseFloat(expenseForm.amount) })}
                  disabled={expenseMut.isPending || !expenseForm.description || !expenseForm.amount}
                  className="flex-1 vc-btn-primary"
                >
                  {expenseMut.isPending ? 'Saving...' : 'Record Expense'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function CampaignBudgetPage() {
  return <PageErrorBoundary page="Campaign Budget"><CampaignBudgetContent /></PageErrorBoundary>;
}
