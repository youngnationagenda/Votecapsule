import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle, XCircle, Clock, Search, Filter } from 'lucide-react';
import { apiClient } from '../api/apiClient';

export function CandidateApprovalPage(): React.JSX.Element {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('PENDING');

  const { data: candidates, isLoading } = useQuery({
    queryKey: ['candidates', 'approval', statusFilter],
    queryFn: () => apiClient.get(`/candidate/candidates?status=${statusFilter}`).then((r) => r.data?.data ?? r.data ?? []),
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => apiClient.patch(`/candidate/candidates/${id}/approve`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['candidates', 'approval'] }),
  });
  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => apiClient.patch(`/candidate/candidates/${id}/reject`, { reason }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['candidates', 'approval'] }),
  });

  const filtered = (candidates ?? []).filter((c: any) =>
    !search || `${c.firstName} ${c.lastName}`.toLowerCase().includes(search.toLowerCase())
  );

  const statusBadge = (s: string) => {
    const m: Record<string, string> = { PENDING: 'bg-amber-100 text-amber-700', APPROVED: 'bg-emerald-100 text-emerald-700', REJECTED: 'bg-red-100 text-red-700' };
    return m[s] ?? 'bg-gray-100 text-gray-600';
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Candidate Approval</h2>
        <p className="text-sm text-gray-500 mt-1">Review and approve/reject candidate registrations</p>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input className="vc-input pl-9" placeholder="Search candidates…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-2">
          {['ALL', 'PENDING', 'APPROVED', 'REJECTED'].map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${statusFilter === s ? 'bg-emerald-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="vc-card">
        {isLoading ? (
          <div className="text-center py-12 text-gray-500">Loading candidates…</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No candidates found</p>
          </div>
        ) : (
          <table className="vc-table">
            <thead>
              <tr>
                <th>Candidate</th><th>Position</th><th>Party</th><th>County</th><th>Status</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c: any) => (
                <tr key={c.id}>
                  <td className="font-medium">{c.firstName} {c.lastName}</td>
                  <td>{c.position ?? '—'}</td>
                  <td>{c.partyName ?? 'Independent'}</td>
                  <td>{c.county ?? '—'}</td>
                  <td><span className={`vc-badge ${statusBadge(c.status)}`}>{c.status}</span></td>
                  <td>
                    {c.status === 'PENDING' && (
                      <div className="flex gap-2">
                        <button onClick={() => approveMutation.mutate(c.id)}
                          className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100" title="Approve">
                          <CheckCircle className="w-4 h-4" />
                        </button>
                        <button onClick={() => rejectMutation.mutate({ id: c.id, reason: 'Documentation incomplete' })}
                          className="p-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100" title="Reject">
                          <XCircle className="w-4 h-4" />
                        </button>
                      </div>
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
