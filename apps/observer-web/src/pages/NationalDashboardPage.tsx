import React, { Component, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MapPin, BarChart3, CheckCircle, AlertTriangle, Users, TrendingUp, Globe, Eye } from 'lucide-react';
import { apiClient } from '../api/apiClient';

// ── Error Boundary — prevents blank page on runtime errors ───────────────────
class NationalDashboardErrorBoundary extends Component<
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
                <h2 className="text-sm font-semibold text-red-800">National Dashboard failed to render</h2>
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

export function NationalDashboardPage(): React.JSX.Element {
  return (
    <NationalDashboardErrorBoundary>
      <NationalDashboardContent />
    </NationalDashboardErrorBoundary>
  );
}

function NationalDashboardContent(): React.JSX.Element {
  const { data: geoStats } = useQuery({ queryKey: ['geo','stats'], queryFn: () => apiClient.get('/geography/stats').then(r => r.data?.data ?? r.data ?? {}) });
  const { data: reporting } = useQuery({ queryKey: ['reporting','national'], queryFn: () => apiClient.get('/reporting/reports/dashboard').then(r => r.data?.data ?? {}) });

  const stats = [
    { label: 'Polling Stations', value: geoStats?.totalPollingStations?.toLocaleString() ?? '45,805', icon: MapPin, color: 'text-sky-600', bg: 'bg-sky-50' },
    { label: 'Registered Voters', value: geoStats?.totalRegisteredVoters?.toLocaleString() ?? '22,102,532', icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Capsules Submitted', value: reporting?.capsulesSubmitted?.toLocaleString() ?? 0, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Validated', value: reporting?.capsulesValidated?.toLocaleString() ?? 0, icon: BarChart3, color: 'text-violet-600', bg: 'bg-violet-50' },
    { label: 'Published', value: reporting?.capsulesPublished?.toLocaleString() ?? 0, icon: Globe, color: 'text-teal-600', bg: 'bg-teal-50' },
    { label: 'Counties Reporting', value: `${reporting?.countiesReporting ?? 0}/47`, icon: TrendingUp, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { label: 'AI Flagged', value: reporting?.aiFlagged ?? 0, icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Integrity Verified', value: reporting?.integrityVerified?.toLocaleString() ?? 0, icon: Eye, color: 'text-pink-600', bg: 'bg-pink-50' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">National Dashboard</h2>
        <p className="text-sm text-gray-500 mt-1">Country-wide election overview — read-only view of published data</p>
      </div>

      <div className="bg-sky-50 border border-sky-200 rounded-xl p-3 flex items-center gap-2">
        <Eye className="w-4 h-4 text-sky-600" />
        <p className="text-xs text-sky-700">Observer mode — you are viewing officially published information only. No data can be modified.</p>
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
          <h3 className="text-base font-semibold text-gray-900 mb-4">Kenya Electoral Geography</h3>
          <div className="space-y-2">
            {[
              { label: 'Counties', value: geoStats?.totalCounties ?? 47 },
              { label: 'Constituencies', value: geoStats?.totalConstituencies ?? 290 },
              { label: 'Wards', value: geoStats?.totalWards ?? 1450 },
              { label: 'Registration Centres', value: geoStats?.totalRegistrationCentres?.toLocaleString() ?? '27,286' },
              { label: 'Polling Stations', value: geoStats?.totalPollingStations?.toLocaleString() ?? '45,805' },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <span className="text-sm text-gray-600">{label}</span>
                <span className="text-sm font-semibold text-gray-900">{value}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="vc-card">
          <h3 className="text-base font-semibold text-gray-900 mb-4">Platform Integrity Status</h3>
          <div className="space-y-3">
            {[
              { label: 'Trust Mechanism', value: 'Hedera Consensus Service + RFC 3161', status: 'active' },
              { label: 'Evidence Hashing', value: 'SHA-256', status: 'active' },
              { label: 'User-Facing Language', value: 'Integrity Verified', status: 'info' },
              { label: 'Batch Interval', value: 'Every 60 seconds', status: 'active' },
              { label: 'Public Verification', value: 'Via HashScan Explorer', status: 'active' },
            ].map(({ label, value, status }) => (
              <div key={label} className="flex items-start justify-between py-2 border-b border-gray-100 last:border-0">
                <span className="text-xs text-gray-500">{label}</span>
                <span className={`text-xs font-medium ${status === 'active' ? 'text-emerald-600' : 'text-sky-600'}`}>{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
