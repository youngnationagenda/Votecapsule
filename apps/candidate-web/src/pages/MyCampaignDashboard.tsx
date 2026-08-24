// ============================================================
// VoteCapsule™ — My Campaign Dashboard (Candidate Portal)
// Phase 14A — Candidate's own campaign overview
// Scoped to candidate's geography + campaign only
// ============================================================
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Calendar, Users, CheckSquare, AlertTriangle, DollarSign,
  MessageSquare, MapPin, Megaphone, ChevronRight, Target,
  Clock, TrendingUp, Flag,
} from 'lucide-react';
import { campaignApi } from '../api/campaignApi';
import { PageErrorBoundary } from '../components/PageErrorBoundary';
import { useAppSelector } from '../store/hooks';

function MyCampaignDashboardContent(): React.JSX.Element {
  const navigate = useNavigate();
  const user     = useAppSelector((s) => s.auth.user);

  // Candidate has exactly one active campaign
  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ['my-campaigns'],
    queryFn:  () => campaignApi.list({ candidate: true }).then((r) => r.data?.data ?? r.data ?? []),
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

  if (!campaigns.length) return (
    <div className="space-y-6">
      <div><h2 className="text-xl font-bold text-gray-900">My Campaign</h2></div>
      <div className="vc-card text-center py-16">
        <Megaphone className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-700 mb-2">No campaign found</h3>
        <p className="text-sm text-gray-500">Your campaign will appear here once it has been set up by your party.</p>
      </div>
    </div>
  );

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
