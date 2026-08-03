/**
 * Vote Capsule™ Admin Portal — Audit Log Page
 * Real-time platform activity log from the Audit Service.
 */
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileText, Search, CheckCircle2, XCircle, RefreshCw } from 'lucide-react';
import { clsx } from 'clsx';
import { auditClient } from '../api/apiClient';

interface AuditLog {
  id: string;
  tenantId: string | null;
  userId: string | null;
  action: string;
  resourceType: string;
  serviceName: string;
  method: string | null;
  endpoint: string | null;
  status: string;
  durationMs: number | null;
  errorCode: string | null;
  createdAt: string;
}

const SERVICE_NAMES = [
  'identity-service','tenant-service','trust-service','geography-service',
  'evidence-service','ai-service','workflow-service','notification-service',
  'candidate-service','reporting-service','election-service','audit-service','billing-service',
];

const METHOD_COLORS: Record<string, string> = {
  GET: 'text-blue-700 bg-blue-50', POST: 'text-emerald-700 bg-emerald-50',
  PATCH: 'text-amber-700 bg-amber-50', PUT: 'text-amber-700 bg-amber-50',
  DELETE: 'text-red-700 bg-red-50',
};

export function AuditLogPage(): React.JSX.Element {
  const [serviceFilter, setServiceFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [limit, setLimit] = useState(50);

  const { data: logs, isLoading, refetch, isFetching } = useQuery<AuditLog[]>({
    queryKey: ['audit-logs', serviceFilter, statusFilter, limit],
    queryFn: () =>
      auditClient.get<any>('/logs', {
        params: { limit, ...(serviceFilter ? { serviceName: serviceFilter } : {}), ...(statusFilter ? { status: statusFilter } : {}) },
      }).then(r => r.data?.items ?? r.data?.data ?? r.data ?? []),
    retry: 1, staleTime: 15_000, refetchInterval: 30_000,
  });

  const filtered = (logs ?? []).filter(log =>
    !search || log.action.toLowerCase().includes(search.toLowerCase()) ||
    (log.endpoint ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const successCount = (logs ?? []).filter(l => l.status === 'SUCCESS').length;
  const failureCount = (logs ?? []).filter(l => l.status === 'FAILURE').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Audit Log</h1>
          <p className="text-sm text-gray-500 mt-1">Platform-wide activity across all 13 services (auto-refreshes every 30s)</p>
        </div>
        <button onClick={() => refetch()} disabled={isFetching}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50">
          <RefreshCw className={clsx('w-4 h-4', isFetching && 'animate-spin')} />Refresh
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Requests Shown</div>
          <div className="text-2xl font-bold text-gray-900">{(logs ?? []).length}</div>
        </div>
        <div className="bg-white rounded-xl border border-emerald-200 p-5 shadow-sm">
          <div className="flex items-center gap-1.5 text-xs text-emerald-700 uppercase mb-1"><CheckCircle2 className="w-3 h-3" />Success</div>
          <div className="text-2xl font-bold text-emerald-700">{successCount}</div>
        </div>
        <div className="bg-white rounded-xl border border-red-200 p-5 shadow-sm">
          <div className="flex items-center gap-1.5 text-xs text-red-700 uppercase mb-1"><XCircle className="w-3 h-3" />Failures</div>
          <div className="text-2xl font-bold text-red-700">{failureCount}</div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="p-4 border-b border-gray-100 flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input className="vc-input pl-9 py-1.5 text-sm" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search action or endpoint…" />
          </div>
          <select className="vc-input py-1.5 text-sm w-auto min-w-[160px]" value={serviceFilter} onChange={e => setServiceFilter(e.target.value)}>
            <option value="">All Services</option>
            {SERVICE_NAMES.map(s => <option key={s} value={s}>{s.replace('-service','')}</option>)}
          </select>
          <select className="vc-input py-1.5 text-sm w-auto" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="">All Statuses</option>
            <option value="SUCCESS">Success</option>
            <option value="FAILURE">Failure</option>
          </select>
          <select className="vc-input py-1.5 text-sm w-auto" value={limit} onChange={e => setLimit(parseInt(e.target.value))}>
            <option value={25}>Last 25</option><option value={50}>Last 50</option>
            <option value={100}>Last 100</option><option value={200}>Last 200</option>
          </select>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-gray-400">Loading audit logs…</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500">No audit logs yet</p>
            <p className="text-sm text-gray-400 mt-1">Logs appear as services receive requests. The AuditInterceptor writes one entry per HTTP request across all 13 services.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="vc-table">
              <thead>
                <tr><th>Time</th><th>Service</th><th>Method</th><th>Endpoint</th><th>Status</th><th>Duration</th><th>User</th></tr>
              </thead>
              <tbody>
                {filtered.map(log => (
                  <tr key={log.id}>
                    <td className="text-xs text-gray-500 whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString('en-KE', { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit', second:'2-digit' })}
                    </td>
                    <td><span className="vc-badge bg-gray-100 text-gray-600 text-xs">{(log.serviceName ?? '').replace('-service','')}</span></td>
                    <td>
                      {log.method
                        ? <span className={clsx('vc-badge text-xs font-mono', METHOD_COLORS[log.method] ?? 'text-gray-600 bg-gray-50')}>{log.method}</span>
                        : <span className="text-gray-400">—</span>}
                    </td>
                    <td className="font-mono text-xs text-gray-600 max-w-[200px] truncate">{log.endpoint ?? log.action ?? '—'}</td>
                    <td>
                      {log.status === 'SUCCESS'
                        ? <span className="flex items-center gap-1 text-emerald-700 text-xs"><CheckCircle2 className="w-3 h-3" />OK</span>
                        : <span className="flex items-center gap-1 text-red-700 text-xs"><XCircle className="w-3 h-3" />{log.errorCode ?? 'ERR'}</span>}
                    </td>
                    <td className="text-xs text-gray-500">{log.durationMs !== null ? `${log.durationMs}ms` : '—'}</td>
                    <td className="font-mono text-xs text-gray-500">{log.userId ? log.userId.slice(0,8)+'…' : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
