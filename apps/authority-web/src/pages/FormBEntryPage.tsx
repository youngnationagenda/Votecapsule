// ============================================================
// VoteCapsule — Form B Tally Entry Page
// apps/authority-web/src/pages/FormBEntryPage.tsx
//
// Returning Officers enter Form B collation data at
// Constituency Tallying Centres.
// IEBC Forms: 34B (President), 35B (MP), 36B (MCA),
//             37B (Governor), 38B (Senator), 39B (Women Rep)
// ============================================================
import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
  FileEdit, PlusCircle, Trash2, CheckCircle, AlertTriangle,
  Info,
} from 'lucide-react';
import { apiClient } from '../api/apiClient';
import { PageErrorBoundary } from '../components/PageErrorBoundary';

// ── Types ──────────────────────────────────────────────────────

interface CandidateRow {
  ballotNumber: number;
  candidateName: string;
  runningMateName: string;
  deputyName: string;
  partyAbbreviation: string;
  votes: number | '';
}

interface ReconciliationResult {
  id: string;
  reconciliation_status: string;
  open_alert_count: number;
  form_type: string;
}

// ── Constants ──────────────────────────────────────────────────

const POSITION_OPTIONS = [
  { value: 'PRESIDENT',  label: 'President',         formType: 'FORM_34B', formLabel: '34B' },
  { value: 'MP',         label: 'MP (Nat. Assembly)', formType: 'FORM_35B', formLabel: '35B' },
  { value: 'MCA',        label: 'MCA (County Asm.)', formType: 'FORM_36B', formLabel: '36B' },
  { value: 'GOVERNOR',   label: 'Governor',           formType: 'FORM_37B', formLabel: '37B' },
  { value: 'SENATOR',    label: 'Senator',            formType: 'FORM_38B', formLabel: '38B' },
  { value: 'WOMEN_REP',  label: 'Women Rep',          formType: 'FORM_39B', formLabel: '39B' },
];

const CURRENT_ELECTION_ID = import.meta.env.VITE_CURRENT_ELECTION_ID ?? 'kenya-2027';
const CURRENT_ELECTION_YEAR = 2027;
const DEFAULT_TENANT_ID = import.meta.env.VITE_TENANT_ID ?? '00000000-0000-0000-0000-000000000001';

const emptyCandidate = (num: number): CandidateRow => ({
  ballotNumber: num,
  candidateName: '',
  runningMateName: '',
  deputyName: '',
  partyAbbreviation: '',
  votes: '',
});

// ── Math validation helpers ────────────────────────────────────

function computeMathCheck(
  ballotsIssued: number | '',
  validVotes: number | '',
  rejectedBallots: number | '',
  spoiltBallots: number | '',
  candidates: CandidateRow[],
) {
  if (
    ballotsIssued === '' || validVotes === '' ||
    rejectedBallots === '' || spoiltBallots === ''
  ) return null;

  const candSum = candidates.reduce(
    (s, c) => s + (typeof c.votes === 'number' ? c.votes : 0),
    0,
  );
  const expectedIssued = (validVotes as number) + (rejectedBallots as number) + (spoiltBallots as number);
  const issuedOk = (ballotsIssued as number) === expectedIssued;
  const candOk   = candSum === (validVotes as number);

  return { candSum, expectedIssued, issuedOk, candOk };
}

// ── Main component ─────────────────────────────────────────────

function FormBEntryPageContent(): React.JSX.Element {
  const [position, setPosition]               = useState('PRESIDENT');
  const [countyCode, setCountyCode]           = useState('');
  const [constituencyCode, setConstCode]      = useState('');
  const [wardCode, setWardCode]               = useState('');
  const [totalStations, setTotalStations]     = useState<number | ''>('');
  const [stationsReported, setStationsRep]    = useState<number | ''>('');
  const [registeredVoters, setRegVoters]      = useState<number | ''>('');
  const [ballotsIssued, setBallotsIssued]     = useState<number | ''>('');
  const [spoiltBallots, setSpoiltBallots]     = useState<number | ''>('');
  const [rejectedBallots, setRejBallots]      = useState<number | ''>('');
  const [validVotes, setValidVotes]           = useState<number | ''>('');
  const [candidates, setCandidates]           = useState<CandidateRow[]>([
    emptyCandidate(1),
    emptyCandidate(2),
  ]);
  const [returningOfficer, setROName]         = useState('');
  const [submitResult, setSubmitResult]       = useState<ReconciliationResult | null>(null);
  const [formError, setFormError]             = useState<string | null>(null);

  const positionMeta = POSITION_OPTIONS.find((p) => p.value === position)!;
  const isPresidential = position === 'PRESIDENT';
  const isGovernor     = position === 'GOVERNOR';
  const isMCA          = position === 'MCA';

  const mathCheck = computeMathCheck(
    ballotsIssued, validVotes, rejectedBallots, spoiltBallots, candidates,
  );

  // ── Add / remove candidate rows ────────────────────────────

  const addCandidate = () => {
    if (candidates.length >= 15) return;
    setCandidates((prev) => [...prev, emptyCandidate(prev.length + 1)]);
  };

  const removeCandidate = (idx: number) => {
    setCandidates((prev) =>
      prev.filter((_, i) => i !== idx).map((c, i) => ({ ...c, ballotNumber: i + 1 }))
    );
  };

  const updateCandidate = (idx: number, field: keyof CandidateRow, value: string | number) => {
    setCandidates((prev) =>
      prev.map((c, i) => (i === idx ? { ...c, [field]: value } : c))
    );
  };

  // ── Submit mutation ────────────────────────────────────────

  const submitMutation = useMutation({
    mutationFn: () => {
      const payload = {
        tenantId:          DEFAULT_TENANT_ID,
        electionId:        CURRENT_ELECTION_ID,
        electionYear:      CURRENT_ELECTION_YEAR,
        positionCode:      position,
        formType:          positionMeta.formType,
        countyCode:        countyCode.padStart(3, '0'),
        constituencyCode:  constituencyCode ? constituencyCode.padStart(3, '0') : undefined,
        wardCode:          wardCode ? wardCode.padStart(4, '0') : undefined,
        totalStations:     Number(totalStations),
        stationsReported:  Number(stationsReported),
        registeredVoters:  Number(registeredVoters),
        ballotsIssued:     Number(ballotsIssued),
        spoiltBallots:     Number(spoiltBallots),
        rejectedBallots:   Number(rejectedBallots),
        validVotes:        Number(validVotes),
        candidates:        candidates
          .filter((c) => c.candidateName.trim())
          .map((c) => ({
            ballotNumber:    c.ballotNumber,
            candidateName:   c.candidateName.trim(),
            runningMateName: isPresidential && c.runningMateName ? c.runningMateName : undefined,
            deputyName:      isGovernor && c.deputyName ? c.deputyName : undefined,
            partyAbbreviation: c.partyAbbreviation.trim(),
            votes:           Number(c.votes) || 0,
          })),
        returningOfficerName: returningOfficer.trim(),
      };
      return apiClient.post('/evidence/reconciliation/form-b', payload).then((r) => r.data);
    },
    onSuccess: (data) => {
      setSubmitResult(data);
      setFormError(null);
    },
    onError: (err: any) => {
      setFormError(
        err?.response?.data?.message ?? 'Submission failed. Check all fields and try again.'
      );
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!countyCode.trim()) { setFormError('County code is required'); return; }
    if (!returningOfficer.trim()) { setFormError('Returning Officer name is required'); return; }
    if (candidates.filter((c) => c.candidateName.trim()).length === 0) {
      setFormError('At least one candidate is required');
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
            <FileEdit className="w-5 h-5 text-emerald-600" />
            <h2 className="text-xl font-bold text-gray-900">Form B — Constituency/Ward Tally Entry</h2>
          </div>
          <p className="text-sm text-gray-500">
            IEBC Form B — {positionMeta.formLabel}: Enter collated results for{' '}
            <span className="font-medium">{positionMeta.label}</span> at the Constituency Tallying Centre.
          </p>
        </div>
        <span className="vc-badge bg-blue-50 text-blue-700 text-xs font-semibold tracking-wide px-3 py-1 flex-shrink-0">
          AI ASSISTS, HUMANS DECIDE
        </span>
      </div>

      {/* Math rules info */}
      <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 flex gap-3">
        <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-800">
          <p className="font-semibold mb-1">IEBC Mathematical Rules (Elections Regulations 2012):</p>
          <ul className="list-disc list-inside space-y-0.5 text-blue-700">
            <li>Ballots issued = Valid votes + Rejected ballots + Spoilt ballots</li>
            <li>Candidate vote totals must sum to Valid votes</li>
          </ul>
        </div>
      </div>

      {/* Success result banner */}
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
              {submitResult.reconciliation_status === 'MATCHED'
                ? 'Form B Submitted — MATCHED'
                : `Form B Submitted — ${submitResult.reconciliation_status}`}
            </p>
            <p className="text-sm text-gray-600 mt-1">
              {submitResult.reconciliation_status === 'MATCHED'
                ? 'Form B totals match the sum of all Form A submissions for this constituency.'
                : `Reconciliation discrepancy detected. ${submitResult.open_alert_count} alert(s) raised for review.`}
            </p>
            <p className="text-xs text-gray-400 mt-1">Form ID: {submitResult.id}</p>
          </div>
        </div>
      )}

      {/* Error banner */}
      {formError && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {formError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* Section 1: Position & Area */}
        <div className="vc-card space-y-4">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
            Position &amp; Area
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Election Position
              </label>
              <select
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-300"
              >
                {POSITION_OPTIONS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label} — IEBC Form {p.formLabel}
                  </option>
                ))}
              </select>
            </div>

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
                required
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-300"
              />
            </div>

            {!isPresidential && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Constituency Code (3-digit)
                </label>
                <input
                  type="text"
                  value={constituencyCode}
                  onChange={(e) => setConstCode(e.target.value)}
                  placeholder="e.g. 001"
                  maxLength={3}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-300"
                />
              </div>
            )}

            {isMCA && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ward Code (4-digit)
                </label>
                <input
                  type="text"
                  value={wardCode}
                  onChange={(e) => setWardCode(e.target.value)}
                  placeholder="e.g. 0001"
                  maxLength={4}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-300"
                />
              </div>
            )}
          </div>
        </div>

        {/* Section 2: Stations & Turnout */}
        <div className="vc-card space-y-4">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
            Stations &amp; Turnout
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {([
              { label: 'Total Stations', value: totalStations, setter: setTotalStations },
              { label: 'Stations Reported', value: stationsReported, setter: setStationsRep },
              { label: 'Registered Voters', value: registeredVoters, setter: setRegVoters },
              { label: 'Ballots Issued', value: ballotsIssued, setter: setBallotsIssued },
              { label: 'Spoilt Ballots', value: spoiltBallots, setter: setSpoiltBallots },
              { label: 'Rejected Ballots', value: rejectedBallots, setter: setRejBallots },
              { label: 'Valid Votes', value: validVotes, setter: setValidVotes },
            ] as Array<{ label: string; value: number | ''; setter: (v: number | '') => void }>).map(
              ({ label, value, setter }) => (
                <div key={label}>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
                  <input
                    type="number"
                    min={0}
                    value={value}
                    onChange={(e) =>
                      setter(e.target.value === '' ? '' : parseInt(e.target.value, 10))
                    }
                    required
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-300"
                  />
                </div>
              )
            )}
          </div>

          {/* Live math check */}
          {mathCheck && (
            <div className={`rounded-lg p-3 text-sm ${
              mathCheck.issuedOk && mathCheck.candOk
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-amber-50 text-amber-800 border border-amber-200'
            }`}>
              <div className="flex items-center gap-2 font-semibold mb-1">
                {mathCheck.issuedOk && mathCheck.candOk ? (
                  <><CheckCircle className="w-4 h-4" /> Math checks pass</>
                ) : (
                  <><AlertTriangle className="w-4 h-4" /> Math check failed</>
                )}
              </div>
              <ul className="space-y-0.5 text-xs">
                <li>
                  Ballots issued ({ballotsIssued}) vs. valid+rejected+spoilt ({mathCheck.expectedIssued}):{' '}
                  <span className={mathCheck.issuedOk ? 'text-emerald-700 font-semibold' : 'text-red-600 font-semibold'}>
                    {mathCheck.issuedOk ? 'OK' : 'MISMATCH'}
                  </span>
                </li>
                <li>
                  Candidate sum ({mathCheck.candSum}) vs. valid votes ({validVotes}):{' '}
                  <span className={mathCheck.candOk ? 'text-emerald-700 font-semibold' : 'text-red-600 font-semibold'}>
                    {mathCheck.candOk ? 'OK' : 'MISMATCH'}
                  </span>
                </li>
              </ul>
            </div>
          )}
        </div>

        {/* Section 3: Candidates */}
        <div className="vc-card space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
              Candidates (max 15)
            </h3>
            <button
              type="button"
              onClick={addCandidate}
              disabled={candidates.length >= 15}
              className="flex items-center gap-1.5 text-sm text-emerald-600 hover:text-emerald-800 font-medium disabled:opacity-40"
            >
              <PlusCircle className="w-4 h-4" />
              Add row
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 px-2 text-xs font-medium text-gray-500 w-10">#</th>
                  <th className="text-left py-2 px-2 text-xs font-medium text-gray-500">Candidate Name</th>
                  {isPresidential && (
                    <th className="text-left py-2 px-2 text-xs font-medium text-gray-500">Running Mate</th>
                  )}
                  {isGovernor && (
                    <th className="text-left py-2 px-2 text-xs font-medium text-gray-500">Deputy</th>
                  )}
                  <th className="text-left py-2 px-2 text-xs font-medium text-gray-500 w-20">Party</th>
                  <th className="text-left py-2 px-2 text-xs font-medium text-gray-500 w-28">Votes</th>
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {candidates.map((cand, idx) => (
                  <tr key={idx}>
                    <td className="py-2 px-2 text-gray-400 text-xs font-mono">{cand.ballotNumber}</td>
                    <td className="py-2 px-2">
                      <input
                        type="text"
                        value={cand.candidateName}
                        onChange={(e) => updateCandidate(idx, 'candidateName', e.target.value)}
                        placeholder="Full name"
                        className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-300"
                      />
                    </td>
                    {isPresidential && (
                      <td className="py-2 px-2">
                        <input
                          type="text"
                          value={cand.runningMateName}
                          onChange={(e) => updateCandidate(idx, 'runningMateName', e.target.value)}
                          placeholder="Running mate"
                          className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-300"
                        />
                      </td>
                    )}
                    {isGovernor && (
                      <td className="py-2 px-2">
                        <input
                          type="text"
                          value={cand.deputyName}
                          onChange={(e) => updateCandidate(idx, 'deputyName', e.target.value)}
                          placeholder="Deputy"
                          className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-300"
                        />
                      </td>
                    )}
                    <td className="py-2 px-2">
                      <input
                        type="text"
                        value={cand.partyAbbreviation}
                        onChange={(e) => updateCandidate(idx, 'partyAbbreviation', e.target.value)}
                        placeholder="UDA"
                        maxLength={20}
                        className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-emerald-300"
                      />
                    </td>
                    <td className="py-2 px-2">
                      <input
                        type="number"
                        min={0}
                        value={cand.votes}
                        onChange={(e) =>
                          updateCandidate(
                            idx,
                            'votes',
                            e.target.value === '' ? '' : parseInt(e.target.value, 10),
                          )
                        }
                        className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-emerald-300"
                      />
                    </td>
                    <td className="py-2 px-2">
                      {candidates.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeCandidate(idx)}
                          className="text-gray-300 hover:text-red-400"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Section 4: Returning Officer */}
        <div className="vc-card space-y-4">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
            Returning Officer
          </h3>
          <div className="max-w-sm">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Returning Officer Name (as signed on Form B)
            </label>
            <input
              type="text"
              value={returningOfficer}
              onChange={(e) => setROName(e.target.value)}
              placeholder="Full name of Returning Officer"
              required
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
            />
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={submitMutation.isPending}
            className="bg-emerald-600 text-white text-sm font-semibold px-6 py-3 rounded-xl hover:bg-emerald-700 disabled:opacity-50 transition-colors"
          >
            {submitMutation.isPending ? 'Submitting…' : `Submit IEBC Form ${positionMeta.formLabel}`}
          </button>
          <p className="text-xs text-gray-400">
            Submission is recorded in the immutable audit trail.
          </p>
        </div>

      </form>
    </div>
  );
}

export function FormBEntryPage() {
  return (
    <PageErrorBoundary page="Form B Entry">
      <FormBEntryPageContent />
    </PageErrorBoundary>
  );
}
