import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart3, TrendingUp, RefreshCw, Info } from 'lucide-react';
import { apiClient } from '../api/apiClient';
import { useAppSelector } from '../store/hooks';
import { PageErrorBoundary } from '../components/PageErrorBoundary';

function LiveResultsPageContent(): React.JSX.Element {
  const user = useAppSelector((s: any) => s.auth.user);
  const positionCode = user?.positionCode ?? 'PRESIDENT';

  const { data: results, refetch, isFetching, isLoading } = useQuery({
    queryKey: ['candidate', 'live-results', positionCode],
    queryFn: () => apiClient.get(`/reporting/public/results?electionYear=2027&positionCode=${positionCode}`).then(r => r.data?.data ?? []),
    refetchInterval: 30_000,
  });

  const rows = results ?? [];
  const totalVotes = rows.reduce((sum: number, r: any) => sum + (r.votes ?? 0), 0);
  const myRow = rows.find((r: any) => r.candidateId === user?.id);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Live Results</h2>
          <p className="text-sm text-gray-500 mt-1">Your position: <span className="font-semibold text-amber-700">{positionCode}</span> — refreshes every 30s</p>
        </div>
        <button onClick={() => refetch()} disabled={isFetching} className="vc-btn-secondary gap-2 text-sm">
          <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />Refresh
        </button>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-start gap-2">
        <Info className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-blue-700 font-medium">AI ASSISTS, HUMANS DECIDE — These figures come from validated, published capsule data only. Official results are certified by the IEBC.</p>
      </div>

      {myRow && (
        <div className="vc-card border-amber-200 bg-amber-50">
          <p className="text-xs text-amber-600 font-semibold uppercase tracking-wide mb-2">Your Standing</p>
          <div className="flex items-center justify-between">
            <p className="text-lg font-bold text-gray-900">{myRow.candidateName}</p>
            <span className={`vc-badge text-sm ${rows.indexOf(myRow) === 0 ? 'bg-amber-200 text-amber-800' : 'bg-gray-100 text-gray-600'}`}>
              #{(rows.sort((a: any, b: any) => (b.votes ?? 0) - (a.votes ?? 0)).indexOf(myRow) + 1)}
            </span>
          </div>
          <p className="text-2xl font-bold text-amber-700 mt-1">{(myRow.votes ?? 0).toLocaleString()} votes</p>
          <p className="text-sm text-gray-600">{totalVotes > 0 ? `${((myRow.votes / totalVotes) * 100).toFixed(2)}% of counted votes` : 'No votes counted yet'}</p>
        </div>
      )}

      <div className="vc-card">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-4 h-4 text-amber-600" />
          <h3 className="font-semibold text-gray-900">All Candidates — {positionCode}</h3>
          {totalVotes > 0 && <span className="text-xs text-gray-400 ml-auto">{totalVotes.toLocaleString()} total counted votes</span>}
        </div>
        {isLoading ? (
          <div className="text-center py-12"><BarChart3 className="w-8 h-8 text-gray-200 mx-auto mb-2 animate-pulse" /><p className="text-gray-400 text-sm">Loading results…</p></div>
        ) : rows.length === 0 ? (
          <div className="text-center py-12">
            <TrendingUp className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No results published yet</p>
            <p className="text-sm text-gray-400 mt-1">Results appear as capsules are validated and published</p>
          </div>
        ) : (
          <table className="vc-table">
            <thead>
              <tr><th>#</th><th>Candidate</th><th>Party</th><th>Votes</th><th>%</th></tr>
            </thead>
            <tbody>
              {[...rows].sort((a: any, b: any) => (b.votes ?? 0) - (a.votes ?? 0)).map((row: any, i: number) => {
                const pct = totalVotes > 0 ? ((row.votes ?? 0) / totalVotes * 100).toFixed(2) : '0.00';
                const isMe = row.candidateId === user?.id;
                return (
                  <tr key={row.candidateId ?? i} className={isMe ? 'bg-amber-50' : ''}>
                    <td className="font-bold text-gray-500">{i + 1}</td>
                    <td className={`font-medium ${isMe ? 'text-amber-700' : 'text-gray-900'}`}>
                      {row.candidateName ?? '—'}{isMe && <span className="ml-1 text-xs text-amber-500">(You)</span>}
                    </td>
                    <td className="text-sm text-gray-600">{row.partyName ?? '—'}</td>
                    <td className="font-mono text-sm font-semibold">{(row.votes ?? 0).toLocaleString()}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-gray-100 rounded-full h-2 flex-shrink-0">
                          <div className={`h-2 rounded-full ${isMe ? 'bg-amber-500' : 'bg-gray-400'}`} style={{ width: `${Math.min(parseFloat(pct), 100)}%` }} />
                        </div>
                        <span className="text-xs text-gray-600">{pct}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
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
