/**
 * Vote Capsule™ — Political Party Nominations Page
 *
 * VALUE PROPOSITION: Run your party's internal nominations using the
 * same rigorous evidence capture + reconciliation as the General
 * Election. Every vote is auditable, tamper-proof, and backed by
 * Hedera Consensus Service + RFC 3161 timestamp anchoring.
 *
 * Flow:
 *   1. Party creates a Nomination election linked to the General Election
 *   2. Party members register as candidates for each position
 *   3. Nomination election runs the full lifecycle (PLANNING → RESULTS_PUBLISHED)
 *   4. Results declared → winner promoted to General Election (PARTY_SPONSORED)
 *   5. IEBC approves the promoted candidate in the General Election
 */

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Vote, Plus, ChevronRight, Users, Trophy, ArrowRight,
  CheckCircle2, XCircle, Clock, AlertTriangle, Shield,
  Star, Flag, Calendar,
} from 'lucide-react';
import { clsx } from 'clsx';
import { useAppSelector } from '../store/hooks';
import { apiClient } from '../api/apiClient';
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
}

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

// ── Create Nomination Modal ───────────────────────────────────

function CreateNominationModal({
  generalElections,
  partyId,
  tenantId,
  userId,
  onClose,
}: {
  generalElections: GeneralElection[];
  partyId: string;
  tenantId: string;
  userId: string;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    parentElectionId: generalElections[0]?.id ?? '',
    name: '',
    electionYear: 2027,
    nominationDeadline: '',
    nominationVotingDate: '',
    nominationFeeKes: 0,
    maxCandidatesPerPosition: 10,
    description: '',
  });

  const mutation = useMutation({
    mutationFn: () =>
      apiClient.post('/candidate/nominations', {
        ...form,
        partyId,
        nominationFeeKes: Number(form.nominationFeeKes),
        maxCandidatesPerPosition: Number(form.maxCandidatesPerPosition),
      }, {
        headers: { 'x-tenant-id': tenantId, 'x-user-id': userId },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['party-nominations'] });
      onClose();
    },
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-100 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center">
            <Vote className="w-4 h-4 text-violet-600" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900">Create Party Nomination Election</h2>
            <p className="text-xs text-gray-500 mt-0.5">Powered by VoteCapsule™ integrity infrastructure</p>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div className="p-3 bg-violet-50 border border-violet-200 rounded-lg text-xs text-violet-800">
            <strong>🏆 Party Value:</strong> Your nomination runs on the same evidence capture and
            reconciliation engine as the IEBC General Election — every vote is anchored to Hedera
            Consensus Service and verified with RFC 3161 timestamps.
          </div>

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
            <p className="text-xs text-gray-400 mt-1">
              Winners will be promoted to this election as party-sponsored candidates.
            </p>
          </div>

          <div>
            <label className="vc-label">Nomination Election Name</label>
            <input
              className="vc-input"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. UDA 2027 Parliamentary Nominations — Nairobi"
              required
            />
          </div>

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
            </div>
            <div>
              <label className="vc-label">Max Candidates per Position</label>
              <input type="number" className="vc-input" min="2" max="50"
                value={form.maxCandidatesPerPosition}
                onChange={e => setForm({ ...form, maxCandidatesPerPosition: Number(e.target.value) })} />
            </div>
          </div>

          <div>
            <label className="vc-label">Description (optional)</label>
            <textarea
              className="vc-input h-20 resize-none"
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              placeholder="Briefly describe this nomination exercise..."
            />
          </div>

          {mutation.isError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
              Failed to create nomination. Please check all fields and try again.
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-100 flex gap-3">
          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !form.name.trim() || !form.parentElectionId}
            className="vc-btn-primary flex-1"
          >
            {mutation.isPending ? 'Creating…' : 'Create Nomination Election'}
          </button>
          <button onClick={onClose} className="vc-btn-secondary">Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ── Nomination Election Card ──────────────────────────────────

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
            </div>
            <div className="flex items-center gap-4 mt-1.5 text-xs text-gray-500 flex-wrap">
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {election.electionYear}
              </span>
              {election.nominationDeadline && (
                <span>Nominations close: {new Date(election.nominationDeadline).toLocaleDateString('en-KE')}</span>
              )}
              {election.nominationVotingDate && (
                <span>Voting day: {new Date(election.nominationVotingDate).toLocaleDateString('en-KE')}</span>
              )}
              {election.nominationFeeKes > 0 && (
                <span>Fee: KES {election.nominationFeeKes.toLocaleString()}</span>
              )}
            </div>
          </div>

          {nextAction && !['CLOSED', 'CANCELLED'].includes(election.status) && (
            <button
              onClick={() => {
                if (!window.confirm(`Advance to: "${nextAction.label}"?`)) return;
                lifecycleMutation.mutate(nextAction.action);
              }}
              disabled={lifecycleMutation.isPending}
              className={clsx('px-3 py-1.5 rounded-lg text-sm font-medium transition-colors', nextAction.color)}
            >
              {nextAction.label} →
            </button>
          )}
        </div>

        {/* Progress */}
        {election.parentElectionId && (
          <div className="mt-3 p-2 bg-blue-50 rounded-lg text-xs text-blue-700 flex items-center gap-2">
            <ArrowRight className="w-3 h-3 flex-shrink-0" />
            Winners will be promoted to the General Election as party-sponsored candidates
            {winners.length > 0 && ` · ${winners.length} winner${winners.length > 1 ? 's' : ''} declared`}
            {promoted.length > 0 && ` · ${promoted.length} promoted ✅`}
          </div>
        )}
      </div>

      {/* Candidates toggle */}
      <div className="border-t border-gray-100 px-5 py-3">
        <button
          onClick={() => setShowCandidates(!showCandidates)}
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
        >
          <Users className="w-4 h-4" />
          {showCandidates ? 'Hide Candidates' : 'Show Candidates'}
          <ChevronRight className={clsx('w-4 h-4 transition-transform', showCandidates && 'rotate-90')} />
        </button>
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
                Party members can register once nominations are open.
              </p>
            </div>
          ) : (
            <table className="vc-table text-sm">
              <thead>
                <tr>
                  <th>Candidate</th>
                  <th>Position</th>
                  <th>Area</th>
                  <th>Status</th>
                  <th>Nomination</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {candidates.map(c => (
                  <tr key={c.id}>
                    <td className="font-medium">{c.fullName}</td>
                    <td>{c.positionCode?.replace('_', ' ')}</td>
                    <td className="text-xs text-gray-500">
                      {c.constituencyCode ?? c.countyCode ?? '—'}
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
                        {/* Declare winner — only when results are being tallied */}
                        {election.status === 'RESULTS_PUBLISHED' && c.nominationWon === null && (
                          <button
                            onClick={() => {
                              if (!window.confirm(`Declare ${c.fullName} as nomination winner?`)) return;
                              declareWinnerMutation.mutate(c.id);
                            }}
                            disabled={declareWinnerMutation.isPending}
                            className="px-2 py-1 rounded text-xs bg-amber-100 text-amber-700 hover:bg-amber-200 font-medium"
                          >
                            <Star className="w-3 h-3 inline mr-0.5" /> Declare Winner
                          </button>
                        )}
                        {/* Promote to general election */}
                        {c.nominationWon === true && c.sponsorshipType !== 'PARTY_SPONSORED' && (
                          <button
                            onClick={() => {
                              if (!window.confirm(`Promote ${c.fullName} to General Election?`)) return;
                              promoteMutation.mutate(c.id);
                            }}
                            disabled={promoteMutation.isPending}
                            className="px-2 py-1 rounded text-xs bg-[#0B3C6D] text-white hover:bg-[#0a3460] font-medium"
                          >
                            <ArrowRight className="w-3 h-3 inline mr-0.5" /> Promote to GE
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

// ── Main Page ─────────────────────────────────────────────────

function NominationsPageContent(): React.JSX.Element {
  const user = useAppSelector((s: any) => s.auth.user);
  const tenantId = user?.tenantId ?? '';
  const userId   = user?.id ?? '';
  const partyId  = user?.partyId ?? tenantId;  // Party ID from JWT claim

  const [showCreate, setShowCreate] = useState(false);

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

  const activeNominations  = (nominations ?? []).filter(n => !['CLOSED','CANCELLED'].includes(n.status));
  const closedNominations  = (nominations ?? []).filter(n => ['CLOSED','CANCELLED'].includes(n.status));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Party Nominations</h2>
          <p className="text-sm text-gray-500 mt-1">
            Run your internal nominations with the same integrity infrastructure as the General Election
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="vc-btn-primary gap-2"
        >
          <Plus className="w-4 h-4" />
          New Nomination
        </button>
      </div>

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
              and photo of the tally form. Results are anchored to Hedera Consensus Service and
              RFC 3161 timestamps — providing the same integrity chain as the IEBC General Election.
              Dispute resolution becomes evidence-based, not opinion-based.
            </p>
            <div className="flex items-center gap-4 mt-2 text-xs text-violet-600 flex-wrap">
              <span>✓ Offline-first mobile capture</span>
              <span>✓ Form A/B/C reconciliation</span>
              <span>✓ Hedera + RFC 3161 anchoring</span>
              <span>✓ AI verification on all forms</span>
              <span>✓ One-click promotion to General Election</span>
            </div>
          </div>
        </div>
      </div>

      {/* Active nominations */}
      {nomLoading ? (
        <div className="text-center py-12 text-gray-400">Loading nominations…</div>
      ) : activeNominations.length === 0 && closedNominations.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center shadow-sm">
          <Vote className="w-14 h-14 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-700 font-medium">No nominations yet</p>
          <p className="text-sm text-gray-400 mt-1 mb-4">
            Create your first nomination election to get started.
          </p>
          <button onClick={() => setShowCreate(true)} className="vc-btn-primary gap-2 mx-auto">
            <Plus className="w-4 h-4" /> Create First Nomination
          </button>
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

      {/* How it works */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">How Nomination Elections Work</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-center">
          {[
            { step: '1', icon: Plus, label: 'Create Nomination', desc: 'Link to General Election 2027' },
            { step: '2', icon: Users, label: 'Members Register', desc: 'Party members apply as candidates' },
            { step: '3', icon: Vote, label: 'Voting Day', desc: 'Mobile app captures Form A data at each polling station' },
            { step: '4', icon: Trophy, label: 'Declare Winner', desc: 'Results verified via Form A/B reconciliation' },
            { step: '5', icon: ArrowRight, label: 'Promote to GE', desc: 'Winner becomes PARTY_SPONSORED candidate in General Election' },
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
