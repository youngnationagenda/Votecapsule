/**
 * Vote Capsule™ — Party Candidates Management Page
 *
 * This page bridges the Party Portal to the Candidate Portal.
 * Party admins can:
 *   1. View all candidates sponsored by their party (nomination winners + direct)
 *   2. Create new party-sponsored candidates directly (bypass nomination)
 *   3. Track IEBC approval pipeline for each candidate
 *   4. Monitor gender/2/3 rule compliance across all positions
 *   5. Manage candidate deposits and clearance status
 *   6. Generate nomination certificates for winners
 *
 * Data flow:
 *   Party Nomination → Winner → Promote to GE → Candidate Portal picks up
 *   Direct Sponsorship → Register → Candidate Portal picks up
 */

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users, Plus, Search, Filter, CheckCircle2, XCircle, Clock,
  Trophy, AlertTriangle, FileText, MapPin, ChevronRight,
  ArrowRight, Shield, UserPlus, BadgeCheck, Download,
  Flag, BarChart3, Eye, UserCheck, Ban, ChevronDown,
} from 'lucide-react';
import { clsx } from 'clsx';
import { useAppSelector } from '../store/hooks';
import { apiClient } from '../api/apiClient';
import { geographyApi, County, Constituency, Ward } from '../api/geographyApi';
import { PageErrorBoundary } from '../components/PageErrorBoundary';

// ── Types ────────────────────────────────────────────────────

interface PartyCandidate {
  id: string;
  fullName: string;
  shortName: string;
  nationalId: string;
  positionCode: string;
  status: string;
  sponsorshipType: string;
  nominationWon: boolean | null;
  nominationElectionId: string | null;
  promotedFromCandidateId: string | null;
  countyCode: string;
  constituencyCode: string;
  wardCode: string;
  gender: string;
  dateOfBirth: string | null;
  photographUrl: string | null;
  runningMateName: string | null;
  iebc_deposit_paid_kes: number;
  iebc_deposit_receipt_no: string | null;
  party_cleared_at: string | null;
  party_cleared_by: string | null;
  iebc_nomination_ref: string | null;
  createdAt: string;
  electionId: string;
  electionName: string;
}

interface GenderCompliance {
  total: number;
  male: number;
  female: number;
  compliant: boolean;
  percentage: number;
}

// ── Status configuration ─────────────────────────────────────

const CANDIDATE_STATUS: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  PENDING_NOMINATION: { label: 'Pending Nomination', color: 'bg-amber-100 text-amber-700', icon: Clock },
  NOMINATED:          { label: 'Nominated',          color: 'bg-blue-100 text-blue-700',    icon: FileText },
  APPROVED:           { label: 'IEBC Approved',      color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 },
  ELECTED:            { label: 'Elected',            color: 'bg-violet-100 text-violet-700', icon: Trophy },
  NOT_ELECTED:        { label: 'Not Elected',        color: 'bg-gray-100 text-gray-600',     icon: XCircle },
  DISQUALIFIED:       { label: 'Disqualified',       color: 'bg-red-100 text-red-700',       icon: Ban },
  WITHDRAWN:          { label: 'Withdrawn',          color: 'bg-gray-100 text-gray-500',     icon: XCircle },
};

const POSITIONS: Record<string, { label: string; level: string }> = {
  PRESIDENT:  { label: 'President',        level: 'National' },
  GOVERNOR:   { label: 'Governor',         level: 'County' },
  SENATOR:    { label: 'Senator',          level: 'County' },
  WOMEN_REP:  { label: 'Women Rep',        level: 'County' },
  MP:         { label: 'Member of Parliament', level: 'Constituency' },
  MCA:        { label: 'MCA',              level: 'Ward' },
};

// ── Direct Candidate Registration Modal ─────────────────────

function CreateCandidateModal({
  tenantId,
  userId,
  partyId,
  onClose,
}: {
  tenantId: string;
  userId: string;
  partyId: string;
  onClose: () => void;
}) {
  const qc = useQueryClient();

  const [form, setForm] = useState({
    fullName: '',
    shortName: '',
    nationalId: '',
    positionCode: '',
    countyCode: '',
    constituencyCode: '',
    wardCode: '',
    gender: '',
    dateOfBirth: '',
    runningMateName: '',
    runningMateNationalId: '',
    electionId: '',
  });

  // Load elections for linking
  const { data: elections } = useQuery({
    queryKey: ['general-elections-list'],
    queryFn: () =>
      apiClient.get('/election/elections')
        .then(r => (r.data?.data ?? r.data ?? []).filter((e: any) => e.electionType === 'GENERAL' || !e.electionType)),
    staleTime: 5 * 60_000,
  });

  // Load NEC counties
  const { data: counties } = useQuery<County[]>({
    queryKey: ['nec-counties'],
    queryFn: () => geographyApi.getCounties(),
    staleTime: 10 * 60_000,
  });

  const { data: constituencies } = useQuery<Constituency[]>({
    queryKey: ['nec-constituencies', form.countyCode],
    queryFn: () => geographyApi.getConstituencies(form.countyCode),
    enabled: !!form.countyCode && ['MP', 'MCA'].includes(form.positionCode),
    staleTime: 10 * 60_000,
  });

  const { data: wards } = useQuery<Ward[]>({
    queryKey: ['nec-wards', form.constituencyCode],
    queryFn: () => geographyApi.getWards(form.constituencyCode),
    enabled: !!form.constituencyCode && form.positionCode === 'MCA',
    staleTime: 10 * 60_000,
  });

  const positionConfig = POSITIONS[form.positionCode];
  const needsConstituency = ['MP', 'MCA'].includes(form.positionCode);
  const needsWard = form.positionCode === 'MCA';
  const needsRunningMate = form.positionCode === 'GOVERNOR';

  const mutation = useMutation({
    mutationFn: () =>
      apiClient.post('/candidate/register', {
        fullName: form.fullName,
        shortName: form.shortName || form.fullName.split(' ')[0],
        nationalId: form.nationalId,
        positionCode: form.positionCode,
        countyCode: form.countyCode || null,
        constituencyCode: form.constituencyCode || null,
        wardCode: form.wardCode || null,
        gender: form.gender,
        dateOfBirth: form.dateOfBirth || null,
        runningMateName: form.runningMateName || null,
        runningMateNationalId: form.runningMateNationalId || null,
        electionId: form.electionId,
        partyId,
        sponsorshipType: 'PARTY_SPONSORED',
        isIndependent: false,
      }, {
        headers: { 'x-tenant-id': tenantId, 'x-user-id': userId },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['party-candidates'] });
      onClose();
    },
  });

  const canSubmit = form.fullName && form.nationalId && form.positionCode && form.gender && form.electionId && form.countyCode;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-100 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
            <UserPlus className="w-4 h-4 text-emerald-600" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900">Register Party-Sponsored Candidate</h2>
            <p className="text-xs text-gray-500 mt-0.5">Directly sponsor a candidate (bypasses nomination)</p>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700">
            <strong>Note:</strong> Direct sponsorship registers a candidate into the General Election as
            PARTY_SPONSORED without going through a nomination election. The candidate will still require
            IEBC clearance before appearing on the ballot.
          </div>

          {/* Election selection */}
          <div>
            <label className="vc-label">General Election <span className="text-red-500">*</span></label>
            <select
              className="vc-input"
              value={form.electionId}
              onChange={e => setForm({ ...form, electionId: e.target.value })}
            >
              <option value="">Select election…</option>
              {(elections ?? []).map((el: any) => (
                <option key={el.id} value={el.id}>{el.name} ({el.electionYear})</option>
              ))}
            </select>
          </div>

          {/* Position */}
          <div>
            <label className="vc-label">Position <span className="text-red-500">*</span></label>
            <select
              className="vc-input"
              value={form.positionCode}
              onChange={e => setForm({ ...form, positionCode: e.target.value, countyCode: '', constituencyCode: '', wardCode: '' })}
            >
              <option value="">Select position…</option>
              {Object.entries(POSITIONS).map(([code, cfg]) => (
                <option key={code} value={code}>{cfg.label} ({cfg.level})</option>
              ))}
            </select>
          </div>

          {/* Geographic selection */}
          {form.positionCode && form.positionCode !== 'PRESIDENT' && (
            <div className="space-y-3 p-3 bg-gray-50 rounded-lg">
              <label className="vc-label flex items-center gap-1.5">
                <MapPin className="w-3 h-3 text-violet-500" /> County <span className="text-red-500">*</span>
              </label>
              <select
                className="vc-input"
                value={form.countyCode}
                onChange={e => setForm({ ...form, countyCode: e.target.value, constituencyCode: '', wardCode: '' })}
              >
                <option value="">Select county…</option>
                {(counties ?? []).map(c => (
                  <option key={c.iebcCode} value={c.iebcCode}>{c.name}</option>
                ))}
              </select>

              {needsConstituency && (
                <>
                  <label className="vc-label">Constituency <span className="text-red-500">*</span></label>
                  <select
                    className="vc-input"
                    value={form.constituencyCode}
                    onChange={e => setForm({ ...form, constituencyCode: e.target.value, wardCode: '' })}
                    disabled={!form.countyCode}
                  >
                    <option value="">Select constituency…</option>
                    {(constituencies ?? []).map(c => (
                      <option key={c.iebcCode} value={c.iebcCode}>{c.name}</option>
                    ))}
                  </select>
                </>
              )}

              {needsWard && (
                <>
                  <label className="vc-label">Ward <span className="text-red-500">*</span></label>
                  <select
                    className="vc-input"
                    value={form.wardCode}
                    onChange={e => setForm({ ...form, wardCode: e.target.value })}
                    disabled={!form.constituencyCode}
                  >
                    <option value="">Select ward…</option>
                    {(wards ?? []).map(w => (
                      <option key={w.iebcCode} value={w.iebcCode}>{w.name}</option>
                    ))}
                  </select>
                </>
              )}
            </div>
          )}

          {/* Candidate details */}
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="vc-label">Full Name <span className="text-red-500">*</span></label>
              <input className="vc-input" value={form.fullName}
                onChange={e => setForm({ ...form, fullName: e.target.value })}
                placeholder="e.g., John Kamau Mwangi" />
            </div>
            <div>
              <label className="vc-label">National ID <span className="text-red-500">*</span></label>
              <input className="vc-input" value={form.nationalId}
                onChange={e => setForm({ ...form, nationalId: e.target.value })}
                placeholder="e.g., 12345678" />
            </div>
            <div>
              <label className="vc-label">Gender <span className="text-red-500">*</span></label>
              <select className="vc-input" value={form.gender}
                onChange={e => setForm({ ...form, gender: e.target.value })}>
                <option value="">Select…</option>
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
              </select>
            </div>
            <div>
              <label className="vc-label">Date of Birth</label>
              <input type="date" className="vc-input" value={form.dateOfBirth}
                onChange={e => setForm({ ...form, dateOfBirth: e.target.value })} />
            </div>
            <div>
              <label className="vc-label">Ballot Name</label>
              <input className="vc-input" value={form.shortName}
                onChange={e => setForm({ ...form, shortName: e.target.value })}
                placeholder="Name as shown on ballot" />
            </div>
          </div>

          {/* Running mate for Governor */}
          {needsRunningMate && (
            <div className="grid grid-cols-2 gap-3 p-3 bg-violet-50 rounded-lg">
              <p className="col-span-2 text-xs font-semibold text-violet-700">Deputy Governor (Running Mate)</p>
              <div>
                <label className="vc-label">Running Mate Name</label>
                <input className="vc-input" value={form.runningMateName}
                  onChange={e => setForm({ ...form, runningMateName: e.target.value })}
                  placeholder="Full name" />
              </div>
              <div>
                <label className="vc-label">Running Mate ID</label>
                <input className="vc-input" value={form.runningMateNationalId}
                  onChange={e => setForm({ ...form, runningMateNationalId: e.target.value })}
                  placeholder="National ID" />
              </div>
            </div>
          )}

          {mutation.isError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
              Failed to register candidate. The candidate may already exist or required fields are missing.
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-100 flex gap-3">
          <button
            onClick={() => mutation.mutate()}
            disabled={!canSubmit || mutation.isPending}
            className="vc-btn-primary flex-1"
          >
            {mutation.isPending ? 'Registering…' : 'Register Candidate'}
          </button>
          <button onClick={onClose} className="vc-btn-secondary">Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ── Candidate Row ────────────────────────────────────────────

function CandidateRow({ candidate, tenantId, userId }: { candidate: PartyCandidate; tenantId: string; userId: string }) {
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const statusCfg = CANDIDATE_STATUS[candidate.status] ?? CANDIDATE_STATUS.PENDING_NOMINATION;
  const StatusIcon = statusCfg.icon;
  const posLabel = POSITIONS[candidate.positionCode]?.label ?? candidate.positionCode;

  // Party clearance mutation
  const clearMutation = useMutation({
    mutationFn: () =>
      apiClient.post(`/candidate/candidates/${candidate.id}/nominate`, {}, {
        headers: { 'x-tenant-id': tenantId, 'x-user-id': userId },
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['party-candidates'] }),
  });

  return (
    <div className="border-b border-gray-100 last:border-0">
      <div
        className="flex items-center gap-3 p-4 hover:bg-gray-50 cursor-pointer transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        {/* Photo / avatar */}
        <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center flex-shrink-0">
          {candidate.photographUrl ? (
            <img src={candidate.photographUrl} alt="" className="w-10 h-10 rounded-full object-cover" />
          ) : (
            <span className="text-sm font-bold text-violet-600">
              {candidate.fullName.charAt(0)}
            </span>
          )}
        </div>

        {/* Name + position */}
        <div className="flex-1 min-w-0">
          <p className="font-medium text-gray-900 truncate">{candidate.fullName}</p>
          <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500">
            <span>{posLabel}</span>
            <span className="text-gray-300">·</span>
            <span className="flex items-center gap-0.5">
              <MapPin className="w-3 h-3" />
              {candidate.constituencyCode || candidate.countyCode || '—'}
            </span>
            {candidate.gender && (
              <>
                <span className="text-gray-300">·</span>
                <span className={candidate.gender === 'FEMALE' ? 'text-pink-500' : 'text-blue-500'}>
                  {candidate.gender === 'FEMALE' ? '♀' : '♂'}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Sponsorship badge */}
        <span className={clsx('text-xs px-2 py-0.5 rounded-full font-medium',
          candidate.sponsorshipType === 'PARTY_SPONSORED' ? 'bg-violet-100 text-violet-700' :
          candidate.nominationWon ? 'bg-emerald-100 text-emerald-700' :
          'bg-gray-100 text-gray-600'
        )}>
          {candidate.nominationElectionId ? 'Nomination Winner' : 'Direct Sponsor'}
        </span>

        {/* Status */}
        <span className={clsx('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold', statusCfg.color)}>
          <StatusIcon className="w-3 h-3" />
          {statusCfg.label}
        </span>

        {/* Chevron */}
        <ChevronRight className={clsx('w-4 h-4 text-gray-400 transition-transform', expanded && 'rotate-90')} />
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="px-4 pb-4 ml-13 pl-16">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div>
              <p className="text-gray-400">National ID</p>
              <p className="font-medium text-gray-700">{candidate.nationalId}</p>
            </div>
            <div>
              <p className="text-gray-400">IEBC Nomination Ref</p>
              <p className="font-medium text-gray-700">{candidate.iebc_nomination_ref || 'Pending'}</p>
            </div>
            <div>
              <p className="text-gray-400">Deposit Paid</p>
              <p className="font-medium text-gray-700">
                {candidate.iebc_deposit_paid_kes > 0
                  ? `KES ${candidate.iebc_deposit_paid_kes.toLocaleString()}`
                  : 'Not paid'}
              </p>
            </div>
            <div>
              <p className="text-gray-400">Party Clearance</p>
              <p className="font-medium text-gray-700">
                {candidate.party_cleared_at
                  ? `Cleared ${new Date(candidate.party_cleared_at).toLocaleDateString('en-KE')}`
                  : 'Not cleared'}
              </p>
            </div>
            {candidate.nominationElectionId && (
              <div>
                <p className="text-gray-400">Source</p>
                <p className="font-medium text-violet-700 flex items-center gap-1">
                  <Trophy className="w-3 h-3" /> Won Party Nomination
                </p>
              </div>
            )}
            {candidate.runningMateName && (
              <div className="col-span-2">
                <p className="text-gray-400">Running Mate (Deputy)</p>
                <p className="font-medium text-gray-700">{candidate.runningMateName}</p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2 mt-3">
            {candidate.status === 'PENDING_NOMINATION' && !candidate.party_cleared_at && (
              <button
                onClick={(e) => { e.stopPropagation(); clearMutation.mutate(); }}
                disabled={clearMutation.isPending}
                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
              >
                <UserCheck className="w-3 h-3 inline mr-1" />
                {clearMutation.isPending ? 'Clearing…' : 'Clear for IEBC Nomination'}
              </button>
            )}
            <button className="px-3 py-1.5 text-xs font-medium rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200">
              <Eye className="w-3 h-3 inline mr-1" /> View on Candidate Portal
            </button>
            {candidate.status === 'APPROVED' && (
              <button className="px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-100 text-blue-700 hover:bg-blue-200">
                <Download className="w-3 h-3 inline mr-1" /> Nomination Certificate
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── IEBC Pipeline Tracker ────────────────────────────────────

function IEBCPipeline({ candidates }: { candidates: PartyCandidate[] }) {
  const stages = [
    { key: 'PENDING_NOMINATION', label: 'Pending', count: candidates.filter(c => c.status === 'PENDING_NOMINATION').length },
    { key: 'NOMINATED', label: 'Nominated', count: candidates.filter(c => c.status === 'NOMINATED').length },
    { key: 'APPROVED', label: 'Approved', count: candidates.filter(c => c.status === 'APPROVED').length },
    { key: 'DISQUALIFIED', label: 'Disqualified', count: candidates.filter(c => c.status === 'DISQUALIFIED').length },
  ];

  const total = candidates.length || 1;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
        <BadgeCheck className="w-4 h-4 text-blue-600" />
        IEBC Approval Pipeline
      </h3>
      <div className="flex gap-1 h-3 rounded-full overflow-hidden bg-gray-100">
        {stages.map(s => (
          s.count > 0 && (
            <div
              key={s.key}
              className={clsx('h-full transition-all',
                s.key === 'PENDING_NOMINATION' ? 'bg-amber-400' :
                s.key === 'NOMINATED' ? 'bg-blue-400' :
                s.key === 'APPROVED' ? 'bg-emerald-500' :
                'bg-red-400'
              )}
              style={{ width: `${(s.count / total) * 100}%` }}
              title={`${s.label}: ${s.count}`}
            />
          )
        ))}
      </div>
      <div className="flex justify-between mt-2 text-xs text-gray-500">
        {stages.map(s => (
          <span key={s.key} className="flex items-center gap-1">
            <span className={clsx('w-2 h-2 rounded-full',
              s.key === 'PENDING_NOMINATION' ? 'bg-amber-400' :
              s.key === 'NOMINATED' ? 'bg-blue-400' :
              s.key === 'APPROVED' ? 'bg-emerald-500' :
              'bg-red-400'
            )} />
            {s.label} ({s.count})
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Gender Compliance Card ───────────────────────────────────

function GenderComplianceCard({ candidates }: { candidates: PartyCandidate[] }) {
  const stats = useMemo((): GenderCompliance => {
    const total = candidates.filter(c => !['WITHDRAWN', 'DISQUALIFIED'].includes(c.status)).length;
    const male = candidates.filter(c => c.gender === 'MALE' && !['WITHDRAWN', 'DISQUALIFIED'].includes(c.status)).length;
    const female = candidates.filter(c => c.gender === 'FEMALE' && !['WITHDRAWN', 'DISQUALIFIED'].includes(c.status)).length;
    const minority = Math.min(male, female);
    const percentage = total > 0 ? (minority / total) * 100 : 0;
    const compliant = total < 3 || percentage >= 33.3;
    return { total, male, female, compliant, percentage };
  }, [candidates]);

  return (
    <div className={clsx(
      'rounded-xl border p-4',
      stats.compliant ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'
    )}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          <Users className="w-4 h-4" />
          2/3 Gender Rule
        </h3>
        <span className={clsx(
          'text-xs font-bold px-2 py-0.5 rounded-full',
          stats.compliant ? 'bg-emerald-200 text-emerald-800' : 'bg-red-200 text-red-800'
        )}>
          {stats.compliant ? 'COMPLIANT' : 'NON-COMPLIANT'}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-3 mt-3 text-center">
        <div>
          <p className="text-2xl font-bold text-blue-600">{stats.male}</p>
          <p className="text-xs text-gray-500">Male</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-pink-600">{stats.female}</p>
          <p className="text-xs text-gray-500">Female</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-700">{stats.percentage.toFixed(1)}%</p>
          <p className="text-xs text-gray-500">Minority %</p>
        </div>
      </div>
      {!stats.compliant && (
        <p className="text-xs text-red-600 mt-2">
          Constitution requires at least 33.3% representation of either gender.
          You need {Math.ceil(stats.total * 0.334) - Math.min(stats.male, stats.female)} more {stats.male > stats.female ? 'female' : 'male'} candidates.
        </p>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────

function PartyCandidatesPageContent(): React.JSX.Element {
  const user = useAppSelector((s: any) => s.auth.user);
  const tenantId = user?.tenantId ?? '';
  const userId   = user?.id ?? '';
  const partyId  = user?.partyId ?? tenantId;

  const [showCreate, setShowCreate] = useState(false);
  const [filterPosition, setFilterPosition] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Load all party-sponsored candidates
  const { data: candidates, isLoading } = useQuery<PartyCandidate[]>({
    queryKey: ['party-candidates', tenantId],
    queryFn: () =>
      apiClient.get('/candidate/candidates', {
        params: { partyId, sponsorshipType: 'PARTY_SPONSORED' },
        headers: { 'x-tenant-id': tenantId },
      }).then(r => r.data?.data ?? r.data ?? []),
    enabled: !!tenantId,
    staleTime: 30_000,
  });

  // Filtered list
  const filtered = useMemo(() => {
    let result = candidates ?? [];
    if (filterPosition) result = result.filter(c => c.positionCode === filterPosition);
    if (filterStatus) result = result.filter(c => c.status === filterStatus);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(c =>
        c.fullName.toLowerCase().includes(q) ||
        c.nationalId.includes(q) ||
        c.countyCode?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [candidates, filterPosition, filterStatus, searchQuery]);

  // Stats
  const totalCandidates = (candidates ?? []).length;
  const approvedCount = (candidates ?? []).filter(c => c.status === 'APPROVED').length;
  const nominationWinners = (candidates ?? []).filter(c => c.nominationElectionId).length;
  const directSponsored = totalCandidates - nominationWinners;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Party Candidates</h2>
          <p className="text-sm text-gray-500 mt-1">
            Manage all candidates sponsored by your party for the General Election
          </p>
        </div>
        <button onClick={() => setShowCreate(true)} className="vc-btn-primary gap-2">
          <UserPlus className="w-4 h-4" />
          Sponsor Candidate
        </button>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Candidates', value: totalCandidates, icon: Users, color: 'text-violet-600' },
          { label: 'IEBC Approved', value: approvedCount, icon: CheckCircle2, color: 'text-emerald-600' },
          { label: 'Via Nominations', value: nominationWinners, icon: Trophy, color: 'text-amber-600' },
          { label: 'Direct Sponsor', value: directSponsored, icon: UserPlus, color: 'text-blue-600' },
        ].map(stat => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="bg-white rounded-lg border border-gray-200 p-3">
              <div className="flex items-center gap-2 mb-1">
                <Icon className={clsx('w-4 h-4', stat.color)} />
                <span className="text-xs text-gray-500">{stat.label}</span>
              </div>
              <p className="text-lg font-bold text-gray-900">{stat.value}</p>
            </div>
          );
        })}
      </div>

      {/* Pipeline + Gender */}
      {totalCandidates > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <IEBCPipeline candidates={candidates ?? []} />
          <GenderComplianceCard candidates={candidates ?? []} />
        </div>
      )}

      {/* Filters */}
      {totalCandidates > 0 && (
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 max-w-xs">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search candidates…"
              className="vc-input pl-9 text-sm"
            />
          </div>
          <select
            value={filterPosition}
            onChange={e => setFilterPosition(e.target.value)}
            className="vc-input text-sm w-auto"
          >
            <option value="">All Positions</option>
            {Object.entries(POSITIONS).map(([code, cfg]) => (
              <option key={code} value={code}>{cfg.label}</option>
            ))}
          </select>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="vc-input text-sm w-auto"
          >
            <option value="">All Statuses</option>
            {Object.entries(CANDIDATE_STATUS).map(([key, cfg]) => (
              <option key={key} value={key}>{cfg.label}</option>
            ))}
          </select>
          {(filterPosition || filterStatus || searchQuery) && (
            <button
              onClick={() => { setFilterPosition(''); setFilterStatus(''); setSearchQuery(''); }}
              className="text-xs text-violet-600 hover:text-violet-700 font-medium"
            >
              Clear filters
            </button>
          )}
        </div>
      )}

      {/* Candidate list */}
      {isLoading ? (
        <div className="text-center py-12 text-gray-400">Loading candidates…</div>
      ) : filtered.length === 0 && totalCandidates === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center shadow-sm">
          <Users className="w-14 h-14 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-700 font-medium">No candidates yet</p>
          <p className="text-sm text-gray-400 mt-1 mb-4">
            Candidates appear here when nominated through party nominations or directly sponsored.
          </p>
          <div className="flex gap-3 justify-center">
            <button onClick={() => setShowCreate(true)} className="vc-btn-primary gap-2">
              <UserPlus className="w-4 h-4" /> Sponsor Candidate Directly
            </button>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <Filter className="w-8 h-8 text-gray-200 mx-auto mb-2" />
          <p className="text-sm text-gray-500">No candidates match your filters</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-700">
              {filtered.length} candidate{filtered.length !== 1 ? 's' : ''}
            </span>
            <span className="text-xs text-gray-400">Click to expand details</span>
          </div>
          {filtered.map(c => (
            <CandidateRow key={c.id} candidate={c} tenantId={tenantId} userId={userId} />
          ))}
        </div>
      )}

      {/* How sponsorship works */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Two Paths to Party Candidature</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-3 bg-violet-50 rounded-lg">
            <p className="text-xs font-semibold text-violet-800 mb-2 flex items-center gap-1.5">
              <Trophy className="w-3.5 h-3.5" /> Path 1: Win Party Nomination
            </p>
            <ol className="text-xs text-violet-700 space-y-1 list-decimal list-inside">
              <li>Party creates nomination election for a position + area</li>
              <li>Members compete (max 6 candidates per slot)</li>
              <li>Winner declared via mobile vote capture</li>
              <li>Winner auto-promoted to General Election</li>
              <li>IEBC approves → appears on ballot</li>
            </ol>
          </div>
          <div className="p-3 bg-blue-50 rounded-lg">
            <p className="text-xs font-semibold text-blue-800 mb-2 flex items-center gap-1.5">
              <UserPlus className="w-3.5 h-3.5" /> Path 2: Direct Party Sponsorship
            </p>
            <ol className="text-xs text-blue-700 space-y-1 list-decimal list-inside">
              <li>Party directly nominates a candidate (NEC approval)</li>
              <li>Registered as PARTY_SPONSORED in General Election</li>
              <li>Party clears candidate internally</li>
              <li>IEBC conducts clearance checks</li>
              <li>Approved → appears on ballot</li>
            </ol>
          </div>
        </div>
      </div>

      {/* Create modal */}
      {showCreate && (
        <CreateCandidateModal
          tenantId={tenantId}
          userId={userId}
          partyId={partyId}
          onClose={() => setShowCreate(false)}
        />
      )}
    </div>
  );
}

export function PartyCandidatesPage() {
  return (
    <PageErrorBoundary page="Party Candidates">
      <PartyCandidatesPageContent />
    </PageErrorBoundary>
  );
}
