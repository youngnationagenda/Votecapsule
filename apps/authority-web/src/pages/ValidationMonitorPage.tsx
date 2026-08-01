import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { CheckSquare, Clock, AlertTriangle, User } from 'lucide-react';
import { apiClient } from '../api/apiClient';

export function ValidationMonitorPage(): React.JSX.Element {
  const { data: queue } = useQuery({
    queryKey: ['validation', 'queue'],
    queryFn: () => apiClient.get('/evidence/capsules?status=AI_VERIFIED').then((r) => r.data?.data ?? []),
    refetchInterval: 15_000,
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Validation Monitor</h2>
        <p className="text-sm text-gray-500 mt-1">Queue status and validator performance — live view</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {[
          { label: 'Awaiting Validation', value: queue?.length ?? 0, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Validated Today', value: 0, icon: CheckSquare, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Escalated', value: 0, icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-50' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="vc-stat-card flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl ${bg} flex items-center justify-center flex-shrink-0`}>
              <Icon className={`w-6 h-6 ${color}`} />
            </div>
            <div>
              <p className="text-sm text-gray-500">{label}</p>
              <p className="text-2xl font-bold text-gray-900">{value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="vc-card">
        <h3 className="text-base font-semibold text-gray-900 mb-4">Validation Queue</h3>
        {!queue || queue.length === 0 ? (
          <div className="text-center py-12">
            <CheckSquare className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400">Validation queue is empty</p>
            <p className="text-sm text-gray-400 mt-1">Capsules requiring human review will appear here</p>
          </div>
        ) : (
          <table className="vc-table">
            <thead><tr><th>Capsule ID</th><th>Station</th><th>Submitted</th><th>AI Score</th><th>Assigned To</th><th>Status</th></tr></thead>
            <tbody>
              {queue.map((item: any) => (
                <tr key={item.id}>
                  <td className="font-mono text-xs">{item.id?.substring(0, 8)}…</td>
                  <td>{item.pollingStationCode ?? '—'}</td>
                  <td>{item.createdAt ? new Date(item.createdAt).toLocaleString() : '—'}</td>
                  <td>
                    <span className={`vc-badge ${(item.aiConfidenceScore ?? 0) > 0.8 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                      {item.aiConfidenceScore ? `${(item.aiConfidenceScore * 100).toFixed(0)}%` : '—'}
                    </span>
                  </td>
                  <td>
                    <div className="flex items-center gap-1.5 text-gray-600">
                      <User className="w-3 h-3" />
                      <span className="text-xs">{item.assignedValidator ?? 'Unassigned'}</span>
                    </div>
                  </td>
                  <td><span className="vc-badge bg-blue-100 text-blue-700">{item.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
