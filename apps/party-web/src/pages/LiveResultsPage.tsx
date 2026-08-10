import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart3, TrendingUp, RefreshCw, Info } from 'lucide-react';
import { apiClient } from '../api/apiClient';
import { PageErrorBoundary } from '../components/PageErrorBoundary';

const PCT_BAR_COLORS: Record<string, string> = {
  LEADING: 'bg-violet-500',
  SECOND: 'bg-sky-400',
  TRAILING: 'bg-gray-300',
};

function LiveResultsPageContent(): React.JSX.Element {
  const { data: results, refetch, isFetching, isLoading } = useQuery({
    queryKey: ['party', 'live-results'],
    queryFn: () => apiClient.get('/reporting/reports/results').then(r => r.data?.data ?? []),
    refetchInterval: 30_000,
  });

  const grouped: Record<string, any[]> = {};
  for (const row of (results ?? [])) {
    const pos = row.position ?? 'Unknown';
    if (!grouped[pos]) grouped[pos] = [];
    grouped[pos].push(row);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Live Results</h2>
          <p className="text-sm text-gray-500 mt-1">Party candidate results — auto-refreshes every 30 seconds</p>
        </div>
        <button onClick={() => refetch()} disabled={isFetching} className="vc-btn-secondary gap-2 text-sm">
          <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />Refresh
        </button>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-start gap-2">
        <Info className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-blue-700 font-medium">AI ASSISTS, HUMANS DECIDE — These results reflect validated capsule data only. Final results are certified by the IEBC.</p>
      </div>

      {isLoading ? (
        <div className="vc-card flex items-center justify-center py-16">
          <BarChart3 className="w-8 h-8 text-violet-400 animate-pulse" />
          <p className="ml-3 text-gray-500">Loading results…</p>
        </div>
      ) : Object.keys(grouped).length === 0 ? (
        <div className="vc-card text-center py-16">
          <TrendingUp className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No results yet</p>
          <p className="text-sm text-gray-400 mt-1">Live results appear once capsules are validated and published</p>
        </div>
      ) : (
        Object.entries(grouped).map(([position, rows]) => (
          <div key={position} className="vc-card">
            <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-violet-600" />{position}
            </h3>
            <table className="vc-table">
              <thead>
                <tr><th>Candidate</th><th>Party</th><th>Votes</th><th>%</th><th>Status</th></tr>
              </thead>
              <tbody>
                {rows.sort((a, b) => (b.votes ?? 0) - (a.votes ?? 0)).map((row: any, i: number) => {
                  const pct = row.votePercent ?? 0;
                  const rankKey = i === 0 ? 'LEADING' : i === 1 ? 'SECOND' : 'TRAILING';
                  return (
                    <tr key={row.candidateId ?? i}>
                      <td className="font-medium text-gray-900">{row.candidateName ?? '—'}</td>
                      <td className="text-sm text-gray-600">{row.partyName ?? '—'}</td>
                      <td className="font-mono text-sm">{(row.votes ?? 0).toLocaleString()}</td>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="w-20 bg-gray-100 rounded-full h-2 flex-shrink-0">
                            <div className={`h-2 rounded-full ${PCT_BAR_COLORS[rankKey]}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                          </div>
                          <span className="text-xs text-gray-600">{pct.toFixed(1)}%</span>
                        </div>
                      </td>
                      <td>
                        <span className={`vc-badge ${i === 0 ? 'bg-violet-100 text-violet-700' : 'bg-gray-100 text-gray-500'}`}>
                          {i === 0 ? 'LEADING' : `#${i + 1}`}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ))
      )}
    </div>
  );
}

export function LiveResultsPage() {
  return (
    <PageErrorBoundary page="Live Results">
      <LiveResultsPageContent />
    </PageErrorBoundary>
  );
}
