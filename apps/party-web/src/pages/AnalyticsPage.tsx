import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp } from 'lucide-react';
import { apiClient } from '../api/apiClient';

export function AnalyticsPage(): React.JSX.Element {
  const { data: analytics } = useQuery({ queryKey: ['party','analytics'], queryFn: () => apiClient.get('/reporting/analytics').then(r => r.data?.data ?? {}) });

  return (
    <div className="space-y-6">
      <div><h2 className="text-xl font-bold text-gray-900">Performance Analytics</h2><p className="text-sm text-gray-500">Agent performance, station coverage, and submission trends</p></div>
      <div className="vc-card">
        <div className="flex items-center gap-2 mb-6"><TrendingUp className="w-4 h-4 text-violet-600" /><h3 className="font-semibold text-gray-900">Submission Trend</h3></div>
        {analytics?.trend && analytics.trend.length > 0 ? (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={analytics.trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis dataKey="time" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line type="monotone" dataKey="submissions" stroke="#7C3AED" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="text-center py-16"><TrendingUp className="w-12 h-12 text-gray-200 mx-auto mb-3" /><p className="text-gray-400">Analytics will appear once election operations begin</p></div>
        )}
      </div>
    </div>
  );
}
