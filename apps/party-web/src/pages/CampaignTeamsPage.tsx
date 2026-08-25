// ============================================================
// VoteCapsule™ — Campaign Teams, Volunteers & Role Delegation (Party Portal)
// Phase 14A + Role Audit Fix 2026-08-24
// ============================================================
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Users, UserPlus, Plus, X, MapPin, Phone, Award, Star, Shield, AlertTriangle, Edit, CheckCircle } from 'lucide-react';
import { campaignApi } from '../api/campaignApi';
import { PageErrorBoundary } from '../components/PageErrorBoundary';

// Campaign role definitions (mirrors V16 spec + migration 139)
const CAMPAIGN_ROLES = [
  { value: 'PARTY_CAMPAIGN_DIRECTOR',     label: 'Campaign Director',        scope: 'full',        color: 'bg-violet-100 text-violet-700' },
  { value: 'CANDIDATE_CAMPAIGN_PRINCIPAL',label: 'Campaign Principal',       scope: 'candidate',   color: 'bg-blue-100 text-blue-700' },
  { value: 'CAMPAIGN_MANAGER',            label: 'Campaign Manager',         scope: 'campaign',    color: 'bg-indigo-100 text-indigo-700' },
  { value: 'CONSTITUENCY_COORDINATOR',    label: 'Constituency Coordinator', scope: 'geography',   color: 'bg-cyan-100 text-cyan-700' },
  { value: 'WARD_COORDINATOR',            label: 'Ward Coordinator',         scope: 'geography',   color: 'bg-teal-100 text-teal-700' },
  { value: 'LOGISTICS_OFFICER',           label: 'Logistics Officer',        scope: 'limited',     color: 'bg-amber-100 text-amber-700' },
  { value: 'FINANCE_OFFICER',             label: 'Finance Officer',          scope: 'limited',     color: 'bg-emerald-100 text-emerald-700' },
  { value: 'COMMUNICATIONS_OFFICER',      label: 'Communications Officer',   scope: 'limited',     color: 'bg-sky-100 text-sky-700' },
  { value: 'BRAND_MANAGER',              label: 'Brand Manager',            scope: 'limited',     color: 'bg-pink-100 text-pink-700' },
  { value: 'CAMPAIGN_VOLUNTEER',          label: 'Campaign Volunteer',       scope: 'read',        color: 'bg-gray-100 text-gray-600' },
];

const SCOPE_LABELS: Record<string, string> = {
  full:       'All campaigns',
  candidate:  'Own campaign + geography',
  campaign:   'Assigned campaign',
  geography:  'Assigned ward/constituency',
  limited:    'Specific modules only',
  read:       'Read-only (assigned tasks)',
};

const ROLE_COLOR: Record<string, string> = Object.fromEntries(CAMPAIGN_ROLES.map((r) => [r.value, r.color]));

const TRAINING_BADGE: Record<string, string> = {
  not_trained: 'bg-gray-100 text-gray-600',
  in_training: 'bg-amber-100 text-amber-700',
  trained:     'bg-blue-100 text-blue-700',
  certified:   'bg-emerald-100 text-emerald-700',
};

// ── Role Assignment Modal ────────────────────────────────────
function AssignRoleModal({
  campaignId,
  member,
  onClose,
}: {
  campaignId: string;
  member: any;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [role, setRole]       = useState(member.campaignRole ?? 'CAMPAIGN_VOLUNTEER');
  const [wardCode, setWard]   = useState(member.wardCode ?? '');
  const [consCode, setCons]   = useState(member.constituencyCode ?? '');

  const selectedRole = CAMPAIGN_ROLES.find((r) => r.value === role);
  const needsGeo     = selectedRole?.scope === 'geography';

  const mut = useMutation({
    mutationFn: () =>
      campaignApi.teams.updateMemberRole(campaignId, member.teamId, member.userId, {
        campaignRole:      role,
        wardCode:          needsGeo ? wardCode : undefined,
        constituencyCode:  needsGeo ? consCode : undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['campaign-teams'] });
      qc.invalidateQueries({ queryKey: ['campaign-role-assignments'] });
      onClose();
    },
  });

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b">
          <div>
            <h3 className="text-base font-semibold text-gray-900">Assign Campaign Role</h3>
            <p className="text-xs text-gray-500 mt-0.5">{member.userName ?? member.userId}</p>
          </div>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Campaign Role *</label>
            <div className="space-y-1.5 max-h-60 overflow-y-auto">
              {CAMPAIGN_ROLES.map((r) => (
                <button
                  key={r.value}
                  onClick={() => setRole(r.value)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg border transition-all ${
                    role === r.value
                      ? 'border-violet-400 bg-violet-50'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${r.color}`}>{r.label}</span>
                      <p className="text-xs text-gray-500 mt-0.5">{SCOPE_LABELS[r.scope]}</p>
                    </div>
                    {role === r.value && <CheckCircle className="w-4 h-4 text-violet-600 flex-shrink-0" />}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {needsGeo && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-3">
              <p className="text-xs text-blue-800 font-medium">Geography scope required for this role</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    {role === 'WARD_COORDINATOR' ? 'Ward Code *' : 'Ward Code'}
                  </label>
                  <input
                    className="vc-input text-sm py-1.5"
                    value={wardCode}
                    onChange={(e) => setWard(e.target.value)}
                    placeholder="e.g. 0101"
                    maxLength={4}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    {role === 'CONSTITUENCY_COORDINATOR' ? 'Constituency Code *' : 'Constituency Code'}
                  </label>
                  <input
                    className="vc-input text-sm py-1.5"
                    value={consCode}
                    onChange={(e) => setCons(e.target.value)}
                    placeholder="e.g. 001"
                    maxLength={3}
                  />
                </div>
              </div>
            </div>
          )}

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <p className="text-xs text-amber-800">
              <span className="font-semibold">Note:</span> Role enforcement is pending Sonie's backend guard (migration 139 + CampaignRoleGuard). The role is stored now and will be enforced once the guard is deployed.
            </p>
          </div>

          {mut.isError && <p className="text-sm text-red-600">Failed to assign role. Please try again.</p>}

          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 vc-btn-secondary">Cancel</button>
            <button
              onClick={() => mut.mutate()}
              disabled={mut.isPending || (needsGeo && !wardCode && !consCode)}
              className="flex-1 vc-btn-primary"
            >
              {mut.isPending ? 'Saving…' : 'Assign Role'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Role Assignments Tab ─────────────────────────────────────
function RoleAssignmentsTab({ campaignId }: { campaignId: string }) {
  const [assigningMember, setAssigning] = useState<any>(null);

  const { data: teams = [] } = useQuery({
    queryKey: ['campaign-teams', campaignId],
    queryFn:  () => campaignApi.teams.list(campaignId).then((r) => r.data?.data ?? r.data ?? []),
    enabled:  !!campaignId,
  });

  // Flatten all members from all teams
  const allMembers = teams.flatMap((team: any) =>
    (team.members ?? []).map((m: any) => ({ ...m, teamId: team.id, teamName: team.teamName }))
  );

  // Group by campaign role
  const byRole: Record<string, any[]> = {};
  allMembers.forEach((m: any) => {
    const r = m.campaignRole ?? 'UNASSIGNED';
    if (!byRole[r]) byRole[r] = [];
    byRole[r].push(m);
  });

  const unassigned = byRole['UNASSIGNED'] ?? [];

  return (
    <div className="space-y-4">
      {/* Guard warning */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
        <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
        <div className="text-sm">
          <p className="font-semibold text-amber-900">Role enforcement pending</p>
          <p className="text-amber-700 mt-0.5">Roles are stored but not yet enforced. Sonie needs to complete migration 139 + CampaignRoleGuard before access scoping takes effect. Assign roles now so they're ready.</p>
        </div>
      </div>

      {/* Unassigned members alert */}
      {unassigned.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-sm font-semibold text-red-800">{unassigned.length} team member{unassigned.length !== 1 ? 's' : ''} without a campaign role</p>
          <div className="flex flex-wrap gap-2 mt-2">
            {unassigned.slice(0, 6).map((m: any) => (
              <button
                key={m.id}
                onClick={() => setAssigning(m)}
                className="flex items-center gap-1.5 text-xs px-2.5 py-1 bg-white border border-red-200 rounded-lg text-red-700 hover:bg-red-50"
              >
                <Edit className="w-3 h-3" />
                {m.userName ?? m.userId}
              </button>
            ))}
            {unassigned.length > 6 && <span className="text-xs text-red-500 self-center">+{unassigned.length - 6} more</span>}
          </div>
        </div>
      )}

      {/* Role groups */}
      <div className="space-y-3">
        {CAMPAIGN_ROLES.map((roleDef) => {
          const members = byRole[roleDef.value] ?? [];
          if (members.length === 0) return null;
          return (
            <div key={roleDef.value} className="vc-card p-0 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${roleDef.color}`}>{roleDef.label}</span>
                  <span className="text-xs text-gray-500">{SCOPE_LABELS[roleDef.scope]}</span>
                </div>
                <span className="text-xs text-gray-500">{members.length} member{members.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="divide-y divide-gray-50">
                {members.map((m: any) => (
                  <div key={m.id} className="flex items-center gap-3 px-4 py-2.5">
                    <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-bold text-violet-700">{(m.userName ?? '?').charAt(0).toUpperCase()}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{m.userName ?? m.userId}</p>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span>{m.teamName}</span>
                        {m.wardCode && <><MapPin className="w-3 h-3" />{m.wardCode}</>}
                        {m.constituencyCode && <span>Cons: {m.constituencyCode}</span>}
                      </div>
                    </div>
                    <button
                      onClick={() => setAssigning(m)}
                      className="flex items-center gap-1 text-xs text-violet-600 hover:text-violet-800 font-medium flex-shrink-0"
                    >
                      <Edit className="w-3 h-3" /> Change
                    </button>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty state */}
      {allMembers.length === 0 && (
        <div className="vc-card text-center py-12">
          <Shield className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">No team members yet. Add team members first, then assign roles.</p>
        </div>
      )}

      {assigningMember && (
        <AssignRoleModal
          campaignId={campaignId}
          member={assigningMember}
          onClose={() => setAssigning(null)}
        />
      )}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────
function CampaignTeamsContent(): React.JSX.Element {
  const qc = useQueryClient();
  const [tab, setTab]               = useState<'teams' | 'volunteers' | 'roles'>('teams');
  const [showCreateTeam, setTeam]   = useState(false);
  const [showAddVol, setVol]        = useState(false);
  const [volFilter, setVolFilter]   = useState({ wardCode: '', status: '' });
  const [teamForm, setTeamForm]     = useState({ teamName: '', teamType: 'GENERAL', wardCode: '', teamLeaderName: '' });
  const [volForm, setVolForm]       = useState({ firstName: '', lastName: '', phone: '', wardCode: '', skills: '', consentGiven: false });

  const { data: campaigns = [] } = useQuery({ queryKey: ['campaigns'], queryFn: () => campaignApi.list().then((r) => r.data?.data ?? r.data ?? []) });
  const campaign = campaigns.find((c: any) => c.status === 'active') ?? campaigns[0];

  const { data: teams = [] } = useQuery({
    queryKey: ['campaign-teams', campaign?.id],
    queryFn: () => campaign ? campaignApi.teams.list(campaign.id).then((r) => r.data?.data ?? r.data ?? []) : [],
    enabled: !!campaign?.id,
  });

  const { data: volunteers = [] } = useQuery({
    queryKey: ['campaign-volunteers', campaign?.id, volFilter],
    queryFn: () => campaign ? campaignApi.volunteers.list(campaign.id, volFilter).then((r) => r.data?.data ?? r.data ?? []) : [],
    enabled: !!campaign?.id,
  });

  const createTeamMut = useMutation({
    mutationFn: () => campaignApi.teams.create(campaign.id, teamForm),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['campaign-teams'] }); setTeam(false); },
  });

  const registerVolMut = useMutation({
    mutationFn: () => campaignApi.volunteers.register(campaign.id, { ...volForm, skills: volForm.skills.split(',').map((s) => s.trim()).filter(Boolean) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['campaign-volunteers'] }); setVol(false); },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Teams & Volunteers</h2>
          <p className="text-sm text-gray-500 mt-1">Manage your campaign team structure and volunteer registry</p>
        </div>
        <div className="flex gap-2">
          {tab === 'teams' && (
            <button onClick={() => setTeam(true)} className="vc-btn-primary inline-flex items-center gap-2 text-sm">
              <Plus className="w-4 h-4" /> New Team
            </button>
          )}
          {tab === 'volunteers' && (
            <button onClick={() => setVol(true)} className="vc-btn-primary inline-flex items-center gap-2 text-sm">
              <UserPlus className="w-4 h-4" /> Register Volunteer
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 gap-6">
        {[
          { key: 'teams',      label: 'Teams',        icon: Users },
          { key: 'volunteers', label: 'Volunteers',   icon: UserPlus },
          { key: 'roles',      label: 'Role Assignments', icon: Shield, badge: 'NEW' },
        ].map(({ key, label, icon: Icon, badge }) => (
          <button
            key={key}
            onClick={() => setTab(key as any)}
            className={`flex items-center gap-2 pb-3 text-sm font-medium border-b-2 transition-colors ${tab === key ? 'border-violet-600 text-violet-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            <Icon className="w-4 h-4" /> {label}
            {badge
              ? <span className="text-[10px] font-bold bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded-full">{badge}</span>
              : <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full">
                  {key === 'teams' ? teams.length : volunteers.length}
                </span>
            }
          </button>
        ))}
      </div>

      {/* Teams Tab */}
      {tab === 'teams' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {teams.map((team: any) => (
            <div key={team.id} className="vc-card">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-base font-semibold text-gray-900">{team.teamName}</h3>
                  <span className="vc-badge bg-violet-100 text-violet-700 mt-1">{team.teamType}</span>
                </div>
                <span className="text-xs text-gray-500">{team.members?.length ?? 0} members</span>
              </div>
              {team.teamLeaderName && (
                <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                  <Star className="w-4 h-4 text-amber-500" /> {team.teamLeaderName}
                </div>
              )}
              {team.wardCode && (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <MapPin className="w-4 h-4" /> Ward {team.wardCode}
                </div>
              )}
              {team.members && team.members.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <div className="flex gap-1 flex-wrap">
                    {team.members.slice(0, 5).map((m: any) => (
                      <div key={m.id} className="w-7 h-7 rounded-full bg-violet-100 flex items-center justify-center text-xs font-semibold text-violet-700" title={m.userName ?? m.userId}>
                        {(m.userName ?? '?').charAt(0).toUpperCase()}
                      </div>
                    ))}
                    {team.members.length > 5 && (
                      <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-xs text-gray-500">+{team.members.length - 5}</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
          {teams.length === 0 && (
            <div className="col-span-3 vc-card text-center py-12">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No teams yet. Create your first team!</p>
            </div>
          )}
        </div>
      )}

      {/* Volunteers Tab */}
      {tab === 'volunteers' && (
        <div className="space-y-4">
          <div className="flex gap-3">
            <input className="vc-input max-w-[180px]" placeholder="Ward code..." value={volFilter.wardCode} onChange={(e) => setVolFilter({ ...volFilter, wardCode: e.target.value })} />
            <select className="vc-input max-w-[160px]" value={volFilter.status} onChange={(e) => setVolFilter({ ...volFilter, status: e.target.value })}>
              <option value="">All statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div className="vc-card overflow-hidden p-0">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  {['Name','Phone','Ward','Skills','Training','Status'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {volunteers.map((v: any) => (
                  <tr key={v.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{v.firstName} {v.lastName}</td>
                    <td className="px-4 py-3 text-gray-600">{v.phone}</td>
                    <td className="px-4 py-3 text-gray-600">{v.wardCode ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-500 max-w-[150px] truncate">{Array.isArray(v.skills) ? v.skills.join(', ') : '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`vc-badge text-xs ${TRAINING_BADGE[v.trainingStatus] ?? ''}`}>{v.trainingStatus?.replace(/_/g,' ')}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`vc-badge text-xs ${v.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>{v.status}</span>
                    </td>
                  </tr>
                ))}
                {volunteers.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No volunteers registered yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Roles Tab */}
      {tab === 'roles' && campaign && <RoleAssignmentsTab campaignId={campaign.id} />}

      {/* Create Team Modal */}
      {showCreateTeam && campaign && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-semibold">New Team</h3>
              <button onClick={() => setTeam(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Team Name *</label>
                <input className="vc-input" value={teamForm.teamName} onChange={(e) => setTeamForm({ ...teamForm, teamName: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Team Type</label>
                  <select className="vc-input" value={teamForm.teamType} onChange={(e) => setTeamForm({ ...teamForm, teamType: e.target.value })}>
                    {['GENERAL','WARD','CONSTITUENCY','COUNTY','YOUTH','WOMEN','MEDIA','SECURITY'].map((t) => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ward Code</label>
                  <input className="vc-input" placeholder="0101" value={teamForm.wardCode} onChange={(e) => setTeamForm({ ...teamForm, wardCode: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Team Leader Name</label>
                <input className="vc-input" value={teamForm.teamLeaderName} onChange={(e) => setTeamForm({ ...teamForm, teamLeaderName: e.target.value })} />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setTeam(false)} className="flex-1 vc-btn-secondary">Cancel</button>
                <button onClick={() => createTeamMut.mutate()} disabled={createTeamMut.isPending || !teamForm.teamName} className="flex-1 vc-btn-primary">
                  {createTeamMut.isPending ? 'Creating...' : 'Create Team'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Register Volunteer Modal */}
      {showAddVol && campaign && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-semibold">Register Volunteer</h3>
              <button onClick={() => setVol(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
                  <input className="vc-input" value={volForm.firstName} onChange={(e) => setVolForm({ ...volForm, firstName: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
                  <input className="vc-input" value={volForm.lastName} onChange={(e) => setVolForm({ ...volForm, lastName: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
                  <input className="vc-input" value={volForm.phone} onChange={(e) => setVolForm({ ...volForm, phone: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ward Code</label>
                  <input className="vc-input" placeholder="0101" value={volForm.wardCode} onChange={(e) => setVolForm({ ...volForm, wardCode: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Skills (comma-separated)</label>
                <input className="vc-input" placeholder="driving, photography, canvassing" value={volForm.skills} onChange={(e) => setVolForm({ ...volForm, skills: e.target.value })} />
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input type="checkbox" className="rounded" checked={volForm.consentGiven} onChange={(e) => setVolForm({ ...volForm, consentGiven: e.target.checked })} />
                Volunteer has given consent to be contacted
              </label>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setVol(false)} className="flex-1 vc-btn-secondary">Cancel</button>
                <button onClick={() => registerVolMut.mutate()} disabled={registerVolMut.isPending || !volForm.firstName || !volForm.phone} className="flex-1 vc-btn-primary">
                  {registerVolMut.isPending ? 'Registering...' : 'Register'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function CampaignTeamsPage() {
  return <PageErrorBoundary page="Campaign Teams"><CampaignTeamsContent /></PageErrorBoundary>;
}
