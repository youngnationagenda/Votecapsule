import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Image, ShieldCheck, Clock, Brain } from 'lucide-react';
import { apiClient } from '../api/apiClient';

const STATUS_BADGE: Record<string, string> = {
  UPLOADED: 'bg-blue-100 text-blue-700',
  AI_PROCESSING: 'bg-purple-100 text-purple-700',
  PENDING_VALIDATION: 'bg-amber-100 text-amber-700',
  APPROVED: 'bg-emerald-100 text-emerald-700',
  ANCHORED: 'bg-teal-100 text-teal-700',
  REJECTED: 'bg-red-100 text-red-700',
};

export function EvidenceCapsulesPage(): React.JSX.Element {
  const { data: capsules, isLoading } = useQuery({
    queryKey: ['candidate', 'evidence-capsules'],
    queryFn: () => apiClient.get('/evidence/capsules').then(r => r.data?.data ?? []),
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Evidence Capsules</h2>
        <p className="text-sm text-gray-500 mt-1">All capsules submitted by your campaign agents for your position</p>
      </div>

      <div className="vc-card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Image className="w-4 h-4 text-amber-600" />
            <h3 className="font-semibold text-gray-900">Capsules ({capsules?.length ?? 0})</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(STATUS_BADGE).map(([status, cls]) => (
              <span key={status} className={`vc-badge text-xs ${cls}`}>{status.replace(/_/g, ' ')}</span>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <Image className="w-8 h-8 text-gray-200 mx-auto mb-2 animate-pulse" />
            <p className="text-gray-400 text-sm">Loading capsules…</p>
          </div>
        ) : !capsules || capsules.length === 0 ? (
          <div className="text-center py-12">
            <Image className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No capsules submitted yet</p>
            <p className="text-sm text-gray-400 mt-1">Capsules will appear here as agents submit evidence from polling stations</p>
          </div>
        ) : (
          <table className="vc-table">
            <thead>
              <tr>
                <th>Station Code</th>
                <th>Position</th>
                <th>Captured At</th>
                <th>Status</th>
                <th>AI Flag</th>
                <th>Integrity</th>
              </tr>
            </thead>
            <tbody>
              {capsules.map((c: any) => (
                <tr key={c.id}>
                  <td className="font-mono text-xs font-medium">{c.pollingStationCode ?? '—'}</td>
                  <td className="text-sm">{c.positionCode ?? c.position ?? '—'}</td>
                  <td className="text-xs text-gray-500">
                    {c.capturedAt ? new Date(c.capturedAt).toLocaleString() : c.createdAt ? new Date(c.createdAt).toLocaleString() : '—'}
                  </td>
                  <td>
                    <span className={`vc-badge ${STATUS_BADGE[c.status] ?? 'bg-gray-100 text-gray-500'}`}>
                      {(c.status ?? 'UNKNOWN').replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td>
                    {c.aiFlagged ? (
                      <span className="vc-badge bg-red-100 text-red-700 flex items-center gap-1 w-fit">
                        <Brain className="w-3 h-3" />Flagged
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">Clear</span>
                    )}
                  </td>
                  <td>
                    {c.anchoredAt ? (
                      <span className="vc-badge bg-teal-100 text-teal-700 flex items-center gap-1 w-fit">
                        <ShieldCheck className="w-3 h-3" />Anchored
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />Pending
                      </span>
                    )}
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
