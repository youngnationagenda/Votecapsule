// ============================================================
// VoteCapsule™ — My Campaign Team (Candidate Portal)
// Phase 14A — Team management + role assignment + volunteers
// Candidate can assign campaign management roles from here:
// Campaign Manager, Ward Coordinator, Logistics Manager,
// Finance Officer, Communications Officer, Brand Manager, etc.
// ============================================================
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users, UserPlus, MapPin, Phone, Shield, Briefcase,
  X, ChevronDown, ChevronRight, Search, Edit3, Trash2,
  Crown, UserCheck, AlertCircle,
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

// ── Campaign Role Definitions ────────────────────────────────
const CAMPAIGN_ROLES = [
  { value: 'CAMPAIGN_MANAGER',            label: 'Campaign Manager',         description: 'Full campaign operations access', icon: Crown, color: 'bg-purple-100 text-purple-700' },
  { value: 'WARD_COORDINATOR',            label: 'Ward Representative',      description: 'Ward-level coordination and outreach', icon: MapPin, color: 'bg-blue-100 text-blue-700' },
  { value: 'CONSTITUENCY_COORDINATOR',    label: 'Constituency Coordinator', description: 'Constituency-wide coordination', icon: MapPin, color: 'bg-indigo-100 text-indigo-700' },
  { value: 'LOGISTICS_OFFICER',           label: 'Logistics Manager',        description: 'Vehicles, equipment, events & tasks', icon: Briefcase, color: 'bg-amber-100 text-amber-700' },
  { value: 'FINANCE_OFFICER',             label: 'Finance Manager',          description: 'Budget, expenses & contributions', icon: Briefcase, color: 'bg-emerald-100 text-emerald-700' },
  { value: 'COMMUNICATIONS_OFFICER',      label: 'Communications Manager',   description: 'SMS campaigns, incidents & messaging', icon: Briefcase, color: 'bg-cyan-100 text-cyan-700' },
  { value: 'BRAND_MANAGER',              label: 'Branding Manager',         description: 'Materials, designs, outdoor ads & media', icon: Briefcase, color: 'bg-rose-100 text-rose-700' },
  { value: 'CAMPAIGN_VOLUNTEER',          label: 'Volunteer',                description: 'Tasks and events access only', icon: UserCheck, color: 'bg-gray-100 text-gray-600' },
];

const ROLE_MAP = Object.fromEntries(CAMPAIGN_ROLES.map(r => [r.value, r]));

// ── Volunteer Roles (subset for quick registration) ──────────
const VOLUNTEER_ROLES = ['MEMBER','COORDINATOR','WARD_COORDINATOR','DRIVER','MEDIA','SECURITY'] as const;
const VOLUNTEER_ROLE_COLORS: Record<string, string> = {
  COORDINATOR:       'bg-violet-100 text-violet-700',
  WARD_COORDINATOR:  'bg-blue-100 text-blue-700',
  DRIVER:            'bg-amber-100 text-amber-700',
  MEDIA:             'bg-emerald-100 text-emerald-700',
  SECURITY:          'bg-red-100 text-red-700',
  MEMBER:            'bg-gray-100 text-gray-600',
};

// ── Assign Role Modal ────────────────────────────────────────
function AssignRoleModal({ campaignId, onClose, existingRole }: {
  campaignId: string; onClose: () => void;
  existingRole?: { userId: string; userName?: string; campaignRole: string; wardCode?: string; constituencyCode?: string };
}) {
  const qc = useQueryClient();
  const isEdit = !!existingRole;
  const [form, setForm] = useState({
    userId: existingRole?.userId ?? '',
    userName: existingRole?.userName ?? '',
    userEmail: '',
    role: existingRole?.campaignRole ?? 'CAMPAIGN_MANAGER',
    wardCode: existingRole?.wardCode ?? '',
    constituencyCode: existingRole?.constituencyCode ?? '',
  });
  const [error, setError] = useState('');

  const mut = useMutation({
    mutationFn: (data: any) => isEdit
      ? campaignApi.roles.update(campaignId, data.userId, { role: data.role })
      : campaignApi.roles.assign(campaignId, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['campaign-roles'] }); onClose(); },
    onError: (e: any) => setError(e?.response?.data?.message ?? 'Failed to assign role'),
  });

  const selectedRole = ROLE_MAP[form.role];
  const needsGeography = ['WARD_COORDINATOR', 'CONSTITUENCY_COORDINATOR'].includes(form.role);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b">
          <h3 className="text-base font-semibold text-gray-900">
            {isEdit ? 'Update Role Assignment' : 'Assign Campaign Role'}
          </h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={(e) => {
          e.preventDefault();
          if (!form.userId && !form.userEmail) { setError('User ID or email is required'); return; }
          mut.mutate({
            userId: form.userId,
            userName: form.userName || undefined,
            userEmail: form.userEmail || undefined,
            role: form.role,
            wardCode: form.wardCode || undefined,
            constituencyCode: form.constituencyCode || undefined,
          });
        }} className="p-5 space-y-4">

          {/* User identification */}
          {!isEdit && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">User ID *</label>
                <input className="vc-input" required value={form.userId}
                  onChange={(e) => setForm({ ...form, userId: e.target.value })}
                  placeholder="UUID of the person to assign" />
                <p className="text-xs text-gray-400 mt-1">Enter the user's system ID</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <input className="vc-input" value={form.userName}
                    onChange={(e) => setForm({ ...form, userName: e.target.value })}
                    placeholder="e.g. Jane Wanjiku" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input type="email" className="vc-input" value={form.userEmail}
                    onChange={(e) => setForm({ ...form, userEmail: e.target.value })}
                    placeholder="jane@example.com" />
                </div>
              </div>
            </>
          )}

          {isEdit && (
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-sm font-medium text-gray-700">{existingRole?.userName ?? existingRole?.userId}</p>
              <p className="text-xs text-gray-500">Updating role assignment</p>
            </div>
          )}

          {/* Role selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Campaign Role *</label>
            <div className="space-y-2">
              {CAMPAIGN_ROLES.map((r) => {
                const Icon = r.icon;
                return (
                  <label key={r.value}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                      form.role === r.value ? 'border-amber-300 bg-amber-50 ring-1 ring-amber-200' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}>
                    <input type="radio" name="role" value={r.value} checked={form.role === r.value}
                      onChange={() => setForm({ ...form, role: r.value })} className="hidden" />
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${r.color}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{r.label}</p>
                      <p className="text-xs text-gray-500">{r.description}</p>
                    </div>
                    {form.role === r.value && <div className="w-2 h-2 rounded-full bg-amber-500" />}
                  </label>
                );
              })}
            </div>
          </div>

          {/* Geography assignment for geo-scoped roles */}
          {needsGeography && (
            <div className="bg-blue-50 rounded-lg p-4 space-y-3">
              <p className="text-sm font-medium text-blue-800">Geography Assignment</p>
              <p className="text-xs text-blue-600">This role is geography-scoped. Assign the area they'll manage.</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Ward Code</label>
                  <input className="vc-input text-sm" value={form.wardCode}
                    onChange={(e) => setForm({ ...form, wardCode: e.target.value })}
                    placeholder="e.g. 0101" maxLength={4} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Constituency Code</label>
                  <input className="vc-input text-sm" value={form.constituencyCode}
                    onChange={(e) => setForm({ ...form, constituencyCode: e.target.value })}
                    placeholder="e.g. 001" maxLength={3} />
                </div>
              </div>
            </div>
          )}

          {/* Module access preview */}
          {selectedRole && !needsGeography && !['CAMPAIGN_MANAGER','CAMPAIGN_VOLUNTEER'].includes(form.role) && (
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs font-medium text-gray-600 mb-1">Access Modules:</p>
              <p className="text-xs text-gray-500">{selectedRole.description}</p>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-lg p-3">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 vc-btn-secondary">Cancel</button>
            <button type="submit" disabled={mut.isPending} className="flex-1 vc-btn-primary">
              {mut.isPending ? 'Saving…' : isEdit ? 'Update Role' : 'Assign Role'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
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
                {VOLUNTEER_ROLES.map((r) => (
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
  const [tab, setTab]               = useState<'roles' | 'team' | 'volunteers'>('roles');
  const [showVolModal, setVolModal]  = useState(false);
  const [showRoleModal, setRoleModal] = useState(false);
  const [editRole, setEditRole]     = useState<any>(null);
  const [search, setSearch]         = useState('');
  const [expandedTeam, setExpanded] = useState<string | null>(null);

  // ── Data queries ───────────────────────────────────────────
  const { data: roles = [] } = useQuery({
    queryKey: ['campaign-roles', campaign?.id],
    queryFn:  () => campaign ? campaignApi.roles.list(campaign.id).then((r) => r.data?.data ?? r.data ?? []) : [],
    enabled:  !!campaign?.id,
  });

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

  // ── Remove role mutation ───────────────────────────────────
  const removeRoleMut = useMutation({
    mutationFn: (userId: string) => campaignApi.roles.remove(campaign!.id, userId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['campaign-roles'] }),
  });

  const filteredVols = volunteers.filter((v: any) => {
    const q = search.toLowerCase();
    return (
      `${v.firstName} ${v.lastName}`.toLowerCase().includes(q) ||
      v.phone?.includes(q) ||
      v.wardCode?.includes(q)
    );
  });

  if (!campaign) return (
    <div className="vc-card text-center py-16">
      <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
      <p className="text-gray-500">No active campaign found.</p>
      <a href="/campaign" className="inline-block mt-3 text-sm text-amber-600 hover:underline font-medium">Create your campaign →</a>
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
        <div className="flex gap-2">
          {tab === 'roles' && (
            <button onClick={() => { setEditRole(null); setRoleModal(true); }} className="vc-btn-primary inline-flex items-center gap-2 text-sm">
              <Shield className="w-4 h-4" /> Assign Role
            </button>
          )}
          {tab === 'volunteers' && (
            <button onClick={() => setVolModal(true)} className="vc-btn-primary inline-flex items-center gap-2 text-sm">
              <UserPlus className="w-4 h-4" /> Add Volunteer
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="vc-stat-card">
          <p className="text-sm text-gray-500">Assigned Roles</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{roles.length}</p>
        </div>
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
        {([
          { key: 'roles' as const, label: `Roles (${roles.length})` },
          { key: 'team' as const, label: `Teams (${teams.length})` },
          { key: 'volunteers' as const, label: `Volunteers (${volunteers.length})` },
        ]).map(({ key, label }) => (
          <button key={key} onClick={() => setTab(key)} className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === key ? 'border-amber-500 text-amber-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* ── Roles Tab ─────────────────────────────────────────── */}
      {tab === 'roles' && (
        <div className="space-y-3">
          {roles.length === 0 ? (
            <div className="vc-card text-center py-12">
              <Shield className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-sm mb-2">No roles assigned yet.</p>
              <p className="text-xs text-gray-400 max-w-sm mx-auto mb-4">
                Assign campaign management roles to your team: Campaign Manager, Ward Reps,
                Logistics, Finance, Communications, and Branding managers.
              </p>
              <button onClick={() => { setEditRole(null); setRoleModal(true); }} className="vc-btn-primary text-sm inline-flex items-center gap-2">
                <Shield className="w-4 h-4" /> Assign First Role
              </button>
            </div>
          ) : (
            <div className="vc-card p-0 overflow-hidden divide-y divide-gray-50">
              {roles.map((member: any) => {
                const roleDef = ROLE_MAP[member.campaignRole];
                const Icon = roleDef?.icon ?? Shield;
                return (
                  <div key={member.id ?? member.userId} className="flex items-center gap-3 p-4 hover:bg-gray-50">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${roleDef?.color ?? 'bg-gray-100 text-gray-600'}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900">
                        {member.userName || member.userEmail || member.userId}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${roleDef?.color ?? 'bg-gray-100 text-gray-600'}`}>
                          {roleDef?.label ?? member.campaignRole?.replace(/_/g, ' ')}
                        </span>
                        {member.wardCode && (
                          <span className="text-[10px] text-gray-500 flex items-center gap-0.5">
                            <MapPin className="w-3 h-3" /> Ward {member.wardCode}
                          </span>
                        )}
                        {member.constituencyCode && (
                          <span className="text-[10px] text-gray-500 flex items-center gap-0.5">
                            <MapPin className="w-3 h-3" /> Const {member.constituencyCode}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => { setEditRole(member); setRoleModal(true); }}
                        className="p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                        title="Edit role"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => { if (confirm(`Remove role from ${member.userName ?? member.userId}?`)) removeRoleMut.mutate(member.userId); }}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Remove role"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Quick role guide */}
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Available Campaign Roles</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {CAMPAIGN_ROLES.map((r) => {
                const Icon = r.icon;
                return (
                  <div key={r.value} className="flex items-center gap-2 text-xs text-gray-600">
                    <div className={`w-5 h-5 rounded flex items-center justify-center ${r.color}`}>
                      <Icon className="w-3 h-3" />
                    </div>
                    <span className="font-medium">{r.label}</span>
                    <span className="text-gray-400">— {r.description}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Teams Tab ─────────────────────────────────────────── */}
      {tab === 'team' && (
        <div className="space-y-3">
          {teams.length === 0 ? (
            <div className="vc-card text-center py-12">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">No teams set up yet. Use the Roles tab to assign campaign positions, or contact your party to configure team structures.</p>
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
                    {team.members?.length > 0 ? (
                      <div className="space-y-2">
                        {team.members.map((m: any) => (
                          <div key={m.id} className="flex items-center gap-2 text-xs text-gray-600">
                            <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center">
                              <span className="text-[9px] font-bold text-gray-500">{(m.userName ?? m.userId ?? '?').charAt(0).toUpperCase()}</span>
                            </div>
                            <span>{m.userName ?? m.userId}</span>
                            <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${VOLUNTEER_ROLE_COLORS[m.campaignRole] ?? 'bg-gray-100 text-gray-500'}`}>
                              {(m.campaignRole ?? 'MEMBER').replace(/_/g, ' ')}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400">No members in this team yet</p>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* ── Volunteers Tab ────────────────────────────────────── */}
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
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${VOLUNTEER_ROLE_COLORS[v.campaignRole ?? 'MEMBER'] ?? 'bg-gray-100 text-gray-600'}`}>
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

      {/* Modals */}
      {showVolModal && <AddVolunteerModal campaignId={campaign.id} onClose={() => setVolModal(false)} />}
      {showRoleModal && (
        <AssignRoleModal
          campaignId={campaign.id}
          existingRole={editRole}
          onClose={() => { setRoleModal(false); setEditRole(null); }}
        />
      )}
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
