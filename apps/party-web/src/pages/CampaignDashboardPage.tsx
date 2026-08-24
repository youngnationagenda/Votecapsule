// ============================================================
// VoteCapsule™ — Campaign Dashboard (Party Portal)
// Phase 14A — Campaign Command Center
// ============================================================
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Calendar, Users, CheckSquare, AlertTriangle, TrendingUp,
  MapPin, DollarSign, MessageSquare, Plus, ChevronRight,
  Activity, Megaphone, Target,
} from 'lucide-react';
import { campaignApi } from '../api/campaignApi';
import { PageErrorBoundary } from '../components/PageErrorBoundary';
import { useAppSelector } from '../store/hooks';

function CampaignDashboardContent(): React.JSX.Element {
  const navigate  = useNavigate();
  const tenantId  = useAppSelector((s) => s.auth.user?.tenantId);
  const [selected, setSelected] = useState<string | null>(null);

  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ['campaigns', tenantId],
    queryFn: () => campaignApi.list().then((r) => r.data?.data ?? r.data ?? []),
    enabled: !!tenantId,
  });

  const { data: dashData } = useQuery({
    queryKey: ['campaign-dashboard', selected],
    queryFn: () => selected ? campaignApi.dashboard(selected).then((r) => r.data?.data ?? r.data) : null,
    enabled: !!selected,
  });

  const activeCampaign = campaigns.find((c: any) => c.status === 'active') ?? campaigns[0];
  const displayId = selected ?? activeCampaign?.id;

  React.useEffect(() => {
    if (activeCampaign?.id && !selected) setSelected(activeCampaign.id);
  }, [activeCampaign]);

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
    </div>
  );

  if (!campaigns.length) return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Campaign Manager</h2>
          <p className="text-sm text-gray-500 mt-1">Manage your election campaigns</p>
        </div>
      </div>
      <div className="vc-card text-center py-16">
        <Megaphone className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-700 mb-2">No campaigns yet</h3>
        <p className="text-sm text-gray-500 mb-6">Create your first campaign to get started</p>
        <button
          onClick={() => navigate('/campaign/create')}
          className="vc-btn-primary inline-flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Create Campaign
        </button>
      </div>
    </div>
  );

  const stats = [
    { label: 'Campaign Events',  value: dashData?.eventsCount ?? '—',     icon: Calendar,      color: 'text-violet-600',  bg: 'bg-violet-50' },
    { label: 'Team Members',     value: dashData?.teamCount ?? '—',        icon: Users,         color: 'text-blue-600',    bg: 'bg-blue-50' },
    { label: 'Tasks Active',     value: dashData?.tasksActive ?? '—',      icon: CheckSquare,   color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Volunteers',       value: dashData?.volunteersCount ?? '—',  icon: Target,        color: 'text-amber-600',   bg: 'bg-amber-50' },
    { label: 'Budget Used',      value: dashData?.budgetUsed ?? '0%',      icon: DollarSign,    color: 'text-pink-600',    bg: 'bg-pink-50' },
    { label: 'SMS Sent',         value: dashData?.smsSent ?? '—',          icon: MessageSquare, color: 'text-sky-600',     bg: 'bg-sky-50' },
    { label: 'Incidents Open',   value: dashData?.incidentsOpen ?? '0',    icon: AlertTriangle, color: 'text-red-600',     bg: 'bg-red-50' },
    { label: 'Ward Coverage',    value: dashData?.wardCoverage ?? '—',     icon: MapPin,        color: 'text-teal-600',    bg: 'bg-teal-50' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Campaign Manager</h2>
          <p className="text-sm text-gray-500 mt-1">Campaign operations command center</p>
        </div>
        <button
          onClick={() => navigate('/campaign/create')}
          className="vc-btn-primary inline-flex items-center gap-2 text-sm"
        >
          <Plus className="w-4 h-4" /> New Campaign
        </button>
      </div>

      {/* Campaign selector */}
      {campaigns.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {campaigns.map((c: any) => (
            <button
              key={c.id}
              onClick={() => setSelected(c.id)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                selected === c.id
                  ? 'bg-violet-600 text-white'
                  : 'bg-white border border-gray-200 text-gray-600 hover:border-violet-300'
              }`}
            >
              {c.name}
              <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${
                c.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
              }`}>{c.status}</span>
            </button>
          ))}
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {[
          { label: 'Campaign Calendar',  icon: Calendar,      path: '/campaign/calendar', color: 'text-violet-600', bg: 'bg-violet-50' },
          { label: 'Tasks & Actions',   icon: CheckSquare,   path: '/campaign/tasks',    color: 'text-blue-600',   bg: 'bg-blue-50' },
          { label: 'Send SMS',          icon: MessageSquare, path: '/campaign/sms',      color: 'text-sky-600',    bg: 'bg-sky-50' },
          { label: 'Campaign Budget',   icon: DollarSign,    path: '/campaign/budget',   color: 'text-emerald-600',bg: 'bg-emerald-50' },
          { label: 'Teams & Volunteers',icon: Users,         path: '/campaign/teams',    color: 'text-amber-600',  bg: 'bg-amber-50' },
          { label: 'Agent Assignments', icon: AlertTriangle, path: '/agents',            color: 'text-red-600',    bg: 'bg-red-50' },
        ].map(({ label, icon: Icon, path, color, bg }) => (
          <button
            key={label}
            onClick={() => navigate(path)}
            className="vc-card flex items-center gap-3 hover:border-violet-200 hover:shadow-md transition-all text-left group"
          >
            <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center flex-shrink-0`}>
              <Icon className={`w-5 h-5 ${color}`} />
            </div>
            <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">{label}</span>
            <ChevronRight className="w-4 h-4 text-gray-400 ml-auto" />
          </button>
        ))}
      </div>

      {/* Active Campaign Info */}
      {activeCampaign && (
        <div className="vc-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-gray-900">Active Campaign</h3>
            <span className="vc-badge bg-emerald-100 text-emerald-700">{activeCampaign.status}</span>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
            <div><p className="text-gray-500">Campaign Name</p><p className="font-semibold text-gray-900 mt-0.5">{activeCampaign.name}</p></div>
            <div><p className="text-gray-500">Constituency</p><p className="font-semibold text-gray-900 mt-0.5">{activeCampaign.constituencyCode ?? '—'}</p></div>
            <div><p className="text-gray-500">Start Date</p><p className="font-semibold text-gray-900 mt-0.5">{activeCampaign.campaignStartDate ? new Date(activeCampaign.campaignStartDate).toLocaleDateString() : '—'}</p></div>
            <div><p className="text-gray-500">Target Wards</p><p className="font-semibold text-gray-900 mt-0.5">{activeCampaign.targetWards?.length ?? 0}</p></div>
          </div>
        </div>
      )}
    </div>
  );
}

export function CampaignDashboardPage() {
  return (
    <PageErrorBoundary page="Campaign Dashboard">
      <CampaignDashboardContent />
    </PageErrorBoundary>
  );
}
