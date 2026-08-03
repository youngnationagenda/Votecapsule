import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CheckSquare, AlertTriangle, Clock, FileText,
  XCircle, Eye, RefreshCw, Info,
} from 'lucide-react';
import { apiClient } from '../api/apiClient';

// ── Types ──────────────────────────────────────────────────────

interface ReconciliationSummary {
  electionId: string;
  byPosition: PositionSummary[];
  totals: {
    totalFormBs: number;
    matched: number;
    discrepancies: number;
    pending: number;
    awaitingForms: number;
    openAlerts: number;
  };
}

interface PositionSummary {
  positionCode: string;
  formType: string;
  totalFormBs: number;
  matched: number;
  discrepancies: number;
  pending: number;
  awaitingForms: number;
}

interface ReconciliationAlert {
  id: string;
  alert_type: string;
  severity: string;
  description: string;
  status: string;
  constituency_code: string | null;
  position_code: string;
  form_b_id: string | null;
  delta_json: Record<string, unknown>;
  created_at: string;
}

interface FormBRecord {
  id: string;
  position_code: string;
  form_type: string;
  constituency_code: string | null;
  ward_code: string | null;
  county_code: string;
  total_stations: number;
  stations_reported: number;
  valid_votes: number;
  reconciliation_status: string;
  status: string;
  returning_officer_name: string;
  open_alert_count: number;
  created_at: string;
}

// ── Constants ──────────────────────────────────────────────────

// In production this would come from the auth context / session
const CURRENT_ELECTION_ID = import.meta.env.VITE_CURRENT_ELECTION_ID ?? 'kenya-2027';

// ── Badge helpers ──────────────────────────────────────────────

function ReconciliationStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    MATCHED:      'bg-emerald-100 text-emerald-800',
    DISCREPANCY:  'bg-red-100 text-red-800',
    PENDING:      'bg-amber-100 text-amber-800',
    AWAITING_FORMS: 'bg-blue-100 text-blue-800',
    OVERRIDDEN:   'bg-purple-100 text-purple-800',
  };
  return (
    <span className={`vc-badge ${map[status] ?? 'bg-gray-100 text-gray-700'}`}>
      {status}
    </span>
  );
}

function SeverityBadge({ severity }: { severity: string }) {
  const map: Record<string, string> = {
    HIGH:   'bg-red-100 text-red-800',
    MEDIUM: 'bg-amber-100 text-amber-800',
    LOW:    'bg-blue-100 text-blue-800',
  };
  return (
    <span className={`vc-badge ${map[severity] ?? 'bg-gray-100 text-gray-700'}`}>
      {severity}
    </span>
  );
}

function AlertStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    OPEN:         'bg-red-50 text-red-700',
    UNDER_REVIEW: 'bg-amber-50 text-amber-700',
    RESOLVED:     'bg-emerald-100 text-emerald-800',
    DISMISSED:    'bg-gray-100 text-gray-600',
  };
  return (
    <span className={`vc-badge ${map[status] ?? 'bg-gray-100 text-gray-700'}`}>
      {status}
    </span>
  );
}

// ── Main component ─────────────────────────────────────────────

export function ValidationMonitorPage(): React.JSX.Element {
  const queryClient = useQueryClient();
  const [alertFilter, setAlertFilter] = useState<{ severity?: string; status?: string; position?: string }>({});
  const [formBFilter, setFormBFilter] = useState<{ positionCode?: string; reconciliationStatus?: string }>({});
  const [resolvingAlertId, setResolvingAlertId] = useState<string | null>(null);
  const [resolveNotes, setResolveNotes] = useState('');

  // ── Data queries ──────────────────────────────────────────

  const { data: summary, isLoading: summaryLoading } = useQuery<ReconciliationSummary>({
    queryKey: ['reconciliation', 'summary', CURRENT_ELECTION_ID],
    queryFn: () =>
      apiClient
        .get(`/evidence/reconciliation/summary/${CURRENT_ELECTION_ID}`)
        .then((r) => r.data),
    refetchInterval: 30_000,
  });

  const { data: alertsData } = useQuery<{ data: ReconciliationAlert[]; total: number }>({
    queryKey: ['reconciliation', 'alerts', CURRENT_ELECTION_ID, alertFilter],
    queryFn: () => {
      const params = new URLSearchParams({ electionId: CURRENT_ELECTION_ID });
      if (alertFilter.severity) params.set('severity', alertFilter.severity);
      if (alertFilter.status)   params.set('status', alertFilter.status);
      if (alertFilter.position) params.set('positionCode', alertFilter.position);
      params.set('limit', '100');
      return apiClient.get(`/evidence/reconciliation/alerts?${params}`).then((r) => r.data);
    },
    refetchInterval: 20_000,
  });

  const { data: formBData } = useQuery<{ data: FormBRecord[]; total: number }>({
    queryKey: ['reconciliation', 'form-b-list', CURRENT_ELECTION_ID, formBFilter],
    queryFn: () => {
      const params = new URLSearchParams({ electionId: CURRENT_ELECTION_ID });
      if (formBFilter.positionCode)         params.set('positionCode', formBFilter.positionCode);
      if (formBFilter.reconciliationStatus) params.set('reconciliationStatus', formBFilter.reconciliationStatus);
      params.set('limit', '200');
      return apiClient.get(`/evidence/reconciliation/form-b?${params}`).then((r) => r.data);
    },
    refetchInterval: 30_000,
  });

  // ── Resolve alert mutation ────────────────────────────────

  const resolveAlert = useMutation({
    mutationFn: ({ alertId, action, notes }: { alertId: string; action: string; notes: string }) =>
      apiClient.patch(`/evidence/reconciliation/alerts/${alertId}/resolve`, {
        action,
        resolutionNotes: notes,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reconciliation'] });
      setResolvingAlertId(null);
      setResolveNotes('');
    },
  });

  const totals = summary?.totals;
  const alerts = alertsData?.data ?? [];
  const formBs = formBData?.data ?? [];

  // ── Render ────────────────────────────────────────────────

  return (
    <div className="space-y-8">

      {/* ── Page header ──────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Reconciliation Monitor</h2>
          <p className="text-sm text-gray-500 mt-1">
            Form B collation vs. Form A totals — live discrepancy tracking
          </p>
        </div>
        <span className="vc-badge bg-blue-50 text-blue-700 text-xs font-semibold tracking-wide px-3 py-1">
          AI ASSISTS, HUMANS DECIDE
        </span>
      </div>

      {/* ── Mathematical rules info box ───────────────────── */}
      <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 flex gap-3">
        <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-800 space-y-1">
          <p className="font-semibold">Reconciliation Rules (IEBC Elections Regulations 2012):</p>
          <ul className="list-disc list-inside space-y-0.5 text-blue-700">
            <li>Form B valid votes must equal the sum of all Form 34A/35A/36A/37A/38A/39A for this constituency</li>
            <li>Candidate totals must sum to valid votes</li>
            <li>Ballots issued = valid votes + rejected ballots + spoilt ballots</li>
            <li>Discrepancies create alerts for human review — they do NOT block publication</li>
          </ul>
        </div>
      </div>

      {/* ── Section 1: Summary Dashboard ──────────────────── */}
      <section>
        <h3 className="text-base font-semibold text-gray-900 mb-4">Reconciliation Summary</h3>

        {summaryLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 animate-pulse">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="vc-stat-card h-24 bg-gray-100 rounded-xl" />
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              {[
                {
                  label: 'Total Form Bs',
                  value: totals?.totalFormBs ?? 0,
                  icon: FileText,
                  color: 'text-gray-600',
                  bg: 'bg-gray-50',
                },
                {
                  label: 'Matched',
                  value: totals?.matched ?? 0,
                  icon: CheckSquare,
                  color: 'text-emerald-600',
                  bg: 'bg-emerald-50',
                },
                {
                  label: 'Discrepancies',
                  value: totals?.discrepancies ?? 0,
                  icon: AlertTriangle,
                  color: 'text-red-600',
                  bg: 'bg-red-50',
                },
                {
                  label: 'Pending',
                  value: totals?.pending ?? 0,
                  icon: Clock,
                  color: 'text-amber-600',
                  bg: 'bg-amber-50',
                },
                {
                  label: 'Open Alerts',
                  value: totals?.openAlerts ?? 0,
                  icon: XCircle,
                  color: 'text-red-500',
                  bg: 'bg-red-50',
                },
              ].map(({ label, value, icon: Icon, color, bg }) => (
                <div key={label} className="vc-stat-card flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl ${bg} flex items-center justify-center flex-shrink-0`}>
                    <Icon className={`w-6 h-6 ${color}`} />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">{label}</p>
                    <p className="text-2xl font-bold text-gray-900">{value.toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Per-position breakdown */}
            {summary && summary.byPosition.length > 0 && (
              <div className="mt-4 vc-card">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">By Position</h4>
                <div className="overflow-x-auto">
                  <table className="vc-table">
                    <thead>
                      <tr>
                        <th>Position</th>
                        <th>Form Type</th>
                        <th>Total Form Bs</th>
                        <th>Matched</th>
                        <th>Discrepancies</th>
                        <th>Pending</th>
                        <th>Awaiting Forms</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summary.byPosition.map((pos) => (
                        <tr key={pos.positionCode}>
                          <td className="font-medium">{pos.positionCode}</td>
                          <td className="text-xs text-gray-500">{pos.formType}</td>
                          <td>{pos.totalFormBs.toLocaleString()}</td>
                          <td>
                            <span className="text-emerald-700 font-semibold">{pos.matched.toLocaleString()}</span>
                          </td>
                          <td>
                            {pos.discrepancies > 0 ? (
                              <span className="text-red-700 font-bold">{pos.discrepancies.toLocaleString()}</span>
                            ) : (
                              <span className="text-gray-400">0</span>
                            )}
                          </td>
                          <td>
                            <span className="text-amber-700">{pos.pending.toLocaleString()}</span>
                          </td>
                          <td>
                            <span className="text-blue-700">{pos.awaitingForms.toLocaleString()}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </section>

      {/* ── Section 2: Discrepancy Alerts ─────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-gray-900">
            Discrepancy Alerts
            {alerts.length > 0 && (
              <span className="ml-2 vc-badge bg-red-100 text-red-700">{alerts.length}</span>
            )}
          </h3>

          {/* Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={alertFilter.severity ?? ''}
              onChange={(e) => setAlertFilter((f) => ({ ...f, severity: e.target.value || undefined }))}
              className="text-sm border border-gray-200 rounded-lg px-2 py-1 bg-white text-gray-700"
            >
              <option value="">All Severities</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
            <select
              value={alertFilter.status ?? ''}
              onChange={(e) => setAlertFilter((f) => ({ ...f, status: e.target.value || undefined }))}
              className="text-sm border border-gray-200 rounded-lg px-2 py-1 bg-white text-gray-700"
            >
              <option value="">All Statuses</option>
              <option value="OPEN">Open</option>
              <option value="UNDER_REVIEW">Under Review</option>
              <option value="RESOLVED">Resolved</option>
              <option value="DISMISSED">Dismissed</option>
            </select>
            <select
              value={alertFilter.position ?? ''}
              onChange={(e) => setAlertFilter((f) => ({ ...f, position: e.target.value || undefined }))}
              className="text-sm border border-gray-200 rounded-lg px-2 py-1 bg-white text-gray-700"
            >
              <option value="">All Positions</option>
              <option value="PRESIDENT">President (34B)</option>
              <option value="MP">MP (35B)</option>
              <option value="MCA">MCA (36B)</option>
              <option value="GOVERNOR">Governor (37B)</option>
              <option value="SENATOR">Senator (38B)</option>
              <option value="WOMEN_REP">Women Rep (39B)</option>
            </select>
          </div>
        </div>

        <div className="vc-card">
          {alerts.length === 0 ? (
            <div className="text-center py-12">
              <CheckSquare className="w-12 h-12 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400">No alerts match the current filter</p>
              <p className="text-sm text-gray-400 mt-1">
                Discrepancies between Form B and Form A totals will appear here
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="vc-table">
                <thead>
                  <tr>
                    <th>Position</th>
                    <th>Constituency</th>
                    <th>Alert Type</th>
                    <th>Description</th>
                    <th>Severity</th>
                    <th>Status</th>
                    <th>Raised</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {alerts.map((alert) => (
                    <tr key={alert.id}>
                      <td className="font-medium text-sm">{alert.position_code}</td>
                      <td className="text-xs text-gray-500">{alert.constituency_code ?? '—'}</td>
                      <td>
                        <span className="vc-badge bg-gray-100 text-gray-700 text-xs">
                          {alert.alert_type.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="text-xs text-gray-600 max-w-xs truncate" title={alert.description}>
                        {alert.description}
                      </td>
                      <td><SeverityBadge severity={alert.severity} /></td>
                      <td><AlertStatusBadge status={alert.status} /></td>
                      <td className="text-xs text-gray-400">
                        {new Date(alert.created_at).toLocaleDateString()}
                      </td>
                      <td>
                        {alert.status === 'OPEN' && (
                          <button
                            onClick={() => setResolvingAlertId(alert.id)}
                            className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                          >
                            Resolve
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Resolve alert modal */}
        {resolvingAlertId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full mx-4">
              <h4 className="text-base font-bold text-gray-900 mb-2">Resolve Alert</h4>
              <p className="text-sm text-gray-500 mb-4">
                This action is recorded in the audit trail. AI ASSISTS, HUMANS DECIDE.
              </p>
              <textarea
                value={resolveNotes}
                onChange={(e) => setResolveNotes(e.target.value)}
                placeholder="Explain why this alert is resolved or dismissed (required for audit)"
                className="w-full border border-gray-200 rounded-xl p-3 text-sm resize-none h-24 focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
              <div className="flex gap-3 mt-4">
                <button
                  onClick={() =>
                    resolveAlert.mutate({
                      alertId: resolvingAlertId,
                      action: 'RESOLVED',
                      notes: resolveNotes,
                    })
                  }
                  disabled={!resolveNotes.trim() || resolveAlert.isPending}
                  className="flex-1 bg-emerald-600 text-white text-sm font-semibold py-2 rounded-xl hover:bg-emerald-700 disabled:opacity-50"
                >
                  Mark Resolved
                </button>
                <button
                  onClick={() =>
                    resolveAlert.mutate({
                      alertId: resolvingAlertId,
                      action: 'DISMISSED',
                      notes: resolveNotes,
                    })
                  }
                  disabled={!resolveNotes.trim() || resolveAlert.isPending}
                  className="flex-1 bg-amber-500 text-white text-sm font-semibold py-2 rounded-xl hover:bg-amber-600 disabled:opacity-50"
                >
                  Dismiss
                </button>
                <button
                  onClick={() => { setResolvingAlertId(null); setResolveNotes(''); }}
                  className="px-4 text-sm text-gray-500 hover:text-gray-700"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* ── Section 3: Form B Status Table ────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-gray-900">
            Form B Collation Status
            {formBData && (
              <span className="ml-2 text-sm font-normal text-gray-500">
                ({formBData.total.toLocaleString()} total)
              </span>
            )}
          </h3>

          {/* Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={formBFilter.positionCode ?? ''}
              onChange={(e) => setFormBFilter((f) => ({ ...f, positionCode: e.target.value || undefined }))}
              className="text-sm border border-gray-200 rounded-lg px-2 py-1 bg-white text-gray-700"
            >
              <option value="">All Positions</option>
              <option value="PRESIDENT">President (34B)</option>
              <option value="MP">MP (35B)</option>
              <option value="MCA">MCA (36B)</option>
              <option value="GOVERNOR">Governor (37B)</option>
              <option value="SENATOR">Senator (38B)</option>
              <option value="WOMEN_REP">Women Rep (39B)</option>
            </select>
            <select
              value={formBFilter.reconciliationStatus ?? ''}
              onChange={(e) =>
                setFormBFilter((f) => ({ ...f, reconciliationStatus: e.target.value || undefined }))
              }
              className="text-sm border border-gray-200 rounded-lg px-2 py-1 bg-white text-gray-700"
            >
              <option value="">All Reconciliation Statuses</option>
              <option value="MATCHED">Matched</option>
              <option value="DISCREPANCY">Discrepancy</option>
              <option value="PENDING">Pending</option>
              <option value="AWAITING_FORMS">Awaiting Forms</option>
            </select>
          </div>
        </div>

        <div className="vc-card">
          {formBs.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400">No Form B submissions yet</p>
              <p className="text-sm text-gray-400 mt-1">
                Returning Officers submit Form B at Constituency Tallying Centres
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="vc-table">
                <thead>
                  <tr>
                    <th>Position</th>
                    <th>Form Type</th>
                    <th>Constituency / Ward</th>
                    <th>Stations Reported</th>
                    <th>Valid Votes</th>
                    <th>Form B Status</th>
                    <th>Reconciliation</th>
                    <th>Alerts</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {formBs.map((fb) => (
                    <tr key={fb.id}>
                      <td className="font-medium text-sm">{fb.position_code}</td>
                      <td className="text-xs text-gray-500">{fb.form_type}</td>
                      <td className="text-xs text-gray-600">
                        {fb.constituency_code ?? fb.ward_code ?? fb.county_code}
                      </td>
                      <td>
                        <span className={`font-mono text-sm ${
                          fb.stations_reported < fb.total_stations
                            ? 'text-amber-700'
                            : 'text-emerald-700'
                        }`}>
                          {fb.stations_reported}/{fb.total_stations}
                        </span>
                      </td>
                      <td className="font-mono text-sm">
                        {fb.valid_votes.toLocaleString()}
                      </td>
                      <td>
                        <span
                          className={`vc-badge ${
                            fb.status === 'SUBMITTED' ? 'bg-blue-100 text-blue-700' :
                            fb.status === 'VERIFIED'  ? 'bg-emerald-100 text-emerald-700' :
                            fb.status === 'DECLARED'  ? 'bg-purple-100 text-purple-700' :
                            'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {fb.status}
                        </span>
                      </td>
                      <td>
                        <ReconciliationStatusBadge status={fb.reconciliation_status} />
                      </td>
                      <td>
                        {fb.open_alert_count > 0 ? (
                          <span className="vc-badge bg-red-100 text-red-700">
                            {fb.open_alert_count} open
                          </span>
                        ) : (
                          <span className="text-gray-400 text-xs">—</span>
                        )}
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() =>
                              apiClient
                                .post(`/evidence/reconciliation/form-b/${fb.id}/reconcile`)
                                .then(() => queryClient.invalidateQueries({ queryKey: ['reconciliation'] }))
                            }
                            title="Re-run reconciliation"
                            className="text-gray-400 hover:text-blue-600"
                          >
                            <RefreshCw className="w-4 h-4" />
                          </button>
                          <button
                            title="View details"
                            className="text-gray-400 hover:text-blue-600"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

    </div>
  );
}
