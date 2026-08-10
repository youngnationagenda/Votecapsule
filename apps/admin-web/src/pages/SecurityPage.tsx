/**
 * Vote Capsule™ Admin Portal — Security Page
 *
 * Security-focused view over the Audit Service — surfacing:
 *  • Auth failures (LOGIN_FAILURE, TOKEN_EXPIRED, INVALID_TOKEN)
 *  • Access denials (DENIED status)
 *  • High-risk operations (DELETE, role changes, tenant mutations)
 *  • Per-service error rate summary
 *
 * Distinct from AuditLogPage (raw HTTP firehose).
 * This page is filtered to events that matter for security review.
 *
 * Data: GET /audit/logs filtered by status=FAILURE|DENIED
 */

import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Shield, ShieldAlert, ShieldX, Lock, LogIn,
  AlertTriangle, CheckCircle2, XCircle, RefreshCw,
  Eye, UserX, Trash2, Key, Activity,
} from 'lucide-react';
import { clsx } from 'clsx';
import { auditClient } from '../api/apiClient';
import { PageErrorBoundary } from '../components/PageErrorBoundary';

// ── Types ────────────────────────────────────────────────────────────────────

interface AuditLog {
  id: string;
  tenantId: string | null;
  userId: string | null;
  sessionId: string | null;
  action: string;
  resourceType: string;
  resourceId: string | null;
  serviceName: string;
  method: string | null;
  endpoint: string | null;
  ipAddress: string | null;
  status: string;
  errorCode: string | null;
  errorMessage: string | null;
  durationMs: number | null;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

type SecurityTier = 'critical' | 'warning' | 'info';

// Security events from the dedicated SecurityEvent table
interface SecurityEventRecord {
  id: string;
  tenantId: string | null;
  userId: string | null;
  eventType: string;
  severity: string;
  category: string;
  description: string;
  ipAddress: string | null;
  resolved: boolean;
  resolvedAt: string | null;
  loginAttemptCount: number | null;
  createdAt: string;
}

interface SecurityEvent {
  log: AuditLog;
  tier: SecurityTier;
  label: string;
  icon: React.ReactNode;
}

// ── Security classification ───────────────────────────────────────────────────

const CRITICAL_ACTIONS = new Set([
  'LOGIN_FAILURE', 'INVALID_TOKEN', 'TOKEN_EXPIRED', 'UNAUTHORIZED',
  'TENANT_DELETED', 'USER_DELETED', 'ROLE_REVOKED', 'ADMIN_ELEVATED',
  'PASSWORD_RESET_FORCED',
]);

const HIGH_RISK_ACTIONS = new Set([
  'DELETE', 'ROLE_ASSIGNED', 'TENANT_SUSPENDED', 'MFA_DISABLED',
  'API_KEY_REVOKED', 'PERMISSION_CHANGED',
]);

// AuditLogStatus enum uses lowercase values in the DB/API:
//   success | failure | denied | error
// We normalise to uppercase for Set lookups only.
function classifyEvent(log: AuditLog): SecurityEvent | null {
  const action = (log.action ?? '').toUpperCase();
  // status comes as lowercase from the service — normalise for comparison
  const status = (log.status ?? '').toLowerCase();
  const method = (log.method ?? '').toUpperCase();

  // DENIED status — always critical
  if (status === 'denied') {
    return {
      log, tier: 'critical',
      label: 'Access Denied',
      icon: <ShieldX className="w-4 h-4" />,
    };
  }

  // Auth / token failures
  if (CRITICAL_ACTIONS.has(action) || status === 'failure') {
    const isAuth = action.includes('LOGIN') || action.includes('TOKEN') || action.includes('AUTH');
    return {
      log, tier: 'critical',
      label: isAuth ? 'Auth Failure' : 'Operation Failed',
      icon: isAuth ? <LogIn className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />,
    };
  }

  // General errors
  if (status === 'error') {
    return {
      log, tier: 'critical',
      label: 'Service Error',
      icon: <AlertTriangle className="w-4 h-4" />,
    };
  }

  // High-risk successful operations
  if (method === 'DELETE' || HIGH_RISK_ACTIONS.has(action)) {
    return {
      log, tier: 'warning',
      label: method === 'DELETE' ? 'Deletion' : 'Privileged Action',
      icon: method === 'DELETE' ? <Trash2 className="w-4 h-4" /> : <Key className="w-4 h-4" />,
    };
  }

  return null;
}

// ── Service health summary ────────────────────────────────────────────────────

interface ServiceHealth {
  name: string;
  total: number;
  failures: number;
  rate: number;
}

function buildServiceHealth(logs: AuditLog[]): ServiceHealth[] {
  const map: Record<string, { total: number; failures: number }> = {};
  for (const log of logs) {
    const svc = (log.serviceName ?? 'unknown').replace('-service', '');
    if (!map[svc]) map[svc] = { total: 0, failures: 0 };
    map[svc].total++;
    if (log.status !== 'success') map[svc].failures++;
  }
  return Object.entries(map)
    .map(([name, { total, failures }]) => ({
      name,
      total,
      failures,
      rate: total > 0 ? Math.round((failures / total) * 100) : 0,
    }))
    .sort((a, b) => b.failures - a.failures);
}

// ── Tier badge ────────────────────────────────────────────────────────────────

function TierBadge({ tier }: { tier: SecurityTier }) {
  return (
    <span className={clsx('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold', {
      'bg-red-100 text-red-700':    tier === 'critical',
      'bg-amber-100 text-amber-700': tier === 'warning',
      'bg-blue-100 text-blue-700':  tier === 'info',
    })}>
      {tier === 'critical' && <ShieldX className="w-3 h-3" />}
      {tier === 'warning'  && <AlertTriangle className="w-3 h-3" />}
      {tier === 'info'     && <Eye className="w-3 h-3" />}
      {tier === 'critical' ? 'Critical' : tier === 'warning' ? 'Warning' : 'Info'}
    </span>
  );
}

// ── Main content ──────────────────────────────────────────────────────────────

function SecurityPageContent(): React.JSX.Element {
  const [tierFilter, setTierFilter] = useState<'all' | SecurityTier>('all');
  const [timeWindow, setTimeWindow] = useState<'1h' | '6h' | '24h' | '7d'>('24h');

  const WINDOW_MS: Record<string, number> = {
    '1h': 3_600_000, '6h': 21_600_000, '24h': 86_400_000, '7d': 604_800_000,
  };

  // Pre-filtered security logs from new backend endpoint
  // GET /audit/logs/security — returns only failure|denied|error + successful DELETEs
  const {
    data: rawLogs,
    isLoading,
    isFetching,
    refetch,
    error,
  } = useQuery<AuditLog[]>({
    queryKey: ['security-logs', timeWindow],
    queryFn: () => {
      const dateFrom = new Date(Date.now() - (WINDOW_MS[timeWindow] ?? 86_400_000)).toISOString();
      return auditClient
        .get<unknown>('/logs/security', { params: { dateFrom, limit: 200 } })
        .then((r) => {
          const d = r.data as unknown;
          return (Array.isArray(d) ? d : ((d as Record<string,unknown>)?.data ?? [])) as AuditLog[];
        });
    },
    retry: 1,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  // Dedicated SecurityEvents from GET /audit/security/events
  const { data: securityEventsRaw } = useQuery<SecurityEventRecord[]>({
    queryKey: ['security-events', timeWindow],
    queryFn: () => {
      const dateFrom = new Date(Date.now() - (WINDOW_MS[timeWindow] ?? 86_400_000)).toISOString();
      return auditClient
        .get<unknown>('/security/events', { params: { dateFrom, limit: 50, resolved: false } })
        .then((r) => {
          const d = r.data as unknown;
          return (Array.isArray(d) ? d : ((d as Record<string,unknown>)?.data ?? [])) as SecurityEventRecord[];
        });
    },
    retry: 1,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
  const securityEvents = securityEventsRaw ?? [];

  const logs = rawLogs ?? [];

  // Classify all logs into security events
  const allEvents = useMemo<SecurityEvent[]>(() => {
    return logs
      .map(classifyEvent)
      .filter((e): e is SecurityEvent => e !== null)
      .sort((a, b) => new Date(b.log.createdAt).getTime() - new Date(a.log.createdAt).getTime());
  }, [logs]);

  const criticalCount = allEvents.filter(e => e.tier === 'critical').length;
  const warningCount  = allEvents.filter(e => e.tier === 'warning').length;
  const deniedCount   = logs.filter(l => (l.status ?? '').toLowerCase() === 'denied').length;
  const authFailures  = allEvents.filter(e =>
    e.tier === 'critical' && (
      e.log.action?.toUpperCase().includes('LOGIN') ||
      e.log.action?.toUpperCase().includes('TOKEN') ||
      e.log.action?.toUpperCase().includes('AUTH')
    )
  ).length;

  const serviceHealth = useMemo(() => buildServiceHealth(logs), [logs]);

  const filteredEvents = tierFilter === 'all'
    ? allEvents
    : allEvents.filter(e => e.tier === tierFilter);

  // Derive unique source IPs from critical audit log events + security events
  const suspiciousIPs = useMemo(() => {
    const ipMap: Record<string, number> = {};
    for (const e of allEvents) {
      if (e.tier === 'critical' && e.log.ipAddress) {
        ipMap[e.log.ipAddress] = (ipMap[e.log.ipAddress] ?? 0) + 1;
      }
    }
    // Also pull IPs from dedicated security events
    for (const ev of securityEvents) {
      if (ev.ipAddress) {
        ipMap[ev.ipAddress] = (ipMap[ev.ipAddress] ?? 0) + 1;
      }
    }
    return Object.entries(ipMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [allEvents, securityEvents]);

  const isHealthy = criticalCount === 0 && warningCount < 5;

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Security</h1>
          <p className="text-sm text-gray-500 mt-1">
            Security events and access monitoring · auto-refreshes every 60s
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={timeWindow}
            onChange={(e) => setTimeWindow(e.target.value as typeof timeWindow)}
            className="vc-input py-1.5 text-sm w-auto"
          >
            <option value="1h">Last 1 hour</option>
            <option value="6h">Last 6 hours</option>
            <option value="24h">Last 24 hours</option>
            <option value="7d">Last 7 days</option>
          </select>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={clsx('w-4 h-4', isFetching && 'animate-spin')} />
            Refresh
          </button>
        </div>
      </div>

      {/* ── Platform status banner ──────────────────────────────────────────── */}
      {!isLoading && !error && (
        <div className={clsx(
          'rounded-xl border px-5 py-4 flex items-center gap-3',
          isHealthy
            ? 'border-emerald-200 bg-emerald-50'
            : 'border-red-200 bg-red-50',
        )}>
          {isHealthy
            ? <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            : <ShieldAlert className="w-5 h-5 text-red-600 shrink-0" />}
          <div>
            <p className={clsx('text-sm font-semibold', isHealthy ? 'text-emerald-800' : 'text-red-800')}>
              {isHealthy ? 'Platform Security Status: Normal' : `Platform Security Alert: ${criticalCount} critical event${criticalCount !== 1 ? 's' : ''} detected`}
            </p>
            <p className={clsx('text-xs mt-0.5', isHealthy ? 'text-emerald-600' : 'text-red-600')}>
              {isHealthy
                ? `No critical security events in the selected window (${logs.length} requests analysed)`
                : `Review the events below. ${deniedCount} access denial${deniedCount !== 1 ? 's' : ''} and ${authFailures} auth failure${authFailures !== 1 ? 's' : ''} found.`}
            </p>
          </div>
        </div>
      )}

      {/* ── API error ──────────────────────────────────────────────────────── */}
      {error && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800">Could not connect to Audit Service</p>
            <p className="text-xs text-amber-600 mt-0.5">
              Authentication logs are still being captured in the database. This UI will show events once the Audit Service is reachable.
            </p>
            <code className="block text-xs text-amber-500 mt-2 font-mono">
              {(error as Error).message}
            </code>
          </div>
        </div>
      )}

      {/* ── Summary KPI cards ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-red-200 p-4 shadow-sm">
          <div className="flex items-center gap-2 text-xs text-red-700 font-semibold uppercase tracking-wide mb-2">
            <ShieldX className="w-3.5 h-3.5" /> Critical
          </div>
          <div className="text-2xl font-bold text-red-700">{isLoading ? '—' : criticalCount}</div>
          <div className="text-xs text-gray-500 mt-1">Security events</div>
        </div>

        <div className="bg-white rounded-xl border border-amber-200 p-4 shadow-sm">
          <div className="flex items-center gap-2 text-xs text-amber-700 font-semibold uppercase tracking-wide mb-2">
            <AlertTriangle className="w-3.5 h-3.5" /> Warnings
          </div>
          <div className="text-2xl font-bold text-amber-700">{isLoading ? '—' : warningCount}</div>
          <div className="text-xs text-gray-500 mt-1">High-risk actions</div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center gap-2 text-xs text-gray-600 font-semibold uppercase tracking-wide mb-2">
            <UserX className="w-3.5 h-3.5" /> Auth Failures
          </div>
          <div className="text-2xl font-bold text-gray-900">{isLoading ? '—' : authFailures}</div>
          <div className="text-xs text-gray-500 mt-1">Login / token errors</div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center gap-2 text-xs text-gray-600 font-semibold uppercase tracking-wide mb-2">
            <Lock className="w-3.5 h-3.5" /> Denied
          </div>
          <div className="text-2xl font-bold text-gray-900">{isLoading ? '—' : deniedCount}</div>
          <div className="text-xs text-gray-500 mt-1">Unauthorised attempts</div>
        </div>
      </div>

      {/* ── Two-column: Event feed + Service health ────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Security event feed (2/3 width) ──────────────────────────────── */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#0B3C6D]" />
              Security Events
              {filteredEvents.length > 0 && (
                <span className="ml-1.5 px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full font-medium">
                  {filteredEvents.length}
                </span>
              )}
            </h2>
            <div className="flex gap-1.5">
              {(['all', 'critical', 'warning'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTierFilter(t)}
                  className={clsx(
                    'px-3 py-1 text-xs rounded-full font-medium transition-colors',
                    tierFilter === t
                      ? t === 'critical' ? 'bg-red-600 text-white'
                        : t === 'warning' ? 'bg-amber-500 text-white'
                        : 'bg-[#0B3C6D] text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
                  )}
                >
                  {t === 'all' ? 'All' : t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {isLoading ? (
            <div className="p-12 text-center text-gray-400 text-sm">Loading security events…</div>
          ) : filteredEvents.length === 0 ? (
            <div className="p-12 text-center">
              <Shield className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="text-sm font-medium text-gray-600">No security events found</p>
              <p className="text-xs text-gray-400 mt-1">
                {tierFilter !== 'all'
                  ? `No ${tierFilter} events in this window. Try a wider time range.`
                  : 'No suspicious activity detected in the selected time window.'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {filteredEvents.map((evt) => (
                <div
                  key={evt.log.id}
                  className={clsx(
                    'px-5 py-3.5 flex items-start gap-3 hover:bg-gray-50 transition-colors',
                    evt.tier === 'critical' && 'border-l-2 border-red-400',
                    evt.tier === 'warning'  && 'border-l-2 border-amber-400',
                  )}
                >
                  {/* Icon */}
                  <div className={clsx(
                    'w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5',
                    evt.tier === 'critical' ? 'bg-red-100 text-red-600'
                      : evt.tier === 'warning' ? 'bg-amber-100 text-amber-600'
                      : 'bg-blue-100 text-blue-600',
                  )}>
                    {evt.icon}
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <TierBadge tier={evt.tier} />
                      <span className="text-xs font-semibold text-gray-800">
                        {evt.label}
                      </span>
                      <span className="text-xs text-gray-500">
                        {(evt.log.serviceName ?? '').replace('-service', '')}
                      </span>
                    </div>

                    <p className="text-xs text-gray-600 mt-1 font-mono truncate">
                      {evt.log.action}
                      {evt.log.endpoint && (
                        <span className="text-gray-400"> · {evt.log.endpoint}</span>
                      )}
                    </p>

                    <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                      {evt.log.userId && (
                        <span className="text-xs text-gray-400 font-mono">
                          user: {evt.log.userId.slice(0, 8)}…
                        </span>
                      )}
                      {evt.log.ipAddress && (
                        <span className="text-xs text-gray-400 font-mono">
                          ip: {evt.log.ipAddress}
                        </span>
                      )}
                      {evt.log.errorCode && (
                        <span className="text-xs bg-red-50 text-red-600 px-1.5 py-0.5 rounded font-mono">
                          {evt.log.errorCode}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Time */}
                  <div className="text-xs text-gray-400 whitespace-nowrap shrink-0">
                    {new Date(evt.log.createdAt).toLocaleTimeString('en-KE', {
                      hour: '2-digit', minute: '2-digit', second: '2-digit',
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Right column ─────────────────────────────────────────────────── */}
        <div className="space-y-5">

          {/* Service error rates */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-900">Service Error Rates</h2>
              <p className="text-xs text-gray-400 mt-0.5">Failures as % of requests in window</p>
            </div>
            {isLoading ? (
              <div className="p-6 text-center text-xs text-gray-400">Loading…</div>
            ) : serviceHealth.length === 0 ? (
              <div className="p-6 text-center text-xs text-gray-400">No service data</div>
            ) : (
              <div className="divide-y divide-gray-50">
                {serviceHealth.slice(0, 8).map((svc) => (
                  <div key={svc.name} className="px-5 py-2.5 flex items-center gap-3">
                    <div className="w-20 text-xs font-medium text-gray-700 truncate">{svc.name}</div>
                    <div className="flex-1">
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={clsx('h-full rounded-full transition-all', {
                            'bg-red-500':    svc.rate >= 20,
                            'bg-amber-400':  svc.rate >= 5 && svc.rate < 20,
                            'bg-emerald-500': svc.rate < 5,
                          })}
                          style={{ width: `${Math.min(svc.rate, 100)}%` }}
                        />
                      </div>
                    </div>
                    <div className={clsx('text-xs font-mono w-10 text-right', {
                      'text-red-600':    svc.rate >= 20,
                      'text-amber-600':  svc.rate >= 5 && svc.rate < 20,
                      'text-emerald-600': svc.rate < 5,
                    })}>
                      {svc.rate}%
                    </div>
                    <div className="text-xs text-gray-400 w-12 text-right">
                      {svc.failures}/{svc.total}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Dedicated Security Events (from SecurityEvent table) */}
          {securityEvents.length > 0 && (
            <div className="bg-white rounded-xl border border-red-200 shadow-sm">
              <div className="px-5 py-4 border-b border-red-100">
                <h2 className="text-sm font-semibold text-red-800 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4" />
                  Security Events
                  <span className="ml-1 px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full font-medium">
                    {securityEvents.length}
                  </span>
                </h2>
                <p className="text-xs text-red-400 mt-0.5">Unresolved — from Auth & Identity service</p>
              </div>
              <div className="divide-y divide-red-50 max-h-72 overflow-y-auto">
                {securityEvents.slice(0, 10).map((ev) => (
                  <div key={ev.id} className="px-5 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className={clsx(
                        'text-xs font-semibold px-2 py-0.5 rounded-full',
                        ev.severity === 'critical' ? 'bg-red-100 text-red-700' :
                        ev.severity === 'high'     ? 'bg-orange-100 text-orange-700' :
                        ev.severity === 'medium'   ? 'bg-amber-100 text-amber-700' :
                        'bg-blue-100 text-blue-700',
                      )}>
                        {ev.severity}
                      </span>
                      <span className="text-xs text-gray-400">
                        {new Date(ev.createdAt).toLocaleTimeString('en-KE', {
                          hour: '2-digit', minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <p className="text-xs font-mono text-gray-700 mt-1">{ev.eventType}</p>
                    <p className="text-xs text-gray-500 mt-0.5 truncate">{ev.description}</p>
                    {ev.ipAddress && (
                      <p className="text-xs text-gray-400 font-mono mt-0.5">ip: {ev.ipAddress}</p>
                    )}
                    {ev.loginAttemptCount != null && ev.loginAttemptCount > 1 && (
                      <p className="text-xs text-red-500 mt-0.5">
                        {ev.loginAttemptCount} attempts
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Top suspicious IPs */}
          {suspiciousIPs.length > 0 && (
            <div className="bg-white rounded-xl border border-red-100 shadow-sm">
              <div className="px-5 py-4 border-b border-red-100">
                <h2 className="text-sm font-semibold text-red-800 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4" />
                  Suspicious IPs
                </h2>
                <p className="text-xs text-red-400 mt-0.5">Source IPs with most critical events</p>
              </div>
              <div className="divide-y divide-red-50">
                {suspiciousIPs.map(([ip, count]) => (
                  <div key={ip} className="px-5 py-2.5 flex items-center justify-between">
                    <code className="text-xs font-mono text-gray-700">{ip}</code>
                    <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-semibold">
                      {count} event{count !== 1 ? 's' : ''}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Security posture legend */}
          <div className="bg-[#0B3C6D]/5 border border-[#0B3C6D]/20 rounded-xl p-4">
            <h3 className="text-xs font-semibold text-[#0B3C6D] mb-3 uppercase tracking-wide">
              Classification Guide
            </h3>
            <div className="space-y-2 text-xs text-gray-600">
              <div className="flex items-start gap-2">
                <ShieldX className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                <span><strong>Critical</strong> — Auth failures, access denials, token errors</span>
              </div>
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                <span><strong>Warning</strong> — Deletions, role/permission changes</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                <span><strong>Normal</strong> — Successful reads and writes</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Export ────────────────────────────────────────────────────────────────────

export function SecurityPage() {
  return (
    <PageErrorBoundary page="Security">
      <SecurityPageContent />
    </PageErrorBoundary>
  );
}
