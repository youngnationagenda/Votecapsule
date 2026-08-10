import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { BarChart3, TrendingUp, RefreshCw } from 'lucide-react';
import { apiClient } from '../api/apiClient';
import { PageErrorBoundary } from '../components/PageErrorBoundary';

const COLORS = ['#059669', '#0B3C6D', '#7C3AED', '#D97706', '#DC2626', '#0369A1', '#6D28D9', '#047857'];

function LiveReportingPageContent(): React.JSX.Element {
  const { data: stats, refetch, isFetching } = useQuery({
    queryKey: ['reporting', 'live'],
    queryFn: () => apiClient.get('/reporting/reports/dashboard').then((r) => r.data?.data ?? r.data ?? {}),
    refetchInterval: 30_000,
  });

  const { data: countyProgress } = useQuery({
    queryKey: ['reporting', 'counties'],
    queryFn: () => apiClient.get('/geography/counties').then((r) => r.data?.data ?? r.data ?? []),
  });

  const chartData = (countyProgress ?? []).slice(0, 15).map((c: any) => ({
    name: c.name?.substring(0, 10) ?? c.code,
    submitted: c.capsulesSubmitted ?? 0,
    total: c.totalStations ?? 100,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Live Reporting</h2>
          <p className="text-sm text-gray-500 mt-1">Real-time results as capsules are validated — auto-refreshes every 30s</p>
        </div>
        <button onClick={() => refetch()} disabled={isFetching}
          className="vc-btn-secondary gap-2 text-sm">
          <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Stations Reported', value: stats?.stationsReported ?? 0, total: '45,805' },
          { label: 'Capsules Validated', value: stats?.capsulesValidated ?? 0, total: '' },
          { label: 'Capsules Published', value: stats?.capsulesPublished ?? 0, total: '' },
          { label: 'Validation Queue', value: stats?.validationQueue ?? 0, total: '' },
        ].map(({ label, value, total }) => (
          <div key={label} className="vc-stat-card">
            <p className="text-sm text-gray-500">{label}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{value?.toLocaleString()}</p>
            {total && <p className="text-xs text-gray-400 mt-1">of {total}</p>}
          </div>
        ))}
      </div>

      <div className="vc-card">
        <div className="flex items-center gap-2 mb-6">
          <BarChart3 className="w-4 h-4 text-emerald-600" />
          <h3 className="font-semibold text-gray-900">County Reporting Progress (Top 15)</h3>
        </div>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData} margin={{ top: 5, right: 20, bottom: 40, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-35} textAnchor="end" />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="submitted" name="Capsules Submitted" radius={[4, 4, 0, 0]}>
                {chartData.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="text-center py-16">
            <TrendingUp className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400">Live results will appear here once the election begins</p>
          </div>
        )}
      </div>
    </div>
  );
}

export function LiveReportingPage() {
  return (
    <PageErrorBoundary page="Live Reporting">
      <LiveReportingPageContent />
    </PageErrorBoundary>
  );
}
