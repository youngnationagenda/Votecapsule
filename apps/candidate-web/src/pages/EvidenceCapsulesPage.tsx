import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Image, ShieldCheck } from 'lucide-react';
import { apiClient } from '../api/apiClient';

export function EvidenceCapsulesPage(): React.JSX.Element {
  const { data: capsules } = useQuery({ queryKey: ['candidate','evidence'], queryFn: () => apiClient.get('/evidence/capsules?scope=mine').then(r => r.data?.data ?? []) });

  const statusBadge: Record<string, string> = { SUBMITTED: 'bg-blue-100 text-blue-700', AI_VERIFIED: 'bg-violet-100 text-violet-700', APPROVED: 'bg-emerald-100 text-emerald-700', PUBLISHED: 'bg-navy-100 text-[#0B3C6D] bg-[#DBEAFE]', REJECTED: 'bg-red-100 text-red-700' };

  return (
    <div className="space-y-6">
      <div><h2 className="text-xl font-bold text-gray-900">Evidence Capsules</h2><p className="text-sm text-gray-500">View capsules from stations in your assigned jurisdiction</p></div>
      <div className="vc-card">
        <div className="flex items-center gap-2 mb-4"><Image className="w-4 h-4 text-amber-600" /><h3 className="font-semibold text-gray-900">Capsules ({capsules?.length ?? 0})</h3></div>
        {!capsules || capsules.length === 0 ? (
          <div className="text-center py-12"><Image className="w-12 h-12 text-gray-200 mx-auto mb-3" /><p className="text-gray-400">No capsules in your jurisdiction yet</p></div>
        ) : (
          <table className="vc-table">
            <thead><tr><th>Capsule ID</th><th>Station</th><th>Submitted</th><th>Status</th><th>Integrity</th></tr></thead>
            <tbody>
              {capsules.map((c: any) => (
                <tr key={c.id}>
                  <td className="font-mono text-xs">{c.id?.substring(0,8)}…</td>
                  <td>{c.pollingStationCode}</td>
                  <td>{c.createdAt ? new Date(c.createdAt).toLocaleString() : '—'}</td>
                  <td><span className={`vc-badge ${statusBadge[c.status] ?? 'bg-gray-100 text-gray-500'}`}>{c.status}</span></td>
                  <td>{c.anchoredAt ? <span className="vc-badge bg-emerald-100 text-emerald-700 flex items-center gap-1 w-fit"><ShieldCheck className="w-3 h-3" />Verified</span> : <span className="text-xs text-gray-400">Pending</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
