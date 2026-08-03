/**
 * Vote Capsule™ Admin Portal — AI Operations Page
 *
 * AI ASSISTS, HUMANS DECIDE — all AI decisions shown as advisory only.
 * Never display AI confidence as the final verdict.
 *
 * Shows:
 * - Overall AI job stats (total, by status, by routing decision)
 * - Flagged jobs requiring human review
 * - Confidence score breakdown
 */

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Bot, AlertTriangle, CheckCircle2, Clock, Search } from 'lucide-react';
import { clsx } from 'clsx';
import { aiApi, type AiVerificationJob } from '../api/aiApi';

const ROUTING_CONFIG: Record<string, { label: string; color: string }> = {
  AUTO_APPROVE:  { label: 'Auto-Approve',  color: 'text-emerald-700 bg-emerald-50' },
  MANUAL_REVIEW: { label: 'Manual Review', color: 'text-amber-700 bg-amber-50' },
  ESCALATE:      { label: 'Escalate',      color: 'text-red-700 bg-red-50' },
  REJECT:        { label: 'Reject',        color: 'text-red-700 bg-red-50' },
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  PENDING:    { label: 'Pending',    color: 'text-gray-600 bg-gray-50' },
  PROCESSING: { label: 'Processing', color: 'text-blue-600 bg-blue-50' },
  COMPLETED:  { label: 'Completed',  color: 'text-emerald-600 bg-emerald-50' },
  FAILED:     { label: 'Failed',     color: 'text-red-600 bg-red-50' },
};

function ConfidenceBar({ score }: { score: number | null }) {
  if (score === null) return <span className="text-gray-400 text-xs">N/A</span>;
  const pct = Math.round(score * 100);
  const color = score >= 0.8 ? 'bg-emerald-500' : score >= 0.5 ? 'bg-amber-500' : 'bg-red-500';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div className={clsx('h-full rounded-full', color)} style={{ width: `${pct}%` }} />
      </div>
      <span className={clsx('text-xs font-mono font-medium', score >= 0.8 ? 'text-emerald-700' : score >= 0.5 ? 'text-amber-700' : 'text-red-700')}>
        {pct}%
      </span>
    </div>
  );
}

export function AiOperationsPage(): React.JSX.Element {
  const [search, setSearch] = useState('');

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['ai-ops-stats'],
    queryFn: () => aiApi.getStats(),
    retry: 1,
    staleTime: 30_000,
  });

  const { data: flaggedJobs, isLoading: flaggedLoading } = useQuery<AiVerificationJob[]>({
    queryKey: ['ai-flagged'],
    queryFn: () => aiApi.getFlaggedJobs(),
    retry: 1,
    staleTime: 30_000,
  });

  const filtered = (flaggedJobs ?? []).filter(
    (j) =>
      !search ||
      j.capsuleId.toLowerCase().includes(search.toLowerCase()) ||
      j.iebcStationCode.includes(search) ||
      j.positionCode.toLowerCase().includes(search.toLowerCase()),
  );

  const byStatus = stats?.breakdown?.reduce((acc: Record<string, number>, row: any) => {
    acc[row.status] = (acc[row.status] ?? 0) + parseInt(row.count ?? '0', 10);
    return acc;
  }, {}) ?? {};

  const total = stats?.breakdown?.reduce((s: number, r: any) => s + parseInt(r.count ?? '0', 10), 0) ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">AI Operations</h1>
        <p className="text-sm text-gray-500 mt-1">Evidence capsule AI verification monitoring</p>
      </div>

      {/* Advisory banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-amber-900">AI ASSISTS, HUMANS DECIDE</p>
          <p className="text-sm text-amber-700 mt-0.5">
            AI confidence scores are advisory indicators only. All final decisions must be made
            by human validators. No AI output constitutes a final election result.
          </p>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <Bot className="w-4 h-4 text-[#0B3C6D]" />
            <span className="text-xs text-gray-500 uppercase tracking-wide">Total Jobs</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{statsLoading ? '…' : total.toLocaleString()}</p>
        </div>
        {Object.entries(byStatus).map(([status, count]) => {
          const cfg = STATUS_CONFIG[status] ?? { label: status, color: 'text-gray-600 bg-gray-50' };
          return (
            <div key={status} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-1">
                <span className={clsx('px-2 py-0.5 rounded text-xs font-semibold', cfg.color)}>{cfg.label}</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{(count as number).toLocaleString()}</p>
            </div>
          );
        })}
      </div>

      {/* Flagged jobs */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <h2 className="text-base font-semibold text-gray-900">
              Flagged for Human Review ({(flaggedJobs ?? []).length})
            </h2>
          </div>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              className="vc-input pl-9 py-1.5 text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search capsule, station…"
            />
          </div>
        </div>

        {flaggedLoading ? (
          <div className="p-12 text-center text-gray-400">Loading flagged jobs…</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <CheckCircle2 className="w-10 h-10 text-emerald-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No flagged jobs</p>
            <p className="text-sm text-gray-400 mt-1">All AI-verified capsules are within confidence thresholds.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="vc-table">
              <thead>
                <tr>
                  <th>Capsule ID</th>
                  <th>Station</th>
                  <th>Position</th>
                  <th>Confidence</th>
                  <th>Routing</th>
                  <th>Flag Reasons</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((job) => {
                  const routingCfg = job.routingDecision ? ROUTING_CONFIG[job.routingDecision] : null;
                  const statusCfg = STATUS_CONFIG[job.status] ?? STATUS_CONFIG.PENDING;
                  return (
                    <tr key={job.id}>
                      <td className="font-mono text-xs">{job.capsuleId.slice(0, 12)}…</td>
                      <td className="font-mono text-xs">{job.iebcStationCode}</td>
                      <td>{job.positionCode}</td>
                      <td className="min-w-[120px]"><ConfidenceBar score={job.overallConfidence} /></td>
                      <td>
                        {routingCfg ? (
                          <span className={clsx('vc-badge', routingCfg.color)}>{routingCfg.label}</span>
                        ) : <span className="text-gray-400 text-xs">—</span>}
                      </td>
                      <td>
                        <div className="flex flex-wrap gap-1">
                          {(job.flagReasons ?? []).map((r, i) => (
                            <span key={i} className="vc-badge bg-red-50 text-red-700 text-xs">{r}</span>
                          ))}
                          {(!job.flagReasons || job.flagReasons.length === 0) && (
                            <span className="text-gray-400 text-xs">—</span>
                          )}
                        </div>
                      </td>
                      <td>
                        <span className={clsx('vc-badge', statusCfg.color)}>{statusCfg.label}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
