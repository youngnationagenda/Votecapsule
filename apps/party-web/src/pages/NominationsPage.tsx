/**
 * Vote Capsule™ — Political Party Nominations Page (v2)
 *
 * ENHANCEMENTS (Aug 2026):
 *   - NEC Geographic Hierarchy: County → Constituency → Ward dropdown
 *   - Position-level nominations: Governor, Senator, Women Rep (County level);
 *     MP (Constituency level); MCA (Ward level). No PRESIDENT in party nominations.
 *   - Maximum 6 candidate slots per position per area
 *   - Multiple nominations per party (many concurrent across different areas/dates)
 *   - Subscription plan limits enforced (super admin can cap nominations)
 *   - Timeline view for nomination schedule across areas
 *   - Deposit/fee tracking per candidate
 *   - Dispute resolution workflow flag
 *   - 2/3 gender rule compliance indicator
 *
 * Flow:
 *   1. Party admin selects position level (County/Constituency/Ward)
 *   2. Geography dropdown filters based on NEC data (47 counties → 290 const → 1,450 wards)
 *   3. Creates nomination with date, fee, position, area — linked to General Election
 *   4. Members register as candidates (max 6 per position per area)
 *   5. Nomination runs lifecycle → winner promoted to General Election (PARTY_SPONSORED)
 */

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Vote, Plus, ChevronRight, Users, Trophy, ArrowRight,
  CheckCircle2, XCircle, Clock, AlertTriangle, Shield,
  Star, Flag, Calendar, MapPin, Filter, BarChart3,
  Lock, TrendingUp, Search, ChevronDown,
} from 'lucide-react';
import { clsx } from 'clsx';
import { useAppSelector } from '../store/hooks';
import { apiClient } from '../api/apiClient';
import { geographyApi, County, Constituency, Ward } from '../api/geographyApi';
import { PageErrorBoundary } from '../components/PageErrorBoundary';

// ── Types ────────────────────────────────────────────────────

interface NominationElection {
  id: string;
  name: string;
  electionYear: number;
  status: string;
  nominationDeadline: string | null;
  nominationVotingDate: string | null;
  parentElectionId: string | null;
  partyId: string | null;
  nominationFeeKes: number;
  description: string | null;
  positionCode: string | null;
  countyCode: string | null;
  constituencyCode: string | null;
  wardCode: string | null;
  maxCandidatesPerPosition: number;
  createdAt: string;
}

interface GeneralElection {
  id: string;
  name: string;
  electionYear: number;
  status: string;
}

interface NominationCandidate {
  id: string;
  fullName: string;
  positionCode: string;
  status: string;
  nominationWon: boolean | null;
  sponsorshipType: string;
  nationalId: string;
  countyCode: string;
  constituencyCode: string;
  wardCode: string;
  gender: string;
}

interface SubscriptionLimits {
  maxNominations: number;
  maxCandidatesPerNomination: number;
  allowedPositions: string[];
  canRunNominations: boolean;
}

// ── Position Configuration ───────────────────────────────────

type GeoLevel = 'COUNTY' | 'CONSTITUENCY' | 'WARD';

interface PositionConfig {
  code: string;
  label: string;
  level: GeoLevel;
  fee: number; // Default nomination fee
  description: string;
}

const POSITIONS: PositionConfig[] = [
  { code: 'GOVERNOR',   label: 'Governor',        level: 'COUNTY',       fee: 500_000, description: 'County Governor' },
  { code: 'SENATOR',    label: 'Senator',         level: 'COUNTY',       fee: 250_000, description: 'County Senator' },
  { code: 'WOMEN_REP',  label: 'Women Rep',       level: 'COUNTY',       fee: 100_000, description: 'County Women Representative' },
  { code: 'MP',         label: 'Member of Parliament', level: 'CONSTITUENCY', fee: 200_000, description: 'Constituency MP' },
  { code: 'MCA',        label: 'MCA',             level: 'WARD',         fee: 50_000,  description: 'Member of County Assembly' },
];

const MAX_CANDIDATES_PER_POSITION = 6;

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  PLANNING:          { label: 'Planning',           color: 'text-gray-600 bg-gray-100',    icon: Clock },
  NOMINATION:        { label: 'Nominations Open',   color: 'text-blue-600 bg-blue-100',    icon: Flag },
  CAMPAIGN:          { label: 'Campaigning',        color: 'text-violet-600 bg-violet-100', icon: Vote },
  ACTIVE:            { label: 'Voting Open',        color: 'text-emerald-600 bg-emerald-100', icon: CheckCircle2 },
  TALLYING:          { label: 'Tallying',           color: 'text-amber-600 bg-amber-100',  icon: Clock },
  RESULTS_PUBLISHED: { label: 'Results Published',  color: 'text-[#0B3C6D] bg-blue-100',  icon: Trophy },
  CLOSED:            { label: 'Closed',             color: 'text-gray-500 bg-gray-100',    icon: CheckCircle2 },
  CANCELLED:         { label: 'Cancelled',          color: 'text-red-600 bg-red-100',      icon: XCircle },
};

const LIFECYCLE_NEXT: Record<string, { label: string; action: string; color: string }> = {
  PLANNING:          { label: 'Open Nominations',  action: 'nominations/open',  color: 'bg-blue-600 hover:bg-blue-700 text-white' },
  NOMINATION:        { label: 'Open Campaigning',  action: 'campaign/open',     color: 'bg-violet-600 hover:bg-violet-700 text-white' },
  CAMPAIGN:          { label: 'Open Voting',       action: 'voting/open',       color: 'bg-emerald-600 hover:bg-emerald-700 text-white' },
  ACTIVE:            { label: 'Close Voting',      action: 'voting/close',      color: 'bg-amber-600 hover:bg-amber-700 text-white' },
  TALLYING:          { label: 'Publish Results',   action: 'results/publish',   color: 'bg-[#0B3C6D] hover:bg-[#0a3460] text-white' },
  RESULTS_PUBLISHED: { label: 'Archive',           action: 'close',             color: 'bg-gray-600 hover:bg-gray-700 text-white' },
};

// ── Subscription Limit Banner ────────────────────────────────

function SubscriptionBanner({ limits, currentCount }: { limits: SubscriptionLimits; currentCount: number }) {
  if (limits.canRunNominations && currentCount < limits.maxNominations) return null;

  const atLimit = currentCount >= limits.maxNominations;
  const cantRun = !limits.canRunNominations;

  return (
    <div className={clsx(
      'rounded-xl p-4 border flex items-start gap-3',
      cantRun ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'
    )}>
      <Lock className={clsx('w-5 h-5 flex-shrink-0 mt-0.5', cantRun ? 'text-red-500' : 'text-amber-500')} />
      <div>
        <p className={clsx('text-sm font-semibold', cantRun ? 'text-red-800' : 'text-amber-800')}>
          {cantRun ? 'Nominations Not Available on Your Plan' : 'Nomination Limit Reached'}
        </p>
        <p className={clsx('text-xs mt-1', cantRun ? 'text-red-700' : 'text-amber-700')}>
          {cantRun
            ? 'Your subscription plan does not include nomination elections. Upgrade to Pro or Enterprise to access this feature.'
            : `Your plan allows up to ${limits.maxNominations} nomination elections. You've created ${currentCount}. Upgrade your plan to create more.`}
        </p>
        <button className="mt-2 text-xs font-semibold text-violet-600 hover:text-violet-700 flex items-center gap-1">
          <TrendingUp className="w-3 h-3" /> View Plans & Upgrade
        </button>
      </div>
    </div>
  );
}

// ── Geographic Cascade Dropdown Component ────────────────────

function GeographyCascade({
  selectedLevel,
  countyCode,
  constituencyCode,
  wardCode,
  onCountyChange,
  onConstituencyChange,
  onWardChange,
}: {
  selectedLevel: GeoLevel;
  countyCode: string;
  constituencyCode: string;
  wardCode: string;
  onCountyChange: (code: string) => void;
  onConstituencyChange: (code: string) => void;
  onWardChange: (code: string) => void;
}) {
  // NEC Counties (47)
  const { data: counties, isLoading: countiesLoading } = useQuery<County[]>({
    queryKey: ['nec-counties'],
    queryFn: () => geographyApi.getCounties(),
    staleTime: 10 * 60_000,
  });

  // NEC Constituencies (filtered by selected county)
  const { data: constituencies, isLoading: constLoading } = useQuery<Constituency[]>({
    queryKey: ['nec-constituencies', countyCode],
    queryFn: () => geographyApi.getConstituencies(countyCode),
    enabled: !!countyCode && (selectedLevel === 'CONSTITUENCY' || selectedLevel === 'WARD'),
    staleTime: 10 * 60_000,
  });

  // NEC Wards (filtered by selected constituency)
  const { data: wards, isLoading: wardsLoading } = useQuery<Ward[]>({
    queryKey: ['nec-wards', constituencyCode],
    queryFn: () => geographyApi.getWards(constituencyCode),
    enabled: !!constituencyCode && selectedLevel === 'WARD',
    staleTime: 10 * 60_000,
  });

  const showConstituency = selectedLevel === 'CONSTITUENCY' || selectedLevel === 'WARD';
  const showWard = selectedLevel === 'WARD';

  return (
    <div className="space-y-3">
      {/* County — always shown */}
      <div>
        <label className="vc-label flex items-center gap-1.5">
          <MapPin className="w-3 h-3 text-violet-500" />
          County
          <span className="text-red-500">*</span>
          <span className="ml-auto text-xs text-gray-400 font-normal">NEC Database</span>
        </label>
        <select
          className="vc-input"
          value={countyCode}
          onChange={e => { onCountyChange(e.target.value); onConstituencyChange(''); onWardChange(''); }}
          disabled={countiesLoading}
        >
          <option value="">{countiesLoading ? 'Loading 47 counties…' : 'Select County'}</option>
          {(counties ?? []).map(c => (
            <option key={c.iebcCode} value={c.iebcCode}>
              {c.iebcCode} — {c.name} ({c.registeredVoters.toLocaleString()} voters)
            </option>
          ))}
        </select>
      </div>

      {/* Constituency — for MP and MCA positions */}
      {showConstituency && (
        <div>
          <label className="vc-label flex items-center gap-1.5">
            <MapPin className="w-3 h-3 text-blue-500" />
            Constituency
            <span className="text-red-500">*</span>
          </label>
          <select
            className="vc-input"
            value={constituencyCode}
            onChange={e => { onConstituencyChange(e.target.value); onWardChange(''); }}
            disabled={constLoading || !countyCode}
          >
            <option value="">
              {!countyCode ? 'Select county first' : constLoading ? 'Loading constituencies…' : 'Select Constituency'}
            </option>
            {(constituencies ?? []).map(c => (
              <option key={c.iebcCode} value={c.iebcCode}>
                {c.iebcCode} — {c.name} ({c.registeredVoters.toLocaleString()} voters)
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Ward — for MCA position */}
      {showWard && (
        <div>
          <label className="vc-label flex items-center gap-1.5">
            <MapPin className="w-3 h-3 text-emerald-500" />
            Ward
            <span className="text-red-500">*</span>
          </label>
          <select
            className="vc-input"
            value={wardCode}
            onChange={e => onWardChange(e.target.value)}
            disabled={wardsLoading || !constituencyCode}
          >
            <option value="">
              {!constituencyCode ? 'Select constituency first' : wardsLoading ? 'Loading wards…' : 'Select Ward'}
            </option>
            {(wards ?? []).map(w => (
              <option key={w.iebcCode} value={w.iebcCode}>
                {w.iebcCode} — {w.name} ({w.registeredVoters.toLocaleString()} voters)
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}

// ── Create Nomination Modal (v2) ─────────────────────────────

function CreateNominationModal({
  generalElections,
  partyId,
  tenantId,
  userId,
  limits,
  onClose,
}: {
  generalElections: GeneralElection[];
  partyId: string;
  tenantId: string;
  userId: string;
  limits: SubscriptionLimits;
  onClose: () => void;
}) {
  const qc = useQueryClient();

  const [form, setForm] = useState({
    parentElectionId: generalElections[0]?.id ?? '',
    positionCode: '' as string,
    electionYear: 2027,
    nominationDeadline: '',
    nominationVotingDate: '',
    nominationFeeKes: 0,
    maxCandidatesPerPosition: MAX_CANDIDATES_PER_POSITION,
    description: '',
    countyCode: '',
    constituencyCode: '',
    wardCode: '',
  });

  const selectedPosition = POSITIONS.find(p => p.code === form.positionCode);
  const geoLevel: GeoLevel = selectedPosition?.level ?? 'COUNTY';

  // Auto-set default fee when position changes
  const handlePositionChange = (code: string) => {
    const pos = POSITIONS.find(p => p.code === code);
    setForm(f => ({
      ...f,
      positionCode: code,
      nominationFeeKes: pos?.fee ?? 0,
      countyCode: '',
      constituencyCode: '',
      wardCode: '',
    }));
  };

  // NEC Counties for name generation
  const { data: counties } = useQuery<County[]>({
    queryKey: ['nec-counties'],
    queryFn: () => geographyApi.getCounties(),
    staleTime: 10 * 60_000,
  });

  const { data: constituencies } = useQuery<Constituency[]>({
    queryKey: ['nec-constituencies', form.countyCode],
    queryFn: () => geographyApi.getConstituencies(form.countyCode),
    enabled: !!form.countyCode && (geoLevel === 'CONSTITUENCY' || geoLevel === 'WARD'),
    staleTime: 10 * 60_000,
  });

  const { data: wards } = useQuery<Ward[]>({
    queryKey: ['nec-wards', form.constituencyCode],
    queryFn: () => geographyApi.getWards(form.constituencyCode),
    enabled: !!form.constituencyCode && geoLevel === 'WARD',
    staleTime: 10 * 60_000,
  });

  // Auto-generate name based on selections
  const autoName = useMemo(() => {
    if (!form.positionCode) return '';
    const posLabel = selectedPosition?.label ?? '';
    let areaName = '';
    if (geoLevel === 'COUNTY' && form.countyCode && counties) {
      areaName = counties.find(c => c.iebcCode === form.countyCode)?.name ?? '';
    } else if (geoLevel === 'CONSTITUENCY' && form.constituencyCode && constituencies) {
      areaName = constituencies.find(c => c.iebcCode === form.constituencyCode)?.name ?? '';
    } else if (geoLevel === 'WARD' && form.wardCode && wards) {
      areaName = wards.find(w => w.iebcCode === form.wardCode)?.name ?? '';
    }
    if (!areaName) return '';
    const dateStr = form.nominationVotingDate
      ? new Date(form.nominationVotingDate).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })
      : '';
    return `${posLabel} Nomination — ${areaName}${dateStr ? ` (${dateStr})` : ''}`;
  }, [form.positionCode, form.countyCode, form.constituencyCode, form.wardCode, form.nominationVotingDate, counties, constituencies, wards, geoLevel, selectedPosition]);

  // Validate geographic selection is complete
  const geoValid = (() => {
    if (!form.positionCode) return false;
    if (geoLevel === 'COUNTY') return !!form.countyCode;
    if (geoLevel === 'CONSTITUENCY') return !!form.countyCode && !!form.constituencyCode;
    if (geoLevel === 'WARD') return !!form.countyCode && !!form.constituencyCode && !!form.wardCode;
    return false;
  })();

  // Check if position is allowed by subscription
  const positionAllowed = !form.positionCode || limits.allowedPositions.length === 0 || limits.allowedPositions.includes(form.positionCode);

  const mutation = useMutation({
    mutationFn: () =>
      apiClient.post('/candidate/nominations', {
        parentElectionId: form.parentElectionId,
        name: autoName || `${selectedPosition?.label ?? ''} Nomination`,
        electionYear: form.electionYear,
        nominationDeadline: form.nominationDeadline || null,
        nominationVotingDate: form.nominationVotingDate || null,
        nominationFeeKes: Number(form.nominationFeeKes),
        maxCandidatesPerPosition: Math.min(Number(form.maxCandidatesPerPosition), MAX_CANDIDATES_PER_POSITION),
        description: form.description || null,
        positionCode: form.positionCode,
        countyCode: form.countyCode || null,
        constituencyCode: form.constituencyCode || null,
        wardCode: form.wardCode || null,
        partyId,
      }, {
        headers: { 'x-tenant-id': tenantId, 'x-user-id': userId },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['party-nominations'] });
      onClose();
    },
  });

  const canSubmit = form.positionCode && geoValid && positionAllowed && !mutation.isPending;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center">
            <Vote className="w-4 h-4 text-violet-600" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900">Create Nomination</h2>
            <p className="text-xs text-gray-500 mt-0.5">Position + Area from NEC Database</p>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* Step 1: Link to General Election */}
          <div>
            <label className="vc-label">Link to General Election</label>
            <select
              className="vc-input"
              value={form.parentElectionId}
              onChange={e => setForm({ ...form, parentElectionId: e.target.value })}
            >
              {generalElections.map(el => (
                <option key={el.id} value={el.id}>{el.name} ({el.electionYear})</option>
              ))}
            </select>
          </div>

          {/* Step 2: Select Position (No President) */}
          <div>
            <label className="vc-label">
              Position to Nominate
              <span className="text-red-500 ml-0.5">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {POSITIONS.map(pos => {
                const allowed = limits.allowedPositions.length === 0 || limits.allowedPositions.includes(pos.code);
                return (
                  <button
                    key={pos.code}
                    type="button"
                    onClick={() => allowed && handlePositionChange(pos.code)}
                    disabled={!allowed}
                    className={clsx(
                      'relative p-3 rounded-lg border text-left transition-all text-xs',
                      form.positionCode === pos.code
                        ? 'border-violet-500 bg-violet-50 ring-1 ring-violet-300'
                        : allowed
                          ? 'border-gray-200 hover:border-violet-300 hover:bg-violet-50/50'
                          : 'border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed'
                    )}
                  >
                    <p className="font-semibold text-gray-900">{pos.label}</p>
                    <p className="text-gray-500 mt-0.5">{pos.level === 'COUNTY' ? 'County level' : pos.level === 'CONSTITUENCY' ? 'Constituency' : 'Ward level'}</p>
                    {!allowed && (
                      <Lock className="w-3 h-3 text-gray-400 absolute top-2 right-2" />
                    )}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-gray-400 mt-2">
              President has no party nominations — nominations start from County level downward.
            </p>
          </div>

          {/* Step 3: Geographic Area from NEC */}
          {form.positionCode && (
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <MapPin className="w-3 h-3" />
                Geographic Area (NEC Database)
              </p>
              <GeographyCascade
                selectedLevel={geoLevel}
                countyCode={form.countyCode}
                constituencyCode={form.constituencyCode}
                wardCode={form.wardCode}
                onCountyChange={(v) => setForm(f => ({ ...f, countyCode: v }))}
                onConstituencyChange={(v) => setForm(f => ({ ...f, constituencyCode: v }))}
                onWardChange={(v) => setForm(f => ({ ...f, wardCode: v }))}
              />
            </div>
          )}

          {/* Auto-generated Name */}
          {autoName && (
            <div className="p-3 bg-violet-50 border border-violet-200 rounded-lg">
              <p className="text-xs text-violet-600 font-medium">Nomination Name (auto-generated)</p>
              <p className="text-sm font-semibold text-violet-900 mt-0.5">{autoName}</p>
            </div>
          )}

          {/* Step 4: Dates & Fee */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="vc-label">Nominations Deadline</label>
              <input type="date" className="vc-input" value={form.nominationDeadline}
                onChange={e => setForm({ ...form, nominationDeadline: e.target.value })} />
            </div>
            <div>
              <label className="vc-label">Voting Day</label>
              <input type="date" className="vc-input" value={form.nominationVotingDate}
                onChange={e => setForm({ ...form, nominationVotingDate: e.target.value })} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="vc-label">Nomination Fee (KES)</label>
              <input type="number" className="vc-input" min="0"
                value={form.nominationFeeKes}
                onChange={e => setForm({ ...form, nominationFeeKes: Number(e.target.value) })} />
              <p className="text-xs text-gray-400 mt-0.5">
                {selectedPosition ? `Default: KES ${selectedPosition.fee.toLocaleString()}` : ''}
              </p>
            </div>
            <div>
              <label className="vc-label">Max Candidates</label>
              <input type="number" className="vc-input" min="2" max="6"
                value={form.maxCandidatesPerPosition}
                onChange={e => setForm({ ...form, maxCandidatesPerPosition: Math.min(6, Number(e.target.value)) })} />
              <p className="text-xs text-gray-400 mt-0.5">Maximum 6 per position</p>
            </div>
          </div>

          <div>
            <label className="vc-label">Description (optional)</label>
            <textarea
              className="vc-input h-16 resize-none"
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              placeholder="Additional details about this nomination..."
            />
          </div>

          {!positionAllowed && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700 flex items-center gap-2">
              <Lock className="w-4 h-4 flex-shrink-0" />
              This position is not available on your current subscription plan.
            </div>
          )}

          {mutation.isError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
              Failed to create nomination. Please check all fields and try again.
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="p-6 border-t border-gray-100 flex gap-3">
          <button
            onClick={() => mutation.mutate()}
            disabled={!canSubmit}
            className="vc-btn-primary flex-1"
          >
            {mutation.isPending ? 'Creating…' : 'Create Nomination'}
          </button>
          <button onClick={onClose} className="vc-btn-secondary">Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ── Nomination Election Card (v2) ────────────────────────────

function NominationCard({
  election,
  tenantId,
  userId,
}: {
  election: NominationElection;
  tenantId: string;
  userId: string;
}) {
  const qc = useQueryClient();
  const [showCandidates, setShowCandidates] = useState(false);

  const statusCfg = STATUS_CONFIG[election.status] ?? STATUS_CONFIG.PLANNING;
  const StatusIcon = statusCfg.icon;
  const nextAction = LIFECYCLE_NEXT[election.status];
  const posConfig = POSITIONS.find(p => p.code === election.positionCode);

  // Candidates for this nomination
  const { data: candidates } = useQuery<NominationCandidate[]>({
    queryKey: ['nom-candidates', election.id],
    queryFn: () => apiClient.get(`/candidate/candidates?electionId=${election.id}`)
      .then(r => r.data?.data ?? r.data ?? []),
    enabled: showCandidates,
    staleTime: 30_000,
  });

  const lifecycleMutation = useMutation({
    mutationFn: (action: string) =>
      apiClient.post(`/candidate/elections/${election.id}/${action}`, {}, {
        headers: { 'x-tenant-id': tenantId, 'x-user-id': userId },
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['party-nominations'] }),
  });

  const declareWinnerMutation = useMutation({
    mutationFn: (candidateId: string) =>
      apiClient.post(`/candidate/nominations/${election.id}/declare-winner`,
        { candidateId },
        { headers: { 'x-user-id': userId } }
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['nom-candidates', election.id] });
      qc.invalidateQueries({ queryKey: ['party-nominations'] });
    },
  });

  const promoteMutation = useMutation({
    mutationFn: (candidateId: string) =>
      apiClient.post(`/candidate/nominations/promote/${candidateId}`, {}, {
        headers: { 'x-user-id': userId },
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['nom-candidates', election.id] }),
  });

  const winners = (candidates ?? []).filter(c => c.nominationWon === true);
  const promoted = (candidates ?? []).filter(c => c.sponsorshipType === 'PARTY_SPONSORED' && c.nominationWon === true);
  const candidateCount = (candidates ?? []).length;
  const slotsRemaining = election.maxCandidatesPerPosition - candidateCount;

  // Gender compliance check (2/3 rule)
  const genderStats = useMemo(() => {
    if (!candidates || candidates.length === 0) return null;
    const male = candidates.filter(c => c.gender === 'MALE').length;
    const female = candidates.filter(c => c.gender === 'FEMALE').length;
    const total = candidates.length;
    const compliant = total >= 3 ? (Math.min(male, female) / total) >= 0.33 : true;
    return { male, female, total, compliant };
  }, [candidates]);

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-gray-900">{election.name}</h3>
              <span className={clsx('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold', statusCfg.color)}>
                <StatusIcon className="w-3 h-3" />
                {statusCfg.label}
              </span>
              {posConfig && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-violet-100 text-violet-700">
                  {posConfig.label}
                </span>
              )}
            </div>

            {/* Geographic area + dates */}
            <div className="flex items-center gap-4 mt-1.5 text-xs text-gray-500 flex-wrap">
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {election.electionYear}
              </span>
              {election.countyCode && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-violet-500" />
                  County: {election.countyCode}
                </span>
              )}
              {election.constituencyCode && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-blue-500" />
                  Const: {election.constituencyCode}
                </span>
              )}
              {election.wardCode && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-emerald-500" />
                  Ward: {election.wardCode}
                </span>
              )}
              {election.nominationDeadline && (
                <span>Deadline: {new Date(election.nominationDeadline).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' })}</span>
              )}
              {election.nominationVotingDate && (
                <span>Voting: {new Date(election.nominationVotingDate).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' })}</span>
              )}
              {election.nominationFeeKes > 0 && (
                <span>Fee: KES {election.nominationFeeKes.toLocaleString()}</span>
              )}
            </div>

            {/* Slots indicator */}
            <div className="mt-2 flex items-center gap-3">
              <div className="flex items-center gap-1">
                {Array.from({ length: election.maxCandidatesPerPosition }).map((_, i) => (
                  <div
                    key={i}
                    className={clsx(
                      'w-5 h-5 rounded-full border-2 flex items-center justify-center text-xs font-bold',
                      i < candidateCount
                        ? 'border-violet-500 bg-violet-500 text-white'
                        : 'border-gray-200 bg-white text-gray-300'
                    )}
                  >
                    {i < candidateCount ? i + 1 : ''}
                  </div>
                ))}
              </div>
              <span className="text-xs text-gray-400">
                {candidateCount}/{election.maxCandidatesPerPosition} slots filled
                {slotsRemaining > 0 && slotsRemaining <= 2 && (
                  <span className="text-amber-500 ml-1">({slotsRemaining} remaining)</span>
                )}
                {slotsRemaining === 0 && (
                  <span className="text-red-500 ml-1 font-semibold">FULL</span>
                )}
              </span>
            </div>
          </div>

          {/* Lifecycle action button */}
          {nextAction && !['CLOSED', 'CANCELLED'].includes(election.status) && (
            <button
              onClick={() => {
                if (!window.confirm(`Advance to: "${nextAction.label}"?`)) return;
                lifecycleMutation.mutate(nextAction.action);
              }}
              disabled={lifecycleMutation.isPending}
              className={clsx('px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap', nextAction.color)}
            >
              {nextAction.label} →
            </button>
          )}
        </div>

        {/* Promotion notice */}
        {election.parentElectionId && (
          <div className="mt-3 p-2 bg-blue-50 rounded-lg text-xs text-blue-700 flex items-center gap-2">
            <ArrowRight className="w-3 h-3 flex-shrink-0" />
            Winners promoted to General Election as party-sponsored candidates
            {winners.length > 0 && ` · ${winners.length} winner${winners.length > 1 ? 's' : ''}`}
            {promoted.length > 0 && ` · ${promoted.length} promoted ✅`}
          </div>
        )}
      </div>

      {/* Candidates toggle */}
      <div className="border-t border-gray-100 px-5 py-3 flex items-center justify-between">
        <button
          onClick={() => setShowCandidates(!showCandidates)}
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
        >
          <Users className="w-4 h-4" />
          {showCandidates ? 'Hide Candidates' : 'Show Candidates'}
          <ChevronRight className={clsx('w-4 h-4 transition-transform', showCandidates && 'rotate-90')} />
        </button>

        {/* Gender compliance badge */}
        {genderStats && (
          <span className={clsx(
            'text-xs px-2 py-0.5 rounded-full font-medium',
            genderStats.compliant ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
          )}>
            {genderStats.compliant ? '✓' : '✗'} Gender: {genderStats.male}M/{genderStats.female}F
          </span>
        )}
      </div>

      {/* Candidates table */}
      {showCandidates && (
        <div className="border-t border-gray-100">
          {!candidates ? (
            <div className="p-5 text-center text-gray-400 text-sm">Loading candidates…</div>
          ) : candidates.length === 0 ? (
            <div className="p-5 text-center">
              <Users className="w-8 h-8 text-gray-200 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No candidates registered yet</p>
              <p className="text-xs text-gray-400 mt-1">
                Max {election.maxCandidatesPerPosition} candidates can register once nominations are open.
              </p>
            </div>
          ) : (
            <table className="vc-table text-sm">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Candidate</th>
                  <th>Position</th>
                  <th>Gender</th>
                  <th>Status</th>
                  <th>Nomination</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {candidates.map((c, idx) => (
                  <tr key={c.id}>
                    <td className="text-gray-400 font-mono text-xs">{idx + 1}</td>
                    <td className="font-medium">{c.fullName}</td>
                    <td>{c.positionCode?.replace(/_/g, ' ')}</td>
                    <td>
                      <span className={clsx('text-xs',
                        c.gender === 'FEMALE' ? 'text-pink-600' : 'text-blue-600'
                      )}>
                        {c.gender === 'FEMALE' ? '♀' : '♂'} {c.gender}
                      </span>
                    </td>
                    <td>
                      <span className={clsx('vc-badge text-xs',
                        c.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' :
                        c.status === 'PENDING_NOMINATION' ? 'bg-amber-100 text-amber-700' :
                        c.status === 'NOMINATED' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-600'
                      )}>
                        {c.status}
                      </span>
                    </td>
                    <td>
                      {c.nominationWon === true ? (
                        <span className="flex items-center gap-1 text-xs text-emerald-700 font-semibold">
                          <Trophy className="w-3 h-3" /> Winner
                        </span>
                      ) : c.nominationWon === false ? (
                        <span className="text-xs text-gray-400">Not selected</span>
                      ) : (
                        <span className="text-xs text-gray-300">Pending</span>
                      )}
                    </td>
                    <td>
                      <div className="flex gap-1.5">
                        {election.status === 'RESULTS_PUBLISHED' && c.nominationWon === null && (
                          <button
                            onClick={() => {
                              if (!window.confirm(`Declare ${c.fullName} as nomination winner?`)) return;
                              declareWinnerMutation.mutate(c.id);
                            }}
                            disabled={declareWinnerMutation.isPending}
                            className="px-2 py-1 rounded text-xs bg-amber-100 text-amber-700 hover:bg-amber-200 font-medium"
                          >
                            <Star className="w-3 h-3 inline mr-0.5" /> Declare
                          </button>
                        )}
                        {c.nominationWon === true && c.sponsorshipType !== 'PARTY_SPONSORED' && (
                          <button
                            onClick={() => {
                              if (!window.confirm(`Promote ${c.fullName} to General Election?`)) return;
                              promoteMutation.mutate(c.id);
                            }}
                            disabled={promoteMutation.isPending}
                            className="px-2 py-1 rounded text-xs bg-[#0B3C6D] text-white hover:bg-[#0a3460] font-medium"
                          >
                            <ArrowRight className="w-3 h-3 inline mr-0.5" /> Promote
                          </button>
                        )}
                        {c.nominationWon === true && c.sponsorshipType === 'PARTY_SPONSORED' && (
                          <span className="text-xs text-emerald-600 flex items-center gap-0.5">
                            <CheckCircle2 className="w-3 h-3" /> Promoted ✓
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

// ── Stats Summary Cards ──────────────────────────────────────

function NominationStats({ nominations }: { nominations: NominationElection[] }) {
  const active = nominations.filter(n => !['CLOSED', 'CANCELLED'].includes(n.status)).length;
  const positionsUsed = new Set(nominations.map(n => n.positionCode).filter(Boolean)).size;
  const countiesUsed = new Set(nominations.map(n => n.countyCode).filter(Boolean)).size;
  const totalFees = nominations.reduce((sum, n) => sum + (n.nominationFeeKes || 0), 0);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {[
        { label: 'Active Nominations', value: active, icon: Vote, color: 'text-violet-600' },
        { label: 'Positions', value: `${positionsUsed}/5`, icon: Flag, color: 'text-blue-600' },
        { label: 'Counties Covered', value: countiesUsed, icon: MapPin, color: 'text-emerald-600' },
        { label: 'Total Fees Collected', value: `KES ${(totalFees / 1000).toFixed(0)}K`, icon: BarChart3, color: 'text-amber-600' },
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
  );
}

// ── Main Page ─────────────────────────────────────────────────

function NominationsPageContent(): React.JSX.Element {
  const user = useAppSelector((s: any) => s.auth.user);
  const tenantId = user?.tenantId ?? '';
  const userId   = user?.id ?? '';
  const partyId  = user?.partyId ?? tenantId;

  const [showCreate, setShowCreate] = useState(false);
  const [filterPosition, setFilterPosition] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Subscription limits from tenant settings
  const { data: limits } = useQuery<SubscriptionLimits>({
    queryKey: ['nomination-limits', tenantId],
    queryFn: () =>
      apiClient.get(`/tenant/tenants/${tenantId}/nomination-limits`)
        .then(r => r.data?.data ?? r.data ?? {
          maxNominations: 50,
          maxCandidatesPerNomination: 6,
          allowedPositions: [],
          canRunNominations: true,
        }),
    enabled: !!tenantId,
    staleTime: 5 * 60_000,
  });

  const effectiveLimits: SubscriptionLimits = limits ?? {
    maxNominations: 50,
    maxCandidatesPerNomination: 6,
    allowedPositions: [],
    canRunNominations: true,
  };

  // Load party's nomination elections
  const { data: nominations, isLoading: nomLoading } = useQuery<NominationElection[]>({
    queryKey: ['party-nominations', tenantId],
    queryFn: () =>
      apiClient.get('/candidate/nominations', { headers: { 'x-tenant-id': tenantId } })
        .then(r => r.data?.data ?? r.data ?? []),
    enabled: !!tenantId,
    staleTime: 30_000,
  });

  // Load available general elections to link to
  const { data: generalElections } = useQuery<GeneralElection[]>({
    queryKey: ['general-elections-list'],
    queryFn: () =>
      apiClient.get('/election/elections')
        .then(r => (r.data?.data ?? r.data ?? []).filter((e: any) => e.electionType === 'GENERAL' || !e.electionType)),
    staleTime: 5 * 60_000,
  });

  // Filter nominations
  const filteredNominations = useMemo(() => {
    let result = nominations ?? [];
    if (filterPosition) result = result.filter(n => n.positionCode === filterPosition);
    if (filterStatus) result = result.filter(n => n.status === filterStatus);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(n => n.name.toLowerCase().includes(q) || n.countyCode?.toLowerCase().includes(q));
    }
    return result;
  }, [nominations, filterPosition, filterStatus, searchQuery]);

  const activeNominations  = filteredNominations.filter(n => !['CLOSED','CANCELLED'].includes(n.status));
  const closedNominations  = filteredNominations.filter(n => ['CLOSED','CANCELLED'].includes(n.status));

  const canCreate = effectiveLimits.canRunNominations && (nominations ?? []).length < effectiveLimits.maxNominations;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Party Nominations</h2>
          <p className="text-sm text-gray-500 mt-1">
            Manage nominations from County level — Governor, Senator, Women Rep, MP, MCA
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          disabled={!canCreate}
          className={clsx('vc-btn-primary gap-2', !canCreate && 'opacity-50 cursor-not-allowed')}
        >
          <Plus className="w-4 h-4" />
          New Nomination
        </button>
      </div>

      {/* Subscription limit warning */}
      <SubscriptionBanner limits={effectiveLimits} currentCount={(nominations ?? []).length} />

      {/* Stats */}
      {(nominations ?? []).length > 0 && <NominationStats nominations={nominations ?? []} />}

      {/* Filters bar */}
      {(nominations ?? []).length > 0 && (
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 max-w-xs">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search nominations…"
              className="vc-input pl-9 text-sm"
            />
          </div>
          <select
            value={filterPosition}
            onChange={e => setFilterPosition(e.target.value)}
            className="vc-input text-sm w-auto"
          >
            <option value="">All Positions</option>
            {POSITIONS.map(p => (
              <option key={p.code} value={p.code}>{p.label}</option>
            ))}
          </select>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="vc-input text-sm w-auto"
          >
            <option value="">All Statuses</option>
            {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
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

      {/* Value proposition banner */}
      <div className="bg-gradient-to-r from-violet-50 to-blue-50 border border-violet-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-violet-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-violet-900">
              Enterprise-grade nomination integrity — powered by VoteCapsule™
            </p>
            <p className="text-xs text-violet-700 mt-1">
              Every nomination vote is captured on the mobile app with SHA-256 hashing, GPS tagging,
              and photo of the tally form. Results anchored to Hedera Consensus + RFC 3161.
              Max 6 candidates per position — run fair, transparent primaries.
            </p>
            <div className="flex items-center gap-4 mt-2 text-xs text-violet-600 flex-wrap">
              <span>✓ NEC geographic data (47 counties)</span>
              <span>✓ Max 6 slots per position</span>
              <span>✓ 2/3 gender compliance</span>
              <span>✓ Hedera + RFC 3161 anchoring</span>
              <span>✓ One-click promotion to GE</span>
            </div>
          </div>
        </div>
      </div>

      {/* Nomination cards */}
      {nomLoading ? (
        <div className="text-center py-12 text-gray-400">Loading nominations…</div>
      ) : filteredNominations.length === 0 && !(nominations ?? []).length ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center shadow-sm">
          <Vote className="w-14 h-14 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-700 font-medium">No nominations yet</p>
          <p className="text-sm text-gray-400 mt-1 mb-4">
            Create your first nomination to start your party primaries. Begin from county level — select position, area, and date.
          </p>
          <button
            onClick={() => setShowCreate(true)}
            disabled={!canCreate}
            className="vc-btn-primary gap-2 mx-auto"
          >
            <Plus className="w-4 h-4" /> Create First Nomination
          </button>
        </div>
      ) : filteredNominations.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center shadow-sm">
          <Filter className="w-8 h-8 text-gray-200 mx-auto mb-2" />
          <p className="text-sm text-gray-500">No nominations match your filters</p>
        </div>
      ) : (
        <>
          {activeNominations.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wider flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                Active Nominations ({activeNominations.length})
              </h3>
              {activeNominations.map(n => (
                <NominationCard key={n.id} election={n} tenantId={tenantId} userId={userId} />
              ))}
            </div>
          )}

          {closedNominations.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wider flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-gray-400" />
                Past Nominations ({closedNominations.length})
              </h3>
              {closedNominations.map(n => (
                <NominationCard key={n.id} election={n} tenantId={tenantId} userId={userId} />
              ))}
            </div>
          )}
        </>
      )}

      {/* How it works (updated) */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">How Position-Based Nominations Work</h3>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 text-center">
          {[
            { step: '1', icon: MapPin, label: 'Select Position & Area', desc: 'Governor, Senator, MP, MCA from NEC database' },
            { step: '2', icon: Plus, label: 'Create Nomination', desc: 'Set date, fee, max 6 candidate slots' },
            { step: '3', icon: Users, label: 'Members Register', desc: 'Up to 6 candidates apply per position' },
            { step: '4', icon: Vote, label: 'Voting Day', desc: 'Mobile captures Form A at each station' },
            { step: '5', icon: Trophy, label: 'Declare Winner', desc: 'Verified via Form A/B reconciliation' },
            { step: '6', icon: ArrowRight, label: 'Promote to GE', desc: 'PARTY_SPONSORED candidate in General Election' },
          ].map(item => {
            const Icon = item.icon;
            return (
              <div key={item.step} className="flex flex-col items-center gap-1.5">
                <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center">
                  <Icon className="w-4 h-4 text-violet-600" />
                </div>
                <p className="text-xs font-medium text-gray-700">{item.label}</p>
                <p className="text-xs text-gray-400">{item.desc}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Create modal */}
      {showCreate && generalElections && generalElections.length > 0 && (
        <CreateNominationModal
          generalElections={generalElections}
          partyId={partyId}
          tenantId={tenantId}
          userId={userId}
          limits={effectiveLimits}
          onClose={() => setShowCreate(false)}
        />
      )}
      {showCreate && (!generalElections || generalElections.length === 0) && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full text-center">
            <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
            <p className="font-semibold text-gray-900">No General Elections Found</p>
            <p className="text-sm text-gray-500 mt-2">
              A General Election must be created first before you can link a party nomination to it.
              Contact the Election Authority (IEBC) to create the Kenya 2027 General Election.
            </p>
            <button onClick={() => setShowCreate(false)} className="vc-btn-secondary mt-4 w-full">
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function NominationsPage() {
  return (
    <PageErrorBoundary page="Nominations">
      <NominationsPageContent />
    </PageErrorBoundary>
  );
}
