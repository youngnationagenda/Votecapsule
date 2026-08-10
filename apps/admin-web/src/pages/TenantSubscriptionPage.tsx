import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, CreditCard } from 'lucide-react';
import { tenantApi } from '../api/tenantApi';
import { PageErrorBoundary } from '../components/PageErrorBoundary';

function TenantSubscriptionPageContent(): React.JSX.Element {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: subscription, isLoading } = useQuery({
    queryKey: ['tenant-subscription', id],
    queryFn: () => tenantApi.getSubscription(id!),
    enabled: !!id,
  });

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(`/tenants/${id}`)} className="p-2 rounded-md hover:bg-gray-100" aria-label="Back">
          <ArrowLeft className="w-4 h-4 text-gray-600" />
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Subscription</h1>
      </div>
      <div className="bg-white rounded-lg border border-gray-200 p-5 shadow-sm">
        {isLoading ? (
          <p className="text-gray-500">Loading subscription…</p>
        ) : !subscription ? (
          <div className="text-center py-8">
            <CreditCard className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500">No active subscription</p>
            <button className="vc-btn-primary mt-4">Create Subscription</button>
          </div>
        ) : (
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div><dt className="text-gray-500">Plan</dt><dd className="font-medium mt-1 capitalize">{(subscription as Record<string, unknown>)['plan'] as string}</dd></div>
            <div><dt className="text-gray-500">Status</dt><dd className="font-medium mt-1 capitalize">{(subscription as Record<string, unknown>)['status'] as string}</dd></div>
            <div><dt className="text-gray-500">Billing Cycle</dt><dd className="font-medium mt-1">{(subscription as Record<string, unknown>)['billingCycle'] as string ?? '—'}</dd></div>
            <div><dt className="text-gray-500">Max Users</dt><dd className="font-medium mt-1">{(subscription as Record<string, unknown>)['maxUsers'] as string ?? 'Unlimited'}</dd></div>
          </dl>
        )}
      </div>
    </div>
  );
}

export function TenantSubscriptionPage() {
  return (
    <PageErrorBoundary page="Tenant Subscription">
      <TenantSubscriptionPageContent />
    </PageErrorBoundary>
  );
}
