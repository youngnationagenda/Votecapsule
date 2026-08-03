import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Shield, Search, ShieldCheck, ExternalLink, Clock } from 'lucide-react';
import { apiClient } from '../api/apiClient';

export function EvidenceViewerPage(): React.JSX.Element {
  const [search, setSearch] = useState('');

  const { data: capsules, isLoading } = useQuery({
    queryKey: ['observer', 'anchored-capsules'],
    queryFn: () => apiClient.get('/evidence/capsules?status=ANCHORED').then(r => r.data?.data ?? []),
  });

  const filtered = (capsules ?? []).filter((c: any) =>
    !search ||
    c.pollingStationCode?.toLowerCase().includes(search.toLowerCase()) ||
    c.countyName?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Evidence Viewer</h2>
        <p className="text-sm text-gray-500 mt-1">Published capsules with Hedera trust anchor verification</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          className="vc-input pl-9"
          placeholder="Search by station code or county…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className="vc-card">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-4 h-4 text-sky-600" />
          <h3 className="font-semibold text-gray-900">Anchored Capsules ({filtered.length})</h3>
          {search && <span className="text-xs text-gray-400 ml-auto">Filtered from {capsules?.length ?? 0} total</span>}
        </div>

        {isLoading ? (
          <div className="text-center py-12"><Shield className="w-8 h-8 text-gray-200 mx-auto mb-2 animate-pulse" /><p className="text-gray-400 text-sm">Loading capsules…</p></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <Shield className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">{search ? 'No capsules match your search' : 'No anchored capsules yet'}</p>
            <p className="text-sm text-gray-400 mt-1">Capsules appear here once they have been validated and anchored to the Hedera ledger</p>
          </div>
        ) : (
          <table className="vc-table">
            <thead>
              <tr><th>Station Code</th><th>County</th><th>Position</th><th>Anchored At</th><th>Integrity</th><th>Verify</th></tr>
            </thead>
            <tbody>
              {filtered.map((c: any) => (
                <tr key={c.id}>
                  <td className="font-mono text-xs font-medium">{c.pollingStationCode ?? '—'}</td>
                  <td className="text-sm">{c.countyName ?? '—'}</td>
                  <td className="text-sm">{c.positionCode ?? c.position ?? '—'}</td>
                  <td className="text-xs text-gray-500">{c.anchoredAt ? new Date(c.anchoredAt).toLocaleString() : '—'}</td>
                  <td>
                    <span className="vc-badge bg-teal-100 text-teal-700 flex items-center gap-1 w-fit">
                      <ShieldCheck className="w-3 h-3" />Integrity Verified
                    </span>
                  </td>
                  <td>
                    {c.hederaTxId ? (
                      <div className="space-y-0.5">
                        <a
                          href={`https://hashscan.io/testnet/transaction/${c.hederaTxId}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-sky-600 underline hover:text-sky-800 flex items-center gap-1"
                        >
                          HashScan <ExternalLink className="w-3 h-3" />
                        </a>
                        {c.trustAnchorBatchId && (
                          <p className="text-xs text-gray-400">Batch: {c.trustAnchorBatchId.substring(0, 8)}…</p>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />Pending anchor
                      </span>
                    )}
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
