import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MapPin, Plus, User } from 'lucide-react';
import { apiClient } from '../api/apiClient';
import { useAppSelector } from '../store/hooks';

export function AgentAssignmentsPage(): React.JSX.Element {
  const qc = useQueryClient();
  const user = useAppSelector(s => s.auth.user);
  const tenantId = user?.tenantId ?? '';
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ email: '', roleCode: 'CAPSULE_AGENT', pollingStationCode: '' });

  // Get candidates registered under this party to see agent assignments
  const { data: candidates, isLoading } = useQuery({
    queryKey: ['party', 'candidates', tenantId],
    queryFn: () => apiClient.get(`/candidate/candidates?tenantId=${tenantId}`).then(r => r.data?.data ?? r.data ?? []),
    enabled: !!tenantId,
  });

  // Invite a new capsule agent via Identity Service
  const inviteMutation = useMutation({
    mutationFn: (payload: typeof form) =>
      apiClient.post('/identity/invitations', {
        email: payload.email,
        tenantId,
        roleCode: payload.roleCode,
        metadata: { pollingStationCode: payload.pollingStationCode },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['party', 'candidates'] });
      setShowForm(false);
      setForm({ email: '', roleCode: 'CAPSULE_AGENT', pollingStationCode: '' });
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Agent Assignments</h2>
          <p className="text-sm text-gray-500">Invite and manage capsule agents assigned to polling stations</p>
        </div>
        <button onClick={() => setShowForm(true)} className="vc-btn-primary gap-2">
          <Plus className="w-4 h-4" />Invite Agent
        </button>
      </div>

      {showForm && (
        <div className="vc-card border-violet-200">
          <h3 className="text-base font-semibold text-gray-900 mb-4">Invite Capsule Agent</h3>
          <form onSubmit={(e) => { e.preventDefault(); inviteMutation.mutate(form); }} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="vc-label">Agent Email</label>
                <input className="vc-input" type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} required />
              </div>
              <div>
                <label className="vc-label">Polling Station Code (optional)</label>
                <input className="vc-input" value={form.pollingStationCode} onChange={e => setForm({...form, pollingStationCode: e.target.value})} placeholder="15-digit IEBC code" />
              </div>
            </div>
            {inviteMutation.isError && <p className="text-sm text-red-600">Failed to send invitation. Please try again.</p>}
            {inviteMutation.isSuccess && <p className="text-sm text-emerald-600">Invitation sent successfully.</p>}
            <div className="flex gap-3">
              <button type="submit" disabled={inviteMutation.isPending} className="vc-btn-primary">{inviteMutation.isPending ? 'Sending…' : 'Send Invitation'}</button>
              <button type="button" onClick={() => setShowForm(false)} className="vc-btn-secondary">Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="vc-card">
        <div className="flex items-center gap-2 mb-4">
          <MapPin className="w-4 h-4 text-violet-600" />
          <h3 className="font-semibold text-gray-900">Registered Candidates ({Array.isArray(candidates) ? candidates.length : 0})</h3>
        </div>
        {isLoading ? (
          <div className="text-center py-12 text-gray-400">Loading…</div>
        ) : !candidates || candidates.length === 0 ? (
          <div className="text-center py-12">
            <User className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400">No candidates registered yet for this party</p>
          </div>
        ) : (
          <table className="vc-table">
            <thead><tr><th>Candidate</th><th>Position</th><th>County</th><th>Status</th></tr></thead>
            <tbody>
              {(Array.isArray(candidates) ? candidates : []).map((c: any) => (
                <tr key={c.id}>
                  <td className="font-medium">{c.fullName ?? c.firstName + " " + c.lastName ?? "—"}</td>
                  <td>{c.positionCode ?? c.position?.positionCode ?? "—"}</td>
                  <td>{c.countyName ?? "—"}</td>
                  <td>
                    <span className={`vc-badge ${c.status === "APPROVED" ? "bg-emerald-100 text-emerald-700" : c.status === "NOMINATED" ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"}`}>
                      {c.status ?? "PENDING"}
                    </span>
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
