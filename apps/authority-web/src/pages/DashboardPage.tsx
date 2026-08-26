import React, { Component, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Vote, MapPin, CheckSquare, AlertTriangle, TrendingUp, Users, Clock, Activity } from 'lucide-react';
import { apiClient } from '../api/apiClient';

interface StatCard { label: string; value: string | number; sub: string; icon: React.ElementType; color: string; bg: string; }

function StatCard({ label, value, sub, icon: Icon, color, bg }: StatCard) {
  return (
    <div className="vc-stat-card">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          <p className="text-xs text-gray-400 mt-1">{sub}</p>
        </div>
        <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center flex-shrink-0`}>
          <Icon className={`w-5 h-5 ${color}`} />
        </div>
      </div>
    </div>
  );
}

// ── Error Boundary — prevents blank page on runtime errors ───────────────────
class DashboardErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="space-y-4 p-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-5">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
              <div>
                <h2 className="text-sm font-semibold text-red-800">Dashboard failed to render</h2>
                <p className="text-sm text-red-700 mt-1">
                  One or more backend services returned unexpected data. Other pages should work normally.
                </p>
                <pre className="text-xs text-red-600 mt-2 bg-red-100 p-2 rounded overflow-auto max-h-24">
                  {this.state.error?.message}
                </pre>
                <button
                  onClick={() => window.location.reload()}
                  className="mt-3 px-3 py-1.5 text-xs font-medium bg-red-100 hover:bg-red-200 text-red-700 rounded transition-colors"
                >
                  Reload page
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export function DashboardPage(): React.JSX.Element {
  return (
    <DashboardErrorBoundary>
      <DashboardContent />
    </DashboardErrorBoundary>
  );
}

function DashboardContent(): React.JSX.Element {
  const { data: geoStats } = useQuery({
    queryKey: ['geography', 'stats'],
    queryFn: () => apiClient.get('/geography/stats').then((r) => r.data?.data ?? r.data),
  });

  const stats: StatCard[] = [
    { label: 'Active Elections', value: '1', sub: '2027 General Election', icon: Vote, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Polling Stations', value: (geoStats?.pollingStations ?? geoStats?.totalPollingStations)?.toLocaleString() ?? '45,805', sub: 'Nationwide', icon: MapPin, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Capsules Submitted', value: '0', sub: 'Awaiting election day', icon: CheckSquare, color: 'text-violet-600', bg: 'bg-violet-50' },
    { label: 'AI Flagged', value: '0', sub: 'Requires review', icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Registered Voters', value: (geoStats?.totalRegisteredVoters ?? geoStats?.registeredVoters)?.toLocaleString() ?? '22,102,532', sub: 'NEC Registry', icon: Users, color: 'text-sky-600', bg: 'bg-sky-50' },
    { label: 'Candidates Approved', value: '0', sub: 'Pending approval', icon: TrendingUp, color: 'text-pink-600', bg: 'bg-pink-50' },
    { label: 'Validators Active', value: '0', sub: 'Online validators', icon: Activity, color: 'text-teal-600', bg: 'bg-teal-50' },
    { label: 'Time to Election', value: 'TBD', sub: '2027 Election countdown', icon: Clock, color: 'text-orange-600', bg: 'bg-orange-50' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Election Authority Dashboard</h2>
        <p className="text-sm text-gray-500 mt-1">Operational command center for election management</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => <StatCard key={s.label} {...s} />)}
      </div>

      {/* Status panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="vc-card">
          <h3 className="text-base font-semibold text-gray-900 mb-4">Election Setup Status</h3>
          <div className="space-y-3">
            {[
              { step: 'Election Created', status: 'pending', note: 'Configure via Election Setup' },
              { step: 'Positions Configured', status: 'pending', note: '8 positions per V9 spec' },
              { step: 'Candidate Registration', status: 'pending', note: 'Opens after setup' },
              { step: 'Agent Assignments', status: 'pending', note: 'After candidates approved' },
              { step: 'Validation Teams', status: 'pending', note: 'Assign validators per county' },
              { step: 'Observer Access', status: 'pending', note: 'Invite accredited observers' },
            ].map(({ step, status, note }) => (
              <div key={step} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-800">{step}</p>
                  <p className="text-xs text-gray-500">{note}</p>
                </div>
                <span className={`vc-badge ${status === 'done' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-500'}`}>
                  {status === 'done' ? 'Done' : 'Pending'}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="vc-card">
          <h3 className="text-base font-semibold text-gray-900 mb-4">NEC Geography Summary</h3>
          <div className="space-y-2">
            {[
              { label: 'Counties',           value: (geoStats?.counties           ?? geoStats?.totalCounties)                                   ?? 47 },
              { label: 'Constituencies',     value: (geoStats?.constituencies      ?? geoStats?.totalConstituencies)                             ?? 290 },
              { label: 'Wards',              value: (geoStats?.wards               ?? geoStats?.totalWards)                                      ?? 1450 },
              { label: 'Registration Centres', value: (geoStats?.registrationCentres ?? geoStats?.totalRegistrationCentres)?.toLocaleString()   ?? '27,286' },
              { label: 'Polling Stations',   value: (geoStats?.pollingStations      ?? geoStats?.totalPollingStations)?.toLocaleString()         ?? '45,805' },
              { label: 'Registered Voters',  value: (geoStats?.totalRegisteredVoters ?? geoStats?.registeredVoters)?.toLocaleString()           ?? '22,102,532' },
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
