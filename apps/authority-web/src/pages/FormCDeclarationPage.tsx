// ============================================================
// VoteCapsule — Form C Official Declaration Page
// apps/authority-web/src/pages/FormCDeclarationPage.tsx
//
// Official declaration forms entered by declaring officers.
// Presidential: Form 34C (national)
// Other positions: County-level Form C (37C Governor, 38C Senator,
//                  39C Women Rep)
// ============================================================
import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  Award, CheckCircle, AlertTriangle, Info, Crown,
} from 'lucide-react';
import { apiClient } from '../api/apiClient';
import { PageErrorBoundary } from '../components/PageErrorBoundary';

// ── Types ──────────────────────────────────────────────────────

interface FormBSummary {
  id: string;
  position_code: string;
  county_code: string | null;
  valid_votes: number;
  registered_voters: number;
  ballots_issued: number;
  rejected_ballots: number;
  reconciliation_status: string;
  candidates: Array<{
    ballot_number: number;
    candidate_name: string;
    running_mate_name?: string;
    deputy_name?: string;
    party_abbreviation: string;
    votes: number;
  }>;
}

interface AggregatedTotals {
  registeredVoters: number;
  ballotsIssued: number;
  validVotes: number;
  rejectedBallots: number;
  totalFormBs: number;
  candidateTotals: Array<{
    ballotNumber: number;
    candidateName: string;
    runningMateName?: string;
    deputyName?: string;
    partyAbbreviation: string;
    votes: number;
    percentage: number;
  }>;
  winner: { candidateName: string; votes: number; partyAbbreviation: string } | null;
}

interface ReconciliationResult {
  id: string;
  reconciliation_status: string;
  open_alert_count: number;
}

// ── Constants ──────────────────────────────────────────────────

const POSITION_OPTIONS = [
  { value: 'PRESIDENT', label: 'President',    formType: 'FORM_34C', formLabel: '34C', national: true },
  { value: 'GOVERNOR',  label: 'Governor',     formType: 'FORM_37C', formLabel: '37C', national: false },
  { value: 'SENATOR',   label: 'Senator',      formType: 'FORM_38C', formLabel: '38C', national: false },
  { value: 'WOMEN_REP', label: 'Women Rep',    formType: 'FORM_39C', formLabel: '39C', national: false },
];

const CURRENT_ELECTION_ID = import.meta.env.VITE_CURRENT_ELECTION_ID ?? 'kenya-2027';
const CURRENT_ELECTION_YEAR = 2027;
const DEFAULT_TENANT_ID = import.meta.env.VITE_TENANT_ID ?? '00000000-0000-0000-0000-000000000001';

// ── Aggregation helper ─────────────────────────────────────────

function aggregateFormBs(formBs: FormBSummary[]): AggregatedTotals {
  if (formBs.length === 0) {
    return {
      registeredVoters: 0,
      ballotsIssued: 0,
      validVotes: 0,
      rejectedBallots: 0,
      totalFormBs: 0,
      candidateTotals: [],
      winner: null,
    };
  }

  const totals = {
    registeredVoters: 0,
    ballotsIssued: 0,
    validVotes: 0,
    rejectedBallots: 0,
  };

  const candMap = new Map<number, {
    ballotNumber: number;
    candidateName: string;
    runningMateName?: string;
    deputyName?: string;
    partyAbbreviation: string;
    votes: number;
  }>();

  for (const fb of formBs) {
    totals.registeredVoters += fb.registered_voters ?? 0;
    totals.ballotsIssued    += fb.ballots_issued ?? 0;
    totals.validVotes       += fb.valid_votes ?? 0;
    totals.rejectedBallots  += fb.rejected_ballots ?? 0;

    for (const cand of fb.candidates ?? []) {
      const existing = candMap.get(cand.ballot_number);
      if (existing) {
        existing.votes += cand.votes;
      } else {
        candMap.set(cand.ballot_number, {
          ballotNumber:    cand.ballot_number,
          candidateName:   cand.candidate_name,
          runningMateName: cand.running_mate_name,
          deputyName:      cand.deputy_name,
          partyAbbreviation: cand.party_abbreviation,
          votes:           cand.votes,
        });
      }
    }
  }

  const candidateTotals = Array.from(candMap.values())
    .sort((a, b) => a.ballotNumber - b.ballotNumber)
    .map((c) => ({
      ...c,
      percentage: totals.validVotes > 0
        ? Math.round((c.votes / totals.validVotes) * 10000) / 100
        : 0,
    }));

  const winner = candidateTotals.reduce<typeof candidateTotals[0] | null>((best, c) => {
    if (!best || c.votes > best.votes) return c;
    return best;
  }, null);

  return {
    ...totals,
    totalFormBs: formBs.length,
    candidateTotals,
    winner: winner ? {
      candidateName: winner.candidateName,
      votes: winner.votes,
      partyAbbreviation: winner.partyAbbreviation,
    } : null,
  };
}

// ── Main component ─────────────────────────────────────────────

function FormCDeclarationPageContent(): React.JSX.Element {
  const [position, setPosition]           = useState('PRESIDENT');
  const [countyCode, setCountyCode]       = useState('');
  const [declaringOfficer, setOfficer]    = useState('');
  const [gazetteRef, setGazetteRef]       = useState('');
  const [submitResult, setSubmitResult]   = useState<ReconciliationResult | null>(null);
  const [formError, setFormError]         = useState<string | null>(null);

  const positionMeta = POSITION_OPTIONS.find((p) => p.value === position)!;
  const isNational   = positionMeta.national;

  // ── Fetch Form B summaries for aggregation ─────────────────

  const { data: formBsData, isLoading: formBsLoading } = useQuery<{ data: FormBSummary[] }>({
    queryKey: ['formB-summary', CURRENT_ELECTION_ID, position, countyCode],
    queryFn: () => {
      const params = new URLSearchParams({ electionId: CURRENT_ELECTION_ID });
      params.set('positionCode', position);
      if (!isNational && countyCode) params.set('countyCode', countyCode.padStart(3, '0'));
      params.set('limit', '500');
      return apiClient.get(`/evidence/reconciliation/form-b?${params}`).then((r) => r.data);
    },
    enabled: isNational || countyCode.length === 3,
  });

  const formBs     = formBsData?.data ?? [];
  const aggregated = aggregateFormBs(formBs);

  // ── Submit mutation ────────────────────────────────────────

  const submitMutation = useMutation({
    mutationFn: () => {
      const payload = {
        tenantId:           DEFAULT_TENANT_ID,
        electionId:         CURRENT_ELECTION_ID,
        electionYear:       CURRENT_ELECTION_YEAR,
        positionCode:       position,
        formType:           positionMeta.formType,
        countyCode:         isNational ? undefined : countyCode.padStart(3, '0'),
        totalFormBs:        aggregated.totalFormBs,
        registeredVoters:   aggregated.registeredVoters,
        ballotsIssued:      aggregated.ballotsIssued,
        validVotes:         aggregated.validVotes,
        rejectedBallots:    aggregated.rejectedBallots,
        candidates:         aggregated.candidateTotals.map((c) => ({
          ballotNumber:      c.ballotNumber,
          candidateName:     c.candidateName,
          runningMateName:   c.runningMateName,
          deputyName:        c.deputyName,
          partyAbbreviation: c.partyAbbreviation,
          votes:             c.votes,
        })),
        declaringOfficerName: declaringOfficer.trim(),
        gazetteReference:    gazetteRef.trim() || undefined,
      };
      return apiClient.post('/evidence/reconciliation/form-c', payload).then((r) => r.data);
    },
    onSuccess: (data) => {
      setSubmitResult(data);
      setFormError(null);
    },
    onError: (err: any) => {
      setFormError(
        err?.response?.data?.message ?? 'Declaration submission failed. Please check all fields.'
      );
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!isNational && !countyCode.trim()) {
      setFormError('County code is required for non-presidential declarations');
      return;
    }
    if (!declaringOfficer.trim()) {
      setFormError('Declaring Officer name is required');
      return;
    }
    if (aggregated.totalFormBs === 0) {
      setFormError('No Form B data available for the selected position/county. Submit Form Bs first.');
      return;
    }
    submitMutation.mutate();
  };

  // ── Render ────────────────────────────────────────────────

  return (
    <div className="space-y-6 max-w-4xl">

      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Award className="w-5 h-5 text-emerald-600" />
            <h2 className="text-xl font-bold text-gray-900">Form C — Official Declaration</h2>
          </div>
          <p className="text-sm text-gray-500">
            IEBC Form {positionMeta.formLabel}: Official declaration of results for{' '}
            <span className="font-medium">{positionMeta.label}</span>.{' '}
            {isNational
              ? 'National Declaration Centre — aggregates all 290 constituencies.'
              : 'County-level declaration — aggregates all constituency Form Bs for this county.'}
          </p>
        </div>
        <span className="vc-badge bg-purple-50 text-purple-700 text-xs font-semibold tracking-wide px-3 py-1 flex-shrink-0">
          OFFICIAL DECLARATION
        </span>
      </div>

      {/* Info box */}
      <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 flex gap-3">
        <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-800">
          <p className="font-semibold mb-1">Declaration Process:</p>
          <ul className="list-disc list-inside space-y-0.5 text-blue-700">
            <li>Totals below are calculated automatically from submitted Form B data</li>
            <li>Verify figures against the physical Form C before declaring</li>
            <li>Declaration is recorded in the immutable audit trail</li>
          </ul>
        </div>
      </div>

      {/* Success result */}
      {submitResult && (
        <div
          className={`rounded-xl border p-4 flex items-start gap-3 ${
            submitResult.reconciliation_status === 'MATCHED'
              ? 'bg-emerald-50 border-emerald-200'
              : 'bg-amber-50 border-amber-200'
          }`}
        >
          {submitResult.reconciliation_status === 'MATCHED' ? (
            <CheckCircle className="w-6 h-6 text-emerald-600 flex-shrink-0" />
          ) : (
            <AlertTriangle className="w-6 h-6 text-amber-500 flex-shrink-0" />
          )}
          <div>
            <p className="font-semibold text-gray-900">
              Form {positionMeta.formLabel} Declaration Submitted —{' '}
              {submitResult.reconciliation_status}
            </p>
            <p className="text-sm text-gray-600 mt-1">
              {submitResult.reconciliation_status === 'MATCHED'
                ? 'Declaration matches Form B totals.'
                : `Discrepancy detected — ${submitResult.open_alert_count} alert(s) raised for review.`}
            </p>
            <p className="text-xs text-gray-400 mt-1">Declaration ID: {submitResult.id}</p>
          </div>
        </div>
      )}

      {/* Error */}
      {formError && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {formError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* Section 1: Position & Scope */}
        <div className="vc-card space-y-4">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
            Position &amp; Scope
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Election Position
              </label>
              <select
                value={position}
                onChange={(e) => { setPosition(e.target.value); setCountyCode(''); }}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
              >
                {POSITION_OPTIONS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label} — IEBC Form {p.formLabel}
                  </option>
                ))}
              </select>
            </div>

            {!isNational && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  County Code (3-digit)
                </label>
                <input
                  type="text"
                  value={countyCode}
                  onChange={(e) => setCountyCode(e.target.value)}
                  placeholder="e.g. 001"
                  maxLength={3}
                  required={!isNational}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-300"
                />
              </div>
            )}
          </div>

          {isNational && (
            <div className="flex items-center gap-2 text-sm text-purple-700 bg-purple-50 border border-purple-200 rounded-lg p-3">
              <Crown className="w-4 h-4 flex-shrink-0" />
              <span>
                Presidential Declaration — Form 34C covers all 47 counties (national scope).
              </span>
            </div>
          )}
        </div>

        {/* Section 2: Aggregated Totals (read-only, from Form Bs) */}
        <div className="vc-card space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
              Aggregated Totals (from Form B data — read-only)
            </h3>
            {formBsLoading && (
              <span className="text-xs text-gray-400 animate-pulse">Loading Form B data…</span>
            )}
          </div>

          {aggregated.totalFormBs === 0 && !formBsLoading ? (
            <div className="rounded-lg bg-gray-50 border border-gray-200 p-4 text-sm text-gray-500 text-center">
              No Form B data found. Submit constituency Form Bs first before creating a Form C declaration.
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                {[
                  { label: 'Form Bs Included', value: aggregated.totalFormBs.toLocaleString() },
                  { label: 'Registered Voters', value: aggregated.registeredVoters.toLocaleString() },
                  { label: 'Ballots Issued', value: aggregated.ballotsIssued.toLocaleString() },
                  { label: 'Valid Votes', value: aggregated.validVotes.toLocaleString() },
                  { label: 'Rejected Ballots', value: aggregated.rejectedBallots.toLocaleString() },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                    <p className="text-xs text-gray-500">{label}</p>
                    <p className="text-lg font-bold text-gray-900 font-mono mt-0.5">{value}</p>
                  </div>
                ))}
              </div>

              {/* Candidate totals table */}
              {aggregated.candidateTotals.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Candidate Totals</h4>
                  <div className="overflow-x-auto">
                    <table className="vc-table">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Candidate</th>
                          <th>Party</th>
                          <th className="text-right">Votes</th>
                          <th className="text-right">%</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {aggregated.candidateTotals
                          .sort((a, b) => b.votes - a.votes)
                          .map((c) => (
                            <tr key={c.ballotNumber} className={
                              aggregated.winner?.candidateName === c.candidateName
                                ? 'bg-emerald-50'
                                : ''
                            }>
                              <td className="font-mono text-xs text-gray-400">{c.ballotNumber}</td>
                              <td className="font-medium">
                                {c.candidateName}
                                {c.runningMateName && (
                                  <span className="block text-xs text-gray-500">+ {c.runningMateName}</span>
                                )}
                                {c.deputyName && (
                                  <span className="block text-xs text-gray-500">+ {c.deputyName}</span>
                                )}
                              </td>
                              <td className="font-mono text-sm text-gray-600">{c.partyAbbreviation}</td>
                              <td className="text-right font-mono font-semibold">
                                {c.votes.toLocaleString()}
                              </td>
                              <td className="text-right text-gray-500 text-sm">
                                {c.percentage.toFixed(2)}%
                              </td>
                              <td>
                                {aggregated.winner?.candidateName === c.candidateName && (
                                  <span className="vc-badge bg-emerald-100 text-emerald-700 text-xs">
                                    WINNER
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Winner callout */}
              {aggregated.winner && (
                <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                  <Crown className="w-6 h-6 text-emerald-600 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      Winner based on aggregated totals:{' '}
                      <span className="text-emerald-700">{aggregated.winner.candidateName}</span>
                      {' '}({aggregated.winner.partyAbbreviation})
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {aggregated.winner.votes.toLocaleString()} votes —{' '}
                      verify against physical Form {positionMeta.formLabel} before declaring
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Section 3: Declaration Details */}
        <div className="vc-card space-y-4">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
            Declaration Details
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Declaring Officer Name (as signed on Form {positionMeta.formLabel})
              </label>
              <input
                type="text"
                value={declaringOfficer}
                onChange={(e) => setOfficer(e.target.value)}
                placeholder="Full name"
                required
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Gazette Reference (optional)
              </label>
              <input
                type="text"
                value={gazetteRef}
                onChange={(e) => setGazetteRef(e.target.value)}
                placeholder="e.g. Kenya Gazette Vol. CXXIX No. 45"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
              />
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={submitMutation.isPending || aggregated.totalFormBs === 0}
            className="bg-emerald-600 text-white text-sm font-semibold px-6 py-3 rounded-xl hover:bg-emerald-700 disabled:opacity-50 transition-colors"
          >
            {submitMutation.isPending
              ? 'Submitting Declaration…'
              : `Declare — IEBC Form ${positionMeta.formLabel}`}
          </button>
          <p className="text-xs text-gray-400">
            This declaration is permanent and recorded in the audit trail.
          </p>
        </div>

      </form>
    </div>
  );
}

export function FormCDeclarationPage() {
  return (
    <PageErrorBoundary page="Form C Declaration">
      <FormCDeclarationPageContent />
    </PageErrorBoundary>
  );
}
