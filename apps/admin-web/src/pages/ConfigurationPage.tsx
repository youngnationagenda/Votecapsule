/**
 * Vote Capsule™ Super Admin Portal — Platform Configuration
 *
 * Real-time platform configuration management for Kenya 2027.
 * Organised into tabs:
 *   1. Platform Status  — live service health + AWS resource overview
 *   2. Election Windows — evidence capture windows per position
 *   3. Feature Flags    — enable/disable platform features
 *   4. Service Config   — AI thresholds, Merkle interval, etc.
 *   5. Infrastructure   — AWS resource references (read-only)
 */

import React, { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Wrench, Activity, Calendar, Flag, Sliders, Server,
  CheckCircle2, XCircle, AlertCircle, RefreshCw, Save,
  ExternalLink, Lock, Unlock, Clock,
} from 'lucide-react';
import { clsx } from 'clsx';
import {
  identityClient, geographyClient, trustClient,
  evidenceClient, aiClient, electionClient, tenantClient,
} from '../api/apiClient';

// ── Tab types ──────────────────────────────────────────────────

type Tab = 'status' | 'election' | 'flags' | 'service' | 'infra';

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'status',   label: 'Platform Status',   icon: Activity },
  { id: 'election', label: 'Election Windows',  icon: Calendar },
  { id: 'flags',    label: 'Feature Flags',     icon: Flag },
  { id: 'service',  label: 'Service Config',    icon: Sliders },
  { id: 'infra',    label: 'Infrastructure',    icon: Server },
];

// ── Platform Status Tab ────────────────────────────────────────

const SERVICES = [
  { name: 'Identity',     path: '/auth/health',  port: 3001, client: identityClient },
  { name: 'Geography',    path: '/health',        port: 3004, client: geographyClient },
  { name: 'Trust',        path: '/health',        port: 3003, client: trustClient },
  { name: 'Evidence',     path: '/health',        port: 3005, client: evidenceClient },
  { name: 'AI',           path: '/health',        port: 3006, client: aiClient },
  { name: 'Election',     path: '/health',        port: 3011, client: electionClient },
  { name: 'Tenant',       path: '/health',        port: 3002, client: tenantClient },
];

function ServiceHealthRow({ name, path, client }: { name: string; path: string; client: any }) {
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['health', name],
    queryFn: () => client.get(path).then((r: any) => r.data),
    retry: 1,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const healthy = !!data && !error;

  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
      <div className="flex items-center gap-3">
        {isLoading || isFetching ? (
          <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
        ) : healthy ? (
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
        ) : (
          <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
        )}
        <span className="text-sm font-medium text-gray-800">{name} Service</span>
      </div>
      <div className="flex items-center gap-3">
        <span className={clsx('text-xs font-semibold px-2 py-0.5 rounded-full',
          healthy ? 'bg-emerald-100 text-emerald-700' :
          isLoading ? 'bg-amber-100 text-amber-700' :
          'bg-red-100 text-red-700'
        )}>
          {isLoading ? 'Checking…' : healthy ? 'HEALTHY' : 'UNREACHABLE'}
        </span>
        <button onClick={() => refetch()} className="text-gray-400 hover:text-gray-600">
          <RefreshCw className={clsx('w-3.5 h-3.5', isFetching && 'animate-spin')} />
        </button>
      </div>
    </div>
  );
}

function PlatformStatusTab() {
  const { data: geoStats } = useQuery({
    queryKey: ['geo-stats-config'],
    queryFn: () => geographyClient.get('/stats').then((r: any) => r.data),
    retry: 1,
    staleTime: 5 * 60_000,
  });

  const { data: trustStats } = useQuery({
    queryKey: ['trust-stats-config'],
    queryFn: () => trustClient.get('/stats').then((r: any) => r.data),
    retry: 1,
    staleTime: 30_000,
  });

  return (
    <div className="space-y-6">
      {/* Service health */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
          <Activity className="w-4 h-4 text-[#0B3C6D]" />
          Backend Service Health
        </h3>
        {SERVICES.map(svc => (
          <ServiceHealthRow key={svc.name} name={svc.name} path={svc.path} client={svc.client} />
        ))}
      </div>

      {/* NEC database stats */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
          <Server className="w-4 h-4 text-[#0B3C6D]" />
          NEC Database (Single Source of Truth)
        </h3>
        {geoStats ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Counties',       value: geoStats.totalCounties ?? 47 },
              { label: 'Constituencies', value: geoStats.totalConstituencies ?? 292 },
              { label: 'Wards',          value: geoStats.totalWards ?? 1447 },
              { label: 'Polling Stations', value: (geoStats.totalStations ?? 45805).toLocaleString() },
              { label: 'Registered Voters', value: (geoStats.totalRegisteredVoters ?? 22102532).toLocaleString() },
            ].map(stat => (
              <div key={stat.label} className="bg-gray-50 rounded-lg p-3">
                <div className="text-xs text-gray-500 mb-1">{stat.label}</div>
                <div className="text-lg font-bold text-gray-900">{stat.value}</div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400">Loading NEC statistics…</p>
        )}
      </div>

      {/* Trust anchor status */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
          <Lock className="w-4 h-4 text-[#0B3C6D]" />
          Hybrid Anchor (Hedera + RFC 3161)
        </h3>
        {trustStats ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { label: 'Total Batches',     value: trustStats.totalBatches ?? 0 },
              { label: 'Dual Anchored',     value: trustStats.dualAnchoredBatches ?? 0 },
              { label: 'Pending Queue',     value: trustStats.pendingQueueSize ?? 0 },
              { label: 'Hedera Network',    value: trustStats.hederaNetwork ?? 'testnet' },
              { label: 'TSA URL',           value: trustStats.tsaUrl ? 'FreeTSA.org' : 'Not configured' },
              { label: 'Batch Interval',    value: `${(trustStats.merkleIntervalMs ?? 60000) / 1000}s` },
            ].map(stat => (
              <div key={stat.label} className="bg-gray-50 rounded-lg p-3">
                <div className="text-xs text-gray-500 mb-1">{stat.label}</div>
                <div className="text-sm font-semibold text-gray-900">{stat.value}</div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400">Loading trust anchor status…</p>
        )}
        <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-xs text-amber-800">
            <strong>Note:</strong> Hedera Testnet account must be registered at{' '}
            <a href="https://portal.hedera.com" target="_blank" rel="noreferrer"
              className="underline text-amber-900">portal.hedera.com</a>{' '}
            for production anchoring. Until then, anchoring is simulated.
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Election Windows Tab ───────────────────────────────────────

function ElectionWindowsTab() {
  const { data: elections, isLoading } = useQuery({
    queryKey: ['config-elections'],
    queryFn: () => electionClient.get('/elections').then((r: any) => r.data?.data ?? r.data ?? []),
    retry: 1,
    staleTime: 60_000,
  });

  const positionForms: Record<string, { formA: string; formB: string; formC?: string }> = {
    PRESIDENT:  { formA: '34A', formB: '34B', formC: '34C' },
    GOVERNOR:   { formA: '37A', formB: '37B', formC: '37C' },
    SENATOR:    { formA: '38A', formB: '38B', formC: '38C' },
    WOMEN_REP:  { formA: '39A', formB: '39B', formC: '39C' },
    MP:         { formA: '35A', formB: '35B' },
    MCA:        { formA: '36A', formB: '36B' },
  };

  const positionScopes: Record<string, string> = {
    PRESIDENT: 'National — 47 counties, 292 constituencies',
    GOVERNOR:  '47 positions — 1 per county',
    SENATOR:   '47 positions — 1 per county',
    WOMEN_REP: '47 positions — 1 per county',
    MP:        '292 positions — 1 per constituency',
    MCA:       '1,447 positions — 1 per ward',
  };

  return (
    <div className="space-y-6">
      {/* Active elections */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-[#0B3C6D]" />
          Active Elections
        </h3>
        {isLoading ? (
          <p className="text-sm text-gray-400">Loading elections…</p>
        ) : !elections || elections.length === 0 ? (
          <div className="text-center py-8">
            <Calendar className="w-10 h-10 text-gray-200 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No elections configured</p>
            <p className="text-xs text-gray-400 mt-1">Go to Elections → Create Election to set up Kenya 2027</p>
          </div>
        ) : (
          <div className="space-y-3">
            {(Array.isArray(elections) ? elections : []).map((el: any) => (
              <div key={el.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className="font-semibold text-gray-900 text-sm">{el.name}</span>
                    <span className={clsx(
                      'ml-2 px-2 py-0.5 rounded-full text-xs font-semibold',
                      el.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' :
                      el.status === 'PLANNING' ? 'bg-gray-100 text-gray-600' :
                      el.status === 'NOMINATION' ? 'bg-blue-100 text-blue-700' :
                      'bg-amber-100 text-amber-700'
                    )}>{el.status}</span>
                  </div>
                  <span className="text-xs text-gray-500">{el.electionYear}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs text-gray-600">
                  {el.nominationDeadline && (
                    <div><span className="text-gray-400">Nominations close:</span> {new Date(el.nominationDeadline).toLocaleDateString('en-KE')}</div>
                  )}
                  {el.electionDate && (
                    <div><span className="text-gray-400">Election day:</span> {new Date(el.electionDate).toLocaleDateString('en-KE')}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* IEBC form reference */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
          <Wrench className="w-4 h-4 text-[#0B3C6D]" />
          IEBC Form Reference (Kenya Elections Act 2011)
        </h3>
        <p className="text-xs text-gray-500 mb-3">
          Each position uses a specific set of forms in the A → B → C → D progression.
          Form A = polling station capture (field agents). Form B = constituency tally (returning officers).
          Form C = county/national declaration. Form D = winner's certificate.
        </p>
        <table className="vc-table text-xs">
          <thead>
            <tr><th>Position</th><th>Form A</th><th>Form B</th><th>Form C</th><th>Scope</th></tr>
          </thead>
          <tbody>
            {Object.entries(positionForms).map(([pos, forms]) => (
              <tr key={pos}>
                <td className="font-semibold">{pos.replace('_', ' ')}</td>
                <td>
                  <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-mono">
                    Form {forms.formA}
                  </span>
                </td>
                <td>
                  <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded text-xs font-mono">
                    Form {forms.formB}
                  </span>
                </td>
                <td>
                  {forms.formC ? (
                    <span className="px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded text-xs font-mono">
                      Form {forms.formC}
                    </span>
                  ) : (
                    <span className="text-gray-400 text-xs">Declares at B</span>
                  )}
                </td>
                <td className="text-gray-500">{positionScopes[pos]}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-xs text-blue-800">
            <strong>Reconciliation rules enforced by VoteCapsule:</strong>{' '}
            Form B valid_votes = SUM(all Form As in constituency) ·
            Form C valid_votes = SUM(all Form Bs in county) ·
            Form 34C = SUM(all 34Bs nationally) ·
            SUM(candidate_votes) = valid_votes at each level
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Feature Flags Tab ──────────────────────────────────────────

interface FeatureFlag {
  id: string;
  label: string;
  description: string;
  enabled: boolean;
  category: 'capture' | 'integrity' | 'portal' | 'security';
  readOnly?: boolean;
  warning?: string;
}

const DEFAULT_FLAGS: FeatureFlag[] = [
  {
    id: 'evidence_capture_open',
    label: 'Evidence Capsule Capture',
    description: 'Allow field agents to submit Form A evidence capsules via the mobile app.',
    enabled: true, category: 'capture',
  },
  {
    id: 'barcode_scanner',
    label: 'Barcode Scanner (Form Scanning)',
    description: 'Enable IEBC barcode scanning in the Agent mobile app for Form 35A station code entry.',
    enabled: true, category: 'capture',
  },
  {
    id: 'tally_data_required',
    label: 'Require Tally Data on Submission',
    description: 'Force agents to enter Form A vote tallies before uploading. When disabled, photo-only submission is allowed.',
    enabled: false, category: 'capture',
  },
  {
    id: 'ai_verification',
    label: 'AI Verification Pipeline',
    description: 'Run submitted capsules through the AI verification engine for OCR + anomaly detection.',
    enabled: true, category: 'integrity',
    warning: 'Disabling AI verification means all capsules go directly to human validation queue.',
  },
  {
    id: 'trust_anchoring',
    label: 'Hybrid Trust Anchoring',
    description: 'Anchor approved capsules to Hedera Consensus Service (testnet) + RFC 3161 TSA.',
    enabled: true, category: 'integrity',
    warning: 'Requires Hedera testnet account registration at portal.hedera.com.',
  },
  {
    id: 'form_b_reconciliation',
    label: 'Form B Reconciliation Engine',
    description: 'Automatically check Form B totals against SUM of Form As when Form B is submitted.',
    enabled: true, category: 'integrity',
  },
  {
    id: 'form_c_reconciliation',
    label: 'Form C Reconciliation Engine',
    description: 'Automatically check Form C (county/national) totals against SUM of Form Bs.',
    enabled: true, category: 'integrity',
  },
  {
    id: 'public_portal',
    label: 'Public Transparency Portal',
    description: 'Allow public access to the Transparency Portal at transparency.votecapsule.yna.co.ke.',
    enabled: true, category: 'portal',
  },
  {
    id: 'results_publication',
    label: 'Results Publication',
    description: 'Allow Election Authority to publish results publicly. When disabled, results remain internal.',
    enabled: true, category: 'portal',
  },
  {
    id: 'mfa_required',
    label: 'MFA Required for All Staff',
    description: 'Enforce TOTP MFA for all platform users. Currently set to OPTIONAL in Cognito.',
    enabled: false, category: 'security',
    readOnly: true,
    warning: 'Change via AWS Cognito console → User Pool → MFA configuration.',
  },
  {
    id: 'waf_geo_filter',
    label: 'WAF Geographic Filter',
    description: 'Restrict API access to Kenya + whitelisted IPs. Currently active via AWS WAF.',
    enabled: true, category: 'security',
    readOnly: true,
    warning: 'Manage in AWS WAF console. Do not disable during live election.',
  },
];

function FeatureFlagsTab() {
  const [flags, setFlags] = useState<FeatureFlag[]>(DEFAULT_FLAGS);
  const [saved, setSaved] = useState(false);

  const toggle = (id: string) => {
    setFlags(prev => prev.map(f => f.id === id && !f.readOnly ? { ...f, enabled: !f.enabled } : f));
    setSaved(false);
  };

  const saveFlags = () => {
    // In production: POST to an admin settings endpoint
    // For now: persist to localStorage as platform config
    localStorage.setItem('vc_feature_flags', JSON.stringify(flags));
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const categories: { id: FeatureFlag['category']; label: string }[] = [
    { id: 'capture', label: 'Evidence Capture' },
    { id: 'integrity', label: 'Integrity & Reconciliation' },
    { id: 'portal', label: 'Portals & Publication' },
    { id: 'security', label: 'Security' },
  ];

  return (
    <div className="space-y-6">
      {categories.map(cat => {
        const catFlags = flags.filter(f => f.category === cat.id);
        return (
          <div key={cat.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <Flag className="w-4 h-4 text-[#0B3C6D]" />
              {cat.label}
            </h3>
            <div className="space-y-4">
              {catFlags.map(flag => (
                <div key={flag.id} className={clsx(
                  'flex items-start justify-between gap-4 pb-4 border-b border-gray-100 last:border-0 last:pb-0',
                  flag.readOnly && 'opacity-75'
                )}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">{flag.label}</span>
                      {flag.readOnly && (
                        <span className="text-xs text-gray-400 flex items-center gap-0.5">
                          <Lock className="w-3 h-3" /> AWS-managed
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{flag.description}</p>
                    {flag.warning && (
                      <p className="text-xs text-amber-700 mt-1 flex items-start gap-1">
                        <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                        {flag.warning}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => toggle(flag.id)}
                    disabled={flag.readOnly}
                    className={clsx(
                      'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent',
                      'transition-colors duration-200 focus:outline-none',
                      flag.enabled ? 'bg-[#0B3C6D]' : 'bg-gray-200',
                      flag.readOnly && 'cursor-not-allowed opacity-60',
                    )}
                    aria-checked={flag.enabled}
                  >
                    <span className={clsx(
                      'pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform',
                      'transition duration-200',
                      flag.enabled ? 'translate-x-5' : 'translate-x-0',
                    )} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-500">
          Non-AWS flags are stored locally in browser storage. Production flag management
          requires a dedicated config service (Phase 3).
        </p>
        <button
          onClick={saveFlags}
          className={clsx(
            'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
            saved
              ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
              : 'vc-btn-primary',
          )}
        >
          {saved ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {saved ? 'Saved!' : 'Save Flags'}
        </button>
      </div>
    </div>
  );
}

// ── Service Config Tab ─────────────────────────────────────────

function ServiceConfigTab() {
  const [aiThreshold, setAiThreshold] = useState('0.75');
  const [merkleInterval, setMerkleInterval] = useState('60');
  const [maxRetries, setMaxRetries] = useState('5');
  const [captureWindowHours, setCaptureWindowHours] = useState('14');
  const [saved, setSaved] = useState(false);

  const save = () => {
    localStorage.setItem('vc_service_config', JSON.stringify({
      aiThreshold: parseFloat(aiThreshold),
      merkleIntervalSec: parseInt(merkleInterval),
      maxSyncRetries: parseInt(maxRetries),
      captureWindowHours: parseInt(captureWindowHours),
    }));
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="space-y-6">
      {/* AI Verification */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
          <Sliders className="w-4 h-4 text-[#0B3C6D]" />
          AI Verification Settings
        </h3>
        <p className="text-xs text-gray-500 mb-4">
          <strong>AI ASSISTS, HUMANS DECIDE</strong> — these thresholds affect routing to validation queue but never make final decisions.
        </p>
        <div className="space-y-4">
          <div>
            <label className="vc-label">Auto-Route Threshold (0.0 – 1.0)</label>
            <input
              type="number" min="0" max="1" step="0.05"
              className="vc-input max-w-[200px]"
              value={aiThreshold}
              onChange={e => setAiThreshold(e.target.value)}
            />
            <p className="text-xs text-gray-400 mt-1">
              Capsules with AI confidence ≥ {aiThreshold} are routed to APPROVED queue.
              Below threshold → MANUAL_REVIEW. Default: 0.75.
            </p>
          </div>
        </div>
      </div>

      {/* Trust Anchoring */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
          <Lock className="w-4 h-4 text-[#0B3C6D]" />
          Trust Anchor Settings
        </h3>
        <div className="space-y-4">
          <div>
            <label className="vc-label">Merkle Batch Interval (seconds)</label>
            <input
              type="number" min="15" max="300" step="15"
              className="vc-input max-w-[200px]"
              value={merkleInterval}
              onChange={e => setMerkleInterval(e.target.value)}
            />
            <p className="text-xs text-gray-400 mt-1">
              How often the Trust Service builds a Merkle batch and anchors to Hedera + TSA.
              Default: 60s. Min: 15s. Higher = fewer Hedera transactions.
            </p>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg text-xs text-gray-600 space-y-1">
            <div className="flex justify-between">
              <span>Hedera Network</span>
              <span className="font-mono font-semibold">testnet</span>
            </div>
            <div className="flex justify-between">
              <span>RFC 3161 TSA</span>
              <span className="font-mono font-semibold">freetsa.org</span>
            </div>
            <div className="flex justify-between">
              <span>S3 Object Lock</span>
              <span className="font-mono font-semibold text-amber-700">Requires bucket migration</span>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile App */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
          <Clock className="w-4 h-4 text-[#0B3C6D]" />
          Mobile App Settings
        </h3>
        <div className="space-y-4">
          <div>
            <label className="vc-label">Sync Retry Limit (max retries per capsule)</label>
            <input
              type="number" min="1" max="20"
              className="vc-input max-w-[200px]"
              value={maxRetries}
              onChange={e => setMaxRetries(e.target.value)}
            />
            <p className="text-xs text-gray-400 mt-1">
              After this many failed upload attempts, capsule is marked FAILED. Default: 5.
            </p>
          </div>
          <div>
            <label className="vc-label">Evidence Capture Window (hours on election day)</label>
            <input
              type="number" min="8" max="24"
              className="vc-input max-w-[200px]"
              value={captureWindowHours}
              onChange={e => setCaptureWindowHours(e.target.value)}
            />
            <p className="text-xs text-gray-400 mt-1">
              How long polls are open for Form A capture on election day.
              Kenya 2027: 14 hours (6:00 AM – 8:00 PM). Default: 14.
            </p>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg text-xs text-gray-600 space-y-1">
            <div className="flex justify-between">
              <span>Sync interval</span><span className="font-mono">30 seconds</span>
            </div>
            <div className="flex justify-between">
              <span>Exponential backoff</span><span className="font-mono">5s → 15s → 30s → 60s → 120s</span>
            </div>
            <div className="flex justify-between">
              <span>SHA-256 formula</span>
              <span className="font-mono text-amber-700 font-semibold">LOCKED — never change</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={save}
          className={clsx(
            'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
            saved ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'vc-btn-primary',
          )}
        >
          {saved ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {saved ? 'Saved!' : 'Save Configuration'}
        </button>
      </div>
    </div>
  );
}

// ── Infrastructure Tab ─────────────────────────────────────────

function InfrastructureTab() {
  const resources = [
    { category: 'AWS Account', items: [
      { label: 'Account ID',      value: '683541453923', mono: true },
      { label: 'Region',          value: 'us-east-1 (N. Virginia)', mono: false },
    ]},
    { category: 'Database', items: [
      { label: 'Aurora Endpoint', value: 'vote-capsule-db.cluster-c43i6c8ow71c.us-east-1.rds.amazonaws.com', mono: true },
      { label: 'Engine',          value: 'Aurora PostgreSQL 16.8 Serverless v2', mono: false },
      { label: 'Database',        value: 'votecapsule / vcadmin', mono: true },
      { label: 'Migrations',      value: '146 applied', mono: false },
    ]},
    { category: 'Cognito', items: [
      { label: 'User Pool ID',    value: 'us-east-1_i3N2tg34A', mono: true },
      { label: 'Admin Client',    value: '3hi86ci06546ki038k6msmik0s', mono: true },
      { label: 'Mobile Client',   value: '5qv2glumv6kd2652hqdrs6ufp', mono: true },
      { label: 'MFA',             value: 'OPTIONAL (TOTP)', mono: false },
    ]},
    { category: 'API Gateway', items: [
      { label: 'Gateway URL',     value: 'https://483uyy43nc.execute-api.us-east-1.amazonaws.com', mono: true },
      { label: 'Gateway ID',      value: '483uyy43nc', mono: true },
      { label: 'Auth',            value: 'Cognito JWT (public routes: /auth/*, /geography/*, /reporting/public/*, /election/elections, /election/candidates)', mono: false },
    ]},
    { category: 'ECS / Compute', items: [
      { label: 'Cluster',         value: 'vote-capsule-services', mono: true },
      { label: 'ALB DNS',         value: 'vote-capsule-services-alb-181601180.us-east-1.elb.amazonaws.com', mono: true },
      { label: 'Services',        value: '13 ECS Fargate services (ports 3001–3013)', mono: false },
    ]},
    { category: 'Storage', items: [
      { label: 'Evidence Vault',  value: 'vote-capsule-evidence-vault-683541453923', mono: true },
      { label: 'Object Lock',     value: '⚠️ Requires new bucket with Object Lock enabled', mono: false },
      { label: 'OpenSearch',      value: 'vpc-vote-capsule-search-2roaf6oxwjanzrtfdfra4ppcbu.us-east-1.es.amazonaws.com', mono: true },
      { label: 'Redis',           value: 'vote-capsule-redis.1n5h3m.ng.0001.use1.cache.amazonaws.com', mono: true },
    ]},
    { category: 'Trust Anchor', items: [
      { label: 'Hedera Operator', value: '⚠️ Register at portal.hedera.com', mono: false },
      { label: 'Hedera Network',  value: 'testnet', mono: true },
      { label: 'TSA URL',         value: 'https://freetsa.org/tsr', mono: true },
    ]},
  ];

  return (
    <div className="space-y-4">
      <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
        <strong>Read-only reference.</strong> These values are provisioned by the infrastructure stack (Sonie).
        Changes must be made via AWS Console / CDK, then update the ECS task definitions.
      </div>

      {resources.map(section => (
        <div key={section.category} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-200">
            <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wider">{section.category}</h3>
          </div>
          <div className="divide-y divide-gray-100">
            {section.items.map(item => (
              <div key={item.label} className="flex items-start justify-between px-4 py-3 gap-4">
                <span className="text-xs text-gray-500 flex-shrink-0 w-36">{item.label}</span>
                <span className={clsx(
                  'text-xs text-right break-all',
                  item.mono ? 'font-mono text-gray-800' : 'text-gray-700',
                  item.value.startsWith('⚠️') && 'text-amber-700 font-semibold',
                )}>
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Portal URLs */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-200">
          <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Live Portal URLs</h3>
        </div>
        <div className="divide-y divide-gray-100">
          {[
            { label: 'Super Admin',   url: 'https://votecapsule.yna.co.ke' },
            { label: 'Transparency',  url: 'https://transparency.votecapsule.yna.co.ke' },
            { label: 'Authority',     url: 'https://authority.votecapsule.yna.co.ke' },
            { label: 'Party',         url: 'https://party.votecapsule.yna.co.ke' },
            { label: 'Candidate',     url: 'https://candidate.votecapsule.yna.co.ke' },
            { label: 'Observer',      url: 'https://observer.votecapsule.yna.co.ke' },
          ].map(portal => (
            <div key={portal.label} className="flex items-center justify-between px-4 py-3">
              <span className="text-xs text-gray-500 w-36">{portal.label}</span>
              <a
                href={portal.url} target="_blank" rel="noreferrer"
                className="text-xs font-mono text-[#0B3C6D] hover:underline flex items-center gap-1"
              >
                {portal.url.replace('https://', '')}
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Main ConfigurationPage ─────────────────────────────────────

export function ConfigurationPage(): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<Tab>('status');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Platform Configuration</h1>
        <p className="text-sm text-gray-500 mt-1">
          Platform-wide settings, feature flags, election windows, and infrastructure reference
        </p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-gray-200 -mb-px">
        {TABS.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={clsx(
                'flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors',
                activeTab === tab.id
                  ? 'border-[#0B3C6D] text-[#0B3C6D]'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
              )}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {activeTab === 'status'   && <PlatformStatusTab />}
      {activeTab === 'election' && <ElectionWindowsTab />}
      {activeTab === 'flags'    && <FeatureFlagsTab />}
      {activeTab === 'service'  && <ServiceConfigTab />}
      {activeTab === 'infra'    && <InfrastructureTab />}
    </div>
  );
}
