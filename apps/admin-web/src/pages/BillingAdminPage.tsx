/**
 * Vote Capsule™ Admin Portal — Billing & Subscriptions Page
 *
 * Platform billing overview:
 * - Pricing plans (Starter / Professional / Enterprise / Platform)
 * - All tenant subscriptions
 * - Invoice history
 */

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CreditCard, Package, CheckCircle2, Clock, XCircle, Search } from 'lucide-react';
import { clsx } from 'clsx';
import { billingClient } from '../api/apiClient';
import { PageErrorBoundary } from '../components/PageErrorBoundary';

interface Plan {
  id: string;
  name: string;
  code: string;
  priceMonthlyKes: number;
  priceAnnualKes: number | null;
  maxUsers: number | null;
  maxStations: number | null;
  features: string[] | null;
  isActive: boolean;
}

interface Subscription {
  id: string;
  tenantId: string;
  planId: string;
  status: string;
  billingCycle: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  createdAt: string;
}

interface Invoice {
  id: string;
  tenantId: string;
  subscriptionId: string | null;
  amountKes: number;
  status: string;
  dueDate: string | null;
  paidAt: string | null;
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
  overdue: { label: 'Overdue', color: 'text-red-700 bg-red-50' },
  voided:  { label: 'Voided',  color: 'text-gray-500 bg-gray-50' },
};

const PLAN_COLORS: Record<string, string> = {
  starter:      'border-gray-200',
  professional: 'border-[#0B3C6D] ring-1 ring-[#0B3C6D]',
  enterprise:   'border-violet-300',
  platform:     'border-emerald-300',
};

function BillingAdminPageContent(): React.JSX.Element {
  const [searchSub, setSearchSub] = useState('');
  const [tab, setTab] = useState<'plans' | 'subscriptions' | 'invoices'>('plans');

  const { data: plans, isLoading: plansLoading } = useQuery<Plan[]>({
    queryKey: ['billing-plans'],
    queryFn: () => billingClient.get<{ data: Plan[] } | Plan[]>('/plans').then(r => (Array.isArray(r.data) ? r.data : (r.data as { data: Plan[] }).data ?? [])),
    retry: 1,
    staleTime: 5 * 60_000,
  });

  const { data: subscriptions, isLoading: subsLoading } = useQuery<Subscription[]>({
    queryKey: ['billing-subscriptions'],
    queryFn: () => billingClient.get<{ data: Subscription[] } | Subscription[]>('/subscriptions').then(r => (Array.isArray(r.data) ? r.data : (r.data as { data: Subscription[] }).data ?? [])),
    retry: 1,
    staleTime: 60_000,
  });

  const { data: invoices, isLoading: invLoading } = useQuery<Invoice[]>({
    queryKey: ['billing-invoices'],
    queryFn: () => billingClient.get<{ data: Invoice[] } | Invoice[]>('/invoices').then(r => (Array.isArray(r.data) ? r.data : (r.data as { data: Invoice[] }).data ?? [])),
    retry: 1,
    staleTime: 60_000,
  });

  const activeSubs   = (subscriptions ?? []).filter(s => s.status === 'active').length;
  const totalRevenue = (invoices ?? []).filter(i => i.status === 'paid').reduce((s, i) => s + i.amountKes, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Billing & Subscriptions</h1>
        <p className="text-sm text-gray-500 mt-1">Platform revenue and tenant subscription management</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Active Subscriptions</div>
          <div className="text-2xl font-bold text-gray-900">{activeSubs}</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Total Invoices</div>
          <div className="text-2xl font-bold text-gray-900">{(invoices ?? []).length}</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Revenue Collected (KES)</div>
          <div className="text-2xl font-bold text-gray-900">
            {new Intl.NumberFormat('en-KE').format(totalRevenue)}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {(['plans', 'subscriptions', 'invoices'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={clsx(
              'px-4 py-2 text-sm font-medium border-b-2 -mb-px capitalize transition-colors',
              tab === t
                ? 'border-[#0B3C6D] text-[#0B3C6D]'
                : 'border-transparent text-gray-500 hover:text-gray-700',
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Plans tab */}
      {tab === 'plans' && (
        plansLoading ? (
          <div className="text-center py-12 text-gray-400">Loading plans…</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {(Array.isArray(plans) ? plans : []).map((plan) => (
              <div key={plan.id} className={clsx('bg-white rounded-xl border-2 p-5 shadow-sm', PLAN_COLORS[plan.code] ?? 'border-gray-200')}>
                <div className="flex items-center gap-2 mb-3">
                  <Package className="w-4 h-4 text-[#0B3C6D]" />
                  <h3 className="font-semibold text-gray-900">{plan.name}</h3>
                </div>
                <div className="text-2xl font-bold text-gray-900 mb-1">
                  {plan.priceMonthlyKes === 0 ? 'Free' : `KES ${new Intl.NumberFormat('en-KE').format(plan.priceMonthlyKes)}`}
                </div>
                {plan.priceMonthlyKes > 0 && <div className="text-xs text-gray-500 mb-3">per month</div>}
                <div className="space-y-1 text-sm text-gray-600">
                  {plan.maxUsers && <div>Up to {plan.maxUsers.toLocaleString()} users</div>}
                  {plan.maxStations && <div>Up to {plan.maxStations.toLocaleString()} stations</div>}
                  {(plan.features ?? []).map((f, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3 h-3 text-emerald-500 flex-shrink-0" />
                      <span>{f}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-3">
                  <span className={clsx('vc-badge text-xs', plan.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500')}>
                    {plan.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Subscriptions tab */}
      {tab === 'subscriptions' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="p-4 border-b border-gray-100 flex items-center gap-3">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input className="vc-input pl-9 py-1.5 text-sm" value={searchSub} onChange={e => setSearchSub(e.target.value)} placeholder="Search by tenant ID…" />
            </div>
          </div>
          {subsLoading ? (
            <div className="p-12 text-center text-gray-400">Loading subscriptions…</div>
          ) : (
            <table className="vc-table">
              <thead><tr><th>Tenant ID</th><th>Plan</th><th>Billing</th><th>Status</th><th>Period End</th></tr></thead>
              <tbody>
                {(Array.isArray(subscriptions) ? subscriptions : [])
                  .filter(s => !searchSub || s.tenantId.includes(searchSub))
                  .map((sub) => {
                    const cfg = SUBSCRIPTION_STATUS[sub.status] ?? SUBSCRIPTION_STATUS.cancelled;
                    const StatusIcon = cfg.icon;
                    return (
                      <tr key={sub.id}>
                        <td className="font-mono text-xs">{sub.tenantId.slice(0, 12)}…</td>
                        <td>{sub.planId.slice(0, 12)}…</td>
                        <td className="capitalize">{sub.billingCycle}</td>
                        <td>
                          <span className={clsx('vc-badge flex items-center gap-1 w-fit', cfg.color)}>
                            <StatusIcon className="w-3 h-3" />
                            {cfg.label}
                          </span>
                        </td>
                        <td className="text-sm">{sub.currentPeriodEnd ? new Date(sub.currentPeriodEnd).toLocaleDateString('en-KE') : '—'}</td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Invoices tab */}
      {tab === 'invoices' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          {invLoading ? (
            <div className="p-12 text-center text-gray-400">Loading invoices…</div>
          ) : (
            <table className="vc-table">
              <thead><tr><th>Invoice ID</th><th>Tenant</th><th>Amount (KES)</th><th>Status</th><th>Due</th><th>Paid</th></tr></thead>
              <tbody>
                {(Array.isArray(invoices) ? invoices : []).map((inv) => {
                  const cfg = INVOICE_STATUS[inv.status] ?? INVOICE_STATUS.pending;
                  return (
                    <tr key={inv.id}>
                      <td className="font-mono text-xs">{inv.id.slice(0, 12)}…</td>
                      <td className="font-mono text-xs">{inv.tenantId.slice(0, 12)}…</td>
                      <td className="font-medium">{new Intl.NumberFormat('en-KE').format(inv.amountKes)}</td>
                      <td><span className={clsx('vc-badge', cfg.color)}>{cfg.label}</span></td>
                      <td className="text-sm">{inv.dueDate ? new Date(inv.dueDate).toLocaleDateString('en-KE') : '—'}</td>
                      <td className="text-sm">{inv.paidAt ? new Date(inv.paidAt).toLocaleDateString('en-KE') : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}
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
