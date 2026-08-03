import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Settings, CheckCircle, AlertTriangle, Info } from 'lucide-react';
import { apiClient } from '../api/apiClient';
import { useAppSelector } from '../store/hooks';

const PLAN_FEATURES: Record<string, string[]> = {
  STANDARD: [
    'Up to 50 candidate registrations',
    'Up to 200 capsule agents',
    'Live results dashboard',
    'Analytics and reporting',
    'Email support',
  ],
  PROFESSIONAL: [
    'Unlimited candidate registrations',
    'Unlimited capsule agents',
    'Live results + AI risk analysis',
    'Advanced analytics and exports',
    'Priority support + dedicated CSM',
    'API access for integrations',
  ],
  ENTERPRISE: [
    'Everything in Professional',
    'Custom SLA',
    'White-label option',
    'On-premise deployment support',
    'Audit trail exports',
    'Dedicated infrastructure',
  ],
};

export function SubscriptionPage(): React.JSX.Element {
  const user = useAppSelector((s: any) => s.auth.user);
  const tenantId = user?.tenantId ?? '';

  const { data: subscription, isLoading } = useQuery({
    queryKey: ['billing', 'subscription-detail', tenantId],
    queryFn: () => apiClient.get(`/billing/subscriptions/tenant/${tenantId}/active`).then(r => r.data?.data ?? null),
    enabled: !!tenantId,
  });

  const isActive = subscription?.status === 'ACTIVE';
  const planKey = (subscription?.planName ?? 'STANDARD').toUpperCase();
  const features = PLAN_FEATURES[planKey] ?? PLAN_FEATURES.STANDARD;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Subscription Management</h2>
        <p className="text-sm text-gray-500 mt-1">Current plan, features, and upgrade options</p>
      </div>

      <div className="vc-card">
        <div className="flex items-center gap-2 mb-4">
          <Settings className="w-4 h-4 text-violet-600" />
          <h3 className="font-semibold text-gray-900">Current Plan</h3>
        </div>
        {isLoading ? (
          <div className="text-center py-10"><Settings className="w-8 h-8 text-gray-200 mx-auto mb-2 animate-pulse" /><p className="text-gray-400 text-sm">Loading…</p></div>
        ) : subscription ? (
          <>
            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <span className="text-sm font-semibold text-gray-700">Plan</span>
              <span className="text-sm font-bold text-gray-900">{subscription.planName ?? 'Standard'}</span>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <span className="text-sm text-gray-600">Status</span>
              <span className={`vc-badge flex items-center gap-1 ${isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                {isActive ? <CheckCircle className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                {subscription.status ?? 'UNKNOWN'}
              </span>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <span className="text-sm text-gray-600">Period End</span>
              <span className="text-sm text-gray-900">{subscription.periodEnd ? new Date(subscription.periodEnd).toLocaleDateString() : '—'}</span>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <span className="text-sm text-gray-600">Candidates Allowed</span>
              <span className="text-sm text-gray-900">{subscription.candidateLimit ?? 'Unlimited'}</span>
            </div>
            <div className="flex items-center justify-between py-3">
              <span className="text-sm text-gray-600">Agents Allowed</span>
              <span className="text-sm text-gray-900">{subscription.agentLimit ?? 'Unlimited'}</span>
            </div>
          </>
        ) : (
          <div className="text-center py-10"><CheckCircle className="w-12 h-12 text-gray-200 mx-auto mb-3" /><p className="text-gray-400">No active subscription found</p></div>
        )}
      </div>

      <div className="vc-card">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Included Features</h3>
        <ul className="space-y-2">
          {features.map(f => (
            <li key={f} className="flex items-center gap-2 text-sm text-gray-700">
              <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />{f}
            </li>
          ))}
        </ul>
      </div>

      <div className="bg-violet-50 border border-violet-200 rounded-xl px-4 py-4 flex items-start gap-3">
        <Info className="w-5 h-5 text-violet-500 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-sm font-semibold text-violet-900">Need to upgrade?</p>
          <p className="text-xs text-violet-700 mt-1">Contact <span className="font-medium">sales@votecapsule.com</span> or speak to your VoteCapsule™ account manager to upgrade your plan or adjust your agent and candidate limits.</p>
        </div>
      </div>
    </div>
  );
}
