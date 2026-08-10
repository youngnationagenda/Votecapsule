import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { BarChart3, RefreshCw } from 'lucide-react';
import { apiClient } from '../api/apiClient';
import { PageErrorBoundary } from '../components/PageErrorBoundary';

function LiveReportingPageContent(): React.JSX.Element {
  const { data: results, refetch, isFetching } = useQuery({ queryKey: ['observer','live'], queryFn: () => apiClient.get('/reporting/public/results?electionYear=2027&positionCode=PRESIDENT').then(r => r.data?.data ?? []), refetchInterval: 30_000 });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h2 className="text-xl font-bold text-gray-900">Live Reporting</h2><p className="text-sm text-gray-500">Published election results — updates every 30 seconds</p></div>
        <button onClick={() => refetch()} disabled={isFetching} className="vc-btn-secondary gap-2 text-sm"><RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />Refresh</button>
      </div>
      <div className="vc-card">
        <div className="flex items-center gap-2 mb-6"><BarChart3 className="w-4 h-4 text-sky-600" /><h3 className="font-semibold text-gray-900">Published Results by Position</h3></div>
        {!results || results.length === 0 ? (
          <div className="text-center py-16 text-gray-400"><BarChart3 className="w-12 h-12 text-gray-200 mx-auto mb-3" /><p>No published results yet — check back when election begins</p></div>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={results}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis dataKey="candidateName" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" height={50} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="votes" fill="#0369A1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
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
