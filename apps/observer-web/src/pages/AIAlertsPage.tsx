import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Brain, AlertTriangle, Info, ShieldAlert } from 'lucide-react';
import { apiClient } from '../api/apiClient';
import { PageErrorBoundary } from '../components/PageErrorBoundary';

function confidenceBadge(score: number | undefined): string {
  if (score === undefined || score === null) return 'bg-gray-100 text-gray-500';
  if (score < 0.5) return 'bg-red-100 text-red-700';
  if (score < 0.8) return 'bg-amber-100 text-amber-700';
  return 'bg-emerald-100 text-emerald-700';
}

function confidenceLabel(score: number | undefined): string {
  if (score === undefined || score === null) return '—';
  if (score < 0.5) return `${(score * 100).toFixed(0)}% (Low)`;
  if (score < 0.8) return `${(score * 100).toFixed(0)}% (Medium)`;
  return `${(score * 100).toFixed(0)}% (High)`;
}

function AIAlertsPageContent(): React.JSX.Element {
  const { data: flagged, isLoading } = useQuery({
    queryKey: ['observer', 'ai-flagged'],
    queryFn: () => apiClient.get('/ai/jobs/flagged').then(r => r.data?.data ?? []),
  });

  const jobs = flagged ?? [];
  const highCount = jobs.filter((j: any) => (j.aiConfidenceScore ?? 1) < 0.5).length;
  const ambigCount = jobs.filter((j: any) => { const s = j.aiConfidenceScore ?? 1; return s >= 0.5 && s < 0.8; }).length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">AI Alerts</h2>
        <p className="text-sm text-gray-500 mt-1">Evidence capsules flagged by AI for human review</p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-start gap-2">
        <Info className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-blue-700 font-medium">AI ASSISTS, HUMANS DECIDE — These flags are algorithmic signals only. A human validator must review each capsule before any action is taken.</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Flagged', value: jobs.length, icon: ShieldAlert, color: 'text-violet-600', bg: 'bg-violet-50' },
          { label: 'Low Confidence (<50%)', value: highCount, icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50' },
          { label: 'Ambiguous (50–80%)', value: ambigCount, icon: Brain, color: 'text-amber-600', bg: 'bg-amber-50' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="vc-stat-card">
            <div className="flex items-start justify-between">
              <div><p className="text-sm text-gray-500">{label}</p><p className="text-2xl font-bold text-gray-900 mt-1">{value}</p></div>
              <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center flex-shrink-0`}><Icon className={`w-5 h-5 ${color}`} /></div>
            </div>
          </div>
        ))}
      </div>

      <div className="vc-card">
        <div className="flex items-center gap-2 mb-4">
          <Brain className="w-4 h-4 text-violet-600" />
          <h3 className="font-semibold text-gray-900">Flagged Capsules ({jobs.length})</h3>
        </div>
        {isLoading ? (
          <div className="text-center py-12"><Brain className="w-8 h-8 text-gray-200 mx-auto mb-2 animate-pulse" /><p className="text-gray-400 text-sm">Loading…</p></div>
        ) : jobs.length === 0 ? (
          <div className="text-center py-12">
            <AlertTriangle className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No anomalies detected</p>
            <p className="text-sm text-gray-400 mt-1">The AI has not flagged any capsules for review at this time</p>
          </div>
        ) : (
          <table className="vc-table">
            <thead>
              <tr><th>Station Code</th><th>Position</th><th>AI Confidence</th><th>Flag Reasons</th><th>Status</th><th>Flagged At</th></tr>
            </thead>
            <tbody>
              {jobs.map((job: any) => (
                <tr key={job.id}>
                  <td className="font-mono text-xs font-medium">{job.pollingStationCode ?? '—'}</td>
                  <td className="text-sm">{job.positionCode ?? job.position ?? '—'}</td>
                  <td>
                    <span className={`vc-badge ${confidenceBadge(job.aiConfidenceScore)}`}>
                      {confidenceLabel(job.aiConfidenceScore)}
                    </span>
                  </td>
                  <td className="text-xs text-gray-600 max-w-[200px]">{Array.isArray(job.flagReasons) ? job.flagReasons.join(', ') : job.flagReason ?? '—'}</td>
                  <td><span className={`vc-badge ${job.status === 'RESOLVED' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{job.status ?? 'PENDING'}</span></td>
                  <td className="text-xs text-gray-500">{job.flaggedAt ? new Date(job.flaggedAt).toLocaleString() : job.createdAt ? new Date(job.createdAt).toLocaleString() : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export function AIAlertsPage() {
  return (
    <PageErrorBoundary page="A I Alerts">
      <AIAlertsPageContent />
    </PageErrorBoundary>
  );
}
