// ============================================================
// VoteCapsule™ — My Campaign Budget (Candidate Portal)
// FULL BUDGET MODULE — Smart planner, file upload, insights,
// summary + detailed views, IEBC compliance, voter-based calc
// ============================================================
import React, { useState, useMemo, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, LineChart, Line, Legend, AreaChart, Area,
} from 'recharts';
import {
  DollarSign, TrendingUp, Plus, X, AlertTriangle, CheckCircle,
  Upload, FileSpreadsheet, FileText, Lightbulb, Target, Users,
  MapPin, BarChart3, PieChart as PieIcon, Eye, EyeOff,
  Download, ArrowUpRight, ArrowDownRight, Zap, Brain,
  ClipboardList, Calculator, Sparkles, TrendingDown, Shield,
} from 'lucide-react';
import { campaignApi } from '../api/campaignApi';
import { PageErrorBoundary } from '../components/PageErrorBoundary';
import { useAppSelector } from '../store/hooks';

// ── Shared hook ──────────────────────────────────────────────
function useMyCampaign() {
  const { data: campaigns = [] } = useQuery({
    queryKey: ['my-campaigns'],
    queryFn:  () => campaignApi.list({ candidate: true }).then((r) => r.data?.data ?? r.data ?? []),
  });
  return campaigns.find((c: any) => c.status === 'active') ?? campaigns[0] ?? null;
}

const CATEGORY_COLORS = ['#f59e0b','#3b82f6','#8b5cf6','#10b981','#ef4444','#06b6d4','#6b7280','#ec4899','#14b8a6','#f97316'];

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
  : `KES ${n.toLocaleString()}`;

// ── IEBC Gauge ───────────────────────────────────────────────
function IEBCGauge({ pct, limitAmount }: { pct: number; limitAmount?: number }) {
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
        {pct >= 95 ? 'CRITICAL' : pct >= 80 ? 'WARNING' : 'COMPLIANT'}
      </p>
      {limitAmount && <p className="text-[10px] text-gray-400 mt-0.5">Limit: {fmt(limitAmount)}</p>}
    </div>
  );
}

// ── Add Expense Modal ────────────────────────────────────────
function AddExpenseModal({ campaignId, onClose }: { campaignId: string; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    description: '', amount: '', categoryCode: 'events',
    expenseDate: new Date().toISOString().split('T')[0],
    paymentMethod: 'mpesa', paymentReference: '', payeeName: '', wardCode: '',
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
          {mut.isError && <p className="text-sm text-red-600">Failed to record expense.</p>}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 vc-btn-secondary">Cancel</button>
            <button type="submit" disabled={mut.isPending} className="flex-1 vc-btn-primary">{mut.isPending ? 'Saving…' : 'Record Expense'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Budget File Upload Modal ─────────────────────────────────
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
              category:    row.category || row.categorycode || row.type || 'miscellaneous',
              amount:      parseFloat(row.amount || row.allocated || row.budget || '0'),
              ward:        row.ward || row.wardcode || row.ward_code || '',
            });
          }
        }
      } else if (ext === 'xlsx' || ext === 'xls') {
        // Client-side XLSX parsing using basic approach
        setError('Excel files will be uploaded and parsed server-side. Preview not available — click Import to proceed.');
        rows = [{ description: `Excel file: ${f.name}`, category: 'import', amount: 0, ward: '' }];
      } else if (ext === 'docx' || ext === 'doc') {
        setError('Word documents will be parsed server-side for budget line items. Click Import to proceed.');
        rows = [{ description: `Word doc: ${f.name}`, category: 'import', amount: 0, ward: '' }];
      } else {
        setError('Unsupported file format. Please use CSV, Excel (.xlsx), or Word (.docx).');
      }

      setPreview(rows);
    } catch (err: any) {
      setError(err.message || 'Failed to parse file');
    } finally {
      setParsing(false);
    }
  }, []);

  const handleImport = async () => {
    if (!file) return;
    setImporting(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('campaignId', campaignId);
      await campaignApi.budget.importFile(campaignId, formData);
      onSuccess();
    } catch (err: any) {
      // If server import not ready, use parsed preview data
      if (preview.length > 0 && preview[0].amount > 0) {
        // Batch create expenses from parsed CSV
        for (const row of preview) {
          if (row.amount > 0) {
            try {
              await campaignApi.budget.recordExpense(campaignId, {
                description: row.description,
                categoryCode: row.category,
                amount: row.amount,
                wardCode: row.ward,
                paymentMethod: 'budget_import',
                expenseDate: new Date().toISOString().split('T')[0],
              });
            } catch {}
          }
        }
        onSuccess();
      } else {
        setError('Import failed. Ensure the file has columns: description, category, amount.');
      }
    } finally {
      setImporting(false);
    }
  };

  const totalAmount = preview.reduce((sum, r) => sum + (r.amount || 0), 0);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-5 border-b">
          <div className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-amber-500" />
            <h3 className="text-base font-bold text-gray-900">Import Budget from File</h3>
          </div>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Drop zone */}
          <div
            onClick={() => inputRef.current?.click()}
            className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-amber-400 hover:bg-amber-50/30 transition-colors"
          >
            <Upload className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-700">
              {file ? file.name : 'Click to upload or drag a file'}
            </p>
            <p className="text-xs text-gray-400 mt-1">Supports: CSV, Excel (.xlsx), Word (.docx)</p>
            <input
              ref={inputRef}
              type="file"
              accept=".csv,.tsv,.xlsx,.xls,.docx,.doc"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) { setFile(f); parseFile(f); }
              }}
            />
          </div>

          {/* Format guide */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
            <p className="text-xs font-semibold text-blue-800 mb-1">Expected CSV format:</p>
            <code className="text-[10px] text-blue-700 font-mono block">
              description,category,amount,ward<br/>
              Rally venue Mwiki,events,50000,0101<br/>
              Posters printing,printing,120000,
            </code>
          </div>

          {/* Preview */}
          {preview.length > 0 && preview[0].amount > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-900">Preview ({preview.length} items)</p>
                <p className="text-sm font-bold text-amber-600">Total: {fmt(totalAmount)}</p>
              </div>
              <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg">
                <table className="w-full text-xs">
                  <thead><tr className="bg-gray-50 text-gray-500 uppercase">
                    <th className="px-2 py-1.5 text-left">Description</th>
                    <th className="px-2 py-1.5 text-left">Category</th>
                    <th className="px-2 py-1.5 text-right">Amount</th>
                  </tr></thead>
                  <tbody className="divide-y divide-gray-50">
                    {preview.slice(0, 20).map((r, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="px-2 py-1.5 text-gray-900">{r.description}</td>
                        <td className="px-2 py-1.5 text-gray-500 capitalize">{r.category.replace(/_/g,' ')}</td>
                        <td className="px-2 py-1.5 text-right font-medium">{r.amount > 0 ? `KES ${r.amount.toLocaleString()}` : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {preview.length > 20 && <p className="text-xs text-gray-400">...and {preview.length - 20} more items</p>}
            </div>
          )}

          {error && <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2">{error}</p>}
        </div>

        <div className="flex gap-3 p-5 border-t">
          <button onClick={onClose} className="flex-1 vc-btn-secondary">Cancel</button>
          <button
            onClick={handleImport}
            disabled={!file || importing}
            className="flex-1 vc-btn-primary flex items-center justify-center gap-2"
          >
            <Upload className="w-4 h-4" />
            {importing ? 'Importing…' : `Import ${preview.length > 0 && totalAmount > 0 ? fmt(totalAmount) : 'Budget'}`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Smart Budget Planner ─────────────────────────────────────
function SmartBudgetPlanner({ campaign, budget }: { campaign: any; budget: any }) {
  const user = useAppSelector((s) => s.auth.user) as any;

  // Geography data from user profile / campaign
  const wardCount = campaign?.wardCount ?? user?.wardCount ?? 5;
  const registeredVoters = campaign?.registeredVoters ?? user?.registeredVoters ?? 45000;
  const pollingStations = campaign?.pollingStations ?? user?.pollingStations ?? Math.ceil(registeredVoters / 700);
  const constituencyName = campaign?.constituencyName ?? user?.constituencyName ?? 'Your Constituency';

  // Budget calculations based on voter numbers
  const costPerVoter = budget?.totalAllocated && registeredVoters > 0
    ? (budget.totalAllocated / registeredVoters)
    : 0;

  const spentPerVoter = budget?.totalSpent && registeredVoters > 0
    ? (budget.totalSpent / registeredVoters)
    : 0;

  // Smart recommendations based on ward count + voters
  const recommendations = useMemo(() => {
    const recs = [];

    // Material quantities recommendation
    const postersPerWard = 500;
    const flyers = Math.ceil(registeredVoters * 0.3); // 30% coverage
    const tshirts = Math.ceil(registeredVoters * 0.05); // 5% coverage
    const caps = Math.ceil(registeredVoters * 0.03); // 3%
    const banners = wardCount * 10; // 10 banners per ward

    recs.push({
      category: 'Printing & Branding',
      items: [
        { name: 'Campaign Posters', qty: postersPerWard * wardCount, cost: postersPerWard * wardCount * 25, note: `${postersPerWard} per ward` },
        { name: 'Flyers/Leaflets', qty: flyers, cost: flyers * 5, note: '30% voter coverage' },
        { name: 'Branded T-Shirts', qty: tshirts, cost: tshirts * 350, note: '5% voter coverage' },
        { name: 'Branded Caps', qty: caps, cost: caps * 250, note: '3% voter coverage' },
        { name: 'Street Banners', qty: banners, cost: banners * 2000, note: '10 per ward' },
      ],
    });

    // Events based on wards
    const ralliesPerWard = 3;
    const totalRallies = wardCount * ralliesPerWard;
    recs.push({
      category: 'Events & Rallies',
      items: [
        { name: 'Ward rallies', qty: totalRallies, cost: totalRallies * 50000, note: `${ralliesPerWard} per ward` },
        { name: 'Constituency rally', qty: 2, cost: 2 * 500000, note: 'Major events' },
        { name: 'Door-to-door teams', qty: wardCount, cost: wardCount * 30000, note: '1 team per ward' },
      ],
    });

    // Communications
    const smsVoters = Math.ceil(registeredVoters * 0.7); // 70% phone coverage
    recs.push({
      category: 'Communications',
      items: [
        { name: 'SMS broadcasts', qty: smsVoters * 5, cost: smsVoters * 5 * 0.8, note: '5 msgs × 70% phone coverage' },
        { name: 'Social media ads', qty: 30, cost: 30 * 5000, note: '30 days of ads' },
        { name: 'Radio spots', qty: 20, cost: 20 * 15000, note: '20 airings' },
      ],
    });

    // Transport
    recs.push({
      category: 'Transport & Logistics',
      items: [
        { name: 'Campaign vehicles', qty: wardCount > 5 ? 3 : 2, cost: (wardCount > 5 ? 3 : 2) * 150000, note: 'Monthly hire' },
        { name: 'Fuel budget', qty: 1, cost: wardCount * 25000, note: `${wardCount} wards coverage` },
        { name: 'Agent transport (E-day)', qty: pollingStations, cost: pollingStations * 500, note: '1 agent per station' },
      ],
    });

    return recs;
  }, [wardCount, registeredVoters, pollingStations]);

  const totalRecommended = recommendations.reduce(
    (sum, cat) => sum + cat.items.reduce((s, i) => s + i.cost, 0), 0
  );

  return (
    <div className="space-y-5">
      {/* Geography overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Constituency', value: constituencyName, icon: MapPin, color: 'text-violet-600', bg: 'bg-violet-50' },
          { label: 'Wards', value: wardCount.toString(), icon: Target, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Registered Voters', value: registeredVoters.toLocaleString(), icon: Users, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Polling Stations', value: pollingStations.toLocaleString(), icon: MapPin, color: 'text-amber-600', bg: 'bg-amber-50' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-white border border-gray-200 rounded-xl p-3">
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center`}><Icon className={`w-4 h-4 ${color}`} /></div>
              <div><p className="text-[10px] text-gray-500">{label}</p><p className="text-sm font-bold text-gray-900">{value}</p></div>
            </div>
          </div>
        ))}
      </div>

      {/* Cost metrics */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4 text-center">
          <Calculator className="w-6 h-6 text-amber-600 mx-auto mb-1" />
          <p className="text-[10px] text-amber-700">Cost per Voter</p>
          <p className="text-lg font-bold text-gray-900">KES {costPerVoter.toFixed(0)}</p>
          <p className="text-[10px] text-amber-600 mt-0.5">{costPerVoter < 50 ? 'Below avg' : costPerVoter < 100 ? 'Average' : 'Above avg'}</p>
        </div>
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4 text-center">
          <DollarSign className="w-6 h-6 text-blue-600 mx-auto mb-1" />
          <p className="text-[10px] text-blue-700">Spent per Voter</p>
          <p className="text-lg font-bold text-gray-900">KES {spentPerVoter.toFixed(0)}</p>
          <p className="text-[10px] text-blue-600 mt-0.5">of {costPerVoter.toFixed(0)} allocated</p>
        </div>
        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl p-4 text-center">
          <Sparkles className="w-6 h-6 text-emerald-600 mx-auto mb-1" />
          <p className="text-[10px] text-emerald-700">Recommended Budget</p>
          <p className="text-lg font-bold text-gray-900">{fmt(totalRecommended)}</p>
          <p className="text-[10px] text-emerald-600 mt-0.5">{(totalRecommended/registeredVoters).toFixed(0)}/voter</p>
        </div>
      </div>

      {/* Recommended allocations */}
      <div className="space-y-3">
        <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
          <Brain className="w-4 h-4 text-violet-500" />
          Recommended Allocations (based on {registeredVoters.toLocaleString()} voters, {wardCount} wards)
        </h4>
        {recommendations.map((cat, ci) => (
          <div key={cat.category} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-100">
              <p className="text-sm font-semibold text-gray-800">{cat.category}</p>
              <p className="text-xs font-bold text-gray-600">
                {fmt(cat.items.reduce((s, i) => s + i.cost, 0))}
              </p>
            </div>
            <div className="divide-y divide-gray-50">
              {cat.items.map((item, i) => (
                <div key={i} className="flex items-center justify-between px-4 py-2">
                  <div className="flex-1">
                    <p className="text-sm text-gray-800">{item.name}</p>
                    <p className="text-[10px] text-gray-400">{item.note}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-medium text-gray-600">{item.qty.toLocaleString()} units</p>
                    <p className="text-xs font-bold text-gray-900">{fmt(item.cost)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── AI Insights & Recommendations ────────────────────────────
function CampaignInsights({ campaign, budget, categories, expenses }: {
  campaign: any; budget: any; categories: any[]; expenses: any[];
}) {
  const user = useAppSelector((s) => s.auth.user) as any;
  const wardCount = campaign?.wardCount ?? user?.wardCount ?? 5;
  const registeredVoters = campaign?.registeredVoters ?? user?.registeredVoters ?? 45000;

  // Generate insights based on spending patterns
  const insights = useMemo(() => {
    const result: Array<{ type: 'success' | 'warning' | 'danger' | 'info'; title: string; body: string; icon: any }> = [];

    if (!budget) return result;

    const spent = budget.totalSpent ?? 0;
    const allocated = budget.totalAllocated ?? 0;
    const remaining = budget.totalRemaining ?? (allocated - spent);
    const spentPct = allocated > 0 ? (spent / allocated) * 100 : 0;

    // Spending pace
    if (spentPct > 70 && campaign?.campaignEndDate) {
      const daysLeft = Math.ceil((new Date(campaign.campaignEndDate).getTime() - Date.now()) / 86400000);
      if (daysLeft > 30) {
        result.push({
          type: 'warning', icon: TrendingUp,
          title: 'High burn rate detected',
          body: `You've spent ${spentPct.toFixed(0)}% of your budget with ${daysLeft} days remaining. Consider slowing spend to maintain reserves for election week.`,
        });
      }
    }

    // Under-invested categories
    const catSpend = categories.map(c => ({ code: c.categoryCode || c.code, spent: Number(c.spent || 0), allocated: Number(c.allocated || 0) }));
    const printSpend = catSpend.find(c => c.code === 'printing' || c.code === 'branding');
    const eventSpend = catSpend.find(c => c.code === 'events');
    const commsSpend = catSpend.find(c => c.code === 'communications' || c.code === 'digital_advertising');

    if (printSpend && printSpend.spent < printSpend.allocated * 0.3) {
      result.push({
        type: 'info', icon: Target,
        title: 'Printing budget under-utilized',
        body: `Only ${((printSpend.spent/Math.max(printSpend.allocated,1))*100).toFixed(0)}% of your printing budget used. Branded materials (posters, t-shirts, caps) create lasting visibility in wards. Order early — lead times are 7-14 days.`,
      });
    }

    if (commsSpend && commsSpend.spent < 5000) {
      result.push({
        type: 'info', icon: Zap,
        title: 'Digital advertising opportunity',
        body: `Your digital/communications spend is low. SMS campaigns cost ~KES 0.80/msg and reach voters directly. With ${registeredVoters.toLocaleString()} voters, even 30% SMS coverage = ${Math.ceil(registeredVoters * 0.3).toLocaleString()} impressions for ~${fmt(registeredVoters * 0.3 * 0.8)}.`,
      });
    }

    // Ward coverage analysis
    const wardExpenses = expenses.filter((e: any) => e.wardCode);
    const uniqueWards = new Set(wardExpenses.map((e: any) => e.wardCode));
    if (uniqueWards.size < wardCount * 0.6) {
      result.push({
        type: 'warning', icon: MapPin,
        title: `Campaign reach gap — only ${uniqueWards.size}/${wardCount} wards covered`,
        body: `Your spending only touches ${uniqueWards.size} of ${wardCount} wards. Uncovered wards represent ~${Math.ceil(registeredVoters * (1 - uniqueWards.size/wardCount)).toLocaleString()} voters who haven't seen campaign activity. Spread resources more evenly.`,
      });
    }

    // Good news
    if (spentPct > 0 && spentPct <= 60) {
      result.push({
        type: 'success', icon: Shield,
        title: 'Budget discipline on track',
        body: `You're at ${spentPct.toFixed(0)}% spend — well within IEBC limits. This gives you ${fmt(remaining)} in reserves for the final campaign push.`,
      });
    }

    // Voter-per-KES efficiency
    const costPerVoter = spent / Math.max(registeredVoters, 1);
    if (costPerVoter > 0) {
      const benchmark = 75; // KES 75/voter is average for parliamentary
      result.push({
        type: costPerVoter > benchmark * 1.5 ? 'danger' : costPerVoter > benchmark ? 'warning' : 'success',
        icon: Calculator,
        title: `Cost per voter: KES ${costPerVoter.toFixed(0)}`,
        body: costPerVoter > benchmark
          ? `Your spend-per-voter (KES ${costPerVoter.toFixed(0)}) is above the KES ${benchmark} benchmark. Look for high-impact, low-cost activities: door-to-door, community WhatsApp groups, strategic poster placement.`
          : `Your cost-per-voter (KES ${costPerVoter.toFixed(0)}) is efficient — below the KES ${benchmark} parliamentary benchmark. You have room to scale up visibility activities.`,
      });
    }

    // Polling station preparedness
    const pollingStations = Math.ceil(registeredVoters / 700);
    const agentBudget = pollingStations * 2500; // ~KES 2500 per agent (transport + lunch + allowance)
    result.push({
      type: 'info', icon: ClipboardList,
      title: `Election day readiness: ${pollingStations} stations`,
      body: `You need agents at ${pollingStations} polling stations. Budget ~${fmt(agentBudget)} for agent allowances (transport + meals + allowance). This is non-negotiable — no agents = no oversight.`,
    });

    return result;
  }, [budget, categories, expenses, campaign, wardCount, registeredVoters]);

  const typeStyles = {
    success: 'border-emerald-200 bg-emerald-50',
    warning: 'border-amber-200 bg-amber-50',
    danger:  'border-red-200 bg-red-50',
    info:    'border-blue-200 bg-blue-50',
  };
  const iconStyles = {
    success: 'text-emerald-600',
    warning: 'text-amber-600',
    danger:  'text-red-600',
    info:    'text-blue-600',
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-2">
        <Lightbulb className="w-5 h-5 text-amber-500" />
        <h4 className="text-sm font-bold text-gray-900">Campaign Insights & Recommendations</h4>
      </div>
      {insights.length === 0 ? (
        <div className="vc-card text-center py-8">
          <Brain className="w-10 h-10 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-400">Start recording expenses to unlock AI-powered insights</p>
        </div>
      ) : (
        insights.map((insight, i) => {
          const Icon = insight.icon;
          return (
            <div key={i} className={`border rounded-xl p-4 ${typeStyles[insight.type]}`}>
              <div className="flex items-start gap-3">
                <Icon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${iconStyles[insight.type]}`} />
                <div>
                  <p className="text-sm font-semibold text-gray-900">{insight.title}</p>
                  <p className="text-xs text-gray-600 mt-1 leading-relaxed">{insight.body}</p>
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

// ── Main Budget Content ──────────────────────────────────────
function MyBudgetContent(): React.JSX.Element {
  const qc = useQueryClient();
  const campaign = useMyCampaign();
  const [showExpense, setExpense] = useState(false);
  const [showUpload, setUpload] = useState(false);
  const [tab, setTab] = useState<'summary' | 'detailed' | 'planner' | 'insights'>('summary');

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
    queryFn:  () => campaign ? campaignApi.budget.listExpenses(campaign.id, { limit: 100 }).then((r) => r.data?.data ?? r.data ?? []) : [],
    enabled:  !!campaign?.id,
  });

  const iebcPct = Math.round(iebc?.limitPercentageUsed ?? iebc?.percentageUsed ?? 0);
  const chartData = categories.slice(0, 10).map((cat: any) => ({
    name:  (cat.categoryName ?? cat.categoryCode ?? cat.code ?? '').replace(/_/g,' '),
    spent: Number(cat.spent ?? 0),
    allocated: Number(cat.allocated ?? 0),
  }));

  // Pie chart data
  const pieData = categories.filter((c: any) => Number(c.spent ?? 0) > 0).map((cat: any, i: number) => ({
    name: (cat.categoryName ?? cat.code ?? '').replace(/_/g,' '),
    value: Number(cat.spent ?? 0),
    fill: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
  }));

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
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-amber-500" />
            Campaign Budget
          </h2>
          <p className="text-sm text-gray-500 mt-1">{campaign.name}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setUpload(true)} className="vc-btn-secondary inline-flex items-center gap-2 text-sm">
            <Upload className="w-4 h-4" /> Import File
          </button>
          <button onClick={() => setExpense(true)} className="vc-btn-primary inline-flex items-center gap-2 text-sm">
            <Plus className="w-4 h-4" /> Record Expense
          </button>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { label: 'Allocated', value: fmt(budget?.totalAllocated ?? 0), color: 'text-gray-900', trend: null },
          { label: 'Committed', value: fmt(budget?.totalCommitted ?? 0), color: 'text-blue-600', trend: null },
          { label: 'Spent', value: fmt(budget?.totalSpent ?? 0), color: 'text-amber-600', trend: expenses.length > 0 ? 'up' : null },
          { label: 'Remaining', value: fmt(budget?.totalRemaining ?? 0), color: 'text-emerald-600', trend: null },
          { label: 'IEBC Used', value: `${iebcPct}%`, color: iebcPct >= 80 ? 'text-red-600' : 'text-emerald-600', trend: null },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white border border-gray-200 rounded-xl p-3">
            <p className="text-[10px] text-gray-500 uppercase tracking-wide">{label}</p>
            <p className={`text-base font-bold mt-0.5 ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Tab navigation */}
      <div className="flex border-b border-gray-200 overflow-x-auto">
        {([
          { key: 'summary', label: 'Summary', icon: PieIcon },
          { key: 'detailed', label: 'Full Budget', icon: ClipboardList },
          { key: 'planner', label: 'Smart Planner', icon: Brain },
          { key: 'insights', label: 'Insights', icon: Lightbulb },
        ] as const).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              tab === key ? 'border-amber-500 text-amber-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>

      {/* ═══════ SUMMARY TAB ═══════ */}
      {tab === 'summary' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* IEBC Gauge */}
            <div className="vc-card flex flex-col items-center justify-center">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">IEBC Compliance</h3>
              <IEBCGauge pct={iebcPct} limitAmount={iebc?.limitAmount ?? iebc?.iebcSpendingLimit} />
            </div>

            {/* Pie chart */}
            <div className="vc-card lg:col-span-2">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Spend Breakdown</h3>
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={2} dataKey="value">
                      {pieData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                    </Pie>
                    <Tooltip formatter={(v: any) => fmt(Number(v))} />
                    <Legend wrapperStyle={{ fontSize: '10px' }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-10"><TrendingUp className="w-8 h-8 text-gray-300 mx-auto mb-2" /><p className="text-xs text-gray-400">No spend data yet</p></div>
              )}
            </div>
          </div>

          {/* Bar chart — allocated vs spent */}
          {chartData.length > 0 && (
            <div className="vc-card">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Allocated vs Spent by Category</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartData}>
                  <XAxis dataKey="name" tick={{ fontSize: 9 }} angle={-20} textAnchor="end" height={50} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v/1000).toFixed(0)}K`} />
                  <Tooltip formatter={(v: any) => fmt(Number(v))} />
                  <Bar dataKey="allocated" name="Allocated" fill="#e5e7eb" radius={[4,4,0,0]} />
                  <Bar dataKey="spent" name="Spent" radius={[4,4,0,0]}>
                    {chartData.map((_: any, i: number) => <Cell key={i} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Progress bars */}
          {categories.length > 0 && (
            <div className="vc-card p-0 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
                <h3 className="text-sm font-semibold text-gray-900">Category Progress</h3>
              </div>
              <div className="divide-y divide-gray-50">
                {categories.map((cat: any, i: number) => {
                  const pct = cat.allocated > 0 ? Math.min(Math.round((Number(cat.spent || 0) / Number(cat.allocated)) * 100), 100) : 0;
                  return (
                    <div key={cat.id ?? i} className="p-3.5">
                      <div className="flex items-center justify-between mb-1.5">
                        <p className="text-sm font-medium text-gray-900 capitalize">{(cat.categoryName ?? cat.code ?? '').replace(/_/g,' ')}</p>
                        <p className="text-xs text-gray-500">{fmt(Number(cat.spent ?? 0))} / {fmt(Number(cat.allocated ?? 0))}</p>
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

      {/* ═══════ DETAILED TAB ═══════ */}
      {tab === 'detailed' && (
        <div className="space-y-4">
          {/* Full expense table */}
          <div className="vc-card p-0 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
              <h3 className="text-sm font-semibold text-gray-900">All Expenses ({expenses.length})</h3>
              <p className="text-sm font-bold text-gray-900">Total: {fmt(expenses.reduce((s: number, e: any) => s + Number(e.amount ?? 0), 0))}</p>
            </div>
            {expenses.length === 0 ? (
              <div className="text-center py-12">
                <DollarSign className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-400">No expenses recorded yet</p>
                <p className="text-xs text-gray-300 mt-1">Record expenses or import from a file</p>
              </div>
            ) : (
              <div className="overflow-x-auto max-h-[50vh] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-white border-b"><tr className="text-left text-xs font-semibold text-gray-500 uppercase">
                    <th className="px-3 py-2">Date</th>
                    <th className="px-3 py-2">Description</th>
                    <th className="px-3 py-2">Category</th>
                    <th className="px-3 py-2">Ward</th>
                    <th className="px-3 py-2">Payment</th>
                    <th className="px-3 py-2 text-right">Amount</th>
                    <th className="px-3 py-2">Status</th>
                  </tr></thead>
                  <tbody className="divide-y divide-gray-50">
                    {expenses.map((exp: any) => (
                      <tr key={exp.id} className="hover:bg-gray-50">
                        <td className="px-3 py-2 text-xs text-gray-500 whitespace-nowrap">{exp.expenseDate ? new Date(exp.expenseDate).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' }) : '—'}</td>
                        <td className="px-3 py-2 text-gray-900">{exp.description}</td>
                        <td className="px-3 py-2"><span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 capitalize">{(exp.categoryCode ?? '').replace(/_/g,' ')}</span></td>
                        <td className="px-3 py-2 text-xs text-gray-500 font-mono">{exp.wardCode || '—'}</td>
                        <td className="px-3 py-2 text-xs text-gray-500 capitalize">{(exp.paymentMethod ?? '').replace(/_/g,' ')}</td>
                        <td className="px-3 py-2 text-right font-semibold text-gray-900">KES {Number(exp.amount ?? 0).toLocaleString()}</td>
                        <td className="px-3 py-2">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                            exp.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                            exp.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                          }`}>{exp.status ?? 'pending'}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Category allocations full detail */}
          {categories.length > 0 && (
            <div className="vc-card p-0 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
                <h3 className="text-sm font-semibold text-gray-900">Budget Allocation Detail</h3>
              </div>
              <table className="w-full text-sm">
                <thead><tr className="text-left text-xs font-semibold text-gray-500 uppercase border-b">
                  <th className="px-3 py-2">Category</th>
                  <th className="px-3 py-2 text-right">Allocated</th>
                  <th className="px-3 py-2 text-right">Spent</th>
                  <th className="px-3 py-2 text-right">Remaining</th>
                  <th className="px-3 py-2 text-right">% Used</th>
                </tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {categories.map((cat: any, i: number) => {
                    const alloc = Number(cat.allocated ?? 0);
                    const spent = Number(cat.spent ?? 0);
                    const pct = alloc > 0 ? Math.round((spent / alloc) * 100) : 0;
                    return (
                      <tr key={cat.id ?? i} className="hover:bg-gray-50">
                        <td className="px-3 py-2 font-medium capitalize text-gray-900">{(cat.categoryName ?? cat.code ?? '').replace(/_/g,' ')}</td>
                        <td className="px-3 py-2 text-right text-gray-600">{fmt(alloc)}</td>
                        <td className="px-3 py-2 text-right font-semibold text-gray-900">{fmt(spent)}</td>
                        <td className="px-3 py-2 text-right text-emerald-600">{fmt(Math.max(alloc - spent, 0))}</td>
                        <td className="px-3 py-2 text-right">
                          <span className={`text-xs font-medium ${pct >= 90 ? 'text-red-600' : pct >= 70 ? 'text-amber-600' : 'text-gray-500'}`}>{pct}%</span>
                        </td>
                      </tr>
                    );
                  })}
                  <tr className="bg-gray-50 font-bold">
                    <td className="px-3 py-2 text-gray-900">TOTAL</td>
                    <td className="px-3 py-2 text-right text-gray-900">{fmt(budget?.totalAllocated ?? 0)}</td>
                    <td className="px-3 py-2 text-right text-gray-900">{fmt(budget?.totalSpent ?? 0)}</td>
                    <td className="px-3 py-2 text-right text-emerald-600">{fmt(budget?.totalRemaining ?? 0)}</td>
                    <td className="px-3 py-2 text-right text-gray-900">{budget?.totalAllocated ? Math.round((budget.totalSpent / budget.totalAllocated) * 100) : 0}%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ═══════ PLANNER TAB ═══════ */}
      {tab === 'planner' && <SmartBudgetPlanner campaign={campaign} budget={budget} />}

      {/* ═══════ INSIGHTS TAB ═══════ */}
      {tab === 'insights' && <CampaignInsights campaign={campaign} budget={budget} categories={categories} expenses={expenses} />}

      {/* Modals */}
      {showExpense && <AddExpenseModal campaignId={campaign.id} onClose={() => setExpense(false)} />}
      {showUpload && (
        <BudgetUploadModal
          campaignId={campaign.id}
          onClose={() => setUpload(false)}
          onSuccess={() => {
            setUpload(false);
            qc.invalidateQueries({ queryKey: ['my-budget'] });
            qc.invalidateQueries({ queryKey: ['my-expenses'] });
          }}
        />
      )}
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
