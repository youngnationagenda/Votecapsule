import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { BarChart3, TrendingUp, RefreshCw } from 'lucide-react';
import { apiClient } from '../api/apiClient';

export function LiveResultsPage(): React.JSX.Element {
  const { data: results, refetch, isFetching } = useQuery({
    queryKey: ['party','live-results'],
    queryFn: () => apiClient.get('/reporting/results').then(r => r.data?.data ?? []),
    refetchInterval: 30_000,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h2 className="text-xl font-bold text-gray-900">Live Results</h2><p className="text-sm text-gray-500">Real-time results for party candidates — refreshes every 30s</p></div>
        <button onClick={() => refetch()} disabled={isFetching} className="vc-btn-secondary gap-2 text-sm">
          <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />Refresh
        </button>
      </div>
      <div className="vc-card">
        <div className="flex items-center gap-2 mb-6"><BarChart3 className="w-4 h-4 text-violet-600" /><h3 className="font-semibold text-gray-900">Results by Position</h3></div>
        {!results || results.length === 0 ? (
          <div className="text-center py-16"><TrendingUp className="w-12 h-12 text-gray-200 mx-auto mb-3" /><p className="text-gray-400">Live results will appear here once the election begins</p></div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={results}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis dataKey="candidateName" tick={{ fontSize: 10 }} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="votes" fill="#7C3AED" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
