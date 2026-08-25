// ============================================================
// VoteCapsule™ — Campaign Budget (Party Portal)
// FULL BUDGET MODULE — Party-wide overview, candidate budgets,
// file upload, IEBC compliance, smart planner, insights
// ============================================================
import React, { useState, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend,
} from 'recharts';
import {
  DollarSign, TrendingUp, AlertTriangle, Plus, X, CheckCircle,
  Upload, Users, MapPin, Target, Brain, Lightbulb, Calculator,
  ClipboardList, Eye, EyeOff, Shield, Zap, PieChart as PieIcon,
  Download,
} from 'lucide-react';
import { campaignApi } from '../api/campaignApi';
import { PageErrorBoundary } from '../components/PageErrorBoundary';

const CATEGORY_COLORS = ['#7c3aed','#2563eb','#059669','#d97706','#dc2626','#0891b2','#6b7280','#ec4899','#14b8a6','#f97316'];

const EXPENSE_CATEGORIES = [
  'transport','fuel','printing','branding','events','venues',
  'equipment','communications','staff','volunteers','accommodation',
  'meals','logistics','media','digital_advertising','outdoor_advertising',
  'office','security','miscellaneous',
];

const fmt = (n: number) => n >= 1_000_000
  ? `KES ${(n/1_000_000).toFixed(1)}M`
  : n >= 1_000
  ? `KES ${(n/1_000).toFixed(0)}K`
  : `KES ${Number(n ?? 0).toLocaleString()}`;

// ── IEBC Gauge ───────────────────────────────────────────────
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
        {pct >= 95 ? 'CRITICAL' : pct >= 80 ? 'WARNING' : 'COMPLIANT'}
      </p>
    </div>
  );
}

// ── Budget Upload Modal ──────────────────────────────────────
function BudgetUploadModal({ campaignId, onClose, onSuccess }: { campaignId: string; onClose: () => void; onSuccess: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<any[]>([]);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const parseFile = useCallback(async (f: File) => {
    setParsing(true);
    setError('');
    try {
      const ext = f.name.split('.').pop()?.toLowerCase();
      const text = await f.text();
      let rows: any[] = [];

      if (ext === 'csv' || ext === 'tsv') {
        const sep = ext === 'tsv' ? '\t' : ',';
        const lines = text.trim().split('\n');
        const headers = lines[0].split(sep).map(h => h.trim().toLowerCase().replace(/[^a-z_]/g, ''));
        for (let i = 1; i < lines.length; i++) {
          const vals = lines[i].split(sep);
          const row: any = {};
          headers.forEach((h, idx) => { row[h] = vals[idx]?.trim() ?? ''; });
          if (row.amount || row.allocated || row.budget) {
            rows.push({
              description: row.description || row.item || row.name || `Line ${i}`,
              category: row.category || row.categorycode || row.type || 'miscellaneous',
              amount: parseFloat(row.amount || row.allocated || row.budget || '0'),
              candidate: row.candidate || row.candidate_name || '',
              ward: row.ward || row.wardcode || '',
            });
          }
        }
      } else if (ext === 'xlsx' || ext === 'xls') {
        setError('Excel file detected — will be parsed server-side. Click Import to proceed.');
        rows = [{ description: `Excel: ${f.name}`, category: 'import', amount: 0, candidate: '', ward: '' }];
      } else if (ext === 'docx' || ext === 'doc') {
        setError('Word document detected — budget tables will be extracted server-side.');
        rows = [{ description: `Word: ${f.name}`, category: 'import', amount: 0, candidate: '', ward: '' }];
      } else {
        setError('Unsupported format. Use CSV, Excel (.xlsx), or Word (.docx).');
      }
      setPreview(rows);
    } catch (err: any) {
      setError(err.message || 'Parse failed');
    } finally {
      setParsing(false);
    }
  }, []);

  const handleImport = async () => {
    if (!file) return;
    setImporting(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('campaignId', campaignId);
      await campaignApi.budget.importFile(campaignId, formData);
      onSuccess();
    } catch (err: any) {
      if (preview.length > 0 && preview[0].amount > 0) {
        for (const row of preview) {
          if (row.amount > 0) {
            try { await campaignApi.budget.recordExpense(campaignId, { description: row.description, categoryCode: row.category, amount: row.amount, wardCode: row.ward, paymentMethod: 'budget_import', expenseDate: new Date().toISOString().split('T')[0] }); } catch {}
          }
        }
        onSuccess();
      } else {
        setError('Import failed. Ensure file has: description, category, amount columns.');
      }
    } finally {
      setImporting(false);
    }
  };

  const totalAmount = preview.reduce((s, r) => s + (r.amount || 0), 0);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-5 border-b">
          <div className="flex items-center gap-2"><Upload className="w-5 h-5 text-violet-500" /><h3 className="text-base font-bold text-gray-900">Import Budget from File</h3></div>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div onClick={() => inputRef.current?.click()} className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-violet-400 hover:bg-violet-50/30 transition-colors">
            <Upload className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-700">{file ? file.name : 'Click to upload or drag a file'}</p>
            <p className="text-xs text-gray-400 mt-1">CSV, Excel (.xlsx), Word (.docx)</p>
            <input ref={inputRef} type="file" accept=".csv,.tsv,.xlsx,.xls,.docx,.doc" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) { setFile(f); parseFile(f); } }} />
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
            <p className="text-xs font-semibold text-blue-800 mb-1">Expected CSV columns:</p>
            <code className="text-[10px] text-blue-700 font-mono">description,category,amount,candidate,ward</code>
          </div>
          {preview.length > 0 && totalAmount > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-900">Preview ({preview.length} items)</p>
                <p className="text-sm font-bold text-violet-600">Total: {fmt(totalAmount)}</p>
              </div>
              <div className="max-h-36 overflow-y-auto border border-gray-200 rounded-lg">
                <table className="w-full text-xs">
                  <thead><tr className="bg-gray-50 text-gray-500"><th className="px-2 py-1 text-left">Desc</th><th className="px-2 py-1 text-left">Category</th><th className="px-2 py-1 text-right">Amount</th></tr></thead>
                  <tbody className="divide-y divide-gray-50">
                    {preview.slice(0, 15).map((r, i) => (
                      <tr key={i}><td className="px-2 py-1">{r.description}</td><td className="px-2 py-1 capitalize">{r.category.replace(/_/g,' ')}</td><td className="px-2 py-1 text-right">{r.amount > 0 ? `KES ${r.amount.toLocaleString()}` : '—'}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {error && <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2">{error}</p>}
        </div>
        <div className="flex gap-3 p-5 border-t">
          <button onClick={onClose} className="flex-1 px-4 py-2 text-sm font-medium border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">Cancel</button>
          <button onClick={handleImport} disabled={!file || importing} className="flex-1 px-4 py-2 text-sm font-medium bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50 flex items-center justify-center gap-2">
            <Upload className="w-4 h-4" /> {importing ? 'Importing…' : 'Import Budget'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Party Budget Insights ────────────────────────────────────
function PartyBudgetInsights({ budget, categories, expenses, campaigns }: { budget: any; categories: any[]; expenses: any[]; campaigns: any[] }) {
  const insights: Array<{ type: 'success' | 'warning' | 'danger' | 'info'; title: string; body: string; icon: any }> = [];

  if (!budget) return null;

  const totalSpent = budget.totalSpent ?? 0;
  const totalAllocated = budget.totalAllocated ?? 0;
  const pctUsed = totalAllocated > 0 ? (totalSpent / totalAllocated) * 100 : 0;

  // Party-wide compliance
  if (pctUsed < 50) {
    insights.push({ type: 'success', icon: Shield, title: 'Budget well within limits', body: `Only ${pctUsed.toFixed(0)}% of party-wide budget used. Candidates have room to scale up activities in key constituencies.` });
  }
  if (pctUsed >= 80) {
    insights.push({ type: 'danger', icon: AlertTriangle, title: 'Party budget nearing limit', body: `${pctUsed.toFixed(0)}% used party-wide. Urgently review candidate spend — some may need budget reallocation.` });
  }

  // Candidate disparity
  const activeCampaigns = campaigns.filter((c: any) => c.status === 'active');
  if (activeCampaigns.length > 1) {
    insights.push({ type: 'info', icon: Users, title: `${activeCampaigns.length} active candidate campaigns`, body: `Monitor candidate budgets for equitable distribution. Underfunded candidates in swing constituencies may need top-up allocations.` });
  }

  // Category analysis
  const catSpend = categories.map(c => ({ code: c.categoryCode || c.code, spent: Number(c.spent || 0), allocated: Number(c.allocated || 0) }));
  const topCat = catSpend.sort((a, b) => b.spent - a.spent)[0];
  if (topCat && topCat.spent > totalSpent * 0.5) {
    insights.push({ type: 'warning', icon: Target, title: `"${(topCat.code || '').replace(/_/g,' ')}" dominates spend (${Math.round((topCat.spent/totalSpent)*100)}%)`, body: `Over-concentration in one category risks under-investment elsewhere. Diversify across branding, digital, and grassroots activities.` });
  }

  // Polling station readiness
  insights.push({ type: 'info', icon: ClipboardList, title: 'Election day planning', body: `Reserve ~15% of remaining budget for E-day logistics: agent allowances, transport, food, communication airtime.` });

  const typeStyles = { success: 'border-emerald-200 bg-emerald-50', warning: 'border-amber-200 bg-amber-50', danger: 'border-red-200 bg-red-50', info: 'border-blue-200 bg-blue-50' };
  const iconStyles = { success: 'text-emerald-600', warning: 'text-amber-600', danger: 'text-red-600', info: 'text-blue-600' };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-2"><Lightbulb className="w-5 h-5 text-violet-500" /><h4 className="text-sm font-bold text-gray-900">Budget Insights & Recommendations</h4></div>
      {insights.map((ins, i) => {
        const Icon = ins.icon;
        return (
          <div key={i} className={`border rounded-xl p-4 ${typeStyles[ins.type]}`}>
            <div className="flex items-start gap-3">
              <Icon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${iconStyles[ins.type]}`} />
              <div><p className="text-sm font-semibold text-gray-900">{ins.title}</p><p className="text-xs text-gray-600 mt-1 leading-relaxed">{ins.body}</p></div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────
function CampaignBudgetContent(): React.JSX.Element {
  const qc = useQueryClient();
  const [showExpense, setExpense] = useState(false);
  const [showUpload, setUpload] = useState(false);
  const [tab, setTab] = useState<'summary' | 'detailed' | 'candidates' | 'insights'>('summary');
  const [expenseForm, setExpenseForm] = useState({ description: '', amount: '', categoryCode: 'events', paymentMethod: 'cash', wardCode: '' });

  const { data: campaigns = [] } = useQuery({ queryKey: ['campaigns'], queryFn: () => campaignApi.list().then(r => r.data?.data ?? r.data ?? []) });
  const campaign = campaigns.find((c: any) => c.status === 'active') ?? campaigns[0];

  const { data: budget } = useQuery({
    queryKey: ['campaign-budget', campaign?.id],
    queryFn: () => campaign ? campaignApi.budget.get(campaign.id).then(r => r.data?.data ?? r.data) : null,
    enabled: !!campaign?.id,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['campaign-budget-categories', campaign?.id],
    queryFn: () => campaign ? campaignApi.budget.categories(campaign.id).then(r => r.data?.data ?? r.data ?? []) : [],
    enabled: !!campaign?.id,
  });

  const { data: iebcStatus } = useQuery({
    queryKey: ['campaign-iebc', campaign?.id],
    queryFn: () => campaign ? campaignApi.budget.iebc(campaign.id).then(r => r.data?.data ?? r.data) : null,
    enabled: !!campaign?.id,
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ['campaign-expenses', campaign?.id],
    queryFn: () => campaign ? campaignApi.budget.listExpenses(campaign.id, { limit: 100 }).then(r => r.data?.data ?? r.data ?? []) : [],
    enabled: !!campaign?.id,
  });

  const expenseMut = useMutation({
    mutationFn: (data: any) => campaignApi.budget.recordExpense(campaign.id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['campaign-budget'] }); qc.invalidateQueries({ queryKey: ['campaign-expenses'] }); setExpense(false); },
  });

  const iebcPct = iebcStatus?.percentageUsed ?? 0;

  const chartData = categories.map((cat: any, i: number) => ({
    name: (cat.categoryCode || cat.code || '').replace(/_/g,' '),
    allocated: Number(cat.allocated ?? 0),
    spent: Number(cat.spent ?? 0),
    fill: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
  }));

  const pieData = categories.filter((c: any) => Number(c.spent ?? 0) > 0).map((cat: any, i: number) => ({
    name: (cat.categoryCode || cat.code || '').replace(/_/g,' '),
    value: Number(cat.spent ?? 0),
    fill: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Campaign Budget</h2>
          <p className="text-sm text-gray-500 mt-1">Party-wide budget tracking and IEBC compliance</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setUpload(true)} className="px-3 py-2 text-sm font-medium border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 inline-flex items-center gap-2">
            <Upload className="w-4 h-4" /> Import File
          </button>
          <button onClick={() => setExpense(true)} className="vc-btn-primary inline-flex items-center gap-2 text-sm">
            <Plus className="w-4 h-4" /> Log Expense
          </button>
        </div>
      </div>

      {budget ? (
        <>
          {/* Quick stats */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              { label: 'Allocated', value: fmt(budget.totalAllocated ?? 0), icon: DollarSign, color: 'text-violet-600', bg: 'bg-violet-50' },
              { label: 'Spent', value: fmt(budget.totalSpent ?? 0), icon: TrendingUp, color: 'text-red-600', bg: 'bg-red-50' },
              { label: 'Remaining', value: fmt(budget.totalRemaining ?? (budget.totalAllocated - budget.totalSpent)), icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
              { label: 'IEBC Limit', value: budget.iebcSpendingLimit ? fmt(budget.iebcSpendingLimit) : 'N/A', icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50' },
              { label: 'Expenses', value: String(expenses.length), icon: ClipboardList, color: 'text-blue-600', bg: 'bg-blue-50' },
            ].map(({ label, value, icon: Icon, color, bg }) => (
              <div key={label} className="vc-stat-card">
                <div className="flex items-start justify-between">
                  <div><p className="text-xs text-gray-500">{label}</p><p className="text-lg font-bold text-gray-900 mt-1">{value}</p></div>
                  <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center flex-shrink-0`}><Icon className={`w-4 h-4 ${color}`} /></div>
                </div>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-200 overflow-x-auto">
            {([
              { key: 'summary', label: 'Summary', icon: PieIcon },
              { key: 'detailed', label: 'Full Budget', icon: ClipboardList },
              { key: 'candidates', label: 'By Candidate', icon: Users },
              { key: 'insights', label: 'Insights', icon: Lightbulb },
            ] as const).map(({ key, label, icon: Icon }) => (
              <button key={key} onClick={() => setTab(key)} className={`flex items-center gap-1.5 px-5 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${tab === key ? 'border-violet-600 text-violet-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                <Icon className="w-4 h-4" /> {label}
              </button>
            ))}
          </div>

          {/* ═══ SUMMARY ═══ */}
          {tab === 'summary' && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="vc-card flex flex-col items-center justify-center py-4">
                  <h3 className="text-base font-semibold text-gray-900 mb-4">IEBC Limit Used</h3>
                  <IEBCGauge pct={iebcPct} />
                  {iebcStatus?.iebcSpendingLimit && <p className="text-xs text-gray-500 mt-3">Spent {fmt(budget.totalSpent)} of {fmt(iebcStatus.iebcSpendingLimit)}</p>}
                </div>
                <div className="vc-card lg:col-span-2">
                  <h3 className="text-base font-semibold text-gray-900 mb-4">Spend Breakdown</h3>
                  {pieData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={2} dataKey="value">
                          {pieData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                        </Pie>
                        <Tooltip formatter={(v: any) => fmt(Number(v))} />
                        <Legend wrapperStyle={{ fontSize: '10px' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="text-center py-10"><TrendingUp className="w-8 h-8 text-gray-300 mx-auto" /><p className="text-xs text-gray-400 mt-2">No spend data yet</p></div>
                  )}
                </div>
              </div>

              {/* Bar chart */}
              {chartData.length > 0 && (
                <div className="vc-card">
                  <h3 className="text-base font-semibold text-gray-900 mb-4">Allocated vs Spent by Category</h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={chartData}>
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                      <Tooltip formatter={(v) => fmt(Number(v))} />
                      <Bar dataKey="allocated" name="Allocated" fill="#e0d7ff" radius={[4,4,0,0]} />
                      <Bar dataKey="spent" name="Spent" radius={[4,4,0,0]}>
                        {chartData.map((entry: any, i: number) => <Cell key={i} fill={entry.fill} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Category progress */}
              {categories.length > 0 && (
                <div className="vc-card p-0 overflow-hidden">
                  <div className="px-4 py-3 border-b bg-gray-50"><h3 className="text-sm font-semibold text-gray-900">Category Progress</h3></div>
                  <div className="divide-y divide-gray-50">
                    {categories.map((cat: any, i: number) => {
                      const alloc = Number(cat.allocated ?? 0);
                      const spent = Number(cat.spent ?? 0);
                      const pct = alloc > 0 ? Math.min(Math.round((spent / alloc) * 100), 100) : 0;
                      return (
                        <div key={cat.id ?? i} className="p-3.5">
                          <div className="flex items-center justify-between mb-1.5">
                            <p className="text-sm font-medium text-gray-900 capitalize">{(cat.categoryCode ?? cat.code ?? '').replace(/_/g,' ')}</p>
                            <p className="text-xs text-gray-500">{fmt(spent)} / {fmt(alloc)}</p>
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

          {/* ═══ DETAILED ═══ */}
          {tab === 'detailed' && (
            <div className="space-y-4">
              <div className="vc-card p-0 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
                  <h3 className="text-sm font-semibold text-gray-900">All Expenses ({expenses.length})</h3>
                  <p className="text-sm font-bold">{fmt(expenses.reduce((s: number, e: any) => s + Number(e.amount ?? 0), 0))}</p>
                </div>
                {expenses.length === 0 ? (
                  <div className="text-center py-16"><DollarSign className="w-12 h-12 text-gray-300 mx-auto mb-3" /><p className="text-sm text-gray-400">No expenses recorded yet</p></div>
                ) : (
                  <div className="overflow-x-auto max-h-[60vh] overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-white"><tr className="text-left text-xs font-semibold text-gray-500 uppercase border-b">
                        <th className="px-3 py-2">Date</th><th className="px-3 py-2">Description</th><th className="px-3 py-2">Category</th>
                        <th className="px-3 py-2">Payment</th><th className="px-3 py-2 text-right">Amount</th><th className="px-3 py-2">Status</th>
                      </tr></thead>
                      <tbody className="divide-y divide-gray-50">
                        {expenses.map((e: any) => (
                          <tr key={e.id} className="hover:bg-gray-50">
                            <td className="px-3 py-2 text-xs text-gray-500 whitespace-nowrap">{e.expenseDate ? new Date(e.expenseDate).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' }) : '—'}</td>
                            <td className="px-3 py-2 text-gray-900">{e.description}</td>
                            <td className="px-3 py-2"><span className="vc-badge bg-violet-100 text-violet-700 capitalize">{(e.categoryCode ?? e.sourceType ?? '').replace(/_/g,' ')}</span></td>
                            <td className="px-3 py-2 text-gray-600 capitalize">{(e.paymentMethod ?? '').replace(/_/g,' ')}</td>
                            <td className="px-3 py-2 text-right font-semibold text-gray-900">{fmt(Number(e.amount ?? 0))}</td>
                            <td className="px-3 py-2"><span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${e.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : e.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{e.status ?? 'pending'}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Full allocation table */}
              {categories.length > 0 && (
                <div className="vc-card p-0 overflow-hidden">
                  <div className="px-4 py-3 border-b bg-gray-50"><h3 className="text-sm font-semibold text-gray-900">Budget Allocation Detail</h3></div>
                  <table className="w-full text-sm">
                    <thead><tr className="text-left text-xs font-semibold text-gray-500 uppercase border-b">
                      <th className="px-3 py-2">Category</th><th className="px-3 py-2 text-right">Allocated</th>
                      <th className="px-3 py-2 text-right">Spent</th><th className="px-3 py-2 text-right">Remaining</th><th className="px-3 py-2 text-right">%</th>
                    </tr></thead>
                    <tbody className="divide-y divide-gray-50">
                      {categories.map((cat: any, i: number) => {
                        const alloc = Number(cat.allocated ?? 0); const spent = Number(cat.spent ?? 0);
                        const pct = alloc > 0 ? Math.round((spent / alloc) * 100) : 0;
                        return (<tr key={cat.id ?? i} className="hover:bg-gray-50">
                          <td className="px-3 py-2 font-medium capitalize">{(cat.categoryCode ?? cat.code ?? '').replace(/_/g,' ')}</td>
                          <td className="px-3 py-2 text-right text-gray-600">{fmt(alloc)}</td>
                          <td className="px-3 py-2 text-right font-semibold">{fmt(spent)}</td>
                          <td className="px-3 py-2 text-right text-emerald-600">{fmt(Math.max(alloc - spent, 0))}</td>
                          <td className="px-3 py-2 text-right"><span className={`text-xs font-medium ${pct >= 90 ? 'text-red-600' : pct >= 70 ? 'text-amber-600' : 'text-gray-500'}`}>{pct}%</span></td>
                        </tr>);
                      })}
                      <tr className="bg-gray-50 font-bold border-t">
                        <td className="px-3 py-2">TOTAL</td>
                        <td className="px-3 py-2 text-right">{fmt(budget.totalAllocated ?? 0)}</td>
                        <td className="px-3 py-2 text-right">{fmt(budget.totalSpent ?? 0)}</td>
                        <td className="px-3 py-2 text-right text-emerald-600">{fmt(budget.totalRemaining ?? 0)}</td>
                        <td className="px-3 py-2 text-right">{budget.totalAllocated ? Math.round((budget.totalSpent / budget.totalAllocated) * 100) : 0}%</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ═══ CANDIDATES ═══ */}
          {tab === 'candidates' && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
                <Users className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-blue-900">Candidate Budget Overview</p>
                  <p className="text-xs text-blue-700 mt-0.5">See how each candidate is spending relative to their constituency size and IEBC limits.</p>
                </div>
              </div>

              <div className="vc-card p-0 overflow-hidden">
                <div className="px-4 py-3 bg-gray-50 border-b">
                  <h3 className="text-sm font-semibold text-gray-900">Active Campaigns ({campaigns.filter((c: any) => c.status === 'active').length})</h3>
                </div>
                <div className="divide-y divide-gray-100">
                  {campaigns.filter((c: any) => c.status === 'active').map((c: any) => (
                    <div key={c.id} className="flex items-center gap-4 px-4 py-3 hover:bg-gray-50">
                      <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center text-violet-600 font-bold text-sm flex-shrink-0">
                        {(c.candidateName ?? c.name ?? '?').charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{c.candidateName ?? c.name}</p>
                        <p className="text-xs text-gray-500">{c.constituencyName ?? c.constituencyCode ?? '—'}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-bold text-gray-900">{fmt(c.budgetSpent ?? 0)}</p>
                        <p className="text-[10px] text-gray-400">of {fmt(c.budgetAllocated ?? 0)}</p>
                      </div>
                      <div className="w-16">
                        <div className="w-full bg-gray-100 rounded-full h-1.5">
                          <div className="h-1.5 rounded-full bg-violet-500 transition-all" style={{ width: `${Math.min(c.budgetAllocated > 0 ? (c.budgetSpent / c.budgetAllocated) * 100 : 0, 100)}%` }} />
                        </div>
                      </div>
                    </div>
                  ))}
                  {campaigns.filter((c: any) => c.status === 'active').length === 0 && (
                    <div className="text-center py-12"><Users className="w-10 h-10 text-gray-300 mx-auto mb-2" /><p className="text-sm text-gray-400">No active campaigns</p></div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ═══ INSIGHTS ═══ */}
          {tab === 'insights' && <PartyBudgetInsights budget={budget} categories={categories} expenses={expenses} campaigns={campaigns} />}
        </>
      ) : (
        <div className="vc-card text-center py-16">
          <DollarSign className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-700 mb-2">No budget set up</h3>
          <p className="text-sm text-gray-500">Record your first expense or import a budget file to get started.</p>
          <div className="flex justify-center gap-3 mt-4">
            <button onClick={() => setExpense(true)} className="vc-btn-primary text-sm inline-flex items-center gap-2"><Plus className="w-4 h-4" /> Log Expense</button>
            <button onClick={() => setUpload(true)} className="vc-btn-secondary text-sm inline-flex items-center gap-2"><Upload className="w-4 h-4" /> Import File</button>
          </div>
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
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Description *</label><input className="vc-input" required value={expenseForm.description} onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Amount (KES) *</label><input type="number" className="vc-input" required value={expenseForm.amount} onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })} /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Category</label><select className="vc-input" value={expenseForm.categoryCode} onChange={(e) => setExpenseForm({ ...expenseForm, categoryCode: e.target.value })}>{EXPENSE_CATEGORIES.map((c) => <option key={c} value={c} className="capitalize">{c.replace(/_/g,' ')}</option>)}</select></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Payment</label><select className="vc-input" value={expenseForm.paymentMethod} onChange={(e) => setExpenseForm({ ...expenseForm, paymentMethod: e.target.value })}>{['cash','mpesa','bank','cheque'].map((m) => <option key={m}>{m}</option>)}</select></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Ward</label><input className="vc-input" value={expenseForm.wardCode} onChange={(e) => setExpenseForm({ ...expenseForm, wardCode: e.target.value })} placeholder="0101" /></div>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setExpense(false)} className="flex-1 vc-btn-secondary">Cancel</button>
                <button onClick={() => expenseMut.mutate({ ...expenseForm, amount: parseFloat(expenseForm.amount) })} disabled={expenseMut.isPending || !expenseForm.description || !expenseForm.amount} className="flex-1 vc-btn-primary">{expenseMut.isPending ? 'Saving...' : 'Record'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {showUpload && campaign && (
        <BudgetUploadModal
          campaignId={campaign.id}
          onClose={() => setUpload(false)}
          onSuccess={() => { setUpload(false); qc.invalidateQueries({ queryKey: ['campaign-budget'] }); qc.invalidateQueries({ queryKey: ['campaign-expenses'] }); }}
        />
      )}
    </div>
  );
}

export function CampaignBudgetPage() {
  return <PageErrorBoundary page="Campaign Budget"><CampaignBudgetContent /></PageErrorBoundary>;
}
