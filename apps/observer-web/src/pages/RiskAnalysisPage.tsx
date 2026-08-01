import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, TrendingDown } from 'lucide-react';
import { apiClient } from '../api/apiClient';

export function RiskAnalysisPage(): React.JSX.Element {
  const { data: risks } = useQuery({ queryKey: ['observer','risks'], queryFn: () => apiClient.get('/ai/anomalies?published=true').then(r => r.data?.data ?? []) });

  const severityBadge: Record<string, string> = { HIGH: 'bg-red-100 text-red-700', MEDIUM: 'bg-amber-100 text-amber-700', LOW: 'bg-yellow-100 text-yellow-700' };

  return (
    <div className="space-y-6">
      <div><h2 className="text-xl font-bold text-gray-900">Risk Analysis</h2><p className="text-sm text-gray-500">AI-flagged anomalies and low-confidence areas — for observer analysis only</p></div>
      <div className="vc-card">
        <div className="flex items-center gap-2 mb-4"><AlertTriangle className="w-4 h-4 text-amber-600" /><h3 className="font-semibold text-gray-900">Anomaly Flags ({risks?.length ?? 0})</h3></div>
        {!risks || risks.length === 0 ? (
          <div className="text-center py-12"><TrendingDown className="w-12 h-12 text-gray-200 mx-auto mb-3" /><p className="text-gray-400">No anomalies currently flagged</p></div>
        ) : (
          <table className="vc-table">
            <thead><tr><th>Station</th><th>County</th><th>Anomaly Type</th><th>AI Confidence</th><th>Severity</th><th>Flagged At</th></tr></thead>
            <tbody>
              {risks.map((r: any) => (
                <tr key={r.id}>
                  <td className="font-mono text-xs">{r.pollingStationCode}</td>
                  <td>{r.countyName ?? '—'}</td>
                  <td>{r.anomalyType ?? 'Image quality'}</td>
                  <td><span className={`vc-badge ${(r.aiConfidenceScore ?? 0) < 0.5 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{r.aiConfidenceScore ? `${(r.aiConfidenceScore*100).toFixed(0)}%` : 'Low'}</span></td>
                  <td><span className={`vc-badge ${severityBadge[r.severity ?? 'MEDIUM'] ?? 'bg-gray-100 text-gray-500'}`}>{r.severity ?? 'MEDIUM'}</span></td>
                  <td className="text-xs text-gray-500">{r.flaggedAt ? new Date(r.flaggedAt).toLocaleString() : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
