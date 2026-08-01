import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Mail, Plus } from 'lucide-react';
import { apiClient } from '../api/apiClient';

const ROLES = ['CAMPAIGN_COORDINATOR', 'CAPSULE_AGENT', 'PARTY_ADMIN'];

export function InvitationsPage(): React.JSX.Element {
  const [form, setForm] = useState({ email: '', role: 'CAPSULE_AGENT', name: '' });
  const [sent, setSent] = useState<string[]>([]);

  const inviteMutation = useMutation({
    mutationFn: (payload: typeof form) => apiClient.post('/identity/invitations', payload),
    onSuccess: (_, vars) => { setSent(prev => [...prev, vars.email]); setForm({ email: '', role: 'CAPSULE_AGENT', name: '' }); },
  });

  return (
    <div className="space-y-6">
      <div><h2 className="text-xl font-bold text-gray-900">User Invitations</h2><p className="text-sm text-gray-500">Invite team members — coordinators, agents, and party admins</p></div>
      <div className="vc-card border-violet-200">
        <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2"><Plus className="w-4 h-4 text-violet-600" />Send Invitation</h3>
        <form onSubmit={(e) => { e.preventDefault(); inviteMutation.mutate(form); }} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div><label className="vc-label">Full Name</label><input className="vc-input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required /></div>
            <div><label className="vc-label">Email</label><input className="vc-input" type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} required /></div>
            <div><label className="vc-label">Role</label><select className="vc-input" value={form.role} onChange={e => setForm({...form, role: e.target.value})}>{ROLES.map(r => <option key={r}>{r.replace(/_/g, ' ')}</option>)}</select></div>
          </div>
          <button type="submit" disabled={inviteMutation.isPending} className="vc-btn-primary gap-2"><Mail className="w-4 h-4" />{inviteMutation.isPending ? 'Sending…' : 'Send Invitation'}</button>
        </form>
      </div>
      {sent.length > 0 && (
        <div className="vc-card">
          <h3 className="font-semibold text-gray-900 mb-3">Sent Invitations (this session)</h3>
          <div className="space-y-2">
            {sent.map(email => <div key={email} className="flex items-center gap-2 text-sm text-gray-700"><Mail className="w-4 h-4 text-emerald-500" />{email}</div>)}
          </div>
        </div>
      )}
    </div>
  );
}
