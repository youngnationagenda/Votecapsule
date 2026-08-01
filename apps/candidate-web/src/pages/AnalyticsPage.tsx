import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrendingUp } from 'lucide-react';
import { apiClient } from '../api/apiClient';

export function AnalyticsPage(): React.JSX.Element {
  const { data: analytics } = useQuery({ queryKey: ['candidate','analytics'], queryFn: () => apiClient.get('/reporting/candidate/analytics').then(r => r.data?.data ?? {}) });

  const pieData = analytics?.stationProgress ? [
    { name: 'Submitted', value: analytics.stationProgress.submitted ?? 0, color: '#D97706' },
    { name: 'Pending', value: analytics.stationProgress.pending ?? 0, color: '#E5E7EB' },
  ] : [];

  return (
    <div className="space-y-6">
      <div><h2 className="text-xl font-bold text-gray-900">Analytics</h2><p className="text-sm text-gray-500">Turnout and coverage analytics for your region</p></div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="vc-card">
          <h3 className="font-semibold text-gray-900 mb-4">Station Coverage</h3>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart><Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie><Tooltip /><Legend /></PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-10"><TrendingUp className="w-10 h-10 text-gray-200 mx-auto mb-2" /><p className="text-gray-400 text-sm">Analytics available once election starts</p></div>
          )}
        </div>
        <div className="vc-card">
          <h3 className="font-semibold text-gray-900 mb-4">Key Metrics</h3>
          <div className="space-y-3">
            {[
              { label: 'Coverage %', value: analytics?.coveragePercent ? `${analytics.coveragePercent}%` : '0%' },
              { label: 'Avg Turnout', value: analytics?.avgTurnout ? `${analytics.avgTurnout}%` : '—' },
              { label: 'Highest Turnout Station', value: analytics?.highestTurnoutStation ?? '—' },
              { label: 'Lowest Turnout Station', value: analytics?.lowestTurnoutStation ?? '—' },
              { label: 'Votes for You', value: analytics?.myVotes?.toLocaleString() ?? '—' },
              { label: 'Your Vote %', value: analytics?.myVotePercent ? `${analytics.myVotePercent}%` : '—' },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <span className="text-sm text-gray-600">{label}</span>
                <span className="text-sm font-bold text-gray-900">{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
