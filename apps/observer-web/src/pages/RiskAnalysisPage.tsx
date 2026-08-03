import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, TrendingDown, ShieldAlert, Brain } from 'lucide-react';
import { apiClient } from '../api/apiClient';

const SEVERITY_BADGE: Record<string, string> = {
  HIGH: 'bg-red-100 text-red-700',
  MEDIUM: 'bg-amber-100 text-amber-700',
  LOW: 'bg-yellow-100 text-yellow-700',
};

function confidenceBadge(score: number | undefined): string {
  if (score === undefined || score === null) return 'bg-gray-100 text-gray-500';
  if (score < 0.5) return 'bg-red-100 text-red-700';
  if (score < 0.8) return 'bg-amber-100 text-amber-700';
  return 'bg-emerald-100 text-emerald-700';
}

export function RiskAnalysisPage(): React.JSX.Element {
  const { data: flagged, isLoading } = useQuery({
    queryKey: ['observer', 'risk-flagged'],
    queryFn: () => apiClient.get('/ai/jobs/flagged').then(r => r.data?.data ?? []),
  });

  const jobs = flagged ?? [];
  const highRisk = jobs.filter((j: any) => (j.aiConfidenceScore ?? 1) < 0.5);
  const ambiguous = jobs.filter((j: any) => { const s = j.aiConfidenceScore ?? 1; return s >= 0.5 && s < 0.8; });

  // Group by county for display
  const byCounty: Record<string, any[]> = {};
  for (const job of jobs) {
    const county = job.countyName ?? 'Unknown County';
    if (!byCounty[county]) byCounty[county] = [];
    byCounty[county].push(job);
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Risk Analysis</h2>
        <p className="text-sm text-gray-500 mt-1">AI risk assessment — flagged anomalies grouped by county for observer review</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Flagged', value: jobs.length, icon: ShieldAlert, color: 'text-violet-600', bg: 'bg-violet-50' },
          { label: 'High Risk (< 50%)', value: highRisk.length, icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50' },
          { label: 'Low Confidence (50–80%)', value: ambiguous.length, icon: Brain, color: 'text-amber-600', bg: 'bg-amber-50' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="vc-stat-card">
            <div className="flex items-start justify-between">
              <div><p className="text-sm text-gray-500">{label}</p><p className="text-2xl font-bold text-gray-900 mt-1">{value}</p></div>
              <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center flex-shrink-0`}><Icon className={`w-5 h-5 ${color}`} /></div>
            </div>
          </div>
        ))}
      </div>

      {isLoading ? (
        <div className="vc-card flex items-center justify-center py-16">
          <Brain className="w-8 h-8 text-violet-400 animate-pulse" />
          <p className="ml-3 text-gray-500">Analysing flagged jobs…</p>
        </div>
      ) : jobs.length === 0 ? (
        <div className="vc-card text-center py-16">
          <TrendingDown className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No anomalies currently flagged</p>
          <p className="text-sm text-gray-400 mt-1">The AI has not identified any risk indicators at this time</p>
        </div>
      ) : (
        Object.entries(byCounty).map(([county, countyJobs]) => (
          <div key={county} className="vc-card">
            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              {county}
              <span className="ml-auto vc-badge bg-amber-100 text-amber-700">{countyJobs.length} flags</span>
            </h3>
            <table className="vc-table">
              <thead>
                <tr><th>Station</th><th>Position</th><th>AI Confidence</th><th>Anomaly Type</th><th>Severity</th><th>Flagged</th></tr>
              </thead>
              <tbody>
                {countyJobs.map((job: any) => (
                  <tr key={job.id}>
                    <td className="font-mono text-xs">{job.pollingStationCode ?? '—'}</td>
                    <td className="text-sm">{job.positionCode ?? job.position ?? '—'}</td>
                    <td>
                      <span className={`vc-badge ${confidenceBadge(job.aiConfidenceScore)}`}>
                        {job.aiConfidenceScore != null ? `${(job.aiConfidenceScore * 100).toFixed(0)}%` : '—'}
                      </span>
                    </td>
                    <td className="text-xs text-gray-600">{job.anomalyType ?? 'Image quality'}</td>
                    <td>
                      <span className={`vc-badge ${SEVERITY_BADGE[job.severity ?? 'MEDIUM'] ?? 'bg-gray-100 text-gray-500'}`}>
                        {job.severity ?? 'MEDIUM'}
                      </span>
                    </td>
                    <td className="text-xs text-gray-500">
                      {job.flaggedAt ? new Date(job.flaggedAt).toLocaleString() : job.createdAt ? new Date(job.createdAt).toLocaleString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))
      )}
    </div>
  );
}
