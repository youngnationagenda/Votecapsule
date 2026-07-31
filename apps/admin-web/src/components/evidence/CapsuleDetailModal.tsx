/**
 * Vote Capsule™ Admin Portal — Capsule Detail Modal
 *
 * Shows full capsule detail:
 * - Evidence metadata (station, position, agent, timestamps)
 * - AI confidence score breakdown
 * - Chain of custody timeline (immutable audit trail)
 * - Integrity verification status (QLDB — never say "blockchain")
 *
 * AI ASSISTS, HUMANS DECIDE — no automated final decisions displayed.
 */

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  X, Shield, Lock, CheckCircle2, Clock, AlertTriangle,
  User, MapPin, Calendar, Hash, ChevronRight,
} from 'lucide-react';
import { clsx } from 'clsx';
import { evidenceApi } from '../../api/evidenceApi';
import { aiApi } from '../../api/aiApi';

interface CapsuleDetailModalProps {
  capsuleId: string;
  onClose: () => void;
}

const CUSTODY_EVENT_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  CREATED:              { label: 'Created',              color: 'bg-gray-400',    icon: Shield },
  CAPTURED:             { label: 'Captured on Device',   color: 'bg-blue-500',    icon: Shield },
  UPLOADED:             { label: 'Uploaded to Server',   color: 'bg-blue-500',    icon: Shield },
  HASH_VERIFIED:        { label: 'Hash Verified',        color: 'bg-emerald-500', icon: CheckCircle2 },
  AI_SUBMITTED:         { label: 'AI Processing Started', color: 'bg-violet-500', icon: Shield },
  AI_COMPLETED:         { label: 'AI Processing Complete', color: 'bg-violet-500', icon: CheckCircle2 },
  VALIDATION_ASSIGNED:  { label: 'Assigned to Validator', color: 'bg-amber-500',  icon: User },
  VALIDATION_APPROVED:  { label: 'Approved by Validator', color: 'bg-emerald-500', icon: CheckCircle2 },
  VALIDATION_REJECTED:  { label: 'Rejected by Validator', color: 'bg-red-500',    icon: X },
  VALIDATION_ESCALATED: { label: 'Escalated',            color: 'bg-orange-500',  icon: AlertTriangle },
  QLDB_ANCHORED:        { label: 'Integrity Verified (QLDB)', color: 'bg-emerald-600', icon: Lock },
  S3_LOCKED:            { label: 'Evidence Locked (WORM)', color: 'bg-emerald-700', icon: Lock },
  PUBLISHED:            { label: 'Published',            color: 'bg-[#0B3C6D]',  icon: CheckCircle2 },
  ARCHIVED:             { label: 'Archived',             color: 'bg-gray-500',    icon: Shield },
};

const POSITION_LABELS: Record<string, string> = {
  PRESIDENT: 'President', GOVERNOR: 'Governor', SENATOR: 'Senator',
  WOMEN_REP: 'Women Rep', MP: 'MP', MCA: 'MCA',
};

export function CapsuleDetailModal({ capsuleId, onClose }: CapsuleDetailModalProps): React.JSX.Element {
  const { data: capsule, isLoading: capsuleLoading } = useQuery({
    queryKey: ['capsule', capsuleId],
    queryFn: () => evidenceApi.getCapsule(capsuleId),
    retry: 1,
  });

  const { data: custody, isLoading: custodyLoading } = useQuery({
    queryKey: ['capsule-custody', capsuleId],
    queryFn: () => evidenceApi.getChainOfCustody(capsuleId),
    retry: 1,
  });

  const { data: aiJob } = useQuery({
    queryKey: ['ai-job-capsule', capsuleId],
    queryFn: () => aiApi.getJobByCapsule(capsuleId),
    retry: 1,
    enabled: !!capsuleId,
  });

  const confidencePct = capsule?.aiConfidenceScore
    ? Math.round(capsule.aiConfidenceScore * 100)
    : aiJob?.overallConfidence
      ? Math.round(aiJob.overallConfidence * 100)
      : null;

  return (
    <div
      className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Evidence Capsule Detail"
    >
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#0B3C6D]/10 rounded-lg">
              <Shield className="w-5 h-5 text-[#0B3C6D]" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">Evidence Capsule</h2>
              <p className="text-xs text-gray-400 font-mono">{capsuleId.slice(0, 8)}…</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-md transition-colors"
            aria-label="Close modal"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="overflow-y-auto flex-1 p-5 space-y-5">
          {capsuleLoading ? (
            <div className="py-8 text-center text-gray-500">Loading capsule details…</div>
          ) : !capsule ? (
            <div className="py-8 text-center text-red-600">Capsule not found or Evidence Service unavailable</div>
          ) : (
            <>
              {/* Evidence Metadata */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Evidence Details</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-gray-400">Station</p>
                      <p className="font-medium text-gray-900 leading-tight">{capsule.pollingStationName}</p>
                      <p className="text-xs text-gray-400 font-mono">{capsule.iebcStationCode}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Position</p>
                    <p className="font-medium">{POSITION_LABELS[capsule.positionCode] ?? capsule.positionCode}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">County / Constituency</p>
                    <p className="font-medium text-gray-900">{capsule.countyName}</p>
                    <p className="text-xs text-gray-500">{capsule.constituencyName} · {capsule.wardName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Election Year</p>
                    <p className="font-medium">{capsule.electionYear}</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <Calendar className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-gray-400">Captured</p>
                      <p className="font-medium">{new Date(capsule.capturedAt).toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <User className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-gray-400">Agent ID</p>
                      <p className="font-mono text-xs text-gray-700 truncate">{capsule.agentUserId.slice(0, 12)}…</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* AI Confidence Score */}
              {(confidencePct !== null || aiJob) && (
                <div className="bg-violet-50 rounded-lg p-4 border border-violet-100">
                  <h3 className="text-xs font-semibold text-violet-700 uppercase tracking-wide mb-3">
                    AI Verification — Advisory Only
                  </h3>
                  <p className="text-xs text-violet-600 mb-3">
                    AI assists with verification — humans make all final decisions.
                  </p>
                  {confidencePct !== null && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-700">Overall Confidence</span>
                        <span className={clsx(
                          'text-sm font-bold',
                          confidencePct >= 80 ? 'text-emerald-600' :
                          confidencePct >= 60 ? 'text-amber-600' : 'text-red-600',
                        )}>
                          {confidencePct}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={clsx(
                            'h-2 rounded-full transition-all',
                            confidencePct >= 80 ? 'bg-emerald-500' :
                            confidencePct >= 60 ? 'bg-amber-500' : 'bg-red-500',
                          )}
                          style={{ width: `${confidencePct}%` }}
                          role="progressbar"
                          aria-valuenow={confidencePct}
                          aria-valuemin={0}
                          aria-valuemax={100}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-gray-400">
                        <span>0% — Escalate</span>
                        <span>60% — Review</span>
                        <span>80% — Approve</span>
                      </div>
                    </div>
                  )}
                  {aiJob?.routingDecision && (
                    <div className="mt-3 flex items-center gap-2">
                      <span className="text-xs text-gray-500">AI Routing:</span>
                      <span className={clsx(
                        'text-xs font-medium px-2 py-0.5 rounded-full',
                        aiJob.routingDecision === 'APPROVE_FOR_REVIEW' ? 'bg-emerald-100 text-emerald-700' :
                        aiJob.routingDecision === 'MANUAL_REVIEW' ? 'bg-amber-100 text-amber-700' :
                        'bg-red-100 text-red-700',
                      )}>
                        {aiJob.routingDecision.replace(/_/g, ' ')}
                      </span>
                      {capsule.aiFlagged && (
                        <span className="flex items-center gap-1 text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                          <AlertTriangle className="w-3 h-3" />
                          Flagged
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Integrity Verification (QLDB) */}
              {capsule.qldbDocumentId && (
                <div className="bg-emerald-50 rounded-lg p-4 border border-emerald-100">
                  <div className="flex items-center gap-2 mb-2">
                    <Lock className="w-4 h-4 text-emerald-600" aria-hidden="true" />
                    <h3 className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">
                      Integrity Verified
                    </h3>
                  </div>
                  <div className="space-y-1 text-xs">
                    <div className="flex gap-2">
                      <span className="text-gray-500 flex-shrink-0">QLDB Document:</span>
                      <span className="font-mono text-gray-700 break-all">{capsule.qldbDocumentId}</span>
                    </div>
                    {capsule.qldbAnchoredAt && (
                      <div className="flex gap-2">
                        <span className="text-gray-500 flex-shrink-0">Anchored:</span>
                        <span className="text-gray-700">{new Date(capsule.qldbAnchoredAt).toLocaleString()}</span>
                      </div>
                    )}
                    {capsule.sha256Hash && (
                      <div className="flex gap-2">
                        <span className="text-gray-500 flex-shrink-0">SHA-256:</span>
                        <span className="font-mono text-gray-600 break-all text-xs">{capsule.sha256Hash.slice(0, 32)}…</span>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-emerald-600 mt-2">
                    This evidence is anchored to Amazon QLDB — any tampering would change the ledger digest.
                  </p>
                </div>
              )}

              {/* Chain of Custody Timeline */}
              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  Chain of Custody
                </h3>
                {custodyLoading ? (
                  <p className="text-sm text-gray-400">Loading custody events…</p>
                ) : !custody || custody.length === 0 ? (
                  <p className="text-sm text-gray-400">No custody events recorded yet</p>
                ) : (
                  <div className="space-y-0">
                    {custody.map((event, idx) => {
                      const cfg = CUSTODY_EVENT_CONFIG[event.eventType] ?? {
                        label: event.eventType.replace(/_/g, ' '),
                        color: 'bg-gray-400',
                        icon: Shield,
                      };
                      const Icon = cfg.icon;
                      const isLast = idx === custody.length - 1;

                      return (
                        <div key={event.id} className="flex gap-3">
                          {/* Timeline dot + line */}
                          <div className="flex flex-col items-center">
                            <div className={clsx('w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0', cfg.color)}>
                              <Icon className="w-3.5 h-3.5 text-white" aria-hidden="true" />
                            </div>
                            {!isLast && <div className="w-0.5 flex-1 bg-gray-200 my-1" />}
                          </div>

                          {/* Event detail */}
                          <div className={clsx('pb-4 flex-1 min-w-0', isLast && 'pb-0')}>
                            <div className="flex items-baseline justify-between gap-2">
                              <p className="text-sm font-medium text-gray-800">{cfg.label}</p>
                              <time
                                className="text-xs text-gray-400 flex-shrink-0"
                                dateTime={event.eventTimestamp}
                              >
                                {new Date(event.eventTimestamp).toLocaleString()}
                              </time>
                            </div>
                            {event.actorService && (
                              <p className="text-xs text-gray-500 mt-0.5">
                                Service: {event.actorService}
                              </p>
                            )}
                            {event.actorUserId && (
                              <p className="text-xs text-gray-500 font-mono">
                                Actor: {event.actorUserId.slice(0, 8)}…
                              </p>
                            )}
                            {event.eventData && Object.keys(event.eventData).length > 0 && (
                              <div className="mt-1 text-xs text-gray-400 font-mono bg-gray-50 rounded px-2 py-1 truncate">
                                {JSON.stringify(event.eventData).slice(0, 80)}
                                {JSON.stringify(event.eventData).length > 80 ? '…' : ''}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-gray-100 flex justify-end">
          <button onClick={onClose} className="vc-btn-secondary text-sm">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
