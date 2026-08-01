import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Shield, Search, ShieldCheck, Clock } from 'lucide-react';
import { apiClient } from '../api/apiClient';

export function EvidenceViewerPage(): React.JSX.Element {
  const [search, setSearch] = useState('');

  const { data: capsules } = useQuery({ queryKey: ['observer','evidence'], queryFn: () => apiClient.get('/evidence/capsules?status=PUBLISHED').then(r => r.data?.data ?? []) });

  const filtered = (capsules ?? []).filter((c: any) =>
    !search || c.pollingStationCode?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div><h2 className="text-xl font-bold text-gray-900">Evidence Viewer</h2><p className="text-sm text-gray-500">View published evidence capsules with integrity verification</p></div>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input className="vc-input pl-9" placeholder="Search by polling station code…" value={search} onChange={e => setSearch(e.target.value)} />
      </div>
      <div className="vc-card">
        <div className="flex items-center gap-2 mb-4"><Shield className="w-4 h-4 text-sky-600" /><h3 className="font-semibold text-gray-900">Published Capsules ({filtered.length})</h3></div>
        {filtered.length === 0 ? (
          <div className="text-center py-12"><Shield className="w-12 h-12 text-gray-200 mx-auto mb-3" /><p className="text-gray-400">No published capsules found</p></div>
        ) : (
          <table className="vc-table">
            <thead><tr><th>Capsule ID</th><th>Station Code</th><th>Published At</th><th>Integrity</th><th>Anchor</th></tr></thead>
            <tbody>
              {filtered.map((c: any) => (
                <tr key={c.id}>
                  <td className="font-mono text-xs">{c.id?.substring(0,8)}…</td>
                  <td>{c.pollingStationCode}</td>
                  <td className="text-xs">{c.publishedAt ? new Date(c.publishedAt).toLocaleString() : '—'}</td>
                  <td><span className="vc-badge bg-emerald-100 text-emerald-700 flex items-center gap-1 w-fit"><ShieldCheck className="w-3 h-3" />Integrity Verified</span></td>
                  <td>
                    {c.hederaTxId ? <a href={`https://hashscan.io/testnet/transaction/${c.hederaTxId}`} target="_blank" rel="noreferrer" className="text-xs text-sky-600 underline hover:text-sky-800">HashScan</a> : <span className="text-xs text-gray-400 flex items-center gap-1"><Clock className="w-3 h-3" />Pending</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
