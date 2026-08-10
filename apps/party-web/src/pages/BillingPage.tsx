import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { CreditCard, Download, CheckCircle, AlertTriangle, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../api/apiClient';
import { useAppSelector } from '../store/hooks';
import { PageErrorBoundary } from '../components/PageErrorBoundary';

function BillingPageContent(): React.JSX.Element {
  const user = useAppSelector((s: any) => s.auth.user);
  const tenantId = user?.tenantId ?? '';
  const navigate = useNavigate();

  const { data: invoices, isLoading: loadingInvoices } = useQuery({
    queryKey: ['billing', 'invoices'],
    queryFn: () => apiClient.get('/billing/invoices').then(r => r.data?.data ?? []),
  });

  const { data: subscription } = useQuery({
    queryKey: ['billing', 'subscription', tenantId],
    queryFn: () => apiClient.get(`/billing/subscriptions/tenant/${tenantId}/active`).then(r => r.data?.data ?? null),
    enabled: !!tenantId,
  });

  const isActive = subscription?.status === 'ACTIVE';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Billing</h2>
          <p className="text-sm text-gray-500 mt-1">Subscription status, invoices, and payment history</p>
        </div>
        <button onClick={() => navigate('/subscription')} className="vc-btn-primary gap-2 text-sm">
          <ArrowRight className="w-4 h-4" />Upgrade Plan
        </button>
      </div>

      {subscription && (
        <div className={`vc-card border ${isActive ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isActive
                ? <CheckCircle className="w-6 h-6 text-emerald-500" />
                : <AlertTriangle className="w-6 h-6 text-red-500" />}
              <div>
                <p className="text-sm font-semibold text-gray-900">{subscription.planName ?? 'Standard Plan'}</p>
                <p className="text-xs text-gray-600 mt-0.5">
                  {subscription.periodEnd ? `Renews ${new Date(subscription.periodEnd).toLocaleDateString()}` : 'Contact support'}
                </p>
              </div>
            </div>
            <span className={`vc-badge ${isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
              {subscription.status ?? 'UNKNOWN'}
            </span>
          </div>
        </div>
      )}

      <div className="vc-card">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-violet-600" />Invoices
        </h3>
        {loadingInvoices ? (
          <div className="text-center py-10"><CreditCard className="w-8 h-8 text-gray-200 mx-auto mb-2 animate-pulse" /><p className="text-gray-400 text-sm">Loading invoices…</p></div>
        ) : !invoices || invoices.length === 0 ? (
          <div className="text-center py-12"><CreditCard className="w-12 h-12 text-gray-200 mx-auto mb-3" /><p className="text-gray-400">No invoices yet</p></div>
        ) : (
          <table className="vc-table">
            <thead>
              <tr><th>Invoice #</th><th>Date</th><th>Amount</th><th>Status</th><th>Download</th></tr>
            </thead>
            <tbody>
              {invoices.map((inv: any) => (
                <tr key={inv.id}>
                  <td className="font-mono text-xs">{inv.invoiceNumber ?? inv.id?.substring(0, 8)}</td>
                  <td className="text-sm">{inv.createdAt ? new Date(inv.createdAt).toLocaleDateString() : '—'}</td>
                  <td className="text-sm font-medium">KES {(inv.amount ?? 0).toLocaleString()}</td>
                  <td>
                    <span className={`vc-badge ${inv.status === 'PAID' ? 'bg-emerald-100 text-emerald-700' : inv.status === 'OVERDUE' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                      {inv.status ?? 'PENDING'}
                    </span>
                  </td>
                  <td>
                    <button className="p-1.5 rounded bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors" title="Download invoice">
                      <Download className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export function BillingPage() {
  return (
    <PageErrorBoundary page="Billing">
      <BillingPageContent />
    </PageErrorBoundary>
  );
}
