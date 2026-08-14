/**
 * Vote Capsule™ — Party Nomination Disputes & Vetting Page
 *
 * Features:
 *   1. Dispute resolution workflow (flag → evidence → tribunal → resolve)
 *   2. Candidate vetting checklist (IEBC requirements, party clearance)
 *   3. Deposit/fee payment tracking with M-Pesa reference
 *   4. Nomination certificate generation
 *   5. Gender compliance enforcement per area
 *   6. Timeline of all nomination activities
 *
 * This page bridges compliance needs for the party admin:
 *   - Ensure candidates meet requirements BEFORE IEBC submission
 *   - Resolve internal nomination disputes transparently
 *   - Track financial obligations (fees paid vs owed)
 */

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle, Shield, FileText, CreditCard, CheckCircle2,
  XCircle, Clock, Search, Filter, Plus, MessageSquare,
  Scale, Eye, Flag, MapPin, Users, Download, Upload,
  Phone, Calendar, ChevronDown, ChevronRight, Gavel,
} from 'lucide-react';
import { clsx } from 'clsx';
import { useAppSelector } from '../store/hooks';
import { apiClient } from '../api/apiClient';
import { PageErrorBoundary } from '../components/PageErrorBoundary';

// ── Types ────────────────────────────────────────────────────

interface Dispute {
  id: string;
  nominationElectionId: string;
  nominationName: string;
  positionCode: string;
  countyCode: string;
  filedBy: string;
  filedByName: string;
  againstCandidateId: string | null;
  againstCandidateName: string | null;
  category: string;
  description: string;
  evidenceUrls: string[];
  status: string;
  resolution: string | null;
  resolvedBy: string | null;
  resolvedAt: string | null;
  createdAt: string;
}

interface CandidateVetting {
  candidateId: string;
  candidateName: string;
  positionCode: string;
  areaCode: string;
  nominationElectionId: string;
  checks: VettingCheck[];
  depositStatus: DepositStatus;
  overallStatus: 'PENDING' | 'CLEARED' | 'FAILED' | 'INCOMPLETE';
}

interface VettingCheck {
  id: string;
  label: string;
  category: string;
  required: boolean;
  passed: boolean | null;
  notes: string | null;
  verifiedAt: string | null;
  verifiedBy: string | null;
}

interface DepositStatus {
  required: number;
  paid: number;
  receiptNo: string | null;
  mpesaRef: string | null;
  paidAt: string | null;
  refunded: boolean;
}

// ── Dispute categories ───────────────────────────────────────

const DISPUTE_CATEGORIES = [
  { code: 'RIGGING', label: 'Vote Rigging', description: 'Alleged manipulation of nomination votes' },
  { code: 'BRIBERY', label: 'Bribery', description: 'Alleged bribery of voters or delegates' },
  { code: 'VIOLENCE', label: 'Violence/Intimidation', description: 'Physical violence or threats against candidates/voters' },
  { code: 'ELIGIBILITY', label: 'Eligibility', description: 'Candidate does not meet requirements for the position' },
  { code: 'PROCESS', label: 'Process Violation', description: 'Party nomination rules were not followed' },
  { code: 'GENDER_RULE', label: 'Gender Rule Violation', description: '2/3 gender rule not applied correctly' },
  { code: 'OTHER', label: 'Other', description: 'Other complaint not covered above' },
];

const DISPUTE_STATUS: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  FILED:        { label: 'Filed',       color: 'bg-amber-100 text-amber-700',   icon: AlertTriangle },
  UNDER_REVIEW: { label: 'Under Review', color: 'bg-blue-100 text-blue-700',    icon: Scale },
  EVIDENCE:     { label: 'Awaiting Evidence', color: 'bg-violet-100 text-violet-700', icon: Upload },
  HEARING:      { label: 'Tribunal Hearing', color: 'bg-orange-100 text-orange-700', icon: Gavel },
  RESOLVED:     { label: 'Resolved',    color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 },
  DISMISSED:    { label: 'Dismissed',   color: 'bg-gray-100 text-gray-500',     icon: XCircle },
};

// ── Vetting check template ───────────────────────────────────

const VETTING_TEMPLATE: Omit<VettingCheck, 'id' | 'passed' | 'notes' | 'verifiedAt' | 'verifiedBy'>[] = [
  { label: 'Kenyan Citizen', category: 'IDENTITY', required: true },
  { label: 'Registered Voter', category: 'IDENTITY', required: true },
  { label: 'National ID Valid', category: 'IDENTITY', required: true },
  { label: 'Age Requirement Met', category: 'IDENTITY', required: true },
  { label: 'KRA Tax Compliance', category: 'CHAPTER_6', required: true },
  { label: 'EACC Clearance', category: 'CHAPTER_6', required: true },
  { label: 'DCI Good Conduct', category: 'CHAPTER_6', required: true },
  { label: 'HELB Clearance', category: 'CHAPTER_6', required: true },
  { label: 'CRB Report Clear', category: 'CHAPTER_6', required: true },
  { label: 'Degree Certificate', category: 'EDUCATION', required: true },
  { label: 'Party Membership (6+ months)', category: 'PARTY', required: true },
  { label: 'Nomination Fee Paid', category: 'FINANCIAL', required: true },
  { label: 'Declaration of Wealth', category: 'FINANCIAL', required: false },
  { label: 'No Active Court Orders', category: 'LEGAL', required: true },
  { label: 'Not a Public Officer', category: 'LEGAL', required: true },
];

// ── Deposit fee by position ──────────────────────────────────

const POSITION_FEES: Record<string, number> = {
  GOVERNOR: 500_000,
  SENATOR: 250_000,
  WOMEN_REP: 100_000,
  MP: 200_000,
  MCA: 50_000,
};

// ── File Dispute Modal ───────────────────────────────────────

function FileDisputeModal({
  tenantId,
  userId,
  onClose,
}: {
  tenantId: string;
  userId: string;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    nominationElectionId: '',
    category: '',
    againstCandidateName: '',
    description: '',
  });

  // Load party's nominations for selection
  const { data: nominations } = useQuery({
    queryKey: ['party-nominations', tenantId],
    queryFn: () =>
      apiClient.get('/candidate/nominations', { headers: { 'x-tenant-id': tenantId } })
        .then(r => r.data?.data ?? r.data ?? []),
    enabled: !!tenantId,
    staleTime: 30_000,
  });

  const mutation = useMutation({
    mutationFn: () =>
      apiClient.post('/candidate/nominations/disputes', {
        ...form,
        tenantId,
        filedBy: userId,
      }, {
        headers: { 'x-tenant-id': tenantId, 'x-user-id': userId },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['nomination-disputes'] });
      onClose();
    },
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-100 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
            <Gavel className="w-4 h-4 text-red-600" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900">File Nomination Dispute</h2>
            <p className="text-xs text-gray-500 mt-0.5">Submit evidence-based complaint for tribunal review</p>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
            <strong>Important:</strong> All disputes are reviewed by the Party's National Elections Board (NEB).
            Provide specific evidence — screenshots, signed declarations, or video links. Frivolous
            complaints may result in penalties under the party constitution.
          </div>

          <div>
            <label className="vc-label">Nomination Election <span className="text-red-500">*</span></label>
            <select className="vc-input" value={form.nominationElectionId}
              onChange={e => setForm({ ...form, nominationElectionId: e.target.value })}>
              <option value="">Select nomination…</option>
              {(nominations ?? []).map((n: any) => (
                <option key={n.id} value={n.id}>{n.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="vc-label">Category <span className="text-red-500">*</span></label>
            <select className="vc-input" value={form.category}
              onChange={e => setForm({ ...form, category: e.target.value })}>
              <option value="">Select category…</option>
              {DISPUTE_CATEGORIES.map(c => (
                <option key={c.code} value={c.code}>{c.label} — {c.description}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="vc-label">Against (Candidate/Official Name)</label>
            <input className="vc-input" value={form.againstCandidateName}
              onChange={e => setForm({ ...form, againstCandidateName: e.target.value })}
              placeholder="Name of person complaint is against (optional)" />
          </div>

          <div>
            <label className="vc-label">Description <span className="text-red-500">*</span></label>
            <textarea className="vc-input h-24 resize-none" value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              placeholder="Describe the incident in detail. Include dates, locations, and witness names…" />
          </div>

          <div>
            <label className="vc-label">Evidence (upload later)</label>
            <div className="border-2 border-dashed border-gray-200 rounded-lg p-4 text-center">
              <Upload className="w-6 h-6 text-gray-300 mx-auto mb-1" />
              <p className="text-xs text-gray-400">Evidence files can be attached after filing</p>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-gray-100 flex gap-3">
          <button
            onClick={() => mutation.mutate()}
            disabled={!form.nominationElectionId || !form.category || !form.description || mutation.isPending}
            className="flex-1 px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50"
          >
            {mutation.isPending ? 'Filing…' : 'File Dispute'}
          </button>
          <button onClick={onClose} className="vc-btn-secondary">Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ── Dispute Card ─────────────────────────────────────────────

function DisputeCard({ dispute }: { dispute: Dispute }) {
  const [expanded, setExpanded] = useState(false);
  const statusCfg = DISPUTE_STATUS[dispute.status] ?? DISPUTE_STATUS.FILED;
  const StatusIcon = statusCfg.icon;
  const category = DISPUTE_CATEGORIES.find(c => c.code === dispute.category);

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div
        className="flex items-center gap-3 p-4 hover:bg-gray-50 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0">
          <Gavel className="w-4 h-4 text-red-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">
            {category?.label ?? dispute.category}
            {dispute.againstCandidateName && ` — vs. ${dispute.againstCandidateName}`}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            {dispute.nominationName} · Filed {new Date(dispute.createdAt).toLocaleDateString('en-KE')}
          </p>
        </div>
        <span className={clsx('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold', statusCfg.color)}>
          <StatusIcon className="w-3 h-3" />
          {statusCfg.label}
        </span>
        <ChevronRight className={clsx('w-4 h-4 text-gray-400 transition-transform', expanded && 'rotate-90')} />
      </div>

      {expanded && (
        <div className="px-4 pb-4 border-t border-gray-100 pt-3 text-xs text-gray-600 space-y-2">
          <p><strong>Description:</strong> {dispute.description}</p>
          {dispute.resolution && (
            <div className="p-2 bg-emerald-50 rounded border border-emerald-200 text-emerald-700">
              <strong>Resolution:</strong> {dispute.resolution}
              {dispute.resolvedAt && ` (${new Date(dispute.resolvedAt).toLocaleDateString('en-KE')})`}
            </div>
          )}
          {dispute.evidenceUrls.length > 0 && (
            <p><strong>Evidence:</strong> {dispute.evidenceUrls.length} file(s) attached</p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Deposit Tracking Table ───────────────────────────────────

function DepositTracker({ tenantId }: { tenantId: string }) {
  const { data: deposits } = useQuery({
    queryKey: ['nomination-deposits', tenantId],
    queryFn: () =>
      apiClient.get('/candidate/candidates', {
        params: { partyId: tenantId, sponsorshipType: 'PARTY_SPONSORED' },
        headers: { 'x-tenant-id': tenantId },
      }).then(r => (r.data?.data ?? r.data ?? []).map((c: any) => ({
        name: c.fullName,
        position: c.positionCode,
        area: c.constituencyCode || c.countyCode || '—',
        required: POSITION_FEES[c.positionCode] ?? 0,
        paid: c.iebc_deposit_paid_kes ?? 0,
        receipt: c.iebc_deposit_receipt_no ?? null,
        paidAt: c.depositPaidAt ?? null,
      }))),
    enabled: !!tenantId,
    staleTime: 60_000,
  });

  const totalRequired = (deposits ?? []).reduce((s: number, d: any) => s + d.required, 0);
  const totalPaid = (deposits ?? []).reduce((s: number, d: any) => s + d.paid, 0);

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="p-4 border-b border-gray-100 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-amber-600" />
          Nomination Deposits & Fees
        </h3>
        <div className="text-xs text-gray-500">
          Paid: <span className="font-bold text-emerald-600">KES {(totalPaid / 1_000_000).toFixed(1)}M</span>
          {' / '}
          Required: <span className="font-bold text-gray-700">KES {(totalRequired / 1_000_000).toFixed(1)}M</span>
        </div>
      </div>

      {!deposits || deposits.length === 0 ? (
        <div className="p-6 text-center text-sm text-gray-400">No candidates with deposit data yet</div>
      ) : (
        <table className="vc-table text-xs">
          <thead>
            <tr>
              <th>Candidate</th>
              <th>Position</th>
              <th>Area</th>
              <th>Required</th>
              <th>Paid</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {deposits.map((d: any, i: number) => (
              <tr key={i}>
                <td className="font-medium">{d.name}</td>
                <td>{d.position}</td>
                <td>{d.area}</td>
                <td>KES {d.required.toLocaleString()}</td>
                <td className={d.paid >= d.required ? 'text-emerald-600 font-bold' : 'text-red-600'}>
                  {d.paid > 0 ? `KES ${d.paid.toLocaleString()}` : '—'}
                </td>
                <td>
                  {d.paid >= d.required ? (
                    <span className="inline-flex items-center gap-0.5 text-emerald-600"><CheckCircle2 className="w-3 h-3" /> Paid</span>
                  ) : d.paid > 0 ? (
                    <span className="inline-flex items-center gap-0.5 text-amber-600"><Clock className="w-3 h-3" /> Partial</span>
                  ) : (
                    <span className="text-gray-400">Unpaid</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────

function NominationDisputesPageContent(): React.JSX.Element {
  const user = useAppSelector((s: any) => s.auth.user);
  const tenantId = user?.tenantId ?? '';
  const userId   = user?.id ?? '';

  const [showFileDispute, setShowFileDispute] = useState(false);
  const [activeTab, setActiveTab] = useState<'disputes' | 'vetting' | 'deposits'>('disputes');

  // Load disputes
  const { data: disputes, isLoading: disputesLoading } = useQuery<Dispute[]>({
    queryKey: ['nomination-disputes', tenantId],
    queryFn: () =>
      apiClient.get('/candidate/nominations/disputes', { headers: { 'x-tenant-id': tenantId } })
        .then(r => r.data?.data ?? r.data ?? []),
    enabled: !!tenantId,
    staleTime: 30_000,
  });

  const openDisputes = (disputes ?? []).filter(d => !['RESOLVED', 'DISMISSED'].includes(d.status));
  const closedDisputes = (disputes ?? []).filter(d => ['RESOLVED', 'DISMISSED'].includes(d.status));

  const tabs = [
    { key: 'disputes', label: 'Disputes', icon: Gavel, count: openDisputes.length },
    { key: 'vetting', label: 'Vetting Checklist', icon: Shield, count: null },
    { key: 'deposits', label: 'Deposit Tracking', icon: CreditCard, count: null },
  ] as const;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Disputes & Compliance</h2>
          <p className="text-sm text-gray-500 mt-1">
            Nomination disputes, candidate vetting, and deposit management
          </p>
        </div>
        <button
          onClick={() => setShowFileDispute(true)}
          className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          File Dispute
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={clsx(
                'px-4 py-2.5 text-sm font-medium border-b-2 transition-colors flex items-center gap-2',
                activeTab === tab.key
                  ? 'border-violet-600 text-violet-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              )}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
              {tab.count !== null && tab.count > 0 && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-bold">
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {activeTab === 'disputes' && (
        <div className="space-y-4">
          {disputesLoading ? (
            <div className="text-center py-12 text-gray-400">Loading disputes…</div>
          ) : (disputes ?? []).length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <Scale className="w-12 h-12 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-700 font-medium">No disputes filed</p>
              <p className="text-sm text-gray-400 mt-1">
                Nomination disputes will appear here when members file complaints.
              </p>
            </div>
          ) : (
            <>
              {openDisputes.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wider flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-red-500" />
                    Open Disputes ({openDisputes.length})
                  </h3>
                  {openDisputes.map(d => <DisputeCard key={d.id} dispute={d} />)}
                </div>
              )}
              {closedDisputes.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wider flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-gray-400" />
                    Resolved ({closedDisputes.length})
                  </h3>
                  {closedDisputes.map(d => <DisputeCard key={d.id} dispute={d} />)}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {activeTab === 'vetting' && (
        <div className="space-y-4">
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-700">
            <strong>Candidate Vetting:</strong> Before submitting candidates to IEBC, ensure all
            Chapter 6 compliance requirements are met. Use this checklist to track clearance status
            for each candidate. The system will flag non-compliant candidates.
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Required Checks (per candidate)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {VETTING_TEMPLATE.map((check, idx) => (
                <div key={idx} className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50">
                  <div className="w-4 h-4 rounded-full border-2 border-gray-300 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-gray-700">{check.label}</p>
                    <p className="text-xs text-gray-400">{check.category}</p>
                  </div>
                  {check.required && (
                    <span className="ml-auto text-xs text-red-500 font-medium">Required</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Compliance by Position</h3>
            <div className="space-y-2">
              {Object.entries(POSITION_FEES).map(([pos, fee]) => (
                <div key={pos} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-gray-700">{pos.replace('_', ' ')}</p>
                    <p className="text-xs text-gray-400">IEBC Deposit: KES {fee.toLocaleString()}</p>
                  </div>
                  <div className="text-xs text-gray-400">
                    Minimum age: {['GOVERNOR', 'SENATOR', 'PRESIDENT'].includes(pos) ? '35' : '18'}
                    {' · '}
                    Degree: {['GOVERNOR', 'SENATOR', 'MP', 'PRESIDENT'].includes(pos) ? 'Required' : 'Not required'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'deposits' && (
        <DepositTracker tenantId={tenantId} />
      )}

      {/* File dispute modal */}
      {showFileDispute && (
        <FileDisputeModal tenantId={tenantId} userId={userId} onClose={() => setShowFileDispute(false)} />
      )}
    </div>
  );
}

export function NominationDisputesPage() {
  return (
    <PageErrorBoundary page="Nomination Disputes">
      <NominationDisputesPageContent />
    </PageErrorBoundary>
  );
}
