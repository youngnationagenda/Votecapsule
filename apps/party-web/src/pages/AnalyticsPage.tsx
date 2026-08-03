import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart3, Users, TrendingUp, Activity, CheckCircle, XCircle, Clock } from 'lucide-react';
import { apiClient } from '../api/apiClient';

export function AnalyticsPage(): React.JSX.Element {
  const { data: analytics, isLoading } = useQuery({
    queryKey: ['party', 'analytics'],
    queryFn: () => apiClient.get('/reporting/reports/analytics').then(r => r.data?.data ?? {}),
  });

  const candidateStats = [
    { label: 'Total Candidates', value: analytics?.totalCandidates ?? 0, icon: Users, color: 'text-violet-600', bg: 'bg-violet-50' },
    { label: 'Approved', value: analytics?.approvedCandidates ?? 0, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Pending Review', value: analytics?.pendingCandidates ?? 0, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Rejected', value: analytics?.rejectedCandidates ?? 0, icon: XCircle, color: 'text-red-600', bg: 'bg-red-50' },
  ];

  const positionVotes: Array<{ position: string; votes: number; percent: number }> = analytics?.votesByPosition ?? [];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div><h2 className="text-xl font-bold text-gray-900">Performance Analytics</h2></div>
        <div className="vc-card flex items-center justify-center py-16">
          <Activity className="w-8 h-8 text-violet-400 animate-pulse" />
          <p className="ml-3 text-gray-500">Loading analytics…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Performance Analytics</h2>
        <p className="text-sm text-gray-500 mt-1">Candidate status breakdown, votes by position, and party coverage summary</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {candidateStats.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="vc-stat-card">
            <div className="flex items-start justify-between">
              <div><p className="text-sm text-gray-500">{label}</p><p className="text-2xl font-bold text-gray-900 mt-1">{value}</p></div>
              <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center flex-shrink-0`}><Icon className={`w-5 h-5 ${color}`} /></div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="vc-card">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-4 h-4 text-violet-600" />
            <h3 className="font-semibold text-gray-900">Votes by Position</h3>
          </div>
          {positionVotes.length === 0 ? (
            <div className="text-center py-10">
              <BarChart3 className="w-10 h-10 text-gray-200 mx-auto mb-2" />
              <p className="text-sm text-gray-400">Vote totals appear once results are published</p>
            </div>
          ) : (
            <div className="space-y-3">
              {positionVotes.map(({ position, votes, percent }) => (
                <div key={position}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700">{position}</span>
                    <span className="text-sm font-bold text-gray-900">{votes.toLocaleString()} ({percent}%)</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div className="bg-violet-500 h-2 rounded-full transition-all" style={{ width: `${Math.min(percent, 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="vc-card">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-violet-600" />
            <h3 className="font-semibold text-gray-900">Party Performance Summary</h3>
          </div>
          <div className="space-y-3">
            {[
              { label: 'Station Coverage', value: analytics?.coveragePercent ? `${analytics.coveragePercent}%` : '0%' },
              { label: 'Capsules Submitted', value: analytics?.capsulesSubmitted?.toLocaleString() ?? '0' },
              { label: 'Capsules Validated', value: analytics?.capsulesValidated?.toLocaleString() ?? '0' },
              { label: 'Agents Active', value: analytics?.activeAgents ?? '0' },
              { label: 'Avg Turnout', value: analytics?.avgTurnout ? `${analytics.avgTurnout}%` : '—' },
              { label: 'Leading Positions', value: analytics?.leadingPositions ?? '—' },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <span className="text-sm text-gray-600">{label}</span>
                <span className="text-sm font-semibold text-gray-900">{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
