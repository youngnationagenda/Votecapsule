import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { TrendingUp, Activity, Info, MapPin } from 'lucide-react';
import { apiClient } from '../api/apiClient';
import { PageErrorBoundary } from '../components/PageErrorBoundary';

function AnalyticsPageContent(): React.JSX.Element {
  const { data: analytics, isLoading: loadingAnalytics } = useQuery({
    queryKey: ['candidate', 'analytics'],
    queryFn: () => apiClient.get('/reporting/reports/analytics').then(r => r.data?.data ?? {}),
  });

  const { data: progress, isLoading: loadingProgress } = useQuery({
    queryKey: ['candidate', 'progress'],
    queryFn: () => apiClient.get('/reporting/public/progress').then(r => r.data?.data ?? {}),
  });

  const isLoading = loadingAnalytics || loadingProgress;

  const totalStations = progress?.totalStations ?? 0;
  const reportedStations = progress?.reportedStations ?? 0;
  const progressPct = totalStations > 0 ? Math.round((reportedStations / totalStations) * 100) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Analytics</h2>
        <p className="text-sm text-gray-500 mt-1">Coverage progress, regional trends, and vote position estimates</p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-start gap-2">
        <Info className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-blue-700 font-medium">AI ASSISTS, HUMANS DECIDE — All analytics are derived from validated capsule data only. Final results are determined by the IEBC.</p>
      </div>

      {isLoading ? (
        <div className="vc-card flex items-center justify-center py-16">
          <Activity className="w-8 h-8 text-amber-400 animate-pulse" />
          <p className="ml-3 text-gray-500">Loading analytics…</p>
        </div>
      ) : (
        <>
          <div className="vc-card">
            <div className="flex items-center gap-2 mb-3">
              <MapPin className="w-4 h-4 text-amber-600" />
              <h3 className="font-semibold text-gray-900">Stations Reporting</h3>
            </div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">{reportedStations.toLocaleString()} of {totalStations.toLocaleString()} stations</span>
              <span className="text-sm font-bold text-gray-900">{progressPct}%</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-3">
              <div
                className="bg-amber-500 h-3 rounded-full transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <p className="text-xs text-gray-400 mt-2">
              {progress?.lastUpdated ? `Last updated: ${new Date(progress.lastUpdated).toLocaleString()}` : 'Data updates every 5 minutes'}
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="vc-card">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-amber-600" />My Vote Position
              </h3>
              {analytics?.myVotes || analytics?.myVotePercent ? (
                <div className="space-y-3">
                  {[
                    { label: 'Estimated Votes', value: analytics?.myVotes?.toLocaleString() ?? '—' },
                    { label: 'Vote Share', value: analytics?.myVotePercent ? `${analytics.myVotePercent}%` : '—' },
                    { label: 'Position Rank', value: analytics?.myRank ? `#${analytics.myRank}` : '—' },
                    { label: 'Leading by', value: analytics?.leadMargin?.toLocaleString() ?? '—' },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                      <span className="text-sm text-gray-600">{label}</span>
                      <span className="text-sm font-bold text-gray-900">{value}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <TrendingUp className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">Vote position estimates available once results are published</p>
                </div>
              )}
            </div>

            <div className="vc-card">
              <h3 className="font-semibold text-gray-900 mb-4">Regional Performance</h3>
              <div className="space-y-3">
                {[
                  { label: 'Coverage %', value: analytics?.coveragePercent ? `${analytics.coveragePercent}%` : '0%' },
                  { label: 'Avg Turnout', value: analytics?.avgTurnout ? `${analytics.avgTurnout}%` : '—' },
                  { label: 'Highest Turnout Station', value: analytics?.highestTurnoutStation ?? '—' },
                  { label: 'Lowest Turnout Station', value: analytics?.lowestTurnoutStation ?? '—' },
                  { label: 'Capsules Submitted', value: analytics?.capsulesSubmitted?.toLocaleString() ?? '0' },
                  { label: 'Capsules Validated', value: analytics?.capsulesValidated?.toLocaleString() ?? '0' },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                    <span className="text-sm text-gray-600">{label}</span>
                    <span className="text-sm font-semibold text-gray-900">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export function AnalyticsPage() {
  return (
    <PageErrorBoundary page="Analytics">
      <AnalyticsPageContent />
    </PageErrorBoundary>
  );
}
