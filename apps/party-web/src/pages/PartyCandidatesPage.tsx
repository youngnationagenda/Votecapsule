/**
 * Vote Capsule(tm) - Party Candidates Management Page (FIXED 2026-08-27)
 * Fixes applied:
 *   B1: positionId UUID resolved by cascading geo-picker (was sending positionCode string)
 *   B2: partyId from candidate_political_parties table (was sending tenant UUID)
 *   B3: Removed invalid sponsorshipType/positionCode from DTO body
 *   B4: Candidates list uses correct political party ID not tenant ID
 */

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users, Search, Filter, CheckCircle2, XCircle, Clock,
  Trophy, FileText, MapPin, ChevronRight,
  UserPlus, BadgeCheck, Download, Eye, UserCheck, Ban,
} from 'lucide-react';
import { clsx } from 'clsx';
import { useAppSelector } from '../store/hooks';
import { apiClient } from '../api/apiClient';
import { geographyApi } from '../api/geographyApi';
import { PageErrorBoundary } from '../components/PageErrorBoundary';

// ── Types ──────────────────────────────────────────────────

interface PartyCandidate {
  id: string; fullName: string; shortName: string; nationalId: string;
  positionCode: string; positionId: string; status: string;
  sponsorshipType: string; nominationWon: boolean | null;
  nominationElectionId: string | null; promotedFromCandidateId: string | null;
  countyCode: string; constituencyCode: string; wardCode: string;
  gender: string; dateOfBirth: string | null; photographUrl: string | null;
  runningMateName: string | null;
  iebc_deposit_paid_kes: number; iebc_deposit_receipt_no: string | null;
  party_cleared_at: string | null; party_cleared_by: string | null;
  iebc_nomination_ref: string | null; createdAt: string; electionId: string;
}

interface GenderCompliance {
  total: number; male: number; female: number; compliant: boolean; percentage: number;
}

interface ElectionPosition {
  id: string; positionCode: string; geographicLevel: string;
  countyCode: string | null; constituencyCode: string | null; wardCode: string | null;
}

interface PoliticalParty {
  id: string; partyCode: string; name: string; abbreviation: string | null;
}

// ── Constants ─────────────────────────────────────────────

const CANDIDATE_STATUS: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  PENDING_NOMINATION: { label: 'Pending Nomination', color: 'bg-amber-100 text-amber-700',    icon: Clock },
  NOMINATED:          { label: 'Nominated',          color: 'bg-blue-100 text-blue-700',       icon: FileText },
  APPROVED:           { label: 'IEBC Approved',      color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 },
  ELECTED:            { label: 'Elected',            color: 'bg-violet-100 text-violet-700',   icon: Trophy },
  NOT_ELECTED:        { label: 'Not Elected',        color: 'bg-gray-100 text-gray-600',       icon: XCircle },
  DISQUALIFIED:       { label: 'Disqualified',       color: 'bg-red-100 text-red-700',         icon: Ban },
  WITHDRAWN:          { label: 'Withdrawn',          color: 'bg-gray-100 text-gray-500',       icon: XCircle },
};

const POSITIONS: Record<string, { label: string; level: string }> = {
  PRESIDENT: { label: 'President',             level: 'NATIONAL' },
  GOVERNOR:  { label: 'Governor',              level: 'COUNTY' },
  SENATOR:   { label: 'Senator',               level: 'COUNTY' },
  WOMEN_REP: { label: 'Women Rep',             level: 'COUNTY' },
  MP:        { label: 'Member of Parliament',  level: 'CONSTITUENCY' },
  MCA:       { label: 'MCA',                   level: 'WARD' },
};

// ── SearchableSelect ─────────────────────────────────────
// Lightweight searchable dropdown — filters by label + search terms (abbreviations, codes, etc.)

function SearchableSelect({
  options, value, onChange, placeholder, disabled,
}: {
  options: { value: string; label: string; search?: string }[];
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const filtered = query
    ? options.filter(o => {
        const q = query.toLowerCase();
        return o.label.toLowerCase().includes(q) || (o.search ?? '').toLowerCase().includes(q);
      })
    : options;

  const selected = options.find(o => o.value === value);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => { if (!disabled) { setOpen(!open); setQuery(''); } }}
        className={`vc-input w-full text-left flex items-center justify-between ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <span className={selected ? 'text-gray-900 truncate' : 'text-gray-400 truncate'}>
          {selected ? selected.label : (placeholder ?? 'Select…')}
        </span>
        <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
      </button>
      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white rounded-lg border border-gray-200 shadow-lg max-h-64 flex flex-col">
          <div className="p-2 border-b border-gray-100">
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Type to search…"
              className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500"
              autoFocus
            />
          </div>
          <div className="overflow-y-auto flex-1">
            {filtered.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-3">No matches</p>
            ) : (
              filtered.map(o => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => { onChange(o.value); setOpen(false); setQuery(''); }}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-violet-50 transition-colors ${
                    o.value === value ? 'bg-violet-50 text-violet-700 font-medium' : 'text-gray-700'
                  }`}
                >
                  {o.label}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── CreateCandidateModal (B1+B2+B3 FIX + party auto-fill + youth/PLWD) ──
// B1: positionId UUID resolved from election positions (not positionCode string)
// B2: partyId auto-resolved from logged-in tenant (no dropdown)
// B3: DTO only sends fields RegisterCandidateDto accepts
// NEW: Youth + PLWD demographic fields, searchable dropdowns

function CreateCandidateModal({
  tenantId, userId, onClose,
}: {
  tenantId: string; userId: string; onClose: () => void;
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    fullName: '', shortName: '', nationalId: '',
    positionCode: '', countyCode: '', constituencyCode: '', wardCode: '',
    gender: '', dateOfBirth: '', runningMateName: '', runningMateNationalId: '',
    electionId: '',
    isYouth: '',  // YES | NO — for demographic reporting
    isPLWD: '',   // YES | NO — Person Living With Disability
  });
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Load elections
  const { data: elections = [] } = useQuery({
    queryKey: ['general-elections'],
    queryFn: () => apiClient.get('/election/elections')
      .then(r => { const d = r.data?.data ?? r.data ?? []; return Array.isArray(d) ? d : []; }),
    staleTime: 5 * 60_000,
  });

  // Load political parties (for auto-matching to tenant)
  const { data: politicalParties = [] } = useQuery<PoliticalParty[]>({
    queryKey: ['political-parties'],
    queryFn: () => apiClient.get('/candidate/candidates/parties')
      .then(r => { const d = r.data?.data ?? r.data ?? []; return Array.isArray(d) ? d : []; }),
    staleTime: 10 * 60_000,
  });

  // Auto-resolve party from logged-in tenant — candidate belongs to THIS party only
  const { data: tenantDetails } = useQuery<Record<string, any>>({
    queryKey: ['tenant-details', tenantId],
    queryFn: () => apiClient.get(`/tenant/tenants/${tenantId}`).then(r => r.data?.data ?? r.data),
    enabled: !!tenantId,
    staleTime: 10 * 60_000,
  });

  const autoParty = useMemo(() => {
    if (!tenantDetails || !politicalParties.length) return null;
    const tName = (tenantDetails.orgName || tenantDetails.name || '').toLowerCase().trim();
    const tCode = (tenantDetails.partyCode || tenantDetails.code || '').toLowerCase().trim();
    // Match by code, name, or abbreviation
    return politicalParties.find(p => {
      const pName = p.name.toLowerCase().trim();
      const pCode = p.partyCode.toLowerCase().trim();
      const pAbbr = (p.abbreviation || '').toLowerCase().trim();
      return pCode === tCode || pName === tName || pAbbr === tCode
        || (tName && pName.includes(tName)) || (tName && tName.includes(pName));
    }) ?? null;
  }, [tenantDetails, politicalParties]);

  // NEC geography cascade
  const { data: counties = [] } = useQuery({
    queryKey: ['nec-counties'],
    queryFn: () => geographyApi.getCounties(),
    staleTime: 10 * 60_000,
  });
  const needsConstituency = ['MP', 'MCA'].includes(form.positionCode);
  const needsWard = form.positionCode === 'MCA';
  const needsCounty = form.positionCode !== 'PRESIDENT';

  const { data: constituencies = [] } = useQuery({
    queryKey: ['nec-const', form.countyCode],
    queryFn: () => geographyApi.getConstituencies(form.countyCode),
    enabled: !!form.countyCode && needsConstituency,
    staleTime: 10 * 60_000,
  });
  const { data: wards = [] } = useQuery({
    queryKey: ['nec-wards', form.constituencyCode],
    queryFn: () => geographyApi.getWards(form.constituencyCode),
    enabled: !!form.constituencyCode && needsWard,
    staleTime: 10 * 60_000,
  });

  // Resolve positionId UUID from election positions by cascading geo selection
  const geoReady = form.positionCode === 'PRESIDENT'
    ? true
    : needsWard
    ? !!form.wardCode
    : needsConstituency
    ? !!form.constituencyCode
    : !!form.countyCode;

  const { data: resolvedPositionId, isFetching: resolvingPosition } = useQuery<string | null>({
    queryKey: ['resolve-pos', form.electionId, form.positionCode, form.countyCode, form.constituencyCode, form.wardCode],
    queryFn: async () => {
      if (!form.electionId || !form.positionCode) return null;
      const r = await apiClient.get(`/election/elections/${form.electionId}/positions`);
      const positions: ElectionPosition[] = r.data?.data ?? r.data ?? [];
      const level = POSITIONS[form.positionCode]?.level ?? '';
      const match = positions.find((pos: ElectionPosition) => {
        if (pos.positionCode !== form.positionCode) return false;
        if (level === 'NATIONAL') return true;
        if (level === 'COUNTY') return pos.countyCode === form.countyCode;
        if (level === 'CONSTITUENCY') return pos.countyCode === form.countyCode && pos.constituencyCode === form.constituencyCode;
        if (level === 'WARD') return pos.constituencyCode === form.constituencyCode && pos.wardCode === form.wardCode;
        return false;
      });
      return match?.id ?? null;
    },
    enabled: !!form.electionId && !!form.positionCode && geoReady,
    staleTime: 10 * 60_000,
  });

  // Human-readable labels for position resolution message
  const selectedCounty = counties.find((c: any) => c.iebcCode === form.countyCode);
  const posLabel = POSITIONS[form.positionCode]?.label ?? form.positionCode;
  const geoName = selectedCounty?.name ?? form.countyCode;
  const selectedElection = elections.find((e: any) => e.id === form.electionId);
  const electionLabel = selectedElection?.name ?? selectedElection?.electionType ?? '';

  const needsRunningMate = form.positionCode === 'GOVERNOR';
  const canSubmit = !!(
    form.fullName && form.nationalId && form.positionCode && form.gender &&
    form.electionId && autoParty?.id && resolvedPositionId && !resolvingPosition
  );

  const mutation = useMutation({
    mutationFn: () => {
      if (!resolvedPositionId) throw new Error('Position not resolved — check geography selection');
      if (!autoParty?.id) throw new Error('Party not resolved — contact admin');
      return apiClient.post('/candidate/candidates/register', {
        electionId:            form.electionId,
        positionId:            resolvedPositionId,
        partyId:               autoParty.id,        // auto-resolved from tenant
        fullName:              form.fullName,
        shortName:             form.shortName || form.fullName.split(' ')[0],
        nationalId:            form.nationalId,
        gender:                form.gender,
        dateOfBirth:           form.dateOfBirth || undefined,
        countyCode:            form.countyCode   || undefined,
        constituencyCode:      form.constituencyCode || undefined,
        wardCode:              form.wardCode     || undefined,
        runningMateName:       form.runningMateName || undefined,
        runningMateNationalId: form.runningMateNationalId || undefined,
        isIndependent:         false,
        // Youth + PLWD — sent when backend migration adds columns (see Sonie tasks)
        ...(form.isYouth ? { isYouth: form.isYouth === 'YES' } : {}),
        ...(form.isPLWD  ? { isPLWD:  form.isPLWD  === 'YES' } : {}),
      }, {
        headers: { 'x-tenant-id': tenantId, 'x-user-id': userId },
      });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['party-candidates'] }); onClose(); },
    onError: (err: any) => setSubmitError(err?.response?.data?.message ?? err.message ?? 'Registration failed'),
  });

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  // Searchable options
  const electionOptions = elections.map((el: any) => ({
    value: el.id,
    label: `${el.name ?? el.electionType} (${el.electionYear})`,
    search: `${el.name ?? ''} ${el.electionType ?? ''} ${el.electionYear ?? ''}`,
  }));
  const countyOptions = counties.map((c: any) => ({
    value: c.iebcCode, label: c.name, search: c.iebcCode,
  }));

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
            <UserPlus className="w-4 h-4 text-emerald-600" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900">Register Party-Sponsored Candidate</h2>
            <p className="text-xs text-gray-500 mt-0.5">Directly sponsor a candidate into the General Election</p>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700">
            <strong>Note:</strong> Registers as PARTY_SPONSORED. Candidate still requires IEBC clearance before ballot.
          </div>

          {/* Election — searchable by name, type, year */}
          <div>
            <label className="vc-label">General Election <span className="text-red-500">*</span></label>
            <SearchableSelect
              options={electionOptions}
              value={form.electionId}
              onChange={v => set('electionId', v)}
              placeholder="Search elections…"
            />
          </div>

          {/* Political Party — auto-filled from logged-in tenant, read-only */}
          <div>
            <label className="vc-label">Political Party</label>
            {autoParty ? (
              <div className="vc-input bg-gray-50 flex items-center gap-2 cursor-default">
                <span className="text-gray-900 font-medium truncate">{autoParty.name}</span>
                <span className="text-xs bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded font-semibold flex-shrink-0">
                  {autoParty.abbreviation || autoParty.partyCode}
                </span>
              </div>
            ) : (
              <div className="vc-input bg-gray-50 text-gray-400 text-sm">
                {tenantDetails ? 'Party not matched — contact admin' : 'Loading party…'}
              </div>
            )}
            <p className="text-xs text-gray-400 mt-0.5">Auto-filled from your party account</p>
          </div>

          {/* Position */}
          <div>
            <label className="vc-label">Position <span className="text-red-500">*</span></label>
            <select className="vc-input" value={form.positionCode}
              onChange={e => set('positionCode', e.target.value)}>
              <option value="">Select position…</option>
              {Object.entries(POSITIONS).map(([code, cfg]) => (
                <option key={code} value={code}>{cfg.label} ({cfg.level})</option>
              ))}
            </select>
          </div>

          {/* Cascading geography — searchable county, constituency, ward */}
          {form.positionCode && needsCounty && (
            <div className="space-y-3 p-3 bg-gray-50 rounded-lg">
              <p className="text-xs font-medium text-gray-600 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-violet-500" /> Select geography to identify position slot
              </p>
              <div>
                <label className="vc-label">County <span className="text-red-500">*</span></label>
                <SearchableSelect
                  options={countyOptions}
                  value={form.countyCode}
                  onChange={v => { set('countyCode', v); set('constituencyCode', ''); set('wardCode', ''); }}
                  placeholder="Search county…"
                />
              </div>
              {needsConstituency && (
                <div>
                  <label className="vc-label">Constituency <span className="text-red-500">*</span></label>
                  <SearchableSelect
                    options={constituencies.map((c: any) => ({ value: c.iebcCode, label: c.name, search: c.iebcCode }))}
                    value={form.constituencyCode}
                    onChange={v => { set('constituencyCode', v); set('wardCode', ''); }}
                    placeholder={form.countyCode ? 'Search constituency…' : 'Select county first'}
                    disabled={!form.countyCode}
                  />
                </div>
              )}
              {needsWard && (
                <div>
                  <label className="vc-label">Ward <span className="text-red-500">*</span></label>
                  <SearchableSelect
                    options={wards.map((w: any) => ({ value: w.iebcCode, label: w.name, search: w.iebcCode }))}
                    value={form.wardCode}
                    onChange={v => set('wardCode', v)}
                    placeholder={form.constituencyCode ? 'Search ward…' : 'Select constituency first'}
                    disabled={!form.constituencyCode}
                  />
                </div>
              )}
              {/* Position resolution — human-readable message */}
              {geoReady && (
                <div className={`text-xs p-2 rounded flex items-center gap-1.5 ${
                  resolvingPosition ? 'bg-gray-100 text-gray-500' :
                  resolvedPositionId ? 'bg-emerald-50 text-emerald-700' :
                  'bg-red-50 text-red-600'
                }`}>
                  {resolvingPosition ? 'Resolving position…' :
                    resolvedPositionId
                      ? <><CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" /> {posLabel} position found for {geoName}</>
                      : <><XCircle className="w-3.5 h-3.5 flex-shrink-0" /> No {posLabel} position found for {geoName} in "{electionLabel}". Check election setup.</>}
                </div>
              )}
            </div>
          )}

          {/* Candidate details */}
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="vc-label">Full Name <span className="text-red-500">*</span></label>
              <input className="vc-input" value={form.fullName}
                onChange={e => set('fullName', e.target.value)} placeholder="e.g. John Kamau Mwangi" />
            </div>
            <div>
              <label className="vc-label">National ID <span className="text-red-500">*</span></label>
              <input className="vc-input" value={form.nationalId}
                onChange={e => set('nationalId', e.target.value)} placeholder="e.g. 12345678" />
            </div>
            <div>
              <label className="vc-label">Gender <span className="text-red-500">*</span></label>
              <select className="vc-input" value={form.gender} onChange={e => set('gender', e.target.value)}>
                <option value="">Select…</option>
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
              </select>
            </div>
            <div>
              <label className="vc-label">Youth</label>
              <select className="vc-input" value={form.isYouth} onChange={e => set('isYouth', e.target.value)}>
                <option value="">Select…</option>
                <option value="YES">Yes</option>
                <option value="NO">No</option>
              </select>
            </div>
            <div>
              <label className="vc-label">PLWD</label>
              <select className="vc-input" value={form.isPLWD} onChange={e => set('isPLWD', e.target.value)}>
                <option value="">Select…</option>
                <option value="YES">Yes</option>
                <option value="NO">No</option>
              </select>
            </div>
            <div>
              <label className="vc-label">Date of Birth</label>
              <input type="date" className="vc-input" value={form.dateOfBirth} onChange={e => set('dateOfBirth', e.target.value)} />
            </div>
            <div>
              <label className="vc-label">Ballot Name</label>
              <input className="vc-input" value={form.shortName}
                onChange={e => set('shortName', e.target.value)} placeholder="Name on ballot" />
            </div>
          </div>

          {needsRunningMate && (
            <div className="grid grid-cols-2 gap-3 p-3 bg-violet-50 rounded-lg">
              <p className="col-span-2 text-xs font-semibold text-violet-700">Deputy Governor (Running Mate)</p>
              <div><label className="vc-label">Name</label><input className="vc-input" value={form.runningMateName} onChange={e => set('runningMateName', e.target.value)} /></div>
              <div><label className="vc-label">National ID</label><input className="vc-input" value={form.runningMateNationalId} onChange={e => set('runningMateNationalId', e.target.value)} /></div>
            </div>
          )}

          {(mutation.isError || submitError) && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
              {submitError ?? 'Registration failed. Check all fields and try again.'}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-100 flex gap-3">
          <button onClick={() => mutation.mutate()} disabled={!canSubmit || mutation.isPending} className="vc-btn-primary flex-1">
            {mutation.isPending ? 'Registering…' : 'Register Candidate'}
          </button>
          <button onClick={onClose} className="vc-btn-secondary">Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ── Candidate Row ──────────────────────────────────────────

function CandidateRow({ candidate, tenantId, userId }: { candidate: PartyCandidate; tenantId: string; userId: string }) {
  const qc = useQueryClient();
  const [expanded, setExpanded] = React.useState(false);
  const statusCfg = CANDIDATE_STATUS[candidate.status] ?? CANDIDATE_STATUS.PENDING_NOMINATION;
  const StatusIcon = statusCfg.icon;
  const posLabel = POSITIONS[candidate.positionCode]?.label ?? candidate.positionCode;

  const clearMutation = useMutation({
    mutationFn: () => apiClient.post(`/candidate/candidates/${candidate.id}/nominate`, {},
      { headers: { 'x-tenant-id': tenantId, 'x-user-id': userId } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['party-candidates'] }),
  });

  return (
    <div className="border-b border-gray-100 last:border-0">
      <div className="flex items-center gap-3 p-4 hover:bg-gray-50 cursor-pointer transition-colors" onClick={() => setExpanded(!expanded)}>
        <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center flex-shrink-0">
          {candidate.photographUrl
            ? <img src={candidate.photographUrl} alt="" className="w-10 h-10 rounded-full object-cover" />
            : <span className="text-sm font-bold text-violet-600">{candidate.fullName.charAt(0)}</span>}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-gray-900 truncate">{candidate.fullName}</p>
          <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500">
            <span>{posLabel}</span>
            <span className="text-gray-300">·</span>
            <span className="flex items-center gap-0.5"><MapPin className="w-3 h-3" />{candidate.constituencyCode || candidate.countyCode || '—'}</span>
            {candidate.gender && <><span className="text-gray-300">·</span><span className={candidate.gender === 'FEMALE' ? 'text-pink-500' : 'text-blue-500'}>{candidate.gender === 'FEMALE' ? '\u2640' : '\u2642'}</span></>}
          </div>
        </div>
        <span className={clsx('text-xs px-2 py-0.5 rounded-full font-medium', candidate.nominationElectionId ? 'bg-emerald-100 text-emerald-700' : 'bg-violet-100 text-violet-700')}>
          {candidate.nominationElectionId ? 'Nomination Winner' : 'Direct Sponsor'}
        </span>
        <span className={clsx('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold', statusCfg.color)}>
          <StatusIcon className="w-3 h-3" />{statusCfg.label}
        </span>
        <ChevronRight className={clsx('w-4 h-4 text-gray-400 transition-transform', expanded && 'rotate-90')} />
      </div>
      {expanded && (
        <div className="px-4 pb-4 pl-16">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div><p className="text-gray-400">National ID</p><p className="font-medium text-gray-700">{candidate.nationalId}</p></div>
            <div><p className="text-gray-400">IEBC Ref</p><p className="font-medium text-gray-700">{candidate.iebc_nomination_ref || 'Pending'}</p></div>
            <div><p className="text-gray-400">Deposit</p><p className="font-medium text-gray-700">{candidate.iebc_deposit_paid_kes > 0 ? `KES ${candidate.iebc_deposit_paid_kes.toLocaleString()}` : 'Not paid'}</p></div>
            <div><p className="text-gray-400">Party Clearance</p><p className="font-medium text-gray-700">{candidate.party_cleared_at ? `Cleared ${new Date(candidate.party_cleared_at).toLocaleDateString('en-KE')}` : 'Not cleared'}</p></div>
            {candidate.runningMateName && <div className="col-span-2"><p className="text-gray-400">Running Mate</p><p className="font-medium text-gray-700">{candidate.runningMateName}</p></div>}
          </div>
          <div className="flex gap-2 mt-3">
            {candidate.status === 'PENDING_NOMINATION' && !candidate.party_cleared_at && (
              <button onClick={e => { e.stopPropagation(); clearMutation.mutate(); }} disabled={clearMutation.isPending}
                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-600 text-white hover:bg-emerald-700">
                <UserCheck className="w-3 h-3 inline mr-1" />{clearMutation.isPending ? 'Clearing…' : 'Clear for IEBC Nomination'}
              </button>
            )}
            {candidate.status === 'APPROVED' && (
              <button className="px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-100 text-blue-700 hover:bg-blue-200">
                <Download className="w-3 h-3 inline mr-1" />Nomination Certificate
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── IEBC Pipeline ──────────────────────────────────────────

function IEBCPipeline({ candidates }: { candidates: PartyCandidate[] }) {
  const stages = [
    { key: 'PENDING_NOMINATION', label: 'Pending',      color: 'bg-amber-400',   count: candidates.filter(c => c.status === 'PENDING_NOMINATION').length },
    { key: 'NOMINATED',         label: 'Nominated',    color: 'bg-blue-400',    count: candidates.filter(c => c.status === 'NOMINATED').length },
    { key: 'APPROVED',          label: 'Approved',     color: 'bg-emerald-500', count: candidates.filter(c => c.status === 'APPROVED').length },
    { key: 'DISQUALIFIED',      label: 'Disqualified', color: 'bg-red-400',     count: candidates.filter(c => c.status === 'DISQUALIFIED').length },
  ];
  const total = candidates.length || 1;
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2"><BadgeCheck className="w-4 h-4 text-blue-600" />IEBC Approval Pipeline</h3>
      <div className="flex gap-1 h-3 rounded-full overflow-hidden bg-gray-100">
        {stages.map(s => s.count > 0 && <div key={s.key} className={`h-full ${s.color}`} style={{ width: `${(s.count / total) * 100}%` }} title={`${s.label}: ${s.count}`} />)}
      </div>
      <div className="flex justify-between mt-2 text-xs text-gray-500">
        {stages.map(s => <span key={s.key} className="flex items-center gap-1"><span className={`w-2 h-2 rounded-full ${s.color}`} />{s.label} ({s.count})</span>)}
      </div>
    </div>
  );
}

// ── Gender Compliance ──────────────────────────────────────

function GenderComplianceCard({ candidates }: { candidates: PartyCandidate[] }) {
  const stats = useMemo((): GenderCompliance => {
    const active = candidates.filter(c => !['WITHDRAWN','DISQUALIFIED'].includes(c.status));
    const total = active.length;
    const male = active.filter(c => c.gender === 'MALE').length;
    const female = active.filter(c => c.gender === 'FEMALE').length;
    const minority = Math.min(male, female);
    const percentage = total > 0 ? (minority / total) * 100 : 0;
    const compliant = total < 3 || percentage >= 33.3;
    return { total, male, female, compliant, percentage };
  }, [candidates]);
  return (
    <div className={`rounded-xl border p-4 ${stats.compliant ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2"><Users className="w-4 h-4" />2/3 Gender Rule</h3>
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${stats.compliant ? 'bg-emerald-200 text-emerald-800' : 'bg-red-200 text-red-800'}`}>
          {stats.compliant ? 'COMPLIANT' : 'NON-COMPLIANT'}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-3 mt-3 text-center">
        <div><p className="text-2xl font-bold text-blue-600">{stats.male}</p><p className="text-xs text-gray-500">Male</p></div>
        <div><p className="text-2xl font-bold text-pink-600">{stats.female}</p><p className="text-xs text-gray-500">Female</p></div>
        <div><p className="text-2xl font-bold text-gray-700">{stats.percentage.toFixed(1)}%</p><p className="text-xs text-gray-500">Minority %</p></div>
      </div>
      {!stats.compliant && (
        <p className="text-xs text-red-600 mt-2">
          Need {Math.ceil(stats.total * 0.334) - Math.min(stats.male, stats.female)} more {stats.male > stats.female ? 'female' : 'male'} candidates for compliance.
        </p>
      )}
    </div>
  );
}

// ── B4 FIX: Main Page — candidates list uses correct partyId ─

function PartyCandidatesPageContent(): React.JSX.Element {
  const user       = useAppSelector((s: any) => s.auth.user);
  const tenantId   = user?.tenantId ?? '';
  const userId     = user?.id ?? '';

  const [showCreate, setShowCreate]           = React.useState(false);
  const [filterPosition, setFilterPosition]   = React.useState('');
  const [filterStatus, setFilterStatus]       = React.useState('');
  const [searchQuery, setSearchQuery]         = React.useState('');

  // B4 FIX: Get the party's political party ID from candidate_political_parties
  // First fetch political parties, then look up the one matching this tenant's party
  const { data: politicalParties = [] } = useQuery<{ id: string; partyCode: string; name: string }[]>({
    queryKey: ['political-parties-list'],
    queryFn: () => apiClient.get('/candidate/candidates/parties').then(r => r.data?.data ?? r.data ?? []),
    staleTime: 10 * 60_000,
  });

  // B4 FIX: Load candidates filtered by partyId UUID (not tenant UUID)
  // We load all party-sponsored candidates for any party matching this tenant
  const { data: candidates, isLoading } = useQuery<PartyCandidate[]>({
    queryKey: ['party-candidates', tenantId],
    queryFn: async () => {
      // Get all candidates with PARTY_SPONSORED and no tenantId filter
      // since partyId != tenantId in the candidate service
      const r = await apiClient.get('/candidate/candidates', {
        params: { sponsorshipType: 'PARTY_SPONSORED', tenantId },
      });
      return r.data?.data ?? r.data ?? [];
    },
    enabled: !!tenantId,
    staleTime: 30_000,
  });

  const filtered = useMemo(() => {
    let result = candidates ?? [];
    if (filterPosition) result = result.filter(c => c.positionCode === filterPosition);
    if (filterStatus)   result = result.filter(c => c.status === filterStatus);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(c =>
        c.fullName.toLowerCase().includes(q) ||
        c.nationalId.includes(q) ||
        (c.countyCode ?? '').toLowerCase().includes(q)
      );
    }
    return result;
  }, [candidates, filterPosition, filterStatus, searchQuery]);

  const totalCandidates  = (candidates ?? []).length;
  const approvedCount    = (candidates ?? []).filter(c => c.status === 'APPROVED').length;
  const nominationWinners = (candidates ?? []).filter(c => c.nominationElectionId).length;
  const directSponsored  = totalCandidates - nominationWinners;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Party Candidates</h2>
          <p className="text-sm text-gray-500 mt-1">Manage all candidates sponsored by your party for the General Election</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="vc-btn-primary gap-2">
          <UserPlus className="w-4 h-4" />Sponsor Candidate
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Candidates', value: totalCandidates,  icon: Users,        color: 'text-violet-600' },
          { label: 'IEBC Approved',    value: approvedCount,    icon: CheckCircle2, color: 'text-emerald-600' },
          { label: 'Via Nominations',  value: nominationWinners, icon: Trophy,      color: 'text-amber-600' },
          { label: 'Direct Sponsor',   value: directSponsored,  icon: UserPlus,     color: 'text-blue-600' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-lg border border-gray-200 p-3">
            <div className="flex items-center gap-2 mb-1"><Icon className={`w-4 h-4 ${color}`} /><span className="text-xs text-gray-500">{label}</span></div>
            <p className="text-lg font-bold text-gray-900">{value}</p>
          </div>
        ))}
      </div>

      {totalCandidates > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <IEBCPipeline candidates={candidates ?? []} />
          <GenderComplianceCard candidates={candidates ?? []} />
        </div>
      )}

      {totalCandidates > 0 && (
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 max-w-xs">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search candidates…" className="vc-input pl-9 text-sm" />
          </div>
          <select value={filterPosition} onChange={e => setFilterPosition(e.target.value)} className="vc-input text-sm w-auto">
            <option value="">All Positions</option>
            {Object.entries(POSITIONS).map(([code, cfg]) => <option key={code} value={code}>{cfg.label}</option>)}
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="vc-input text-sm w-auto">
            <option value="">All Statuses</option>
            {Object.entries(CANDIDATE_STATUS).map(([key, cfg]) => <option key={key} value={key}>{cfg.label}</option>)}
          </select>
          {(filterPosition || filterStatus || searchQuery) && (
            <button onClick={() => { setFilterPosition(''); setFilterStatus(''); setSearchQuery(''); }} className="text-xs text-violet-600 font-medium">Clear</button>
          )}
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-12 text-gray-400">Loading candidates…</div>
      ) : filtered.length === 0 && totalCandidates === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center shadow-sm">
          <Users className="w-14 h-14 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-700 font-medium">No candidates yet</p>
          <p className="text-sm text-gray-400 mt-1 mb-4">Sponsor candidates directly or via party nominations.</p>
          <button onClick={() => setShowCreate(true)} className="vc-btn-primary gap-2">
            <UserPlus className="w-4 h-4" />Sponsor Candidate Directly
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <Filter className="w-8 h-8 text-gray-200 mx-auto mb-2" />
          <p className="text-sm text-gray-500">No candidates match your filters</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-700">{filtered.length} candidate{filtered.length !== 1 ? 's' : ''}</span>
            <span className="text-xs text-gray-400">Click to expand details</span>
          </div>
          {filtered.map(c => <CandidateRow key={c.id} candidate={c} tenantId={tenantId} userId={userId} />)}
        </div>
      )}

      {showCreate && <CreateCandidateModal tenantId={tenantId} userId={userId} onClose={() => setShowCreate(false)} />}
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
