/**
 * Vote Capsule™ Admin Portal — Evidence Capsules Page
 *
 * Lists evidence capsules filtered by county/station/status.
 * Shows AI confidence scores and chain of custody.
 * Routing integrates with Geography Service for county selection.
 *
 * AI ASSISTS, HUMANS DECIDE — no automated approval shown here.
 */

import React, { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Shield, Search, Filter, CheckCircle2, XCircle, Clock,
  ChevronRight, AlertTriangle, Eye, Lock,
} from 'lucide-react';
import { clsx } from 'clsx';
import { evidenceApi, type EvidenceCapsule } from '../api/evidenceApi';
import { geographyApi } from '../api/geographyApi';
import { CapsuleDetailModal } from '../components/evidence/CapsuleDetailModal';

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  DRAFT:              { label: 'Draft',              color: 'text-gray-600 bg-gray-50',    icon: Clock },
  CAPTURED:           { label: 'Captured',           color: 'text-blue-600 bg-blue-50',    icon: Shield },
  UPLOADED:           { label: 'Uploaded',           color: 'text-blue-600 bg-blue-50',    icon: Shield },
  AI_PROCESSING:      { label: 'AI Processing',      color: 'text-violet-600 bg-violet-50', icon: Shield },
  AI_VERIFIED:        { label: 'AI Verified',        color: 'text-violet-600 bg-violet-50', icon: CheckCircle2 },
  PENDING_VALIDATION: { label: 'Pending Validation', color: 'text-amber-600 bg-amber-50',  icon: Clock },
  APPROVED:           { label: 'Approved',           color: 'text-emerald-600 bg-emerald-50', icon: CheckCircle2 },
  REJECTED:           { label: 'Rejected',           color: 'text-red-600 bg-red-50',      icon: XCircle },
  ANCHORED:           { label: 'Integrity Verified', color: 'text-emerald-700 bg-emerald-50', icon: Lock },
  PUBLISHED:          { label: 'Published',          color: 'text-[#0B3C6D] bg-blue-50',  icon: CheckCircle2 },
  ARCHIVED:           { label: 'Archived',           color: 'text-gray-500 bg-gray-50',    icon: Clock },
};

const POSITION_LABELS: Record<string, string> = {
  PRESIDENT:  'President',
  GOVERNOR:   'Governor',
  SENATOR:    'Senator',
  WOMEN_REP:  'Women Rep',
  MP:         'MP',
  MCA:        'MCA',
};

export function EvidencePage(): React.JSX.Element {
  const [selectedCounty, setSelectedCounty] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedCapsuleId, setSelectedCapsuleId] = useState<string | null>(null);

  // County dropdown from Geography Service (NEC)
  const { data: counties } = useQuery({
    queryKey: ['counties'],
    queryFn: geographyApi.getCounties,
    staleTime: 10 * 60 * 1000,
    retry: 1,
  });

  // Capsules by county
  const { data: capsules, isLoading } = useQuery({
    queryKey: ['evidence-capsules', selectedCounty, selectedStatus],
    queryFn: () =>
      selectedCounty
        ? evidenceApi.getCapsulesByCounty(selectedCounty, selectedStatus || undefined)
        : Promise.resolve([]),
    enabled: !!selectedCounty,
    retry: 1,
  });

  // Evidence stats
  const { data: stats } = useQuery({
    queryKey: ['evidence-stats'],
    queryFn: () => evidenceApi.getStats(),
    staleTime: 30 * 1000,
    retry: 1,
  });

  const filtered = (capsules ?? []).filter(
    (c) => !selectedStatus || c.status === selectedStatus,
  );

  const handleCapsuleClick = useCallback((id: string) => {
    setSelectedCapsuleId(id);
  }, []);

  const totalCapsules = stats ? Object.values(stats).reduce((a, b) => (a ?? 0) + (b ?? 0), 0) : 0;
  const anchored = stats?.ANCHORED ?? 0;
  const published = stats?.PUBLISHED ?? 0;
  const pending = stats?.PENDING_VALIDATION ?? 0;
  const flagged = stats?.APPROVED ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Evidence Capsules</h1>
          <p className="text-sm text-gray-500 mt-1">
            Monitor submitted election evidence capsules and their verification status
          </p>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Capsules', value: totalCapsules ?? 0, color: 'text-[#0B3C6D]', bg: 'bg-blue-50' },
          { label: 'Integrity Verified', value: anchored, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Published', value: published, color: 'text-[#0B3C6D]', bg: 'bg-sky-50' },
          { label: 'Awaiting Validation', value: pending, color: 'text-amber-600', bg: 'bg-amber-50' },
        ].map(({ label, value, color, bg }) => (
          <div key={label} className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
            <p className="text-xs text-gray-500 mb-1">{label}</p>
            <p className={clsx('text-2xl font-bold', color)}>{value.toLocaleString()}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 flex flex-wrap items-center gap-3">
        {/* County filter — live from Geography Service */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" aria-hidden="true" />
          <select
            value={selectedCounty}
            onChange={(e) => setSelectedCounty(e.target.value)}
            className="text-sm border border-gray-200 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#0B3C6D] text-gray-700"
            aria-label="Filter by county"
          >
            <option value="">Select County…</option>
            {(counties ?? []).map((c) => (
              <option key={c.iebcCode} value={c.iebcCode}>
                {c.iebcCode} — {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Status filter */}
        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="text-sm border border-gray-200 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#0B3C6D] text-gray-700"
          aria-label="Filter by status"
        >
          <option value="">All Statuses</option>
          {Object.entries(STATUS_CONFIG).map(([key, { label }]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>

        {selectedCounty && (
          <span className="text-sm text-gray-400 ml-auto">
            {filtered.length} capsule{filtered.length !== 1 ? 's' : ''} in county {selectedCounty}
          </span>
        )}
      </div>

      {/* Capsules Table */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        {!selectedCounty ? (
          <div className="p-8 text-center">
            <Shield className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">Select a county to view evidence capsules</p>
            <p className="text-sm text-gray-400 mt-1">
              Use the county dropdown above — all 47 Kenya counties are available
            </p>
          </div>
        ) : isLoading ? (
          <div className="p-8 text-center text-gray-500">Loading evidence capsules…</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center">
            <Shield className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500">No capsules found for county {selectedCounty}</p>
            {selectedStatus && (
              <p className="text-sm text-gray-400 mt-1">
                Try removing the status filter
              </p>
            )}
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Station</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase hidden sm:table-cell">Position</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase hidden lg:table-cell">AI Score</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase hidden lg:table-cell">Submitted</th>
                <th className="w-10" aria-label="Actions" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((capsule: EvidenceCapsule) => {
                const statusCfg = STATUS_CONFIG[capsule.status] ?? STATUS_CONFIG['UPLOADED']!;
                const StatusIcon = statusCfg.icon;
                const confidencePct = capsule.aiConfidenceScore
                  ? Math.round(capsule.aiConfidenceScore * 100)
                  : null;

                return (
                  <tr
                    key={capsule.id}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => handleCapsuleClick(capsule.id)}
                    role="row"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && handleCapsuleClick(capsule.id)}
                    aria-label={`View capsule ${capsule.pollingStationName}`}
                  >
                    <td className="px-5 py-3">
                      <div>
                        <p className="text-sm font-medium text-gray-900 truncate max-w-xs">
                          {capsule.pollingStationName}
                        </p>
                        <p className="text-xs text-gray-400 font-mono">{capsule.iebcStationCode}</p>
                      </div>
                    </td>
                    <td className="px-5 py-3 hidden sm:table-cell">
                      <span className="text-sm text-gray-600">
                        {POSITION_LABELS[capsule.positionCode] ?? capsule.positionCode}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className={clsx('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium', statusCfg.color)}>
                          <StatusIcon className="w-3 h-3" aria-hidden="true" />
                          {statusCfg.label}
                        </span>
                        {capsule.aiFlagged && (
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" title="AI flagged" />
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3 hidden lg:table-cell">
                      {confidencePct !== null ? (
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-gray-200 rounded-full h-1.5">
                            <div
                              className={clsx(
                                'h-1.5 rounded-full',
                                confidencePct >= 80 ? 'bg-emerald-500' :
                                confidencePct >= 60 ? 'bg-amber-500' : 'bg-red-500',
                              )}
                              style={{ width: `${confidencePct}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-600 tabular-nums">{confidencePct}%</span>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3 hidden lg:table-cell text-sm text-gray-500">
                      {capsule.submittedAt
                        ? new Date(capsule.submittedAt).toLocaleDateString()
                        : '—'}
                    </td>
                    <td className="px-5 py-3">
                      <Eye className="w-4 h-4 text-gray-300" aria-hidden="true" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Capsule Detail Modal */}
      {selectedCapsuleId && (
        <CapsuleDetailModal
          capsuleId={selectedCapsuleId}
          onClose={() => setSelectedCapsuleId(null)}
        />
      )}
    </div>
  );
}
