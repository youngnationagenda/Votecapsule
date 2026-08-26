// ============================================================
// VoteCapsule™ — My Campaign Dashboard (Candidate Portal)
// Phase 14A — Candidate's own campaign overview
// Scoped to candidate's geography + campaign only
// ============================================================
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Calendar, Users, CheckSquare, AlertTriangle, DollarSign,
  MessageSquare, MapPin, Megaphone, ChevronRight, Target,
  Clock, TrendingUp, Flag, Plus, Rocket,
} from 'lucide-react';
import { campaignApi } from '../api/campaignApi';
import { PageErrorBoundary } from '../components/PageErrorBoundary';
import { useAppSelector } from '../store/hooks';

// ── Create Campaign Form (shown when no campaign exists) ──────
function CreateCampaignForm(): React.JSX.Element {
  const qc   = useQueryClient();
  const user = useAppSelector((s) => s.auth.user);
  const [name, setName]               = useState('');
  const [description, setDescription] = useState('');
  const [countyCode, setCountyCode]   = useState('');
  const [constituencyCode, setConstituencyCode] = useState('');
  const [wardCode, setWardCode]       = useState('');
  const [error, setError]             = useState<string | null>(null);

  // Fetch active election for auto-population
  // activeElection() → GET /election/elections/active (requires x-tenant-id header)
  const { data: activeElection } = useQuery({
    queryKey: ['active-election', user?.tenantId],
    queryFn:  async () => {
      try {
        const r = await campaignApi.activeElection();
        const el = r.data?.data ?? r.data;
        // Null means no active election found — return null gracefully
        return el?.id ? el : null;
      } catch {
        return null;
      }
    },
    enabled: !!user?.tenantId,
  });

  // Fallback: list all elections and filter to usable statuses client-side
  // (Backend listElections doesn't accept a status filter param — it returns all)
  const { data: electionsRaw = [] } = useQuery({
    queryKey: ['elections-list'],
    queryFn:  () => campaignApi.listElections().then((r) => {
      const all: any[] = r.data?.data ?? r.data ?? [];
      // Show elections that are in a state where campaigns make sense
      const usable = ['PLANNING', 'NOMINATION', 'CAMPAIGN', 'ACTIVE', 'active', 'nomination', 'campaign', 'planning'];
      return all.filter((el: any) => usable.includes(el.status) || el.isActive === true || el.is_active === true);
    }),
    enabled: !activeElection,
  });
  const elections = electionsRaw;

  const [selectedElectionId, setSelectedElectionId] = useState('');
  const electionId = activeElection?.id ?? selectedElectionId;

  const createMutation = useMutation({
    mutationFn: (payload: Parameters<typeof campaignApi.create>[0]) => campaignApi.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-campaigns'] });
      setError(null);
    },
    onError: (err: any) => {
      setError(err?.response?.data?.message ?? 'Failed to create campaign. Please try again.');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError('Campaign name is required'); return; }
    if (!electionId) { setError('Please select an election'); return; }
    createMutation.mutate({
      candidateId: user?.id ?? '',
      electionId,
      name: name.trim(),
      description: description.trim() || undefined,
      countyCode:        countyCode.trim() || undefined,
      constituencyCode:  constituencyCode.trim() || undefined,
      wardCode:          wardCode.trim() || undefined,
    });
  };

  return (
    <div className="space-y-6">
      <div><h2 className="text-xl font-bold text-gray-900">My Campaign</h2></div>

      <div className="vc-card">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-amber-50 rounded-2xl mb-4">
            <Rocket className="w-8 h-8 text-amber-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">Launch Your Campaign</h3>
          <p className="text-sm text-gray-500 max-w-md mx-auto">
            Set up your campaign to start managing team, budget, events, and materials.
          </p>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 mb-4 rounded-lg bg-red-50 border border-red-200 max-w-lg mx-auto">
            <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="max-w-lg mx-auto space-y-4">
          <div>
            <label className="vc-label">Campaign Name *</label>
            <input
              className="vc-input"
              placeholder="e.g. Wanjiku 2027 — Governor Kiambu"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="vc-label">Description</label>
            <textarea
              className="vc-input min-h-[80px]"
              placeholder="Brief campaign description (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          {activeElection ? (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
              <p className="text-xs text-emerald-600 font-medium">Active Election</p>
              <p className="text-sm font-semibold text-emerald-800 mt-0.5">{activeElection.name ?? activeElection.electionType ?? 'Current Election'}</p>
            </div>
          ) : elections.length > 0 ? (
            <div>
              <label className="vc-label">Election *</label>
              <select className="vc-input" value={selectedElectionId} onChange={(e) => setSelectedElectionId(e.target.value)} required>
                <option value="">Select election…</option>
                {elections.map((el: any) => (
                  <option key={el.id} value={el.id}>{el.name ?? el.electionType ?? el.id}</option>
                ))}
              </select>
            </div>
          ) : (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-xs text-amber-700">No active election found. Contact your party admin to register an election first.</p>
            </div>
          )}

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="vc-label">County Code</label>
              <input className="vc-input" placeholder="e.g. 022" value={countyCode} onChange={(e) => setCountyCode(e.target.value)} maxLength={3} />
            </div>
            <div>
              <label className="vc-label">Constituency</label>
              <input className="vc-input" placeholder="e.g. 110" value={constituencyCode} onChange={(e) => setConstituencyCode(e.target.value)} maxLength={3} />
            </div>
            <div>
              <label className="vc-label">Ward</label>
              <input className="vc-input" placeholder="e.g. 0550" value={wardCode} onChange={(e) => setWardCode(e.target.value)} maxLength={4} />
            </div>
          </div>

          <button
            type="submit"
            disabled={createMutation.isPending || !name.trim() || !electionId}
            className="vc-btn-primary w-full gap-2"
          >
            <Plus className="w-4 h-4" />
            {createMutation.isPending ? 'Creating campaign…' : 'Create My Campaign'}
          </button>
        </form>
      </div>
    </div>
  );
}

function MyCampaignDashboardContent(): React.JSX.Element {
  const navigate = useNavigate();
  const user     = useAppSelector((s) => s.auth.user);

  // Fetch campaigns scoped to this candidate's own user ID
  // Backend: GET /campaign/campaigns?candidateId=<userId>
  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ['my-campaigns', user?.id],
    queryFn:  () => campaignApi.list({ candidateId: user?.id }).then((r) => r.data?.data ?? r.data ?? []),
    enabled:  !!user?.id,
  });

  const campaign = campaigns.find((c: any) => c.status === 'active') ?? campaigns[0];

  const { data: dash } = useQuery({
    queryKey: ['my-campaign-dashboard', campaign?.id],
    queryFn:  () => campaign ? campaignApi.dashboard(campaign.id).then((r) => r.data?.data ?? r.data) : null,
    enabled:  !!campaign?.id,
  });

  const { data: upcomingEvents = [] } = useQuery({
    queryKey: ['my-upcoming-events', campaign?.id],
    queryFn:  () => campaign
      ? campaignApi.events.list(campaign.id, { status: 'scheduled,confirmed', limit: 5 }).then((r) => r.data?.data ?? r.data ?? [])
      : [],
    enabled: !!campaign?.id,
  });

  const { data: pendingTasks = [] } = useQuery({
    queryKey: ['my-pending-tasks', campaign?.id],
    queryFn:  () => campaign
      ? campaignApi.tasks.list(campaign.id, { status: 'todo,in_progress', limit: 5 }).then((r) => r.data?.data ?? r.data ?? [])
      : [],
    enabled: !!campaign?.id,
  });

  const { data: budgetData } = useQuery({
    queryKey: ['my-budget', campaign?.id],
    queryFn:  () => campaign ? campaignApi.budget.get(campaign.id).then((r) => r.data?.data ?? r.data) : null,
    enabled:  !!campaign?.id,
  });

  const { data: iebc } = useQuery({
    queryKey: ['my-iebc', campaign?.id],
    queryFn:  () => campaign ? campaignApi.budget.iebc(campaign.id).then((r) => r.data?.data ?? r.data) : null,
    enabled:  !!campaign?.id,
  });

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-amber-200 border-t-amber-500 rounded-full animate-spin" />
    </div>
  );

  if (!campaigns.length) return <CreateCampaignForm />;

  const iebcPct  = iebc?.limitPercentageUsed ?? 0;
  const iebcColor = iebcPct >= 95 ? 'text-red-600' : iebcPct >= 80 ? 'text-amber-600' : 'text-emerald-600';
  const iebcBg    = iebcPct >= 95 ? 'bg-red-50'   : iebcPct >= 80 ? 'bg-amber-50'    : 'bg-emerald-50';

  const stats = [
    { label: 'Scheduled Events',  value: dash?.eventsCount     ?? '—', icon: Calendar,      color: 'text-amber-600',   bg: 'bg-amber-50' },
    { label: 'Team Members',      value: dash?.teamCount        ?? '—', icon: Users,         color: 'text-blue-600',    bg: 'bg-blue-50' },
    { label: 'Open Tasks',        value: dash?.tasksActive      ?? '—', icon: CheckSquare,   color: 'text-violet-600',  bg: 'bg-violet-50' },
    { label: 'Volunteers',        value: dash?.volunteersCount  ?? '—', icon: Target,        color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'IEBC Limit Used',   value: `${iebcPct}%`,                 icon: TrendingUp,    color: iebcColor,          bg: iebcBg },
    { label: 'Open Incidents',    value: dash?.incidentsOpen    ?? '0', icon: AlertTriangle, color: 'text-red-600',     bg: 'bg-red-50' },
  ];

  const quickLinks = [
    { label: 'Campaign Calendar',  icon: Calendar,      path: '/campaign/calendar',  color: 'text-amber-600',   bg: 'bg-amber-50' },
    { label: 'My Tasks',           icon: CheckSquare,   path: '/campaign/tasks',     color: 'text-violet-600',  bg: 'bg-violet-50' },
    { label: 'My Team',            icon: Users,         path: '/campaign/team',      color: 'text-blue-600',    bg: 'bg-blue-50' },
    { label: 'Campaign Budget',    icon: DollarSign,    path: '/campaign/budget',    color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Send SMS',           icon: MessageSquare, path: '/campaign/sms',       color: 'text-sky-600',     bg: 'bg-sky-50' },
    { label: 'Report Incident',    icon: Flag,          path: '/campaign/incidents', color: 'text-red-600',     bg: 'bg-red-50' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">My Campaign</h2>
          <p className="text-sm text-gray-500 mt-1">
            {campaign?.name ?? 'Campaign'} — {campaign?.constituencyCode ?? campaign?.countyCode ?? 'Geography TBD'}
          </p>
        </div>
        <span className={`vc-badge ${campaign?.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
          {campaign?.status ?? 'unknown'}
        </span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {stats.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="vc-stat-card">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-500">{label}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
              </div>
              <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center flex-shrink-0`}>
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* IEBC Bar */}
      {iebc && (
        <div className={`vc-card border-l-4 ${iebcPct >= 95 ? 'border-red-500' : iebcPct >= 80 ? 'border-amber-500' : 'border-emerald-500'}`}>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold text-gray-900">IEBC Spending Limit</p>
            <span className={`text-sm font-bold ${iebcColor}`}>{iebcPct}% used</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2.5">
            <div
              className={`h-2.5 rounded-full transition-all ${iebcPct >= 95 ? 'bg-red-500' : iebcPct >= 80 ? 'bg-amber-500' : 'bg-emerald-500'}`}
              style={{ width: `${Math.min(iebcPct, 100)}%` }}
            />
          </div>
          <div className="flex justify-between mt-1.5 text-xs text-gray-500">
            <span>KES {budgetData?.totalSpent?.toLocaleString() ?? '0'} spent</span>
            <span>Limit: KES {iebc?.limitAmount?.toLocaleString() ?? '—'}</span>
          </div>
          {iebcPct >= 80 && (
            <p className={`text-xs font-medium mt-2 ${iebcColor}`}>
              {iebcPct >= 95 ? '⚠ CRITICAL: You are very close to the IEBC legal spending limit.' : '⚠ WARNING: Campaign spend approaching IEBC limit (80%).'}
            </p>
          )}
        </div>
      )}

      {/* Two-column: Upcoming Events + Pending Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Upcoming Events */}
        <div className="vc-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-900">Upcoming Events</h3>
            <button onClick={() => navigate('/campaign/calendar')} className="text-xs text-amber-600 hover:underline">View all</button>
          </div>
          {upcomingEvents.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No upcoming events</p>
          ) : (
            <div className="space-y-2">
              {upcomingEvents.map((ev: any) => (
                <div key={ev.id} className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-gray-50">
                  <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
                    <Calendar className="w-4 h-4 text-amber-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{ev.eventName}</p>
                    <p className="text-xs text-gray-500">{ev.venueName ?? ev.wardCode ?? '—'} · {ev.startTime ? new Date(ev.startTime).toLocaleDateString('en-KE', { weekday: 'short', day: 'numeric', month: 'short' }) : '—'}</p>
                  </div>
                  <span className={`ml-auto text-xs px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                    ev.status === 'confirmed' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                  }`}>{ev.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pending Tasks */}
        <div className="vc-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-900">Pending Tasks</h3>
            <button onClick={() => navigate('/campaign/tasks')} className="text-xs text-amber-600 hover:underline">View all</button>
          </div>
          {pendingTasks.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No pending tasks</p>
          ) : (
            <div className="space-y-2">
              {pendingTasks.map((task: any) => (
                <div key={task.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-50">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    task.priority === 'critical' ? 'bg-red-500' :
                    task.priority === 'high'     ? 'bg-amber-500' :
                    task.priority === 'medium'   ? 'bg-blue-500' : 'bg-gray-300'
                  }`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">{task.title}</p>
                    {task.dueDate && (
                      <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3" />
                        Due {new Date(task.dueDate).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' })}
                      </p>
                    )}
                  </div>
                  <span className={`text-xs px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                    task.status === 'in_progress' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                  }`}>{task.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {quickLinks.map(({ label, icon: Icon, path, color, bg }) => (
          <button
            key={label}
            onClick={() => navigate(path)}
            className="vc-card flex items-center gap-3 hover:border-amber-200 hover:shadow-md transition-all text-left group p-4"
          >
            <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center flex-shrink-0`}>
              <Icon className={`w-4 h-4 ${color}`} />
            </div>
            <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900 truncate">{label}</span>
            <ChevronRight className="w-4 h-4 text-gray-400 ml-auto flex-shrink-0" />
          </button>
        ))}
      </div>

      {/* Campaign info */}
      <div className="vc-card">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Campaign Details</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
          <div><p className="text-gray-500 text-xs">Position</p><p className="font-semibold text-gray-900 mt-0.5">{user?.position ?? '—'}</p></div>
          <div><p className="text-gray-500 text-xs">Geography</p><p className="font-semibold text-gray-900 mt-0.5">{campaign?.constituencyCode ?? campaign?.countyCode ?? '—'}</p></div>
          <div><p className="text-gray-500 text-xs">Target Wards</p><p className="font-semibold text-gray-900 mt-0.5">{campaign?.targetWards?.length ?? 0}</p></div>
          <div><p className="text-gray-500 text-xs">Campaign End</p><p className="font-semibold text-gray-900 mt-0.5">{campaign?.campaignEndDate ? new Date(campaign.campaignEndDate).toLocaleDateString('en-KE') : '—'}</p></div>
        </div>
      </div>
    </div>
  );
}

export function MyCampaignDashboard() {
  return (
    <PageErrorBoundary page="My Campaign Dashboard">
      <MyCampaignDashboardContent />
    </PageErrorBoundary>
  );
}
