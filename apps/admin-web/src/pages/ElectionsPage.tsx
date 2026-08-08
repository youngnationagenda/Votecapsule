/**
 * Vote Capsule™ Admin Portal — Elections Management Page
 *
 * Full election lifecycle management:
 *   PLANNING → NOMINATION → CAMPAIGN → ACTIVE → TALLYING → RESULTS_PUBLISHED → CLOSED
 *
 * Creates elections, manages lifecycle transitions, views positions.
 */

import React, { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Vote, Plus, ChevronRight, Calendar, Flag,
  PlayCircle, CheckCircle2, XCircle, Clock, AlertTriangle,
} from 'lucide-react';
import { clsx } from 'clsx';
import { electionClient, candidateClient } from '../api/apiClient';

interface Election {
  id: string;
  tenantId: string;
  name: string;
  type: 'GENERAL' | 'BY_ELECTION' | 'REPEAT';
  electionType?: 'GENERAL' | 'BY_ELECTION' | 'REPEAT' | 'PARTY_NOMINATION';
  electionYear: number;
  electionDate: string | null;
  nominationDeadline: string | null;
  campaignStartDate: string | null;
  campaignEndDate: string | null;
  status: string;
  isActive: boolean;
  description: string | null;
  gazetteReference: string | null;
  createdAt: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  PLANNING:          { label: 'Planning',           color: 'text-gray-600 bg-gray-50',     icon: Clock },
  NOMINATION:        { label: 'Nominations Open',   color: 'text-blue-600 bg-blue-50',     icon: Flag },
  CAMPAIGN:          { label: 'Campaigning',        color: 'text-violet-600 bg-violet-50', icon: PlayCircle },
  ACTIVE:            { label: 'Voting Open',        color: 'text-emerald-600 bg-emerald-50', icon: CheckCircle2 },
  TALLYING:          { label: 'Tallying',           color: 'text-amber-600 bg-amber-50',   icon: Clock },
  RESULTS_PUBLISHED: { label: 'Results Published',  color: 'text-[#0B3C6D] bg-blue-50',   icon: CheckCircle2 },
  CLOSED:            { label: 'Closed',             color: 'text-gray-500 bg-gray-50',     icon: CheckCircle2 },
  CANCELLED:         { label: 'Cancelled',          color: 'text-red-600 bg-red-50',       icon: XCircle },
};

const LIFECYCLE_TRANSITIONS: Record<string, { label: string; action: string; color: string }> = {
  PLANNING:          { label: 'Open Nominations', action: 'nominations/open',  color: 'bg-blue-600 hover:bg-blue-700' },
  NOMINATION:        { label: 'Open Campaign',    action: 'campaign/open',     color: 'bg-violet-600 hover:bg-violet-700' },
  CAMPAIGN:          { label: 'Open Voting',      action: 'voting/open',       color: 'bg-emerald-600 hover:bg-emerald-700' },
  ACTIVE:            { label: 'Close Polls',      action: 'voting/close',      color: 'bg-amber-600 hover:bg-amber-700' },
  TALLYING:          { label: 'Publish Results',  action: 'results/publish',   color: 'bg-[#0B3C6D] hover:bg-[#0a3460]' },
  RESULTS_PUBLISHED: { label: 'Archive',          action: 'close',             color: 'bg-gray-600 hover:bg-gray-700' },
};

export function ElectionsPage(): React.JSX.Element {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    name: '',
    type: 'GENERAL' as Election['type'],
    electionYear: 2027,
    electionDate: '',
    nominationDeadline: '',
    description: '',
  });

  const { data: elections, isLoading } = useQuery<Election[]>({
    queryKey: ['elections'],
    queryFn: () => electionClient.get<Election[]>('/elections').then(r => r.data?.data ?? r.data ?? []),
    retry: 1,
    staleTime: 30_000,
  });

  const createMutation = useMutation({
    mutationFn: (payload: typeof form) =>
      electionClient.post('/elections', payload, {
        headers: {
          'x-tenant-id': 'platform',
          'x-user-id':   'admin',
        },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['elections'] });
      setShowCreate(false);
      setForm({ name: '', type: 'GENERAL', electionYear: 2027, electionDate: '', nominationDeadline: '', description: '' });
    },
  });

  const lifecycleMutation = useMutation({
    mutationFn: ({ id, action }: { id: string; action: string }) =>
      electionClient.post(`/elections/${id}/${action}`, {}, {
        headers: { 'x-tenant-id': 'platform', 'x-user-id': 'admin' },
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['elections'] }),
  });

  const cancelMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      electionClient.post(`/elections/${id}/cancel`, { reason }, {
        headers: { 'x-tenant-id': 'platform', 'x-user-id': 'admin' },
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['elections'] }),
  });

  const handleLifecycle = useCallback((election: Election) => {
    const transition = LIFECYCLE_TRANSITIONS[election.status];
    if (!transition) return;
    if (!window.confirm(`Advance "${election.name}" to next stage: ${transition.label}?`)) return;
    lifecycleMutation.mutate({ id: election.id, action: transition.action });
  }, [lifecycleMutation]);

  const handleCancel = useCallback((election: Election) => {
    const reason = window.prompt(`Cancel "${election.name}"? Enter reason:`);
    if (!reason) return;
    cancelMutation.mutate({ id: election.id, reason });
  }, [cancelMutation]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Elections</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage the Kenya 2027 General Election lifecycle
          </p>
        </div>
        <button onClick={() => setShowCreate(true)} className="vc-btn-primary gap-2">
          <Plus className="w-4 h-4" />
          Create Election
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="bg-white rounded-xl border border-blue-200 p-6 shadow-sm">
          <h2 className="text-base font-semibold text-gray-900 mb-4">New Election</h2>
          <form
            onSubmit={(e) => { e.preventDefault(); createMutation.mutate(form); }}
            className="space-y-4"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="vc-label">Election Name</label>
                <input className="vc-input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Kenya General Election 2027" required />
              </div>
              <div>
                <label className="vc-label">Type</label>
                <select className="vc-input" value={form.type} onChange={e => setForm({...form, type: e.target.value as Election['type']})}>
                  <option value="GENERAL">General Election</option>
                  <option value="BY_ELECTION">By-Election</option>
                  <option value="REPEAT">Repeat Election</option>
                </select>
              </div>
              <div>
                <label className="vc-label">Election Year</label>
                <input className="vc-input" type="number" value={form.electionYear} onChange={e => setForm({...form, electionYear: parseInt(e.target.value)})} min="2024" max="2050" required />
              </div>
              <div>
                <label className="vc-label">Election Date</label>
                <input className="vc-input" type="date" value={form.electionDate} onChange={e => setForm({...form, electionDate: e.target.value})} />
              </div>
              <div>
                <label className="vc-label">Nomination Deadline</label>
                <input className="vc-input" type="date" value={form.nominationDeadline} onChange={e => setForm({...form, nominationDeadline: e.target.value})} />
              </div>
              <div>
                <label className="vc-label">Description (optional)</label>
                <input className="vc-input" value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
              </div>
            </div>
            {createMutation.isError && (
              <p className="text-sm text-red-600">Failed to create election. Please try again.</p>
            )}
            <div className="flex gap-3">
              <button type="submit" disabled={createMutation.isPending} className="vc-btn-primary">
                {createMutation.isPending ? 'Creating…' : 'Create Election'}
              </button>
              <button type="button" onClick={() => setShowCreate(false)} className="vc-btn-secondary">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Elections list */}
      {isLoading ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400 shadow-sm">
          Loading elections…
        </div>
      ) : !elections || elections.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center shadow-sm">
          <Vote className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No elections yet</p>
          <p className="text-sm text-gray-400 mt-1">Create the Kenya 2027 General Election to get started.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {(Array.isArray(elections) ? elections : []).map((election) => {
            const statusCfg = STATUS_CONFIG[election.status] ?? STATUS_CONFIG.PLANNING;
            const StatusIcon = statusCfg.icon;
            const transition = LIFECYCLE_TRANSITIONS[election.status];

            return (
              <div key={election.id} className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h2 className="text-lg font-semibold text-gray-900">{election.name}</h2>
                      {election.isActive && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          ACTIVE
                        </span>
                      )}
                      <span className={clsx('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold', statusCfg.color)}>
                        <StatusIcon className="w-3 h-3" />
                        {statusCfg.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-500 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {election.type} · {election.electionYear}
                      </span>
                      {election.electionDate && (
                        <span>Election Date: {new Date(election.electionDate).toLocaleDateString('en-KE')}</span>
                      )}
                      {election.nominationDeadline && (
                        <span>Nominations close: {new Date(election.nominationDeadline).toLocaleDateString('en-KE')}</span>
                      )}
                    </div>
                    {election.description && (
                      <p className="mt-2 text-sm text-gray-500">{election.description}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {transition && !['CLOSED', 'CANCELLED'].includes(election.status) && (
                      <button
                        onClick={() => handleLifecycle(election)}
                        disabled={lifecycleMutation.isPending}
                        className={clsx('px-3 py-1.5 rounded-lg text-white text-sm font-medium transition-colors', transition.color)}
                      >
                        {transition.label}
                      </button>
                    )}
                    {!['CLOSED', 'CANCELLED', 'RESULTS_PUBLISHED'].includes(election.status) && (
                      <button
                        onClick={() => handleCancel(election)}
                        className="px-3 py-1.5 rounded-lg text-red-600 border border-red-200 text-sm font-medium hover:bg-red-50 transition-colors"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>

                {/* Lifecycle progress bar */}
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <div className="flex items-center justify-between">
                    {['PLANNING','NOMINATION','CAMPAIGN','ACTIVE','TALLYING','RESULTS_PUBLISHED','CLOSED'].map((stage, i, arr) => {
                      const stageStatuses = arr.slice(0, arr.indexOf(election.status) + 1);
                      const isComplete = stageStatuses.includes(stage);
                      const isCurrent = stage === election.status;
                      return (
                        <React.Fragment key={stage}>
                          <div className="flex flex-col items-center gap-1">
                            <div className={clsx(
                              'w-2.5 h-2.5 rounded-full border-2',
                              isCurrent ? 'bg-[#0B3C6D] border-[#0B3C6D]' :
                              isComplete ? 'bg-emerald-500 border-emerald-500' :
                              'bg-white border-gray-300',
                            )} />
                            <span className="text-[10px] text-gray-400 hidden md:block">{stage.replace('_',' ')}</span>
                          </div>
                          {i < arr.length - 1 && (
                            <div className={clsx('flex-1 h-0.5 mx-1', isComplete && !isCurrent ? 'bg-emerald-500' : 'bg-gray-200')} />
                          )}
                        </React.Fragment>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Warning */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
        <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-amber-800">
          <strong>Lifecycle changes are irreversible.</strong> Advancing an election to the next stage cannot be undone automatically. Only proceed when all prerequisite steps are complete.
        </div>
      </div>

      {/* Party Nominations Overview */}
      <PartyNominationsOverview elections={Array.isArray(elections) ? elections : []} />
    </div>
  );
}

// ── Party Nominations Overview ─────────────────────────────────
// Shows all party nomination elections linked to each general election.
// Allows IEBC admin to monitor which parties are running nominations
// and track candidates being promoted.

function PartyNominationsOverview({ elections }: { elections: Election[] }) {
  const generalElections = elections.filter(e => !e.electionType || e.electionType === 'GENERAL');

  // For each general election, fetch its party nominations
  const firstGeneral = generalElections[0];
  const [selectedElection, setSelectedElection] = React.useState<string>(firstGeneral?.id ?? '');

  const { data: nominations, isLoading } = useQuery({
    queryKey: ['admin-nominations', selectedElection],
    queryFn: () =>
      candidateClient.get(`/nominations?parentElectionId=${selectedElection}`)
        .then(r => r.data?.data ?? r.data ?? []),
    enabled: !!selectedElection,
    staleTime: 60_000,
  });

  if (generalElections.length === 0) return null;

  const nomList = Array.isArray(nominations) ? nominations : [];
  const byStatus = nomList.reduce((acc: Record<string, number>, n: any) => {
    acc[n.status] = (acc[n.status] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="bg-white rounded-xl border border-violet-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-5 border-b border-gray-100 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center">
            <Vote className="w-4 h-4 text-violet-600" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900">Party Nominations Monitor</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Political parties running internal nominations via VoteCapsule™
            </p>
          </div>
        </div>
        {generalElections.length > 1 && (
          <select
            className="vc-input py-1.5 text-sm w-auto"
            value={selectedElection}
            onChange={e => setSelectedElection(e.target.value)}
          >
            {generalElections.map(e => (
              <option key={e.id} value={e.id}>{e.name}</option>
            ))}
          </select>
        )}
      </div>

      {/* Stats */}
      {nomList.length > 0 && (
        <div className="px-5 py-3 border-b border-gray-100 flex gap-4 flex-wrap">
          <span className="text-xs text-gray-500">
            <strong className="text-gray-900 text-sm">{nomList.length}</strong> party nominations
          </span>
          {Object.entries(byStatus).map(([status, count]) => (
            <span key={status} className={clsx(
              'text-xs px-2 py-0.5 rounded-full font-medium',
              STATUS_CONFIG[status]?.color ?? 'text-gray-600 bg-gray-100'
            )}>
              {count as number} {status}
            </span>
          ))}
        </div>
      )}

      {/* Nominations list */}
      {isLoading ? (
        <div className="p-8 text-center text-gray-400 text-sm">Loading party nominations…</div>
      ) : nomList.length === 0 ? (
        <div className="p-8 text-center">
          <Flag className="w-10 h-10 text-gray-200 mx-auto mb-2" />
          <p className="text-sm text-gray-500">No party nominations yet</p>
          <p className="text-xs text-gray-400 mt-1">
            Political parties can create nomination elections from their Party Portal.
            Winners are automatically promoted as party-sponsored candidates in this election.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="vc-table text-sm">
            <thead>
              <tr>
                <th>Nomination Election</th>
                <th>Party</th>
                <th>Year</th>
                <th>Status</th>
                <th>Voting Day</th>
                <th>Candidates</th>
                <th>Winners Promoted</th>
              </tr>
            </thead>
            <tbody>
              {nomList.map((nom: any) => {
                const cfg = STATUS_CONFIG[nom.status] ?? STATUS_CONFIG.PLANNING;
                const CfgIcon = cfg.icon;
                return (
                  <tr key={nom.id}>
                    <td className="font-medium">{nom.name}</td>
                    <td className="text-xs text-gray-500 font-mono">{nom.partyId?.slice(0, 8)}…</td>
                    <td>{nom.electionYear}</td>
                    <td>
                      <span className={clsx('vc-badge flex items-center gap-1 w-fit text-xs', cfg.color)}>
                        <CfgIcon className="w-3 h-3" />
                        {cfg.label}
                      </span>
                    </td>
                    <td className="text-sm">
                      {nom.nominationVotingDate
                        ? new Date(nom.nominationVotingDate).toLocaleDateString('en-KE')
                        : '—'}
                    </td>
                    <td>{nom.candidateCount ?? '—'}</td>
                    <td>
                      {nom.promotedCount > 0 ? (
                        <span className="text-xs text-emerald-700 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          {nom.promotedCount} promoted
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">Pending</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Info box */}
      <div className="p-4 border-t border-gray-100 bg-violet-50">
        <p className="text-xs text-violet-800">
          <strong>How it works:</strong> Each political party creates their nomination election in the Party Portal,
          linked to this General Election. When a party declares a nomination winner, they can promote the winner
          here as a PARTY_SPONSORED candidate. IEBC then vets and approves all candidates (party-sponsored + independent)
          through the standard approval workflow before they appear on the ballot.
        </p>
      </div>
    </div>
  );
}
