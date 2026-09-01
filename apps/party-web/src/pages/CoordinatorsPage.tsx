import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { UserCheck, Plus, Mail, MapPin } from 'lucide-react';
import { apiClient } from '../api/apiClient';
import { PageErrorBoundary } from '../components/PageErrorBoundary';
import { useAppSelector } from '../store/hooks';

// ─────────────────────────────────────────────────────────────
// Campaign Coordinators — uses Campaign service role endpoints
// (NOT Identity service users — that endpoint rejects Cognito tokens)
// ─────────────────────────────────────────────────────────────

const COORDINATOR_ROLES = [
  'CAMPAIGN_COORDINATOR',
  'CONSTITUENCY_COORDINATOR',
  'WARD_COORDINATOR',
  'CAMPAIGN_MANAGER',
];

const ROLE_LABEL: Record<string, string> = {
  CAMPAIGN_COORDINATOR: 'Campaign Coordinator',
  CONSTITUENCY_COORDINATOR: 'Constituency Coordinator',
  WARD_COORDINATOR: 'Ward Coordinator',
  CAMPAIGN_MANAGER: 'Campaign Manager',
};

const ROLE_BADGE: Record<string, string> = {
  CAMPAIGN_COORDINATOR: 'bg-violet-100 text-violet-700',
  CONSTITUENCY_COORDINATOR: 'bg-blue-100 text-blue-700',
  WARD_COORDINATOR: 'bg-emerald-100 text-emerald-700',
  CAMPAIGN_MANAGER: 'bg-amber-100 text-amber-700',
};

function CoordinatorsPageContent(): React.JSX.Element {
  const qc = useQueryClient();
  const user = useAppSelector((s) => s.auth.user);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ userName: '', userEmail: '', region: '', role: 'CAMPAIGN_COORDINATOR', userId: '' });

  // Get party's campaigns to list roles from
  const { data: campaigns = [] } = useQuery({
    queryKey: ['party-campaigns'],
    queryFn: () => apiClient.get('/campaign/campaigns').then(r => r.data?.data ?? r.data ?? []),
  });

  const activeCampaign = campaigns.find((c: any) => c.status === 'active') ?? campaigns[0];

  // List coordinators from campaign roles endpoint (bypasses Identity JwtAuthGuard)
  const { data: coordinators = [], isLoading } = useQuery({
    queryKey: ['coordinators', activeCampaign?.id],
    queryFn: () => activeCampaign
      ? apiClient.get(`/campaign/campaigns/${activeCampaign.id}/roles`).then(r => {
          const all = r.data?.data ?? r.data ?? [];
          return all.filter((m: any) => COORDINATOR_ROLES.includes(m.campaignRole ?? m.role));
        })
      : [],
    enabled: !!activeCampaign?.id,
  });

  // Assign coordinator role via campaign service
  const assignMutation = useMutation({
    mutationFn: (payload: typeof form) =>
      apiClient.post(`/campaign/campaigns/${activeCampaign.id}/roles`, {
        userId: payload.userId || payload.userEmail, // fallback to email as userId placeholder
        role: payload.role,
        userName: payload.userName,
        userEmail: payload.userEmail,
        constituencyCode: payload.region || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['coordinators'] });
      setShowForm(false);
      setForm({ userName: '', userEmail: '', region: '', role: 'CAMPAIGN_COORDINATOR', userId: '' });
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Campaign Coordinators</h2>
          <p className="text-sm text-gray-500">Manage regional campaign coordinators and their access</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          disabled={!activeCampaign}
          className="vc-btn-primary gap-2"
        >
          <Plus className="w-4 h-4" />Assign Coordinator
        </button>
      </div>

      {!activeCampaign && (
        <div className="flex items-center gap-3 bg-violet-50 border border-violet-200 rounded-xl px-4 py-3">
          <MapPin className="w-5 h-5 text-violet-500 flex-shrink-0" />
          <p className="text-sm text-violet-700">Create a campaign to assign and manage coordinators. <a href="/campaign/create" className="font-semibold underline hover:text-violet-900">Get started →</a></p>
        </div>
      )}

      {showForm && activeCampaign && (
        <div className="vc-card border-violet-200">
          <h3 className="text-base font-semibold text-gray-900 mb-4">Assign Campaign Coordinator</h3>
          <form onSubmit={(e) => { e.preventDefault(); assignMutation.mutate(form); }} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="vc-label">Full Name</label>
                <input className="vc-input" value={form.userName} onChange={e => setForm({...form, userName: e.target.value})} required placeholder="Jane Wanjiku" />
              </div>
              <div>
                <label className="vc-label">Email</label>
                <input className="vc-input" type="email" value={form.userEmail} onChange={e => setForm({...form, userEmail: e.target.value})} required placeholder="jane@example.com" />
              </div>
              <div>
                <label className="vc-label">Role</label>
                <select className="vc-input" value={form.role} onChange={e => setForm({...form, role: e.target.value})}>
                  {COORDINATOR_ROLES.map(r => <option key={r} value={r}>{ROLE_LABEL[r] ?? r}</option>)}
                </select>
              </div>
              <div>
                <label className="vc-label">Region (County/Constituency)</label>
                <input className="vc-input" value={form.region} onChange={e => setForm({...form, region: e.target.value})} placeholder="e.g. 110" />
              </div>
            </div>
            <div className="flex gap-3">
              <button type="submit" disabled={assignMutation.isPending} className="vc-btn-primary gap-2">
                <Mail className="w-4 h-4" />{assignMutation.isPending ? 'Assigning…' : 'Assign Coordinator'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="vc-btn-secondary">Cancel</button>
            </div>
            {assignMutation.isError && (
              <p className="text-sm text-red-600">Failed to assign coordinator. Please try again.</p>
            )}
          </form>
        </div>
      )}

      <div className="vc-card">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <UserCheck className="w-4 h-4 text-violet-600" />Coordinators ({coordinators.length})
        </h3>
        {isLoading ? (
          <div className="text-center py-12 text-gray-400">Loading coordinators…</div>
        ) : coordinators.length === 0 ? (
          <div className="text-center py-12">
            <UserCheck className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400">No coordinators assigned yet</p>
            <p className="text-xs text-gray-400 mt-1">Use the "Assign Coordinator" button to add regional campaign managers</p>
          </div>
        ) : (
          <table className="vc-table">
            <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Region</th><th>Status</th></tr></thead>
            <tbody>
              {coordinators.map((c: any) => (
                <tr key={c.id ?? c.userId}>
                  <td className="font-medium">{c.userName ?? `${c.firstName ?? ''} ${c.lastName ?? ''}`}</td>
                  <td className="text-sm text-gray-600">{c.userEmail ?? c.email ?? '—'}</td>
                  <td><span className={`vc-badge ${ROLE_BADGE[c.campaignRole ?? c.role] ?? 'bg-gray-100 text-gray-500'}`}>
                    {ROLE_LABEL[c.campaignRole ?? c.role] ?? c.campaignRole ?? c.role}
                  </span></td>
                  <td className="text-sm text-gray-600">{c.constituencyCode ?? c.wardCode ?? c.countyCode ?? '—'}</td>
                  <td><span className="vc-badge bg-emerald-100 text-emerald-700">Active</span></td>
                </tr>
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
