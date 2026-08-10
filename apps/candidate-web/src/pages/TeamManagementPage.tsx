import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Users, Mail, Plus, CheckCircle, UserPlus } from 'lucide-react';
import { apiClient } from '../api/apiClient';
import { PageErrorBoundary } from '../components/PageErrorBoundary';

const ROLES = ['CAMPAIGN_COORDINATOR', 'CAPSULE_AGENT'];

const ROLE_BADGE: Record<string, string> = {
  CAMPAIGN_COORDINATOR: 'bg-violet-100 text-violet-700',
  CAPSULE_AGENT: 'bg-sky-100 text-sky-700',
};

function TeamManagementPageContent(): React.JSX.Element {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', role: 'CAPSULE_AGENT' });
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const { data: members, isLoading } = useQuery({
    queryKey: ['candidate', 'team-members'],
    queryFn: () => apiClient.get('/identity/users').then(r => r.data?.data ?? []),
  });

  const inviteMutation = useMutation({
    mutationFn: (payload: typeof form) => apiClient.post('/identity/invitations', payload),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['candidate', 'team-members'] });
      setSuccessMsg(`Invitation sent to ${vars.email}`);
      setForm({ name: '', email: '', role: 'CAPSULE_AGENT' });
      setShowForm(false);
      setTimeout(() => setSuccessMsg(null), 4000);
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Team Management</h2>
          <p className="text-sm text-gray-500 mt-1">Manage your campaign coordinators and capsule agents</p>
        </div>
        <button onClick={() => setShowForm(v => !v)} className="vc-btn-primary gap-2 text-sm">
          <UserPlus className="w-4 h-4" />Invite Member
        </button>
      </div>

      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-500" />
          <p className="text-sm text-emerald-700">{successMsg}</p>
        </div>
      )}

      {showForm && (
        <div className="vc-card border-amber-200">
          <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Plus className="w-4 h-4 text-amber-600" />Invite Team Member
          </h3>
          <form
            onSubmit={(e) => { e.preventDefault(); inviteMutation.mutate(form); }}
            className="grid grid-cols-1 md:grid-cols-3 gap-4"
          >
            <div>
              <label className="vc-label">Full Name</label>
              <input className="vc-input" placeholder="Jane Wanjiku" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div>
              <label className="vc-label">Email Address</label>
              <input className="vc-input" type="email" placeholder="jane@example.com" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
            </div>
            <div>
              <label className="vc-label">Role</label>
              <select className="vc-input" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                {ROLES.map(r => <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
            <div className="md:col-span-3 flex items-center gap-3">
              <button type="submit" disabled={inviteMutation.isPending} className="vc-btn-primary gap-2">
                <Mail className="w-4 h-4" />{inviteMutation.isPending ? 'Sending…' : 'Send Invitation'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="vc-btn-secondary text-sm">Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="vc-card">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-4 h-4 text-amber-600" />
          <h3 className="font-semibold text-gray-900">Team Members ({members?.length ?? 0})</h3>
        </div>
        {isLoading ? (
          <div className="text-center py-10"><Users className="w-8 h-8 text-gray-200 mx-auto mb-2 animate-pulse" /><p className="text-gray-400 text-sm">Loading team…</p></div>
        ) : !members || members.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No team members yet</p>
            <p className="text-sm text-gray-400 mt-1">Invite coordinators and agents to your campaign</p>
          </div>
        ) : (
          <table className="vc-table">
            <thead>
              <tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th></tr>
            </thead>
            <tbody>
              {members.map((m: any) => (
                <tr key={m.id}>
                  <td className="font-medium text-gray-900">{m.firstName} {m.lastName}</td>
                  <td className="text-sm text-gray-600">{m.email}</td>
                  <td><span className={`vc-badge ${ROLE_BADGE[m.role] ?? 'bg-gray-100 text-gray-500'}`}>{(m.role ?? '').replace(/_/g, ' ')}</span></td>
                  <td><span className={`vc-badge ${m.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>{m.status ?? 'PENDING'}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export function TeamManagementPage() {
  return (
    <PageErrorBoundary page="Team Management">
      <TeamManagementPageContent />
    </PageErrorBoundary>
  );
}
