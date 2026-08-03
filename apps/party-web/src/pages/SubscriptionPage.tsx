import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Settings, CheckCircle } from 'lucide-react';
import { apiClient } from '../api/apiClient';

export function SubscriptionPage(): React.JSX.Element {
  const { data: subscription } = useQuery({ queryKey: ['subscription'], queryFn: () => apiClient.get('/billing/subscriptions/tenant/' + (user?.tenantId ?? '')).then(r => r.data?.data ?? null) });

  return (
    <div className="space-y-6">
      <div><h2 className="text-xl font-bold text-gray-900">Subscription Management</h2><p className="text-sm text-gray-500">View your current license and plan details</p></div>
      <div className="vc-card">
        <div className="flex items-center gap-2 mb-4"><Settings className="w-4 h-4 text-violet-600" /><h3 className="font-semibold text-gray-900">Current Plan</h3></div>
        {subscription ? (
          <div className="space-y-3">
            {[['Plan', subscription.plan], ['Status', subscription.status], ['Valid Until', subscription.validUntil ? new Date(subscription.validUntil).toLocaleDateString() : '—'], ['Candidates Allowed', subscription.candidateLimit ?? 'Unlimited'], ['Agents Allowed', subscription.agentLimit ?? 'Unlimited']].map(([k, v]) => (
              <div key={k} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <span className="text-sm text-gray-600">{k}</span><span className="text-sm font-semibold text-gray-900">{v}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12"><CheckCircle className="w-12 h-12 text-gray-200 mx-auto mb-3" /><p className="text-gray-400">No subscription data available</p></div>
        )}
      </div>
    </div>
  );
}
