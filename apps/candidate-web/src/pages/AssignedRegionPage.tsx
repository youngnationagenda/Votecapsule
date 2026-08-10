import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { MapPin, ChevronRight } from 'lucide-react';
import { apiClient } from '../api/apiClient';
import { useAppSelector } from '../store/hooks';
import { PageErrorBoundary } from '../components/PageErrorBoundary';

function AssignedRegionPageContent(): React.JSX.Element {
  const user = useAppSelector((s: any) => s.auth.user);
  const { data: stations } = useQuery({ queryKey: ['candidate','stations'], queryFn: () => apiClient.get('/geography/polling-stations').then(r => r.data?.items ?? r.data?.data ?? r.data ?? []) });
  const { data: profile } = useQuery({ queryKey: ['candidate','profile'], queryFn: () => apiClient.get(`/candidate/candidates/\${user?.id ?? ''}`).then(r => r.data?.data ?? r.data ?? {}) });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Assigned Region</h2>
        <p className="text-sm text-gray-500 mt-1">Polling stations in your constituency — restricted to your geographic scope</p>
      </div>
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <p className="text-sm font-medium text-amber-800">Your geographic access scope</p>
        <p className="text-xs text-amber-700 mt-1">{profile?.position} — {profile?.constituencyName ?? profile?.countyName ?? 'Region not yet assigned'}</p>
      </div>
      <div className="vc-card">
        <div className="flex items-center gap-2 mb-4"><MapPin className="w-4 h-4 text-amber-600" /><h3 className="font-semibold text-gray-900">Polling Stations ({stations?.length ?? 0})</h3></div>
        {!stations || stations.length === 0 ? (
          <div className="text-center py-12"><MapPin className="w-12 h-12 text-gray-200 mx-auto mb-3" /><p className="text-gray-400">No stations found in your assigned region</p></div>
        ) : (
          <table className="vc-table">
            <thead><tr><th>Code</th><th>Station Name</th><th>Ward</th><th>Registered Voters</th><th>Status</th></tr></thead>
            <tbody>
              {stations.map((s: any) => (
                <tr key={s.id}><td className="font-mono text-xs">{s.code}</td><td className="font-medium">{s.name}</td><td>{s.wardName}</td><td>{s.registeredVoters?.toLocaleString()}</td><td><span className={`vc-badge ${s.hasSubmitted ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>{s.hasSubmitted ? 'Submitted' : 'Pending'}</span></td></tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export function AssignedRegionPage() {
  return (
    <PageErrorBoundary page="Assigned Region">
      <AssignedRegionPageContent />
    </PageErrorBoundary>
  );
}
