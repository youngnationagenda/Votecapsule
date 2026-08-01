import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Eye, Mail, Plus, CheckCircle } from 'lucide-react';
import { apiClient } from '../api/apiClient';

export function ObserverCoordinationPage(): React.JSX.Element {
  const qc = useQueryClient();
  const [showInvite, setShowInvite] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: '', organization: '', accessLevel: 'NATIONAL' });

  const { data: observers } = useQuery({
    queryKey: ['observers'],
    queryFn: () => apiClient.get('/identity/users?role=OBSERVER').then((r) => r.data?.data ?? []),
  });

  const inviteMutation = useMutation({
    mutationFn: (payload: typeof inviteForm) => apiClient.post('/identity/invitations', { ...payload, role: 'OBSERVER' }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['observers'] }); setShowInvite(false); },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Observer Coordination</h2>
          <p className="text-sm text-gray-500 mt-1">Invite and manage accredited observer organizations</p>
        </div>
        <button onClick={() => setShowInvite(true)} className="vc-btn-primary gap-2">
          <Plus className="w-4 h-4" />Invite Observer
        </button>
      </div>

      {showInvite && (
        <div className="vc-card border-emerald-200">
          <h3 className="text-base font-semibold text-gray-900 mb-4">Invite Observer Organization</h3>
          <form onSubmit={(e) => { e.preventDefault(); inviteMutation.mutate(inviteForm); }} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="vc-label">Email</label>
                <input className="vc-input" type="email" value={inviteForm.email} onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })} required />
              </div>
              <div>
                <label className="vc-label">Organization</label>
                <input className="vc-input" value={inviteForm.organization} onChange={(e) => setInviteForm({ ...inviteForm, organization: e.target.value })} placeholder="e.g. African Union" required />
              </div>
              <div>
                <label className="vc-label">Access Level</label>
                <select className="vc-input" value={inviteForm.accessLevel} onChange={(e) => setInviteForm({ ...inviteForm, accessLevel: e.target.value })}>
                  <option value="NATIONAL">National</option>
                  <option value="COUNTY">County</option>
                  <option value="CONSTITUENCY">Constituency</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3">
              <button type="submit" disabled={inviteMutation.isPending} className="vc-btn-primary gap-2">
                <Mail className="w-4 h-4" />{inviteMutation.isPending ? 'Sending…' : 'Send Invitation'}
              </button>
              <button type="button" onClick={() => setShowInvite(false)} className="vc-btn-secondary">Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="vc-card">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2"><Eye className="w-4 h-4 text-sky-600" />Accredited Observers</h3>
        {!observers || observers.length === 0 ? (
          <div className="text-center py-12">
            <Eye className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400">No observers invited yet</p>
          </div>
        ) : (
          <table className="vc-table">
            <thead><tr><th>Organization</th><th>Email</th><th>Access Level</th><th>Status</th></tr></thead>
            <tbody>
              {observers.map((obs: any) => (
                <tr key={obs.id}>
                  <td className="font-medium">{obs.organization ?? obs.email}</td>
                  <td>{obs.email}</td>
                  <td><span className="vc-badge bg-sky-100 text-sky-700">{obs.accessLevel ?? 'NATIONAL'}</span></td>
                  <td><span className="vc-badge bg-emerald-100 text-emerald-700 flex items-center gap-1 w-fit"><CheckCircle className="w-3 h-3" />Active</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
