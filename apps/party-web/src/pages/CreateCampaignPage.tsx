// ============================================================
// VoteCapsule™ — Create Campaign Page (Party Portal)
// Auto-turbulates IEBC spending limit when position + geography
// are selected. Live preview badge shows the limit in step 3.
// ============================================================
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  Megaphone, ArrowLeft, Calendar, MapPin, DollarSign,
  Users, FileText, CheckCircle, AlertTriangle, Zap,
  Shield, TrendingUp, BarChart2,
} from 'lucide-react';
import { campaignApi } from '../api/campaignApi';
import { geographyApi, County, Constituency, Ward } from '../api/geographyApi';
import { PageErrorBoundary } from '../components/PageErrorBoundary';
import { useAppSelector } from '../store/hooks';

interface CampaignForm {
  name: string;
  description: string;
  campaignType: string;
  targetPosition: string;
  countyCode: string;
  constituencyCode: string;
  wardCode: string;
  campaignStartDate: string;
  electionDate: string;
  totalBudget: string;
  iebcSpendingLimit: string;
  candidateName: string;
  candidateUserId: string;
  headquartersAddress: string;
}

const CAMPAIGN_TYPES = [
  { value: 'GENERAL_ELECTION', label: 'General Election Campaign' },
  { value: 'PARTY_PRIMARY',    label: 'Party Primary / Nomination' },
  { value: 'BY_ELECTION',      label: 'By-Election Campaign' },
  { value: 'AWARENESS',        label: 'Voter Awareness Campaign' },
];

const TARGET_POSITIONS = [
  { value: 'PRESIDENT',  label: 'President',                schedule: 'First Schedule',  geo: 'national',       color: 'text-purple-700',  bg: 'bg-purple-50',  border: 'border-purple-200' },
  { value: 'GOVERNOR',   label: 'Governor',                 schedule: 'Second Schedule', geo: 'county',         color: 'text-blue-700',    bg: 'bg-blue-50',    border: 'border-blue-200' },
  { value: 'SENATOR',    label: 'Senator',                  schedule: 'Second Schedule', geo: 'county',         color: 'text-indigo-700',  bg: 'bg-indigo-50',  border: 'border-indigo-200' },
  { value: 'WOMEN_REP',  label: 'Women Representative',     schedule: 'Second Schedule', geo: 'county',         color: 'text-pink-700',    bg: 'bg-pink-50',    border: 'border-pink-200' },
  { value: 'MP',         label: 'Member of Parliament',     schedule: 'Third Schedule',  geo: 'constituency',   color: 'text-amber-700',   bg: 'bg-amber-50',   border: 'border-amber-200' },
  { value: 'MCA',        label: 'Member of County Assembly',schedule: 'Fourth Schedule', geo: 'ward',           color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' },
];

const fmt = (n: number) =>
  n >= 1_000_000_000 ? `KES ${(n/1_000_000_000).toFixed(2)}B`
  : n >= 1_000_000 ? `KES ${(n/1_000_000).toFixed(1)}M`
  : n >= 1_000 ? `KES ${(n/1_000).toFixed(0)}K`
  : `KES ${n.toLocaleString()}`;

function CreateCampaignContent(): React.JSX.Element {
  const navigate = useNavigate();
  const user     = useAppSelector((s) => s.auth.user);
  const tenantId = useAppSelector((s) => s.auth.tenantId ?? s.auth.user?.tenantId ?? '');

  const [form, setForm] = useState<CampaignForm>({
    name: '',
    description: '',
    campaignType: 'GENERAL_ELECTION',
    targetPosition: 'MP',
    countyCode: '',
    constituencyCode: '',
    wardCode: '',
    campaignStartDate: '',
    electionDate: '',
    totalBudget: '',
    iebcSpendingLimit: '',
    candidateName: '',
    candidateUserId: '',
    headquartersAddress: '',
  });
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Derive which geo fields are required for the selected position
  const positionMeta = TARGET_POSITIONS.find(p => p.value === form.targetPosition)!;
  const needsCounty       = ['county','constituency','ward'].includes(positionMeta?.geo ?? '');
  const needsConstituency = ['constituency','ward'].includes(positionMeta?.geo ?? '');
  const needsWard         = positionMeta?.geo === 'ward';

  // Load ALL elections (nomination, planning, active) — not just "active"
  // The party may be running nominations which are in NOMINATION status, not ACTIVE
  const { data: elections = [] } = useQuery({
    queryKey: ['party-elections-for-campaign'],
    queryFn: async () => {
      try {
        // Try listing all elections for this tenant
        const r = await campaignApi.listElections();
        const list: any[] = r.data?.data ?? r.data ?? [];
        // Accept any election that is usable for campaign creation
        const usable = list.filter((e: any) =>
          ['ACTIVE', 'NOMINATION', 'PLANNING', 'PENDING', 'SCHEDULED'].includes(
            (e.status ?? e.electionStatus ?? '').toUpperCase()
          )
        );
        // If nothing, return all so the party admin can still select
        return usable.length > 0 ? usable : list;
      } catch { return []; }
    },
    staleTime: 0, // Always re-fetch — elections change
  });

  // selectedElectionId — the election the campaign will be linked to
  const [selectedElectionId, setSelectedElectionId] = useState<string>('');
  const activeElection = elections.find((e: any) => e.id === selectedElectionId) ?? elections[0] ?? null;
  // Auto-select first election when list loads
  React.useEffect(() => {
    if (elections.length > 0 && !selectedElectionId) {
      setSelectedElectionId(elections[0].id);
    }
  }, [elections]);

  // NEC Geography — use summary endpoints for counts
  const { data: counties = [] } = useQuery<County[]>({
    queryKey: ['nec-counties-summary'],
    queryFn:  () => geographyApi.getCountySummaries().catch(() => geographyApi.getCounties()),
    staleTime: 10 * 60_000,
  });

  const { data: constituencies = [] } = useQuery<Constituency[]>({
    queryKey: ['nec-constituencies-summary', form.countyCode],
    queryFn:  () => geographyApi.getConstituencySummaries(form.countyCode).catch(() => geographyApi.getConstituencies(form.countyCode)),
    enabled:  !!form.countyCode,
    staleTime: 10 * 60_000,
  });

  const { data: wards = [] } = useQuery<Ward[]>({
    queryKey: ['nec-wards-summary', form.constituencyCode],
    queryFn:  () => geographyApi.getWardSummaries(form.constituencyCode).catch(() => geographyApi.getWards(form.constituencyCode)),
    enabled:  !!form.constituencyCode && needsWard,
    staleTime: 10 * 60_000,
  });

  // Selected geography objects for stats panel
  const selectedCounty       = counties.find(c => c.iebcCode === form.countyCode);
  const selectedConstituency = constituencies.find(c => c.iebcCode === form.constituencyCode);
  const selectedWard         = wards.find(w => w.iebcCode === form.wardCode);

  // Live IEBC limit preview — fetches from DB tables as position/geography changes
  // Uses a debounce-like pattern: only fetch when we have the required geo fields
  const canPreview = useMemo(() => {
    const pos = form.targetPosition;
    if (!pos) return false;
    if (pos === 'PRESIDENT') return true;
    if (['GOVERNOR','SENATOR','WOMEN_REP'].includes(pos)) return !!form.countyCode;
    if (pos === 'MP') return !!form.constituencyCode;
    if (pos === 'MCA') return !!form.wardCode;
    return false;
  }, [form.targetPosition, form.countyCode, form.constituencyCode, form.wardCode]);

  const { data: iebcPreview } = useQuery({
    queryKey: ['iebc-limit-preview', form.targetPosition, form.countyCode, form.constituencyCode, form.wardCode],
    queryFn: () =>
      campaignApi.budget.previewIebcLimit({
        position:          form.targetPosition,
        countyCode:        form.countyCode        || undefined,
        constituencyCode:  form.constituencyCode  || undefined,
        wardCode:          form.wardCode          || undefined,
        isParty:           false,
      }).then(r => r.data?.data ?? r.data),
    enabled: canPreview,
    staleTime: 5 * 60_000,
  });

  // Auto-fill iebcSpendingLimit when preview resolves
  useEffect(() => {
    if (iebcPreview?.spendingLimitKes && !form.iebcSpendingLimit) {
      setForm(f => ({ ...f, iebcSpendingLimit: String(iebcPreview.spendingLimitKes) }));
    }
  }, [iebcPreview?.spendingLimitKes]);

  const createMutation = useMutation({
    mutationFn: () => {
      if (!selectedElectionId) throw new Error('Please select an election');
      if (!form.name.trim())   throw new Error('Campaign name is required');
      return campaignApi.create({
        name:              form.name.trim(),
        description:       form.description || undefined,
        tenantId,
        electionId:        selectedElectionId,
        ...(form.candidateUserId ? { candidateId: form.candidateUserId } : {}),
        countyCode:        form.countyCode        || undefined,
        constituencyCode:  form.constituencyCode  || undefined,
        wardCode:          form.wardCode          || undefined,
        campaignStartDate: form.campaignStartDate || undefined,
        campaignEndDate:   form.electionDate      || undefined,
        headquarters:      form.headquartersAddress || undefined,
        targetWards:       form.wardCode ? [form.wardCode] : [],
        goals: {
          targetPosition:    form.targetPosition,
          campaignType:      form.campaignType,
          candidateName:     form.candidateName,
          totalBudget:       form.totalBudget       ? parseFloat(form.totalBudget)       : null,
          iebcSpendingLimit: form.iebcSpendingLimit ? parseFloat(form.iebcSpendingLimit) : (iebcPreview?.spendingLimitKes ?? null),
          iebcSchedule:      iebcPreview?.schedule  ?? null,
          iebcGazetteRef:    iebcPreview?.gazetteRef ?? null,
          registeredVoters:  iebcPreview?.registeredVoters ?? null,
          wardCount:         iebcPreview?.wardCount  ?? null,
          pollingStations:   iebcPreview?.pollingStations ?? null,
        },
      });
    },
    onSuccess: () => navigate('/campaign'),
  });

  const set = (field: keyof CampaignForm, value: string) => {
    setForm(f => {
      const next = { ...f, [field]: value };
      // Clear downstream geo when parent changes
      if (field === 'countyCode')       { next.constituencyCode = ''; next.wardCode = ''; next.iebcSpendingLimit = ''; }
      if (field === 'constituencyCode') { next.wardCode = ''; next.iebcSpendingLimit = ''; }
      if (field === 'wardCode')         { next.iebcSpendingLimit = ''; }
      if (field === 'targetPosition')   { next.iebcSpendingLimit = ''; }
      return next;
    });
  };

  const canGoNext1 = form.name && form.campaignType && form.targetPosition && !!selectedElectionId;
  const canGoNext2 = (
    (needsCounty       ? !!form.countyCode       : true) &&
    (needsConstituency ? !!form.constituencyCode : true) &&
    (needsWard         ? !!form.wardCode          : true) &&
    !!form.campaignStartDate
  );
  const canSubmit = canGoNext1 && canGoNext2 && !createMutation.isPending;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/campaign')}
          className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-xl font-bold text-gray-900">Create Campaign</h2>
          <p className="text-sm text-gray-500">Set up a new election campaign for your party</p>
        </div>
      </div>

      {/* Step indicators */}
      <div className="flex items-center gap-2">
        {[
          { num: 1, label: 'Campaign Info' },
          { num: 2, label: 'Geography & Dates' },
          { num: 3, label: 'Budget & Review' },
        ].map(({ num, label }, idx) => (
          <React.Fragment key={num}>
            <div className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                step === num
                  ? 'bg-violet-600 text-white'
                  : step > num
                    ? 'bg-emerald-500 text-white'
                    : 'bg-gray-200 text-gray-500'
              }`}>
                {step > num ? '✓' : num}
              </div>
              <span className={`text-sm font-medium hidden sm:block ${step === num ? 'text-violet-700' : 'text-gray-400'}`}>
                {label}
              </span>
            </div>
            {idx < 2 && <div className="flex-1 h-px bg-gray-200" />}
          </React.Fragment>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        {/* Step 1: Campaign Info */}
        {step === 1 && (
          <div className="p-6 space-y-5">
            <div className="flex items-center gap-2 mb-4">
              <Megaphone className="w-5 h-5 text-violet-600" />
              <h3 className="text-base font-semibold text-gray-900">Campaign Information</h3>
            </div>

            <div>
              <label className="vc-label">Campaign Name <span className="text-red-500">*</span></label>
              <input
                className="vc-input"
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                placeholder="e.g. UDA 2027 General Election — Kasarani"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="vc-label">Campaign Type <span className="text-red-500">*</span></label>
                <select className="vc-input" value={form.campaignType} onChange={(e) => set('campaignType', e.target.value)}>
                  {CAMPAIGN_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="vc-label">Target Position <span className="text-red-500">*</span></label>
                <select className="vc-input" value={form.targetPosition} onChange={(e) => set('targetPosition', e.target.value)}>
                  {TARGET_POSITIONS.map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="vc-label">Candidate Name</label>
                <input
                  className="vc-input"
                  value={form.candidateName}
                  onChange={(e) => set('candidateName', e.target.value)}
                  placeholder="Full name of the candidate"
                />
              </div>
              <div>
                <label className="vc-label">Candidate User ID <span className="text-xs text-gray-400">(optional)</span></label>
                <input
                  className="vc-input font-mono text-xs"
                  value={form.candidateUserId}
                  onChange={(e) => set('candidateUserId', e.target.value)}
                  placeholder="UUID from Candidates page"
                />
              </div>
            </div>

            {/* Election selector — shows ALL elections (nomination, planning, active) */}
            <div>
              <label className="vc-label">Election *</label>
              {elections.length === 0 ? (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-amber-700 font-medium">No elections found.</p>
                    <p className="text-xs text-amber-600 mt-0.5">Create an election first from the Elections page, or ask your administrator.</p>
                  </div>
                </div>
              ) : (
                <select
                  className="vc-input"
                  value={selectedElectionId}
                  onChange={(e) => setSelectedElectionId(e.target.value)}
                >
                  {elections.map((e: any) => (
                    <option key={e.id} value={e.id}>
                      {e.name ?? e.electionName ?? e.id}
                      {e.status ? ` (${e.status})` : ''}
                    </option>
                  ))}
                </select>
              )}
            </div>
            {activeElection && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <div>
                  <p className="text-xs text-emerald-600 font-medium">Selected Election</p>
                  <p className="text-sm font-semibold text-emerald-800">{activeElection.name ?? activeElection.id}</p>
                  {activeElection.status && <p className="text-xs text-emerald-600">Status: {activeElection.status}</p>}
                </div>
              </div>
            )}
            {false /* old single-election amber warning kept for reference */ && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <p className="text-sm text-amber-700">No active election found. Contact your administrator.</p>
              </div>
            )}

            <div>
              <label className="vc-label">Description</label>
              <textarea
                className="vc-input h-20 resize-none"
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
                placeholder="Brief description of this campaign's objectives..."
              />
            </div>

            <div>
              <label className="vc-label">Headquarters Address</label>
              <input
                className="vc-input"
                value={form.headquartersAddress}
                onChange={(e) => set('headquartersAddress', e.target.value)}
                placeholder="Campaign office address"
              />
            </div>
          </div>
        )}

        {/* Step 2: Geography & Dates */}
        {step === 2 && (
          <div className="p-6 space-y-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-violet-600" />
                <h3 className="text-base font-semibold text-gray-900">Geography & Timeline</h3>
              </div>
              {/* Position geo hint */}
              <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${positionMeta?.bg} ${positionMeta?.color} ${positionMeta?.border} border`}>
                {positionMeta?.label} — {positionMeta?.schedule}
              </span>
            </div>

            {/* Position = PRESIDENT: national scope, no geo needed */}
            {form.targetPosition === 'PRESIDENT' ? (
              <div className="p-4 bg-purple-50 border border-purple-200 rounded-xl flex items-start gap-3">
                <Shield className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-purple-900">Presidential Campaign — National Scope</p>
                  <p className="text-xs text-purple-700 mt-1">
                    Presidential campaigns are nation-wide. No county or constituency selection is needed.
                    IEBC spending limit: <strong>KES 8,000,000,000</strong> (First Schedule, GN 12251).
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* County selector */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="vc-label">
                      County {needsCounty && <span className="text-red-500">*</span>}
                    </label>
                    <select
                      className="vc-input"
                      value={form.countyCode}
                      onChange={(e) => set('countyCode', e.target.value)}
                    >
                      <option value="">Select County (NEC)</option>
                      {counties.map((c) => (
                        <option key={c.iebcCode} value={c.iebcCode}>
                          {c.iebcCode} — {c.name}
                          {c.registeredVoters ? ` (${(c.registeredVoters/1000).toFixed(0)}K voters)` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Constituency selector */}
                  {(needsConstituency || needsWard) && (
                    <div>
                      <label className="vc-label">
                        Constituency {needsConstituency && <span className="text-red-500">*</span>}
                      </label>
                      <select
                        className="vc-input"
                        value={form.constituencyCode}
                        onChange={(e) => set('constituencyCode', e.target.value)}
                        disabled={!form.countyCode}
                      >
                        <option value="">{form.countyCode ? 'Select Constituency' : 'Select county first'}</option>
                        {constituencies.map((c) => (
                          <option key={c.iebcCode} value={c.iebcCode}>
                            {c.iebcCode} — {c.name}
                            {c.registeredVoters ? ` (${(c.registeredVoters/1000).toFixed(0)}K)` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {/* Ward selector (MCA only) */}
                {needsWard && (
                  <div>
                    <label className="vc-label">Ward <span className="text-red-500">*</span></label>
                    <select
                      className="vc-input"
                      value={form.wardCode}
                      onChange={(e) => set('wardCode', e.target.value)}
                      disabled={!form.constituencyCode}
                    >
                      <option value="">{form.constituencyCode ? 'Select Ward' : 'Select constituency first'}</option>
                      {wards.map((w) => (
                        <option key={w.iebcCode} value={w.iebcCode}>
                          {w.iebcCode} — {w.name}
                          {w.registeredVoters ? ` (${w.registeredVoters.toLocaleString()} voters)` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Geography stats panel — shows once geo is selected */}
                {(selectedCounty || selectedConstituency || selectedWard) && (
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Selected Geography — NEC Data</p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {[
                        { label: 'Registered Voters', value: (selectedWard?.registeredVoters ?? selectedConstituency?.registeredVoters ?? selectedCounty?.registeredVoters ?? 0).toLocaleString(), icon: Users, color: 'text-violet-600' },
                        { label: 'Polling Stations',  value: (selectedWard?.pollingStationCount ?? selectedConstituency?.pollingStationCount ?? selectedCounty?.pollingStationCount ?? 0).toLocaleString(), icon: MapPin, color: 'text-blue-600' },
                        { label: needsWard ? 'Reg. Centres' : 'Wards', value: needsWard ? (selectedWard?.registrationCentreCount ?? 0).toLocaleString() : (selectedConstituency?.wardCount ?? selectedCounty?.wardCount ?? 0).toLocaleString(), icon: BarChart2, color: 'text-amber-600' },
                        { label: 'Constituencies',   value: selectedCounty ? (selectedCounty.constituencyCount ?? 0).toLocaleString() : '—', icon: TrendingUp, color: 'text-emerald-600' },
                      ].map(({ label, value, icon: Icon, color }) => (
                        <div key={label} className="bg-white rounded-lg p-3 border border-gray-100 text-center">
                          <Icon className={`w-4 h-4 ${color} mx-auto mb-1`} />
                          <p className="text-base font-bold text-gray-900">{value}</p>
                          <p className="text-[10px] text-gray-500">{label}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="vc-label">Campaign Start Date <span className="text-red-500">*</span></label>
                <input type="date" className="vc-input" value={form.campaignStartDate} onChange={(e) => set('campaignStartDate', e.target.value)} />
              </div>
              <div>
                <label className="vc-label">Election Date</label>
                <input type="date" className="vc-input" value={form.electionDate} onChange={(e) => set('electionDate', e.target.value)} />
              </div>
            </div>

            <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg">
              <p className="text-xs text-blue-700">
                Geography sourced from NEC — 47 counties · 290 constituencies · 1,447 wards · 45,805 polling stations.
                Campaign events and agent assignments will be scoped to the selected geography.
              </p>
            </div>
          </div>
        )}

        {/* Step 3: Budget & Review */}
        {step === 3 && (
          <div className="p-6 space-y-5">
            <div className="flex items-center gap-2 mb-4">
              <DollarSign className="w-5 h-5 text-violet-600" />
              <h3 className="text-base font-semibold text-gray-900">Budget & Review</h3>
            </div>

            {/* ── AUTO-TURBULATED IEBC LIMIT PANEL ── */}
            {iebcPreview ? (
              <div className={`rounded-xl border-2 p-5 ${positionMeta?.border} ${positionMeta?.bg}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${positionMeta?.bg}`}>
                      <Zap className={`w-5 h-5 ${positionMeta?.color}`} />
                    </div>
                    <div>
                      <p className={`text-sm font-bold ${positionMeta?.color}`}>
                        IEBC Limit Auto-Populated ✓
                      </p>
                      <p className="text-xs text-gray-600 mt-0.5">
                        {iebcPreview.schedule} · {iebcPreview.gazetteRef}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-2xl font-bold ${positionMeta?.color}`}>
                      {fmt(iebcPreview.spendingLimitKes)}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">Maximum legal spend</p>
                  </div>
                </div>

                {/* Geography context from preview */}
                {(iebcPreview.registeredVoters || iebcPreview.wardCount || iebcPreview.pollingStations) && (
                  <div className="grid grid-cols-3 gap-3 mt-4">
                    {iebcPreview.registeredVoters ? (
                      <div className="bg-white/70 rounded-lg p-2.5 text-center border border-white">
                        <p className="text-sm font-bold text-gray-900">{Number(iebcPreview.registeredVoters).toLocaleString()}</p>
                        <p className="text-[10px] text-gray-500">Registered Voters</p>
                      </div>
                    ) : null}
                    {iebcPreview.wardCount ? (
                      <div className="bg-white/70 rounded-lg p-2.5 text-center border border-white">
                        <p className="text-sm font-bold text-gray-900">{iebcPreview.wardCount}</p>
                        <p className="text-[10px] text-gray-500">Wards</p>
                      </div>
                    ) : null}
                    {iebcPreview.pollingStations ? (
                      <div className="bg-white/70 rounded-lg p-2.5 text-center border border-white">
                        <p className="text-sm font-bold text-gray-900">{Number(iebcPreview.pollingStations).toLocaleString()}</p>
                        <p className="text-[10px] text-gray-500">Polling Stations</p>
                      </div>
                    ) : null}
                  </div>
                )}

                <p className="text-xs text-gray-500 mt-3">
                  ⚡ Budget categories will be automatically seeded from this limit when the campaign is created,
                  using the 11 IEBC-authorized spending categories (Fifth Schedule proportions).
                </p>
              </div>
            ) : canPreview ? (
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl animate-pulse">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-violet-300 border-t-violet-600 rounded-full animate-spin" />
                  <p className="text-sm text-gray-500">Loading IEBC limit from gazette database…</p>
                </div>
              </div>
            ) : null}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="vc-label">Total Party Budget (KES)</label>
                <input
                  type="number" className="vc-input"
                  value={form.totalBudget}
                  onChange={(e) => set('totalBudget', e.target.value)}
                  placeholder="0" min="0"
                />
                <p className="text-xs text-gray-400 mt-0.5">Total approved campaign budget (party allocation)</p>
              </div>
              <div>
                <label className="vc-label flex items-center gap-2">
                  IEBC Spending Limit (KES)
                  {iebcPreview && <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-semibold">Auto</span>}
                </label>
                <input
                  type="number" className="vc-input"
                  value={form.iebcSpendingLimit || (iebcPreview ? String(iebcPreview.spendingLimitKes) : '')}
                  onChange={(e) => set('iebcSpendingLimit', e.target.value)}
                  placeholder={iebcPreview ? String(iebcPreview.spendingLimitKes) : '0'}
                  min="0"
                />
                <p className="text-xs text-gray-400 mt-0.5">
                  {iebcPreview ? `Auto: ${fmt(iebcPreview.spendingLimitKes)} — overrideable` : 'Maximum allowed by IEBC regulations'}
                </p>
              </div>
            </div>

            {/* Review summary */}
            <div className="bg-gray-50 rounded-xl p-5 space-y-3">
              <h4 className="text-sm font-semibold text-gray-700">Campaign Summary</h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  { label: 'Campaign Name',   value: form.name || '—' },
                  { label: 'Type',            value: CAMPAIGN_TYPES.find(t => t.value === form.campaignType)?.label },
                  { label: 'Target Position', value: positionMeta?.label },
                  { label: 'Schedule',        value: positionMeta?.schedule },
                  { label: 'Candidate',       value: form.candidateName || '—' },
                  { label: 'County',          value: selectedCounty?.name ?? (form.countyCode || (form.targetPosition === 'PRESIDENT' ? 'National' : '—')) },
                  { label: 'Constituency',    value: selectedConstituency?.name ?? (form.constituencyCode || '—') },
                  { label: 'Ward',            value: selectedWard?.name ?? (form.wardCode || '—') },
                  { label: 'Start Date',      value: form.campaignStartDate || '—' },
                  { label: 'Election Date',   value: form.electionDate || '—' },
                  { label: 'IEBC Limit',      value: iebcPreview ? fmt(iebcPreview.spendingLimitKes) : (form.iebcSpendingLimit ? fmt(parseFloat(form.iebcSpendingLimit)) : '—') },
                  { label: 'Registered Voters', value: iebcPreview?.registeredVoters ? Number(iebcPreview.registeredVoters).toLocaleString() : '—' },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p className="text-gray-500 text-xs">{label}</p>
                    <p className="font-medium text-gray-900 text-sm">{value}</p>
                  </div>
                ))}
              </div>
            </div>

            {createMutation.isError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-sm text-red-700">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                Failed to create campaign. Please check all fields and try again.
              </div>
            )}
          </div>
        )}

        {/* Footer actions */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between bg-gray-50 rounded-b-xl">
          <button
            onClick={() => step === 1 ? navigate('/campaign') : setStep((step - 1) as 1 | 2)}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 font-medium"
          >
            {step === 1 ? 'Cancel' : '← Back'}
          </button>

          {step < 3 ? (
            <button
              onClick={() => setStep((step + 1) as 2 | 3)}
              disabled={step === 1 ? !canGoNext1 : !canGoNext2}
              className="vc-btn-primary"
            >
              Next →
            </button>
          ) : (
            <button
              onClick={() => createMutation.mutate()}
              disabled={!canSubmit}
              className="vc-btn-primary gap-2"
            >
              {createMutation.isPending ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating…
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Create Campaign
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function CreateCampaignPage() {
  return (
    <PageErrorBoundary page="Create Campaign">
      <CreateCampaignContent />
    </PageErrorBoundary>
  );
}
