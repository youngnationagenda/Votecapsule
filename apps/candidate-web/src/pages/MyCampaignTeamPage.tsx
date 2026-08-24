// ============================================================
// VoteCapsule™ — My Campaign Team (Candidate Portal)
// Phase 14A — Team management + volunteer registry
// Candidate sees own team only
// ============================================================
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users, UserPlus, MapPin, Phone, Shield,
  X, ChevronDown, ChevronRight, Search,
} from 'lucide-react';
import { campaignApi } from '../api/campaignApi';
import { PageErrorBoundary } from '../components/PageErrorBoundary';

function useMyCampaign() {
  const { data: campaigns = [] } = useQuery({
    queryKey: ['my-campaigns'],
    queryFn:  () => campaignApi.list({ candidate: true }).then((r) => r.data?.data ?? r.data ?? []),
  });
  return campaigns.find((c: any) => c.status === 'active') ?? campaigns[0] ?? null;
}

// ── Add Volunteer Modal ───────────────────────────────────────
function AddVolunteerModal({ campaignId, onClose }: { campaignId: string; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    firstName: '', lastName: '', phone: '', wardCode: '',
    constituencyCode: '', skills: '', role: 'MEMBER',
    consentGiven: false, consentMethod: 'VERBAL',
  });

  const mut = useMutation({
    mutationFn: (data: any) => campaignApi.volunteers.register(campaignId, data),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['my-volunteers'] }); onClose(); },
  });

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b">
          <h3 className="text-base font-semibold text-gray-900">Register Volunteer</h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); mut.mutate({ ...form, skills: form.skills.split(',').map(s => s.trim()).filter(Boolean) }); }} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
              <input className="vc-input" required value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
              <input className="vc-input" required value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number *</label>
            <input type="tel" className="vc-input" required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+254 7XX XXX XXX" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ward Code</label>
              <input className="vc-input" value={form.wardCode} onChange={(e) => setForm({ ...form, wardCode: e.target.value })} placeholder="e.g. 0101" maxLength={4} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
              <select className="vc-input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                {['MEMBER','COORDINATOR','WARD_COORDINATOR','DRIVER','MEDIA','SECURITY'].map((r) => (
                  <option key={r} value={r}>{r.replace(/_/g,' ')}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Skills (comma-separated)</label>
            <input className="vc-input" value={form.skills} onChange={(e) => setForm({ ...form, skills: e.target.value })} placeholder="e.g. driving, photography, social_media" />
          </div>
          <div className="bg-amber-50 rounded-lg p-3">
            <label className="flex items-start gap-2 text-sm text-gray-700 cursor-pointer">
              <input type="checkbox" checked={form.consentGiven} onChange={(e) => setForm({ ...form, consentGiven: e.target.checked })} className="mt-0.5 rounded" />
              <span>Volunteer has given consent to be contacted by this campaign <span className="text-red-500">*</span></span>
            </label>
            {form.consentGiven && (
              <div className="mt-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Consent Method</label>
                <select className="vc-input text-sm py-1" value={form.consentMethod} onChange={(e) => setForm({ ...form, consentMethod: e.target.value })}>
                  {['VERBAL','WRITTEN','DIGITAL'].map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
            )}
          </div>
          {mut.isError && <p className="text-sm text-red-600">Failed to register volunteer. Please try again.</p>}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 vc-btn-secondary">Cancel</button>
            <button type="submit" disabled={mut.isPending || !form.consentGiven} className="flex-1 vc-btn-primary">
              {mut.isPending ? 'Saving…' : 'Register'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Team Page ────────────────────────────────────────────
function MyCampaignTeamContent(): React.JSX.Element {
  const qc = useQueryClient();
  const campaign = useMyCampaign();
  const [tab, setTab]               = useState<'team' | 'volunteers'>('team');
  const [showVolModal, setVolModal]  = useState(false);
  const [search, setSearch]         = useState('');
  const [expandedTeam, setExpanded] = useState<string | null>(null);

  const { data: teams = [] } = useQuery({
    queryKey: ['my-teams', campaign?.id],
    queryFn:  () => campaign ? campaignApi.teams.list(campaign.id).then((r) => r.data?.data ?? r.data ?? []) : [],
    enabled:  !!campaign?.id,
  });

  const { data: volunteers = [] } = useQuery({
    queryKey: ['my-volunteers', campaign?.id],
    queryFn:  () => campaign ? campaignApi.volunteers.list(campaign.id).then((r) => r.data?.data ?? r.data ?? []) : [],
    enabled:  !!campaign?.id,
  });

  const filteredVols = volunteers.filter((v: any) => {
    const q = search.toLowerCase();
    return (
      `${v.firstName} ${v.lastName}`.toLowerCase().includes(q) ||
      v.phone?.includes(q) ||
      v.wardCode?.includes(q)
    );
  });

  const ROLE_COLORS: Record<string, string> = {
    COORDINATOR:       'bg-violet-100 text-violet-700',
    WARD_COORDINATOR:  'bg-blue-100 text-blue-700',
    DRIVER:            'bg-amber-100 text-amber-700',
    MEDIA:             'bg-emerald-100 text-emerald-700',
    SECURITY:          'bg-red-100 text-red-700',
    MEMBER:            'bg-gray-100 text-gray-600',
  };

  if (!campaign) return (
    <div className="vc-card text-center py-16">
      <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
      <p className="text-gray-500">No active campaign found.</p>
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">My Campaign Team</h2>
          <p className="text-sm text-gray-500 mt-1">{campaign.name}</p>
        </div>
        {tab === 'volunteers' && (
          <button onClick={() => setVolModal(true)} className="vc-btn-primary inline-flex items-center gap-2 text-sm">
            <UserPlus className="w-4 h-4" /> Add Volunteer
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="vc-stat-card">
          <p className="text-sm text-gray-500">Teams</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{teams.length}</p>
        </div>
        <div className="vc-stat-card">
          <p className="text-sm text-gray-500">Volunteers</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{volunteers.length}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        {(['team', 'volunteers'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === t ? 'border-amber-500 text-amber-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {t === 'team' ? `Teams (${teams.length})` : `Volunteers (${volunteers.length})`}
          </button>
        ))}
      </div>

      {/* Teams Tab */}
      {tab === 'team' && (
        <div className="space-y-3">
          {teams.length === 0 ? (
            <div className="vc-card text-center py-12">
              <Shield className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">No teams set up yet. Contact your party to configure your campaign teams.</p>
            </div>
          ) : (
            teams.map((team: any) => (
              <div key={team.id} className="vc-card p-0 overflow-hidden">
                <button
                  onClick={() => setExpanded(expandedTeam === team.id ? null : team.id)}
                  className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 text-left"
                >
                  <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
                    <Users className="w-4 h-4 text-amber-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900">{team.teamName}</p>
                    <p className="text-xs text-gray-500">{team.teamType} · {team.wardCode ?? team.constituencyCode ?? 'Campaign-wide'}</p>
                  </div>
                  {expandedTeam === team.id
                    ? <ChevronDown className="w-4 h-4 text-gray-400" />
                    : <ChevronRight className="w-4 h-4 text-gray-400" />}
                </button>
                {expandedTeam === team.id && (
                  <div className="border-t border-gray-100 p-4 bg-gray-50">
                    {team.teamLeaderName && (
                      <p className="text-xs text-gray-600 mb-3"><span className="font-medium">Team Leader:</span> {team.teamLeaderName}</p>
                    )}
                    {team.description && <p className="text-sm text-gray-600">{team.description}</p>}
                    {!team.description && !team.teamLeaderName && (
                      <p className="text-xs text-gray-400">No additional details</p>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Volunteers Tab */}
      {tab === 'volunteers' && (
        <div className="space-y-3">
          {volunteers.length > 0 && (
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                className="vc-input pl-9"
                placeholder="Search by name, phone, or ward…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          )}

          {filteredVols.length === 0 ? (
            <div className="vc-card text-center py-12">
              <UserPlus className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">{volunteers.length === 0 ? 'No volunteers registered yet.' : 'No volunteers match your search.'}</p>
              {volunteers.length === 0 && (
                <button onClick={() => setVolModal(true)} className="mt-4 vc-btn-primary text-sm inline-flex items-center gap-2">
                  <UserPlus className="w-4 h-4" /> Register First Volunteer
                </button>
              )}
            </div>
          ) : (
            <div className="vc-card p-0 overflow-hidden divide-y divide-gray-50">
              {filteredVols.map((v: any) => (
                <div key={v.id} className="flex items-center gap-3 p-3.5 hover:bg-gray-50">
                  <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-amber-700">{v.firstName?.charAt(0)}{v.lastName?.charAt(0)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{v.firstName} {v.lastName}</p>
                    <div className="flex items-center gap-3 mt-0.5">
                      {v.phone && <p className="text-xs text-gray-500 flex items-center gap-1"><Phone className="w-3 h-3" />{v.phone}</p>}
                      {v.wardCode && <p className="text-xs text-gray-500 flex items-center gap-1"><MapPin className="w-3 h-3" />{v.wardCode}</p>}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${ROLE_COLORS[v.campaignRole ?? 'MEMBER'] ?? 'bg-gray-100 text-gray-600'}`}>
                      {(v.campaignRole ?? 'MEMBER').replace(/_/g,' ')}
                    </span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${v.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                      {v.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {showVolModal && <AddVolunteerModal campaignId={campaign.id} onClose={() => setVolModal(false)} />}
    </div>
  );
}

export function MyCampaignTeamPage() {
  return (
    <PageErrorBoundary page="My Campaign Team">
      <MyCampaignTeamContent />
    </PageErrorBoundary>
  );
}
