// ============================================================
// VoteCapsule™ — Create Campaign Page (Party Portal)
// ============================================================
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  Megaphone, ArrowLeft, Calendar, MapPin, DollarSign,
  Users, FileText, CheckCircle, AlertTriangle,
} from 'lucide-react';
import { campaignApi } from '../api/campaignApi';
import { geographyApi, County, Constituency } from '../api/geographyApi';
import { PageErrorBoundary } from '../components/PageErrorBoundary';
import { useAppSelector } from '../store/hooks';

interface CampaignForm {
  name: string;
  description: string;
  campaignType: string;
  targetPosition: string;
  countyCode: string;
  constituencyCode: string;
  campaignStartDate: string;
  electionDate: string;
  totalBudget: string;
  iebcSpendingLimit: string;
  candidateName: string;
  candidateUserId: string;  // UUID of the candidate user in the system
  headquartersAddress: string;
}

const CAMPAIGN_TYPES = [
  { value: 'GENERAL_ELECTION', label: 'General Election Campaign' },
  { value: 'PARTY_PRIMARY',    label: 'Party Primary / Nomination' },
  { value: 'BY_ELECTION',      label: 'By-Election Campaign' },
  { value: 'AWARENESS',        label: 'Voter Awareness Campaign' },
];

const TARGET_POSITIONS = [
  { value: 'PRESIDENT',  label: 'President' },
  { value: 'GOVERNOR',   label: 'Governor' },
  { value: 'SENATOR',    label: 'Senator' },
  { value: 'WOMEN_REP',  label: 'Women Representative' },
  { value: 'MP',         label: 'Member of Parliament' },
  { value: 'MCA',        label: 'Member of County Assembly' },
];

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
    campaignStartDate: '',
    electionDate: '',
    totalBudget: '',
    iebcSpendingLimit: '',
    candidateName: '',
    candidateUserId: '',
    headquartersAddress: '',
  });
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Active election — auto-populated for campaign creation
  const { data: activeElection } = useQuery({
    queryKey: ['active-election'],
    queryFn: async () => {
      try {
        const r = await campaignApi.activeElection();
        const el = r.data?.data ?? r.data;
        return el?.id ? el : null;
      } catch { return null; }
    },
  });

  // NEC Geography
  const { data: counties = [] } = useQuery<County[]>({
    queryKey: ['nec-counties'],
    queryFn: () => geographyApi.getCounties(),
    staleTime: 10 * 60_000,
  });

  const { data: constituencies = [] } = useQuery<Constituency[]>({
    queryKey: ['nec-constituencies', form.countyCode],
    queryFn: () => geographyApi.getConstituencies(form.countyCode),
    enabled: !!form.countyCode,
    staleTime: 10 * 60_000,
  });

  const createMutation = useMutation({
    mutationFn: () => {
      if (!activeElection?.id) throw new Error('No active election found');
      return campaignApi.create({
        name:              form.name,
        description:       form.description || undefined,
        tenantId,
        // electionId is required by CreateCampaignDto
        electionId:        activeElection.id,
        // candidateId: use the supplied userId if a candidate is being assigned,
        // otherwise use the current party admin's user ID as placeholder
        candidateId:       form.candidateUserId || user?.id || '',
        countyCode:        form.countyCode        || undefined,
        constituencyCode:  form.constituencyCode  || undefined,
        campaignStartDate: form.campaignStartDate || undefined,
        campaignEndDate:   form.electionDate      || undefined,
        headquarters:      form.headquartersAddress || undefined,
        targetWards:       [],
        goals: {
          targetPosition:  form.targetPosition,
          campaignType:    form.campaignType,
          candidateName:   form.candidateName,
          totalBudget:     form.totalBudget ? parseFloat(form.totalBudget) : null,
          iebcSpendingLimit: form.iebcSpendingLimit ? parseFloat(form.iebcSpendingLimit) : null,
        },
      });
    },
    onSuccess: () => navigate('/campaign'),
  });

  const set = (field: keyof CampaignForm, value: string) =>
    setForm((f) => ({ ...f, [field]: value }));

  const canGoNext1 = form.name && form.campaignType && form.targetPosition && !!activeElection;
  const canGoNext2 = form.countyCode && form.campaignStartDate;
  const canSubmit  = canGoNext1 && canGoNext2 && !createMutation.isPending;

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

            {/* Active election indicator */}
            {activeElection ? (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <div>
                  <p className="text-xs text-emerald-600 font-medium">Election</p>
                  <p className="text-sm font-semibold text-emerald-800">{activeElection.name ?? 'Kenya General Election 2027'}</p>
                </div>
              </div>
            ) : (
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
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="w-5 h-5 text-violet-600" />
              <h3 className="text-base font-semibold text-gray-900">Geography & Timeline</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="vc-label">County <span className="text-red-500">*</span></label>
                <select
                  className="vc-input"
                  value={form.countyCode}
                  onChange={(e) => { set('countyCode', e.target.value); set('constituencyCode', ''); }}
                >
                  <option value="">Select County (NEC)</option>
                  {counties.map((c) => (
                    <option key={c.iebcCode} value={c.iebcCode}>
                      {c.iebcCode} — {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="vc-label">Constituency</label>
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
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="vc-label">Campaign Start Date <span className="text-red-500">*</span></label>
                <input
                  type="date"
                  className="vc-input"
                  value={form.campaignStartDate}
                  onChange={(e) => set('campaignStartDate', e.target.value)}
                />
              </div>
              <div>
                <label className="vc-label">Election Date</label>
                <input
                  type="date"
                  className="vc-input"
                  value={form.electionDate}
                  onChange={(e) => set('electionDate', e.target.value)}
                />
              </div>
            </div>

            <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg">
              <p className="text-sm text-blue-800 font-medium">NEC Geography Integration</p>
              <p className="text-xs text-blue-600 mt-1">
                Counties and constituencies are sourced from the National Elections Commission (NEC) database —
                47 counties, 292 constituencies, 45,805 polling stations.
                Campaign events and tasks will be scoped to the selected geography.
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="vc-label">Total Budget (KES)</label>
                <input
                  type="number"
                  className="vc-input"
                  value={form.totalBudget}
                  onChange={(e) => set('totalBudget', e.target.value)}
                  placeholder="0"
                  min="0"
                />
                <p className="text-xs text-gray-400 mt-0.5">Total approved campaign budget</p>
              </div>
              <div>
                <label className="vc-label">IEBC Spending Limit (KES)</label>
                <input
                  type="number"
                  className="vc-input"
                  value={form.iebcSpendingLimit}
                  onChange={(e) => set('iebcSpendingLimit', e.target.value)}
                  placeholder="0"
                  min="0"
                />
                <p className="text-xs text-gray-400 mt-0.5">Maximum allowed by IEBC campaign regulations</p>
              </div>
            </div>

            {/* Review summary */}
            <div className="bg-gray-50 rounded-xl p-5 space-y-3">
              <h4 className="text-sm font-semibold text-gray-700">Campaign Summary</h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-gray-500">Campaign Name</p>
                  <p className="font-medium text-gray-900">{form.name || '—'}</p>
                </div>
                <div>
                  <p className="text-gray-500">Type</p>
                  <p className="font-medium text-gray-900">{CAMPAIGN_TYPES.find(t => t.value === form.campaignType)?.label}</p>
                </div>
                <div>
                  <p className="text-gray-500">Target Position</p>
                  <p className="font-medium text-gray-900">{TARGET_POSITIONS.find(p => p.value === form.targetPosition)?.label}</p>
                </div>
                <div>
                  <p className="text-gray-500">Candidate</p>
                  <p className="font-medium text-gray-900">{form.candidateName || '—'}</p>
                </div>
                <div>
                  <p className="text-gray-500">County</p>
                  <p className="font-medium text-gray-900">
                    {counties.find(c => c.iebcCode === form.countyCode)?.name ?? (form.countyCode || '—')}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Constituency</p>
                  <p className="font-medium text-gray-900">
                    {constituencies.find(c => c.iebcCode === form.constituencyCode)?.name ?? (form.constituencyCode || '—')}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Start Date</p>
                  <p className="font-medium text-gray-900">{form.campaignStartDate || '—'}</p>
                </div>
                <div>
                  <p className="text-gray-500">Election Date</p>
                  <p className="font-medium text-gray-900">{form.electionDate || '—'}</p>
                </div>
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
