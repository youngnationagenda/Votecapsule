/**
 * Vote Capsule™ Admin Portal — Billing & Subscriptions Page
 *
 * 4 Plans:
 *  1. Candidate Plan       — Pay per polling station (KES 500–3,000/position)
 *  2. Political Party Plan — Per station OR county lump sum
 *  3. Observer Plan        — Per station, unlimited users, advanced reporting
 *  4. Authority Plan       — Lump sum data access (KES 1M–200M)
 *
 * Super Admin sets exact pricing per tenant within defined ranges,
 * assigns subscription, and invoice is auto-generated.
 */

import React, { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CreditCard, Package, CheckCircle2, Clock, XCircle, Search,
  Plus, User, Users, Building2, Scale, MapPin, FileText,
  X, AlertCircle, Send,
} from 'lucide-react';
import { clsx } from 'clsx';
import { billingClient } from '../api/apiClient';
import { tenantApi, type Tenant } from '../api/tenantApi';
import { PageErrorBoundary } from '../components/PageErrorBoundary';
import { useAppDispatch } from '../store/hooks';
import { addToast } from '../store/slices/uiSlice';

// ── Plan definitions ─────────────────────────────────────────────────

type PlanCode = 'candidate' | 'party' | 'observer' | 'authority';
type PricingModel = 'per_station' | 'lump_sum' | 'per_station_or_lump';

interface PlanConfig {
  code: PlanCode;
  name: string;
  description: string;
  icon: React.ElementType;
  pricingModel: PricingModel;
  perStationRange: { min: number; max: number } | null;
  lumpSumRange: { min: number; max: number } | null;
  features: string[];
  color: string;
  targetAudience: string;
}

const PLAN_CONFIGS: PlanConfig[] = [
  {
    code: 'candidate',
    name: 'Candidate Plan',
    description: 'Pay per polling station — ideal for individual candidates',
    icon: User,
    pricingModel: 'per_station',
    perStationRange: { min: 500, max: 3000 },
    lumpSumRange: null,
    features: [
      'Evidence capture per station',
      'Real-time tallying dashboard',
      'Agent assignment & geo-fencing',
      'Basic reporting & analytics',
      'Up to 10 agents per position',
    ],
    color: 'border-blue-300 bg-blue-50/30',
    targetAudience: 'Independent Candidates',
  },
  {
    code: 'party',
    name: 'Political Party Plan',
    description: 'Per station OR county lump sum — flexible party pricing',
    icon: Building2,
    pricingModel: 'per_station_or_lump',
    perStationRange: { min: 500, max: 3000 },
    lumpSumRange: { min: 1_000_000, max: 50_000_000 },
    features: [
      'All candidate features',
      'Multi-candidate sponsorship',
      'County-wide coverage option',
      'Unlimited agents',
      'Party-wide analytics dashboard',
      'Nomination management',
      'Priority support',
    ],
    color: 'border-[#0B3C6D] bg-[#0B3C6D]/5 ring-1 ring-[#0B3C6D]/20',
    targetAudience: 'Political Parties',
  },
  {
    code: 'observer',
    name: 'Observer Plan',
    description: 'Per station with advanced reporting and unlimited access',
    icon: Users,
    pricingModel: 'per_station',
    perStationRange: { min: 500, max: 3000 },
    lumpSumRange: null,
    features: [
      'Unlimited users & agents',
      'Advanced reporting & exports',
      'Real-time election monitoring',
      'Cross-county comparison',
      'Evidence verification access',
      'API access',
      'Custom dashboards',
    ],
    color: 'border-teal-300 bg-teal-50/30',
    targetAudience: 'Observer Organizations',
  },
  {
    code: 'authority',
    name: 'Third Party Plan',
    description: 'Lump sum data access — for institutions, media, NGOs, and government bodies',
    icon: Scale,
    pricingModel: 'lump_sum',
    perStationRange: null,
    lumpSumRange: { min: 1_000_000, max: 200_000_000 },
    features: [
      'Full platform data access',
      'Cross-reference with own data',
      'Legal evidence export (certified)',
      'Unlimited users',
      'SLA guarantee (99.9%)',
      'Dedicated support channel',
      'Custom integrations & API',
      'Audit trail access',
    ],
    color: 'border-violet-300 bg-violet-50/30',
    targetAudience: 'IEBC, Courts, Media, NGOs, Law Firms',
  },
];

// ── Price step options for dropdowns ─────────────────────────────────

function generatePriceSteps(min: number, max: number): number[] {
  const steps: number[] = [];
  if (max <= 5000) {
    // Per-station: 500 step
    for (let p = min; p <= max; p += 500) steps.push(p);
  } else if (max <= 100_000_000) {
    // Lump sum: graduated steps
    const anchors = [
      1_000_000, 2_000_000, 3_000_000, 5_000_000, 7_500_000,
      10_000_000, 15_000_000, 20_000_000, 25_000_000, 30_000_000,
      40_000_000, 50_000_000, 75_000_000, 100_000_000, 150_000_000, 200_000_000,
    ];
    for (const a of anchors) {
      if (a >= min && a <= max) steps.push(a);
    }
  }
  return steps;
}

const formatKES = (amount: number) => new Intl.NumberFormat('en-KE').format(amount);

// ── Backend interfaces ───────────────────────────────────────────────

interface Subscription {
  id: string;
  tenantId: string;
  tenantName?: string;
  planId: string;
  planCode?: string;
  planName?: string;
  status: string;
  billingCycle: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

interface Invoice {
  id: string;
  tenantId: string;
  tenantName?: string;
  invoiceNumber?: string;
  subscriptionId: string | null;
  total: number;
  amountDue: number;
  amountPaid: number;
  status: string;
  dueDate: string | null;
  paidAt: string | null;
  issuedAt: string | null;
  createdAt: string;
}

const SUBSCRIPTION_STATUS: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  active:    { label: 'Active',    color: 'text-emerald-700 bg-emerald-50', icon: CheckCircle2 },
  trialing:  { label: 'Trial',     color: 'text-blue-700 bg-blue-50',       icon: Clock },
  suspended: { label: 'Suspended', color: 'text-amber-700 bg-amber-50',     icon: Clock },
  cancelled: { label: 'Cancelled', color: 'text-gray-600 bg-gray-50',       icon: XCircle },
  past_due:  { label: 'Past Due',  color: 'text-red-700 bg-red-50',         icon: XCircle },
};

const INVOICE_STATUS: Record<string, { label: string; color: string }> = {
  paid:    { label: 'Paid',    color: 'text-emerald-700 bg-emerald-50' },
  pending: { label: 'Pending', color: 'text-amber-700 bg-amber-50' },
  issued:  { label: 'Issued',  color: 'text-blue-700 bg-blue-50' },
  overdue: { label: 'Overdue', color: 'text-red-700 bg-red-50' },
  draft:   { label: 'Draft',   color: 'text-gray-500 bg-gray-50' },
  voided:  { label: 'Voided',  color: 'text-gray-400 bg-gray-50' },
};

// ── Main Component ───────────────────────────────────────────────────

function BillingAdminPageContent(): React.JSX.Element {
  const dispatch = useAppDispatch();
  const qc = useQueryClient();
  const [tab, setTab] = useState<'plans' | 'subscriptions' | 'invoices'>('plans');
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedPlanCode, setSelectedPlanCode] = useState<PlanCode | ''>('');
  const [searchSub, setSearchSub] = useState('');

  // ── Queries ──────────────────────────────────────────────────────
  const { data: subscriptions, isLoading: subsLoading } = useQuery<Subscription[]>({
    queryKey: ['billing-subscriptions'],
    queryFn: async () => {
      try {
        const r = await billingClient.get('/subscriptions');
        const raw = r.data;
        return Array.isArray(raw) ? raw : (raw as { data: Subscription[] }).data ?? [];
      } catch { return []; }
    },
    staleTime: 60_000,
  });

  const { data: invoices, isLoading: invLoading } = useQuery<Invoice[]>({
    queryKey: ['billing-invoices'],
    queryFn: async () => {
      try {
        const r = await billingClient.get('/invoices');
        const raw = r.data;
        return Array.isArray(raw) ? raw : (raw as { data: Invoice[] }).data ?? [];
      } catch { return []; }
    },
    staleTime: 60_000,
  });

  const activeSubs   = (subscriptions ?? []).filter(s => s.status === 'active').length;
  const totalRevenue = (invoices ?? []).filter(i => i.status === 'paid').reduce((s, i) => s + Number(i.total || 0), 0);
  const pendingInvoices = (invoices ?? []).filter(i => ['pending', 'issued'].includes(i.status)).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Billing & Subscriptions</h1>
          <p className="text-sm text-gray-500 mt-1">Set pricing, assign plans to tenants, and manage invoices</p>
        </div>
        <button
          onClick={() => setShowAssignModal(true)}
          className="vc-btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Assign Plan
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Active Subscriptions</div>
          <div className="text-2xl font-bold text-gray-900">{activeSubs}</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Pending Invoices</div>
          <div className="text-2xl font-bold text-amber-600">{pendingInvoices}</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Total Invoices</div>
          <div className="text-2xl font-bold text-gray-900">{(invoices ?? []).length}</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Revenue (KES)</div>
          <div className="text-2xl font-bold text-emerald-700">{formatKES(totalRevenue)}</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {(['plans', 'subscriptions', 'invoices'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={clsx(
              'px-4 py-2.5 text-sm font-medium border-b-2 -mb-px capitalize transition-colors',
              tab === t
                ? 'border-[#0B3C6D] text-[#0B3C6D]'
                : 'border-transparent text-gray-500 hover:text-gray-700',
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {/* ═══ Plans Tab ═══ */}
      {tab === 'plans' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {PLAN_CONFIGS.map((plan) => {
            const Icon = plan.icon;
            return (
              <div key={plan.code} className={clsx('rounded-xl border-2 p-6 shadow-sm', plan.color)}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-lg bg-white border border-gray-200 flex items-center justify-center shadow-sm">
                      <Icon className="w-5 h-5 text-[#0B3C6D]" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900">{plan.name}</h3>
                      <p className="text-xs text-gray-500">{plan.targetAudience}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => { setSelectedPlanCode(plan.code); setShowAssignModal(true); }}
                    className="text-xs text-[#0B3C6D] hover:underline font-medium"
                  >
                    Assign →
                  </button>
                </div>

                <p className="text-sm text-gray-600 mb-4">{plan.description}</p>

                {/* Pricing */}
                <div className="bg-white/70 rounded-lg p-3 mb-4 border border-gray-100">
                  {plan.perStationRange && (
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="w-3.5 h-3.5 text-gray-400" />
                      <span className="text-gray-600">Per station:</span>
                      <span className="font-bold text-gray-900">
                        KES {formatKES(plan.perStationRange.min)} — {formatKES(plan.perStationRange.max)}
                      </span>
                    </div>
                  )}
                  {plan.lumpSumRange && (
                    <div className={clsx('flex items-center gap-2 text-sm', plan.perStationRange && 'mt-1.5')}>
                      <CreditCard className="w-3.5 h-3.5 text-gray-400" />
                      <span className="text-gray-600">Lump sum:</span>
                      <span className="font-bold text-gray-900">
                        KES {formatKES(plan.lumpSumRange.min)} — {formatKES(plan.lumpSumRange.max)}
                      </span>
                    </div>
                  )}
                  <p className="text-xs text-gray-400 mt-2 italic">
                    Super Admin sets exact price per tenant agreement
                  </p>
                </div>

                {/* Features */}
                <div className="space-y-1.5">
                  {plan.features.map((f, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-gray-700">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                      <span>{f}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ═══ Subscriptions Tab ═══ */}
      {tab === 'subscriptions' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="p-4 border-b border-gray-100 flex items-center gap-3">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                className="vc-input pl-9 py-1.5 text-sm"
                value={searchSub}
                onChange={e => setSearchSub(e.target.value)}
                placeholder="Search by tenant name…"
              />
            </div>
            <span className="text-xs text-gray-400 ml-auto">
              {(subscriptions ?? []).length} subscription(s)
            </span>
          </div>
          {subsLoading ? (
            <div className="p-12 text-center text-gray-400">Loading subscriptions…</div>
          ) : (subscriptions ?? []).length === 0 ? (
            <div className="p-12 text-center">
              <Package className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-500">No active subscriptions</p>
              <p className="text-xs text-gray-400 mt-1">Assign a plan to a tenant to create their subscription</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Tenant</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Plan</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Billing</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Period End</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {(subscriptions ?? [])
                  .filter(s => !searchSub || (s.tenantName ?? s.tenantId).toLowerCase().includes(searchSub.toLowerCase()))
                  .map((sub) => {
                    const cfg = SUBSCRIPTION_STATUS[sub.status] ?? SUBSCRIPTION_STATUS.active!;
                    const StatusIcon = cfg.icon;
                    return (
                      <tr key={sub.id} className="hover:bg-gray-50">
                        <td className="px-5 py-3">
                          <p className="text-sm font-medium text-gray-900">{sub.tenantName ?? sub.tenantId.slice(0, 12)}</p>
                        </td>
                        <td className="px-5 py-3 text-sm text-gray-600 capitalize">{sub.planName ?? sub.planCode ?? sub.planId.slice(0, 8)}</td>
                        <td className="px-5 py-3 text-sm text-gray-600 capitalize">{sub.billingCycle}</td>
                        <td className="px-5 py-3">
                          <span className={clsx('vc-badge flex items-center gap-1 w-fit', cfg.color)}>
                            <StatusIcon className="w-3 h-3" />
                            {cfg.label}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-sm text-gray-500">
                          {sub.currentPeriodEnd ? new Date(sub.currentPeriodEnd).toLocaleDateString('en-KE') : '—'}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ═══ Invoices Tab ═══ */}
      {tab === 'invoices' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          {invLoading ? (
            <div className="p-12 text-center text-gray-400">Loading invoices…</div>
          ) : (invoices ?? []).length === 0 ? (
            <div className="p-12 text-center">
              <FileText className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-500">No invoices yet</p>
              <p className="text-xs text-gray-400 mt-1">Invoices are generated when you assign a plan to a tenant</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Invoice #</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Tenant</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Amount (KES)</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Due</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Paid</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {(invoices ?? []).map((inv) => {
                  const cfg = INVOICE_STATUS[inv.status] ?? INVOICE_STATUS.pending!;
                  return (
                    <tr key={inv.id} className="hover:bg-gray-50">
                      <td className="px-5 py-3 font-mono text-xs text-gray-700">{inv.invoiceNumber ?? inv.id.slice(0, 12)}</td>
                      <td className="px-5 py-3 text-sm text-gray-900">{inv.tenantName ?? inv.tenantId.slice(0, 12)}</td>
                      <td className="px-5 py-3 text-sm font-semibold text-gray-900">{formatKES(Number(inv.total || 0))}</td>
                      <td className="px-5 py-3"><span className={clsx('vc-badge', cfg.color)}>{cfg.label}</span></td>
                      <td className="px-5 py-3 text-sm text-gray-500">{inv.dueDate ? new Date(inv.dueDate).toLocaleDateString('en-KE') : '—'}</td>
                      <td className="px-5 py-3 text-sm text-gray-500">{inv.paidAt ? new Date(inv.paidAt).toLocaleDateString('en-KE') : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ═══ Assign Plan Modal ═══ */}
      {showAssignModal && (
        <AssignPlanModal
          initialPlanCode={selectedPlanCode || undefined}
          onClose={() => { setShowAssignModal(false); setSelectedPlanCode(''); }}
          onSuccess={() => {
            qc.invalidateQueries({ queryKey: ['billing-subscriptions'] });
            qc.invalidateQueries({ queryKey: ['billing-invoices'] });
            dispatch(addToast({ type: 'success', title: 'Plan Assigned', message: 'Subscription created and invoice generated for tenant.' }));
            setShowAssignModal(false);
            setSelectedPlanCode('');
            setTab('subscriptions');
          }}
        />
      )}
    </div>
  );
}

// ── Assign Plan Modal ────────────────────────────────────────────────

function AssignPlanModal({
  initialPlanCode,
  onClose,
  onSuccess,
}: {
  initialPlanCode?: PlanCode;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [planCode, setPlanCode] = useState<PlanCode | ''>(initialPlanCode ?? '');
  const [tenantId, setTenantId] = useState('');
  const [tenantSearch, setTenantSearch] = useState('');
  const [pricingType, setPricingType] = useState<'per_station' | 'lump_sum'>('per_station');
  const [pricePerStation, setPricePerStation] = useState(1000);
  const [lumpSumAmount, setLumpSumAmount] = useState(5_000_000);
  const [stationCount, setStationCount] = useState(1);
  const [billingCycle, setBillingCycle] = useState<'one_time' | 'monthly' | 'yearly'>('one_time');
  const [notes, setNotes] = useState('');

  // Fetch tenants
  const { data: tenantsData } = useQuery({
    queryKey: ['tenants-for-billing'],
    queryFn: () => tenantApi.findAll({ page: 1, limit: 200 }),
  });

  const tenants = (tenantsData?.data ?? []).filter((t) =>
    !tenantSearch || t.name.toLowerCase().includes(tenantSearch.toLowerCase()) || t.slug.toLowerCase().includes(tenantSearch.toLowerCase())
  );

  const selectedPlan = PLAN_CONFIGS.find(p => p.code === planCode);
  const selectedTenant = (tenantsData?.data ?? []).find(t => t.id === tenantId);

  // Calculate total
  const calculateTotal = (): number => {
    if (pricingType === 'lump_sum') return lumpSumAmount;
    return pricePerStation * stationCount;
  };

  // Create subscription mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      const total = calculateTotal();
      // Create subscription + auto-generate invoice
      const { data } = await billingClient.post('/subscriptions', {
        tenantId,
        planCode,
        billingCycle,
        customPrice: total,
        pricingType,
        pricePerStation: pricingType === 'per_station' ? pricePerStation : undefined,
        stationCount: pricingType === 'per_station' ? stationCount : undefined,
        lumpSumAmount: pricingType === 'lump_sum' ? lumpSumAmount : undefined,
        notes,
        generateInvoice: true,
      });
      return data;
    },
    onSuccess,
    onError: () => {},
  });

  const perStationSteps = selectedPlan?.perStationRange
    ? generatePriceSteps(selectedPlan.perStationRange.min, selectedPlan.perStationRange.max)
    : [];
  const lumpSumSteps = selectedPlan?.lumpSumRange
    ? generatePriceSteps(selectedPlan.lumpSumRange.min, selectedPlan.lumpSumRange.max)
    : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Assign Plan to Tenant</h2>
            <p className="text-xs text-gray-400">Step {step} of 3</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* ─── Step 1: Select Plan ─── */}
          {step === 1 && (
            <>
              <label className="vc-label">Select Plan</label>
              <div className="grid grid-cols-2 gap-3">
                {PLAN_CONFIGS.map((plan) => {
                  const Icon = plan.icon;
                  return (
                    <button
                      key={plan.code}
                      onClick={() => {
                        setPlanCode(plan.code);
                        // Set default pricing type based on plan
                        if (plan.pricingModel === 'lump_sum') setPricingType('lump_sum');
                        else setPricingType('per_station');
                      }}
                      className={clsx(
                        'border-2 rounded-xl p-4 text-left transition-all',
                        planCode === plan.code
                          ? 'border-[#0B3C6D] bg-[#0B3C6D]/5 ring-2 ring-[#0B3C6D]/20'
                          : 'border-gray-200 hover:border-gray-300',
                      )}
                    >
                      <Icon className={clsx('w-5 h-5 mb-2', planCode === plan.code ? 'text-[#0B3C6D]' : 'text-gray-400')} />
                      <p className="text-sm font-semibold text-gray-900">{plan.name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{plan.targetAudience}</p>
                    </button>
                  );
                })}
              </div>
              <div className="flex justify-end pt-3">
                <button
                  onClick={() => setStep(2)}
                  disabled={!planCode}
                  className="vc-btn-primary disabled:opacity-40"
                >
                  Next: Select Tenant →
                </button>
              </div>
            </>
          )}

          {/* ─── Step 2: Select Tenant ─── */}
          {step === 2 && (
            <>
              <label className="vc-label">Select Tenant</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={tenantSearch}
                  onChange={(e) => setTenantSearch(e.target.value)}
                  className="vc-input pl-9"
                  placeholder="Search tenants by name…"
                  autoFocus
                />
              </div>
              <div className="max-h-48 overflow-y-auto border border-gray-100 rounded-lg divide-y divide-gray-50">
                {tenants.slice(0, 20).map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTenantId(t.id)}
                    className={clsx(
                      'w-full px-4 py-2.5 text-left flex items-center gap-3 transition-colors',
                      tenantId === t.id ? 'bg-[#0B3C6D]/5' : 'hover:bg-gray-50',
                    )}
                  >
                    <Building2 className={clsx('w-4 h-4', tenantId === t.id ? 'text-[#0B3C6D]' : 'text-gray-300')} />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{t.name}</p>
                      <p className="text-xs text-gray-400">{t.slug} · {t.type}</p>
                    </div>
                    {tenantId === t.id && <CheckCircle2 className="w-4 h-4 text-[#0B3C6D] ml-auto" />}
                  </button>
                ))}
              </div>
              <div className="flex justify-between pt-3">
                <button onClick={() => setStep(1)} className="vc-btn-secondary">← Back</button>
                <button
                  onClick={() => setStep(3)}
                  disabled={!tenantId}
                  className="vc-btn-primary disabled:opacity-40"
                >
                  Next: Set Price →
                </button>
              </div>
            </>
          )}

          {/* ─── Step 3: Set Pricing ─── */}
          {step === 3 && selectedPlan && (
            <>
              {/* Summary banner */}
              <div className="bg-gray-50 rounded-lg p-3 border border-gray-100 flex items-center gap-3">
                <div className="flex-1">
                  <p className="text-xs text-gray-500">Assigning</p>
                  <p className="text-sm font-bold text-gray-900">{selectedPlan.name}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">To</p>
                  <p className="text-sm font-bold text-gray-900">{selectedTenant?.name ?? '—'}</p>
                </div>
              </div>

              {/* Pricing type toggle (for party plan) */}
              {selectedPlan.pricingModel === 'per_station_or_lump' && (
                <div>
                  <label className="vc-label">Pricing Model</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPricingType('per_station')}
                      className={clsx(
                        'flex-1 py-2 px-3 rounded-lg text-sm font-medium border-2 transition-colors',
                        pricingType === 'per_station'
                          ? 'border-[#0B3C6D] bg-[#0B3C6D]/5 text-[#0B3C6D]'
                          : 'border-gray-200 text-gray-500 hover:border-gray-300',
                      )}
                    >
                      Per Polling Station
                    </button>
                    <button
                      onClick={() => setPricingType('lump_sum')}
                      className={clsx(
                        'flex-1 py-2 px-3 rounded-lg text-sm font-medium border-2 transition-colors',
                        pricingType === 'lump_sum'
                          ? 'border-[#0B3C6D] bg-[#0B3C6D]/5 text-[#0B3C6D]'
                          : 'border-gray-200 text-gray-500 hover:border-gray-300',
                      )}
                    >
                      County Lump Sum
                    </button>
                  </div>
                </div>
              )}

              {/* Per-station pricing */}
              {pricingType === 'per_station' && selectedPlan.perStationRange && (
                <div className="space-y-3">
                  <div>
                    <label className="vc-label">Price Per Polling Station (KES)</label>
                    <select
                      value={pricePerStation}
                      onChange={(e) => setPricePerStation(Number(e.target.value))}
                      className="vc-input font-semibold"
                    >
                      {perStationSteps.map((p) => (
                        <option key={p} value={p}>KES {formatKES(p)}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="vc-label">Number of Polling Stations</label>
                    <input
                      type="number"
                      min={1}
                      max={46030}
                      value={stationCount}
                      onChange={(e) => setStationCount(Math.max(1, Number(e.target.value)))}
                      className="vc-input"
                      placeholder="e.g., 150"
                    />
                    <p className="text-xs text-gray-400 mt-1">Kenya has 46,030 polling stations</p>
                  </div>
                </div>
              )}

              {/* Lump sum pricing */}
              {pricingType === 'lump_sum' && selectedPlan.lumpSumRange && (
                <div>
                  <label className="vc-label">Lump Sum Amount (KES)</label>
                  <select
                    value={lumpSumAmount}
                    onChange={(e) => setLumpSumAmount(Number(e.target.value))}
                    className="vc-input font-semibold"
                  >
                    {lumpSumSteps.map((p) => (
                      <option key={p} value={p}>KES {formatKES(p)}</option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-400 mt-1">
                    Set as agreed with {selectedTenant?.name ?? 'the tenant'}
                  </p>
                </div>
              )}

              {/* Billing cycle */}
              <div>
                <label className="vc-label">Billing Cycle</label>
                <select
                  value={billingCycle}
                  onChange={(e) => setBillingCycle(e.target.value as 'one_time' | 'monthly' | 'yearly')}
                  className="vc-input"
                >
                  <option value="one_time">One-time payment</option>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly (election cycle)</option>
                </select>
              </div>

              {/* Notes */}
              <div>
                <label className="vc-label">Notes (optional)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="vc-input resize-none h-16"
                  placeholder="e.g., County lump sum for all candidates in Nairobi County"
                />
              </div>

              {/* Total */}
              <div className="bg-[#0B3C6D]/5 rounded-xl p-4 border border-[#0B3C6D]/20">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">
                    {pricingType === 'per_station'
                      ? `${formatKES(pricePerStation)} × ${stationCount} station${stationCount > 1 ? 's' : ''}`
                      : 'Lump sum agreement'}
                  </span>
                  <span className="text-xl font-bold text-[#0B3C6D]">
                    KES {formatKES(calculateTotal())}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-between pt-2">
                <button onClick={() => setStep(2)} className="vc-btn-secondary">← Back</button>
                <button
                  onClick={() => createMutation.mutate()}
                  disabled={createMutation.isPending}
                  className="vc-btn-primary flex items-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  {createMutation.isPending ? 'Creating…' : 'Assign & Generate Invoice'}
                </button>
              </div>

              {createMutation.isError && (
                <p className="text-xs text-red-600 flex items-center gap-1 mt-2">
                  <AlertCircle className="w-3 h-3" />
                  Failed to create subscription. Backend may not support custom pricing yet — see Sonie tasks.
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export function BillingAdminPage() {
  return (
    <PageErrorBoundary page="Billing Admin">
      <BillingAdminPageContent />
    </PageErrorBoundary>
  );
}
