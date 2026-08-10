import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { UserCheck, Plus, Mail } from 'lucide-react';
import { apiClient } from '../api/apiClient';
import { PageErrorBoundary } from '../components/PageErrorBoundary';

function CoordinatorsPageContent(): React.JSX.Element {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ email: '', name: '', region: '', role: 'CAMPAIGN_COORDINATOR' });

  const { data: coordinators } = useQuery({ queryKey: ['coordinators'], queryFn: () => apiClient.get('/identity/users?role=CAMPAIGN_COORDINATOR').then(r => r.data?.data ?? []) });

  const inviteMutation = useMutation({
    mutationFn: (payload: typeof form) => apiClient.post('/identity/invitations', payload),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['coordinators'] }); setShowForm(false); },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h2 className="text-xl font-bold text-gray-900">Campaign Coordinators</h2><p className="text-sm text-gray-500">Manage regional campaign coordinators and their access</p></div>
        <button onClick={() => setShowForm(true)} className="vc-btn-primary gap-2"><Plus className="w-4 h-4" />Invite Coordinator</button>
      </div>

      {showForm && (
        <div className="vc-card border-violet-200">
          <h3 className="text-base font-semibold text-gray-900 mb-4">Invite Campaign Coordinator</h3>
          <form onSubmit={(e) => { e.preventDefault(); inviteMutation.mutate(form); }} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div><label className="vc-label">Full Name</label><input className="vc-input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required /></div>
              <div><label className="vc-label">Email</label><input className="vc-input" type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} required /></div>
              <div><label className="vc-label">Region (County/Constituency)</label><input className="vc-input" value={form.region} onChange={e => setForm({...form, region: e.target.value})} placeholder="e.g. Nairobi County" /></div>
            </div>
            <div className="flex gap-3"><button type="submit" disabled={inviteMutation.isPending} className="vc-btn-primary gap-2"><Mail className="w-4 h-4" />{inviteMutation.isPending ? 'Sending…' : 'Send Invitation'}</button><button type="button" onClick={() => setShowForm(false)} className="vc-btn-secondary">Cancel</button></div>
          </form>
        </div>
      )}

      <div className="vc-card">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2"><UserCheck className="w-4 h-4 text-violet-600" />Coordinators ({coordinators?.length ?? 0})</h3>
        {!coordinators || coordinators.length === 0 ? (
          <div className="text-center py-12"><UserCheck className="w-12 h-12 text-gray-200 mx-auto mb-3" /><p className="text-gray-400">No coordinators invited yet</p></div>
        ) : (
          <table className="vc-table">
            <thead><tr><th>Name</th><th>Email</th><th>Region</th><th>Status</th></tr></thead>
            <tbody>
              {coordinators.map((c: any) => (
                <tr key={c.id}><td className="font-medium">{c.name ?? c.firstName + ' ' + c.lastName}</td><td>{c.email}</td><td>{c.region ?? '—'}</td><td><span className="vc-badge bg-violet-100 text-violet-700">Active</span></td></tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export function CoordinatorsPage() {
  return (
    <PageErrorBoundary page="Coordinators">
      <CoordinatorsPageContent />
    </PageErrorBoundary>
  );
}
