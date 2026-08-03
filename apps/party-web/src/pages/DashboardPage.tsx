import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Users, MapPin, BarChart3, TrendingUp, CheckCircle, Clock, Activity } from 'lucide-react';
import { apiClient } from '../api/apiClient';

export function DashboardPage(): React.JSX.Element {
  const { data: candidates } = useQuery({ queryKey: ['party','candidates'], queryFn: () => apiClient.get('/candidate/candidates').then(r => r.data?.data ?? []) });
  const { data: reporting } = useQuery({ queryKey: ['party','dashboard'], queryFn: () => apiClient.get('/reporting/reports/dashboard').then(r => r.data?.data ?? {}) });

  const stats = [
    { label: 'Party Candidates', value: candidates?.length ?? 0, icon: Users, color: 'text-violet-600', bg: 'bg-violet-50' },
    { label: 'Stations Assigned', value: reporting?.stationsAssigned ?? 0, icon: MapPin, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Capsules Submitted', value: reporting?.capsulesSubmitted ?? 0, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Awaiting Validation', value: reporting?.pendingValidation ?? 0, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Agents Active', value: reporting?.activeAgents ?? 0, icon: Activity, color: 'text-sky-600', bg: 'bg-sky-50' },
    { label: 'Coverage %', value: reporting?.coveragePercent ? `${reporting.coveragePercent}%` : '0%', icon: TrendingUp, color: 'text-pink-600', bg: 'bg-pink-50' },
    { label: 'Validated Today', value: reporting?.validatedToday ?? 0, icon: BarChart3, color: 'text-teal-600', bg: 'bg-teal-50' },
    { label: 'Published Results', value: reporting?.publishedResults ?? 0, icon: CheckCircle, color: 'text-indigo-600', bg: 'bg-indigo-50' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Party Dashboard</h2>
        <p className="text-sm text-gray-500 mt-1">Campaign operations overview — agents, candidates, and live coverage</p>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(({ label, value, icon: Icon, color, bg }) => (
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
          <h3 className="text-base font-semibold text-gray-900 mb-4">Recent Activity</h3>
          <div className="space-y-3">
            {[
              { event: 'Portal initialized', time: 'Now', type: 'info' },
              { event: 'Awaiting election configuration', time: 'Pending', type: 'pending' },
            ].map(({ event, time, type }) => (
              <div key={event} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <span className="text-sm text-gray-700">{event}</span>
                <span className={`vc-badge ${type === 'info' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>{time}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="vc-card">
          <h3 className="text-base font-semibold text-gray-900 mb-4">Candidate Status Summary</h3>
          <div className="space-y-2">
            {[
              { label: 'Pending Approval', value: (candidates ?? []).filter((c: any) => c.status === 'PENDING').length },
              { label: 'Approved', value: (candidates ?? []).filter((c: any) => c.status === 'APPROVED').length },
              { label: 'Rejected', value: (candidates ?? []).filter((c: any) => c.status === 'REJECTED').length },
              { label: 'Total', value: candidates?.length ?? 0 },
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
