/**
 * Vote Capsule™ — Candidate Portal: Nomination & Party Sponsorship Status
 *
 * This page shows the candidate's:
 *   - Party affiliation and sponsorship details
 *   - Nomination origin (if they won a party nomination)
 *   - IEBC clearance pipeline status
 *   - Deposit payment tracking
 *   - Required documents checklist
 *   - Direct link back to party portal for coordination
 *
 * Connects to: Candidate Service, Party nominations data
 */

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Trophy, Shield, CheckCircle2, Clock, FileText, MapPin,
  CreditCard, AlertTriangle, ArrowRight, BadgeCheck, Users,
  Flag, XCircle, Download, ExternalLink, Briefcase,
} from 'lucide-react';
import { clsx } from 'clsx';
import { useAppSelector } from '../store/hooks';
import { apiClient } from '../api/apiClient';
import { PageErrorBoundary } from '../components/PageErrorBoundary';

// ── Types ────────────────────────────────────────────────────

interface CandidateProfile {
  id: string;
  fullName: string;
  shortName: string;
  nationalId: string;
  positionCode: string;
  status: string;
  sponsorshipType: string;
  isIndependent: boolean;
  nominationWon: boolean | null;
  nominationElectionId: string | null;
  promotedFromCandidateId: string | null;
  countyCode: string;
  constituencyCode: string;
  wardCode: string;
  gender: string;
  photographUrl: string | null;
  runningMateName: string | null;
  iebc_deposit_paid_kes: number;
  iebc_deposit_receipt_no: string | null;
  party_cleared_at: string | null;
  party_cleared_by: string | null;
  iebc_nomination_ref: string | null;
  gazette_reference: string | null;
  electionId: string;
  electionName: string;
  partyId: string | null;
  partyName: string | null;
  partyAbbreviation: string | null;
  partyColor: string | null;
  createdAt: string;
}

interface NominationOrigin {
  nominationElectionId: string;
  nominationElectionName: string;
  nominationDate: string;
  competitorsCount: number;
  votesReceived: number | null;
  totalVotes: number | null;
  promotedAt: string;
}

// ── Status Pipeline ──────────────────────────────────────────

const PIPELINE_STAGES = [
  { key: 'party_nominated', label: 'Party Nominated', desc: 'Selected by party (nomination or direct)' },
  { key: 'party_cleared', label: 'Party Cleared', desc: 'Internal clearance by party officials' },
  { key: 'iebc_submitted', label: 'IEBC Submitted', desc: 'Papers submitted to IEBC returning officer' },
  { key: 'iebc_cleared', label: 'IEBC Cleared', desc: 'Meets all IEBC requirements (Chapter 6)' },
  { key: 'gazetted', label: 'Gazetted', desc: 'Published in Kenya Gazette as candidate' },
  { key: 'on_ballot', label: 'On Ballot', desc: 'Ballot reference assigned, ready for election' },
];

function getActiveStage(profile: CandidateProfile): number {
  if (profile.gazette_reference) return 5;
  if (profile.status === 'APPROVED') return 4;
  if (profile.iebc_nomination_ref) return 3;
  if (profile.party_cleared_at) return 2;
  if (profile.status === 'NOMINATED') return 1;
  return 0;
}

// ── Vetting Checklist ────────────────────────────────────────

interface VettingItem {
  label: string;
  description: string;
  done: boolean;
  required: boolean;
}

function getVettingChecklist(profile: CandidateProfile): VettingItem[] {
  return [
    { label: 'Party Nomination', description: 'Won party nomination or direct party ticket', done: true, required: true },
    { label: 'Party Internal Clearance', description: 'Cleared by party\'s National Elections Board', done: !!profile.party_cleared_at, required: true },
    { label: 'Nomination Fee Paid', description: 'IEBC nomination deposit received', done: profile.iebc_deposit_paid_kes > 0, required: true },
    { label: 'IEBC Form 13B Submitted', description: 'Nomination papers submitted to returning officer', done: !!profile.iebc_nomination_ref, required: true },
    { label: 'Chapter 6 Compliance', description: 'EACC, DCI, KRA, HELB clearance certificates', done: profile.status === 'APPROVED', required: true },
    { label: 'Academic Qualifications', description: 'Degree certificate (for Governor/Senator/MP)', done: profile.status === 'APPROVED', required: ['GOVERNOR', 'SENATOR', 'MP'].includes(profile.positionCode) },
    { label: 'Running Mate Declared', description: 'Deputy Governor candidate registered', done: !!profile.runningMateName, required: profile.positionCode === 'GOVERNOR' },
    { label: 'Gazette Notice Published', description: 'Name published in Kenya Gazette', done: !!profile.gazette_reference, required: true },
  ].filter(item => item.required);
}

// ── Main Content ─────────────────────────────────────────────

function NominationStatusPageContent(): React.JSX.Element {
  const user = useAppSelector((s: any) => s.auth.user);
  const candidateId = user?.candidateId ?? '';

  // Load candidate profile (extended with party info)
  const { data: profile, isLoading } = useQuery<CandidateProfile>({
    queryKey: ['candidate-profile', candidateId],
    queryFn: () =>
      apiClient.get(`/candidate/candidates/${candidateId}`)
        .then(r => r.data?.data ?? r.data),
    enabled: !!candidateId,
    staleTime: 60_000,
  });

  // Load nomination origin (if promoted from party nomination)
  const { data: nominationOrigin } = useQuery<NominationOrigin>({
    queryKey: ['nomination-origin', candidateId],
    queryFn: () =>
      apiClient.get(`/candidate/candidates/${candidateId}/nomination-origin`)
        .then(r => r.data?.data ?? r.data)
        .catch(() => null),
    enabled: !!candidateId && !!profile?.nominationElectionId,
    staleTime: 5 * 60_000,
  });

  if (isLoading) {
    return <div className="flex items-center justify-center h-64 text-gray-400">Loading nomination status…</div>;
  }

  if (!profile) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
        <AlertTriangle className="w-12 h-12 text-amber-400 mx-auto mb-3" />
        <p className="font-medium text-gray-700">No candidate profile found</p>
        <p className="text-sm text-gray-400 mt-1">Your account may not be linked to a candidate record yet.</p>
      </div>
    );
  }

  const activeStage = getActiveStage(profile);
  const checklist = getVettingChecklist(profile);
  const completedChecks = checklist.filter(c => c.done).length;
  const isIndependent = profile.isIndependent || profile.sponsorshipType === 'INDEPENDENT';

  const POSITION_LABELS: Record<string, string> = {
    PRESIDENT: 'President', GOVERNOR: 'Governor', SENATOR: 'Senator',
    WOMEN_REP: 'Women Rep', MP: 'Member of Parliament', MCA: 'MCA',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-gray-900">Nomination & Sponsorship</h2>
        <p className="text-sm text-gray-500 mt-1">
          Track your candidature journey from party nomination to ballot appearance
        </p>
      </div>

      {/* Candidate identity card */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-5 flex items-start gap-4">
          {/* Photo */}
          <div className="w-16 h-16 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
            {profile.photographUrl ? (
              <img src={profile.photographUrl} alt="" className="w-16 h-16 rounded-xl object-cover" />
            ) : (
              <span className="text-xl font-bold text-amber-600">{profile.fullName.charAt(0)}</span>
            )}
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-gray-900">{profile.fullName}</h3>
            <p className="text-sm text-gray-600 mt-0.5">
              {POSITION_LABELS[profile.positionCode] ?? profile.positionCode} Candidate
            </p>
            <div className="flex items-center gap-3 mt-2 flex-wrap text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {profile.constituencyCode || profile.countyCode || 'National'}
              </span>
              <span className="flex items-center gap-1">
                <FileText className="w-3 h-3" />
                ID: {profile.nationalId}
              </span>
              {profile.runningMateName && (
                <span className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  + {profile.runningMateName}
                </span>
              )}
            </div>
          </div>

          {/* Status badge */}
          <div className="text-right">
            <span className={clsx(
              'inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold',
              profile.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' :
              profile.status === 'NOMINATED' ? 'bg-blue-100 text-blue-700' :
              profile.status === 'ELECTED' ? 'bg-violet-100 text-violet-700' :
              profile.status === 'DISQUALIFIED' ? 'bg-red-100 text-red-700' :
              'bg-amber-100 text-amber-700'
            )}>
              {profile.status === 'APPROVED' && <CheckCircle2 className="w-3 h-3" />}
              {profile.status === 'ELECTED' && <Trophy className="w-3 h-3" />}
              {profile.status}
            </span>
          </div>
        </div>

        {/* Party affiliation bar */}
        {!isIndependent && profile.partyName && (
          <div
            className="px-5 py-3 border-t flex items-center gap-3"
            style={{ backgroundColor: `${profile.partyColor}10`, borderColor: `${profile.partyColor}30` }}
          >
            <Flag className="w-4 h-4" style={{ color: profile.partyColor ?? '#6b21a8' }} />
            <div className="flex-1">
              <p className="text-sm font-semibold" style={{ color: profile.partyColor ?? '#1f2937' }}>
                {profile.partyName}
              </p>
              <p className="text-xs text-gray-500">
                {profile.sponsorshipType === 'PARTY_SPONSORED' ? 'Party Sponsored' : profile.sponsorshipType}
                {profile.nominationElectionId && ' · Won Party Nomination'}
              </p>
            </div>
            <a
              href="https://party.votecapsule.yna.co.ke"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-violet-600 hover:text-violet-700 flex items-center gap-1"
            >
              Party Portal <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        )}
      </div>

      {/* Nomination origin (if won a nomination) */}
      {profile.nominationElectionId && (
        <div className="bg-gradient-to-r from-amber-50 to-yellow-50 rounded-xl border border-amber-200 p-5">
          <div className="flex items-start gap-3">
            <Trophy className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-900">
                Won Party Nomination
              </p>
              {nominationOrigin ? (
                <div className="mt-2 text-xs text-amber-700 space-y-1">
                  <p><strong>Election:</strong> {nominationOrigin.nominationElectionName}</p>
                  <p><strong>Date:</strong> {new Date(nominationOrigin.nominationDate).toLocaleDateString('en-KE', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                  <p><strong>Competitors:</strong> {nominationOrigin.competitorsCount} candidates competed</p>
                  {nominationOrigin.votesReceived !== null && (
                    <p><strong>Votes:</strong> {nominationOrigin.votesReceived?.toLocaleString()} / {nominationOrigin.totalVotes?.toLocaleString()}</p>
                  )}
                  <p><strong>Promoted to GE:</strong> {new Date(nominationOrigin.promotedAt).toLocaleDateString('en-KE')}</p>
                </div>
              ) : (
                <p className="text-xs text-amber-700 mt-1">Promoted from party nomination to General Election</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* IEBC Pipeline */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
          <BadgeCheck className="w-4 h-4 text-blue-600" />
          Candidature Pipeline
        </h3>
        <div className="relative">
          {/* Pipeline line */}
          <div className="absolute left-4 top-4 bottom-4 w-0.5 bg-gray-200" />
          <div
            className="absolute left-4 top-4 w-0.5 bg-emerald-500 transition-all"
            style={{ height: `${(activeStage / (PIPELINE_STAGES.length - 1)) * 100}%` }}
          />

          {/* Stages */}
          <div className="space-y-4 relative">
            {PIPELINE_STAGES.map((stage, idx) => {
              const isCompleted = idx <= activeStage;
              const isCurrent = idx === activeStage;
              return (
                <div key={stage.key} className="flex items-start gap-3 pl-1">
                  <div className={clsx(
                    'w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 z-10',
                    isCompleted ? 'bg-emerald-500' : 'bg-gray-200',
                    isCurrent && 'ring-2 ring-emerald-300 ring-offset-2'
                  )}>
                    {isCompleted ? (
                      <CheckCircle2 className="w-4 h-4 text-white" />
                    ) : (
                      <Clock className="w-3 h-3 text-gray-400" />
                    )}
                  </div>
                  <div className={clsx('pt-0.5', isCurrent && 'font-medium')}>
                    <p className={clsx('text-sm', isCompleted ? 'text-gray-900' : 'text-gray-400')}>
                      {stage.label}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">{stage.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Vetting checklist + Deposit */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Checklist */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <Shield className="w-4 h-4 text-violet-600" />
            Vetting Checklist ({completedChecks}/{checklist.length})
          </h3>
          <div className="space-y-2">
            {checklist.map(item => (
              <div key={item.label} className="flex items-start gap-2">
                {item.done ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                ) : (
                  <div className="w-4 h-4 rounded-full border-2 border-gray-300 flex-shrink-0 mt-0.5" />
                )}
                <div>
                  <p className={clsx('text-xs', item.done ? 'text-gray-700' : 'text-gray-400')}>
                    {item.label}
                  </p>
                  <p className="text-xs text-gray-400">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Deposit tracking */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-amber-600" />
            Nomination Deposit
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-xs text-gray-500">Amount Paid</span>
              <span className={clsx('text-sm font-bold',
                profile.iebc_deposit_paid_kes > 0 ? 'text-emerald-700' : 'text-gray-400'
              )}>
                {profile.iebc_deposit_paid_kes > 0
                  ? `KES ${profile.iebc_deposit_paid_kes.toLocaleString()}`
                  : 'Not paid'}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-xs text-gray-500">Receipt No.</span>
              <span className="text-sm font-mono text-gray-700">
                {profile.iebc_deposit_receipt_no || '—'}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-xs text-gray-500">IEBC Nomination Ref</span>
              <span className="text-sm font-mono text-gray-700">
                {profile.iebc_nomination_ref || '—'}
              </span>
            </div>
            {profile.gazette_reference && (
              <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg">
                <span className="text-xs text-emerald-600">Gazette Reference</span>
                <span className="text-sm font-mono text-emerald-700">{profile.gazette_reference}</span>
              </div>
            )}
          </div>

          {/* Required deposit amounts */}
          <div className="mt-3 p-3 bg-blue-50 rounded-lg">
            <p className="text-xs text-blue-700">
              <strong>Required deposits:</strong> President KES 1M · Governor KES 500K · Senator KES 250K · MP KES 200K · Women Rep KES 100K · MCA KES 50K
            </p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Actions</h3>
        <div className="flex gap-3 flex-wrap">
          {profile.status === 'APPROVED' && (
            <button className="px-4 py-2 text-sm font-medium rounded-lg bg-violet-600 text-white hover:bg-violet-700 flex items-center gap-2">
              <Download className="w-4 h-4" /> Download Nomination Certificate
            </button>
          )}
          {!isIndependent && (
            <a
              href="https://party.votecapsule.yna.co.ke/nominations"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 text-sm font-medium rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 flex items-center gap-2"
            >
              <Flag className="w-4 h-4" /> View on Party Portal
            </a>
          )}
          <button className="px-4 py-2 text-sm font-medium rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 flex items-center gap-2">
            <Briefcase className="w-4 h-4" /> View IEBC Requirements
          </button>
        </div>
      </div>
    </div>
  );
}

export function NominationStatusPage() {
  return (
    <PageErrorBoundary page="Nomination Status">
      <NominationStatusPageContent />
    </PageErrorBoundary>
  );
}
