import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { TrendingUp, CheckCircle, Clock } from 'lucide-react';
import { apiClient } from '../api/apiClient';

export function StationProgressPage(): React.JSX.Element {
  const { data: progress } = useQuery({ queryKey: ['candidate','station-progress'], queryFn: () => apiClient.get('/reporting/candidate/station-progress').then(r => r.data?.data ?? []) });

  const submitted = (progress ?? []).filter((s: any) => s.hasSubmitted).length;
  const total = (progress ?? []).length;

  return (
    <div className="space-y-6">
      <div><h2 className="text-xl font-bold text-gray-900">Polling Station Progress</h2><p className="text-sm text-gray-500">Which stations in your region have submitted capsules</p></div>
      <div className="grid grid-cols-3 gap-4">
        <div className="vc-stat-card text-center"><p className="text-sm text-gray-500">Total Stations</p><p className="text-2xl font-bold text-gray-900 mt-1">{total}</p></div>
        <div className="vc-stat-card text-center"><p className="text-sm text-gray-500">Submitted</p><p className="text-2xl font-bold text-emerald-600 mt-1">{submitted}</p></div>
        <div className="vc-stat-card text-center"><p className="text-sm text-gray-500">Pending</p><p className="text-2xl font-bold text-amber-600 mt-1">{total - submitted}</p></div>
      </div>
      {total > 0 && (
        <div className="vc-card">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-700">Coverage</span>
            <span className="text-sm font-bold text-gray-900">{total > 0 ? Math.round((submitted/total)*100) : 0}%</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-3"><div className="bg-amber-500 h-3 rounded-full transition-all" style={{ width: `${total > 0 ? (submitted/total)*100 : 0}%` }} /></div>
        </div>
      )}
      <div className="vc-card">
        <h3 className="font-semibold text-gray-900 mb-4">Station Status</h3>
        {!progress || progress.length === 0 ? (
          <div className="text-center py-12 text-gray-400">No station data available yet</div>
        ) : (
          <table className="vc-table">
            <thead><tr><th>Station Code</th><th>Station Name</th><th>Ward</th><th>Status</th></tr></thead>
            <tbody>
              {progress.map((s: any) => (
                <tr key={s.id}><td className="font-mono text-xs">{s.code}</td><td>{s.name}</td><td>{s.wardName}</td>
                  <td><span className={`vc-badge flex items-center gap-1 w-fit ${s.hasSubmitted ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                    {s.hasSubmitted ? <><CheckCircle className="w-3 h-3" />Submitted</> : <><Clock className="w-3 h-3" />Pending</>}
                  </span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
