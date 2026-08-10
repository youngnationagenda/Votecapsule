/**
 * Vote Capsule™ Admin Portal — Tenants List Page
 *
 * Full CRUD tenant management with filters by type/status/search.
 */

import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Plus, Search, Filter, Building2, ChevronRight,
  CheckCircle2, XCircle, Clock, MoreHorizontal,
} from 'lucide-react';
import { tenantApi, type Tenant } from '../api/tenantApi';
import { clsx } from 'clsx';
import { PageErrorBoundary } from '../components/PageErrorBoundary';

const TENANT_TYPE_LABELS: Record<string, string> = {
  election_authority: 'Election Authority',
  political_party: 'Political Party',
  observer: 'Observer',
  media: 'Media',
  independent_candidate: 'Independent Candidate',
  civil_society: 'Civil Society',
  government_agency: 'Government Agency',
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  active: { label: 'Active', color: 'text-emerald-700 bg-emerald-50', icon: CheckCircle2 },
  suspended: { label: 'Suspended', color: 'text-amber-700 bg-amber-50', icon: Clock },
  deactivated: { label: 'Deactivated', color: 'text-red-700 bg-red-50', icon: XCircle },
  pending: { label: 'Pending', color: 'text-blue-700 bg-blue-50', icon: Clock },
};

function TenantsPageContent(): React.JSX.Element {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading, error } = useQuery({
    queryKey: ['tenants', page],
    queryFn: () => tenantApi.findAll({ page, limit: 20 }),
  });

  const filteredTenants = (data?.data ?? []).filter((tenant) => {
    const matchesSearch = !search || tenant.name.toLowerCase().includes(search.toLowerCase());
    const matchesType = !typeFilter || tenant.type === typeFilter;
    const matchesStatus = !statusFilter || tenant.status === statusFilter;
    return matchesSearch && matchesType && matchesStatus;
  });

  const handleTenantClick = useCallback(
    (id: string) => navigate(`/tenants/${id}`),
    [navigate],
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tenants</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage all customer organizations on the platform
          </p>
        </div>
        <button
          onClick={() => navigate('/tenants/new')}
          className="vc-btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" aria-hidden="true" />
          New Tenant
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tenants…"
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-[#0B3C6D]"
            aria-label="Search tenants"
          />
        </div>

        {/* Type filter */}
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="text-sm border border-gray-200 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#0B3C6D] text-gray-700"
          aria-label="Filter by type"
        >
          <option value="">All Types</option>
          {Object.entries(TENANT_TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>

        {/* Status filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="text-sm border border-gray-200 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#0B3C6D] text-gray-700"
          aria-label="Filter by status"
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="deactivated">Deactivated</option>
          <option value="pending">Pending</option>
        </select>

        <span className="text-sm text-gray-400 ml-auto">
          {filteredTenants.length} result{filteredTenants.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Tenants Table */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">Loading tenants…</div>
        ) : error ? (
          <div className="p-8 text-center text-red-600">Failed to load tenants. Check API connection.</div>
        ) : filteredTenants.length === 0 ? (
          <div className="p-8 text-center">
            <Building2 className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No tenants found</p>
            <p className="text-sm text-gray-400 mt-1">
              {search || typeFilter || statusFilter
                ? 'Try adjusting your filters'
                : 'Create your first tenant to get started'}
            </p>
            {!search && !typeFilter && !statusFilter && (
              <button onClick={() => navigate('/tenants/new')} className="vc-btn-primary mt-4">
                Create First Tenant
              </button>
            )}
          </div>
        ) : (
          <table className="w-full" role="table">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Organization
                </th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Type
                </th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Status
                </th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">
                  Country
                </th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">
                  Created
                </th>
                <th className="w-12 px-5 py-3" aria-label="Actions" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredTenants.map((tenant: Tenant) => {
                const statusCfg = STATUS_CONFIG[tenant.status] ?? STATUS_CONFIG.active!;
                const StatusIcon = statusCfg.icon;
                return (
                  <tr
                    key={tenant.id}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => handleTenantClick(tenant.id)}
                    role="row"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && handleTenantClick(tenant.id)}
                    aria-label={`View tenant ${tenant.name}`}
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-[#F5F7FA] border border-gray-200 rounded-md flex items-center justify-center flex-shrink-0">
                          <Building2 className="w-4 h-4 text-[#0B3C6D]" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{tenant.name}</p>
                          <p className="text-xs text-gray-400 font-mono">{tenant.slug}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-sm text-gray-600">
                        {TENANT_TYPE_LABELS[tenant.type] ?? tenant.type}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className={clsx('vc-badge gap-1', statusCfg.color)}>
                        <StatusIcon className="w-3 h-3" />
                        {statusCfg.label}
                      </span>
                    </td>
                    <td className="px-5 py-4 hidden sm:table-cell">
                      <span className="text-sm text-gray-600">{tenant.countryCode}</span>
                    </td>
                    <td className="px-5 py-4 hidden lg:table-cell">
                      <span className="text-sm text-gray-500">
                        {new Date(tenant.createdAt).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <ChevronRight className="w-4 h-4 text-gray-300 ml-auto" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {data && data.meta.totalPages > 1 && (
          <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between">
            <span className="text-sm text-gray-500">
              Page {data.meta.page} of {data.meta.totalPages} ({data.meta.total} total)
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={!data.meta.hasPreviousPage}
                className="vc-btn-secondary text-xs py-1 px-3 disabled:opacity-40"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={!data.meta.hasNextPage}
                className="vc-btn-secondary text-xs py-1 px-3 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function TenantsPage() {
  return (
    <PageErrorBoundary page="Tenants">
      <TenantsPageContent />
    </PageErrorBoundary>
  );
}
