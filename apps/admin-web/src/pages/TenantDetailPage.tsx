import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Building2, Users, CreditCard, Settings, ExternalLink } from 'lucide-react';
import { tenantApi } from '../api/tenantApi';

export function TenantDetailPage(): React.JSX.Element {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: tenant, isLoading } = useQuery({
    queryKey: ['tenant', id],
    queryFn: () => tenantApi.findById(id!),
    enabled: !!id,
  });

  if (isLoading) return <div className="p-8 text-center text-gray-500">Loading tenant…</div>;
  if (!tenant) return <div className="p-8 text-center text-red-600">Tenant not found</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/tenants')} className="p-2 rounded-md hover:bg-gray-100" aria-label="Back">
          <ArrowLeft className="w-4 h-4 text-gray-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{tenant.name}</h1>
          <p className="text-sm text-gray-400 font-mono">{tenant.slug}</p>
        </div>
        <span className={`ml-auto vc-badge ${tenant.status === 'active' ? 'text-emerald-700 bg-emerald-50' : 'text-gray-700 bg-gray-100'}`}>
          {tenant.status}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Members', icon: Users, path: `/tenants/${id}/members` },
          { label: 'Subscription', icon: CreditCard, path: `/tenants/${id}/subscription` },
        ].map(({ label, icon: Icon, path }) => (
          <button
            key={label}
            onClick={() => navigate(path)}
            className="bg-white rounded-lg border border-gray-200 p-4 text-left hover:border-[#0B3C6D] hover:shadow-sm transition-all flex items-center gap-3"
          >
            <Icon className="w-5 h-5 text-[#0B3C6D]" />
            <span className="text-sm font-medium text-gray-700">{label}</span>
            <ExternalLink className="w-3 h-3 text-gray-300 ml-auto" />
          </button>
        ))}
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Organization Details</h3>
        <dl className="grid grid-cols-2 gap-4 text-sm">
          <div><dt className="text-gray-500">Type</dt><dd className="font-medium mt-1">{tenant.type}</dd></div>
          <div><dt className="text-gray-500">Country</dt><dd className="font-medium mt-1">{tenant.countryCode}</dd></div>
          <div><dt className="text-gray-500">Contact Email</dt><dd className="font-medium mt-1">{tenant.contactEmail ?? '—'}</dd></div>
          <div><dt className="text-gray-500">Contact Phone</dt><dd className="font-medium mt-1">{tenant.contactPhone ?? '—'}</dd></div>
          <div><dt className="text-gray-500">Created</dt><dd className="font-medium mt-1">{new Date(tenant.createdAt).toLocaleDateString()}</dd></div>
          <div><dt className="text-gray-500">Status</dt><dd className="font-medium mt-1 capitalize">{tenant.status}</dd></div>
        </dl>
      </div>
    </div>
  );
}
