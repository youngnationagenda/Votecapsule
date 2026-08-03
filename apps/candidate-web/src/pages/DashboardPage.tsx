import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { MapPin, BarChart3, CheckCircle, Clock, TrendingUp, Users } from 'lucide-react';
import { apiClient } from '../api/apiClient';
import { useAppSelector } from '../store/hooks';

export function DashboardPage(): React.JSX.Element {
  const user = useAppSelector((s) => s.auth.user);
  const { data: profile } = useQuery({ queryKey: ['candidate','profile'], queryFn: () => apiClient.get(`/candidate/candidates/${user?.id ?? ''}`).then(r => r.data?.data ?? r.data ?? {}) });
  const { data: reporting } = useQuery({ queryKey: ['candidate','reporting'], queryFn: () => apiClient.get('/reporting/reports/dashboard').then(r => r.data?.data ?? {}) });

  const stats = [
    { label: 'My Position', value: profile?.position ?? 'MP', icon: Users, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Assigned Region', value: profile?.constituencyName ?? profile?.countyName ?? 'Loading…', icon: MapPin, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Stations in Region', value: reporting?.totalStations ?? 0, icon: TrendingUp, color: 'text-violet-600', bg: 'bg-violet-50' },
    { label: 'Stations Reported', value: reporting?.stationsReported ?? 0, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Capsules Submitted', value: reporting?.capsulesSubmitted ?? 0, icon: BarChart3, color: 'text-sky-600', bg: 'bg-sky-50' },
    { label: 'Pending Validation', value: reporting?.pendingValidation ?? 0, icon: Clock, color: 'text-orange-600', bg: 'bg-orange-50' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">My Dashboard</h2>
        <p className="text-sm text-gray-500 mt-1">Your campaign overview — access restricted to your assigned position and geography</p>
      </div>

      {profile && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-amber-500 flex items-center justify-center text-white font-bold text-lg">
            {profile.firstName?.charAt(0)}{profile.lastName?.charAt(0)}
          </div>
          <div>
            <p className="font-semibold text-gray-900">{profile.firstName} {profile.lastName}</p>
            <p className="text-sm text-gray-600">{profile.position} — {profile.constituencyName ?? profile.countyName ?? 'Region TBD'}</p>
            <span className={`vc-badge mt-1 ${profile.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{profile.status ?? 'PENDING APPROVAL'}</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {stats.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="vc-stat-card">
            <div className="flex items-start justify-between">
              <div><p className="text-sm text-gray-500">{label}</p><p className="text-lg font-bold text-gray-900 mt-1">{value}</p></div>
              <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center`}><Icon className={`w-4 h-4 ${color}`} /></div>
            </div>
          </div>
        ))}
      </div>

      <div className="vc-card">
        <h3 className="text-base font-semibold text-gray-900 mb-3">Access Scope</h3>
        <p className="text-sm text-gray-500 mb-4">You can only view data from your assigned position and geography. This is enforced by the platform policy engine.</p>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Position', value: profile?.position ?? '—' },
            { label: 'Geographic Scope', value: profile?.constituencyName ?? profile?.countyName ?? '—' },
            { label: 'Election', value: profile?.electionName ?? 'Pending assignment' },
            { label: 'Tenant', value: profile?.partyName ?? 'Independent' },
          ].map(({ label, value }) => (
            <div key={label} className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500">{label}</p>
              <p className="text-sm font-semibold text-gray-900 mt-0.5">{value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
