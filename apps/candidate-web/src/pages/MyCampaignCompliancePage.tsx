// ============================================================
// VoteCapsule™ — IEBC Election Campaign Financing Compliance
// Election Campaign Financing Act, 2013
// Election Campaign Financing Regulations, 2026
// Gazette Notice No. 12251, 7th August 2026
// ============================================================
import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Shield, FileCheck, AlertTriangle, CheckCircle, XCircle, Clock,
  Landmark, Users, Receipt, BadgeCheck, FileText, Scale,
  ChevronDown, ChevronRight, Plus, X, Trash2, Calendar,
  Building2, CreditCard, Download, Info, Ban,
} from 'lucide-react';
import { campaignApi } from '../api/campaignApi';
import { PageErrorBoundary } from '../components/PageErrorBoundary';
import { useAppSelector } from '../store/hooks';

// ── Types ───────────────────────────────────────────────────
interface AuthorizedPerson {
  id: string;
  fullName: string;
  idNumber: string;
  pin?: string;
  email: string;
  phone: string;
  gender: string;
  postalAddress?: string;
  role: 'candidate' | 'agent' | 'committee_member';
  dateAppointed: string;
  status: 'active' | 'revoked';
}

interface BankAccount {
  bankName: string;
  branchName: string;
  accountNumber: string;
  currency: string;
  signatories: string[];
  registered: boolean;
  registeredDate?: string;
}

interface ComplianceStatus {
  score: number;
  authorizedPersons: boolean;
  bankAccountOpened: boolean;
  contributionsUpdated: boolean;
  expenditureWithinLimits: boolean;
  singleSourceCompliant: boolean;
  reportsFiledOnTime: boolean;
}

interface ComplianceReport {
  id: string;
  type: 'preliminary' | 'final' | 'surplus' | 'auditor';
  formNumber: string;
  status: 'draft' | 'submitted' | 'under_review' | 'compliant';
  dueDate: string;
  submittedDate?: string;
}

interface ComplianceCertificate {
  issued: boolean;
  formNumber: string;
  issuedDate?: string;
  status: 'pending' | 'issued' | 'denied';
}

type TabKey = 'dashboard' | 'persons' | 'bank' | 'contributions' | 'expenditure' | 'reports';

// ── Constants ───────────────────────────────────────────────
const GAZETTE_REF = 'IEBC Gazette Notice No. 12251, 7th August 2026';
const ACT_REF = 'Election Campaign Financing Act, 2013';
const REGS_REF = 'Election Campaign Financing Regulations, 2026';

const KEY_DATES = [
  { label: 'Expenditure Period Start', date: '10 Feb 2027', note: '6 months before election' },
  { label: 'Election Date',           date: '10 Aug 2027', note: 'Kenya 2027 General Election' },
  { label: 'Expenditure Period End',   date: '24 Aug 2027', note: '14 days after election' },
  { label: 'Account Closure Deadline', date: '10 Nov 2027', note: '3 months after election' },
];

const IEBC_CATEGORIES = [
  { code: 'venues',          name: 'Venues',                   share: 1.5  },
  { code: 'publicity',       name: 'Publicity Materials',      share: 4.4  },
  { code: 'advertising',     name: 'Advertising & Media',      share: 10.3 },
  { code: 'personnel',       name: 'Campaign Personnel',       share: 1.4  },
  { code: 'agents',          name: 'Election Agents',          share: 8.5  },
  { code: 'transport',       name: 'Transportation',           share: 66.0 },
  { code: 'communication',   name: 'Communication',            share: 0.5  },
  { code: 'nomination_fees', name: 'Nomination Fees & Charges',share: 0.9  },
  { code: 'security',        name: 'Security',                 share: 1.2  },
  { code: 'accommodation',   name: 'Accommodation',            share: 0.1  },
  { code: 'administrative',  name: 'Administrative Cost',      share: 5.3  },
];

const CONTRIBUTION_TYPES = [
  'Self-Financing', 'Family', 'Individual', 'Supporting Organizations',
  'Harambee', 'Political Parties Fund', 'Loans', 'Anonymous',
];

// ── Helpers ─────────────────────────────────────────────────
const fmt = (n: number) =>
  n >= 1_000_000 ? `KES ${(n / 1_000_000).toFixed(1)}M`
  : n >= 1_000   ? `KES ${(n / 1_000).toFixed(0)}K`
  : `KES ${n.toLocaleString()}`;

const fmtFull = (n: number) => `KES ${n.toLocaleString()}`;

const pctColor = (pct: number) =>
  pct >= 90 ? 'text-red-600' : pct >= 70 ? 'text-amber-600' : 'text-emerald-600';

const pctBg = (pct: number) =>
  pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-500' : 'bg-emerald-500';

const scoreColor = (score: number) =>
  score >= 80 ? 'text-emerald-600' : score >= 50 ? 'text-amber-600' : 'text-red-600';

const scoreBorder = (score: number) =>
  score >= 80 ? 'border-emerald-500' : score >= 50 ? 'border-amber-500' : 'border-red-500';

const scoreBg = (score: number) =>
  score >= 80 ? 'bg-emerald-500' : score >= 50 ? 'bg-amber-500' : 'bg-red-500';

const safe = <T,>(fn: () => Promise<any>, fallback: T): Promise<T> =>
  fn().then((r: any) => r.data?.data ?? r.data ?? fallback).catch(() => fallback);

// ── Shared Hook ─────────────────────────────────────────────
function useMyCampaign() {
  const { data: campaigns = [] } = useQuery({
    queryKey: ['my-campaigns'],
    queryFn:  () => campaignApi.list({ candidate: true }).then((r) => r.data?.data ?? r.data ?? []),
  });
  return campaigns.find((c: any) => c.status === 'active') ?? campaigns[0] ?? null;
}

// ── Compliance Score Ring ───────────────────────────────────
function ScoreRing({ score }: { score: number }) {
  const color = score >= 80 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444';
  return (
    <div className="relative w-36 h-36">
      <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
        <circle cx="50" cy="50" r="40" fill="none" stroke="#e5e7eb" strokeWidth="8" />
        <circle cx="50" cy="50" r="40" fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={`${Math.min(score, 100) * 2.51} 251`} strokeLinecap="round" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold text-gray-900">{score}%</span>
        <span className="text-xs text-gray-500 mt-0.5">Compliance</span>
      </div>
    </div>
  );
}

// ── Checklist Item ──────────────────────────────────────────
function ChecklistItem({ passed, label, detail }: { passed: boolean; label: string; detail: string }) {
  return (
    <div className={`flex items-start gap-3 p-3 rounded-xl border ${passed ? 'border-emerald-200 bg-emerald-50/50' : 'border-amber-200 bg-amber-50/50'}`}>
      {passed
        ? <CheckCircle className="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0" />
        : <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold ${passed ? 'text-emerald-800' : 'text-amber-800'}`}>{label}</p>
        <p className="text-xs text-gray-600 mt-0.5">{detail}</p>
      </div>
    </div>
  );
}

// ── Register Person Modal ───────────────────────────────────
function RegisterPersonModal({ campaignId, onClose }: { campaignId: string; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    fullName: '', idNumber: '', pin: '', email: '', phone: '',
    gender: 'male', postalAddress: '', role: 'agent',
  });

  const mut = useMutation({
    mutationFn: (data: any) => campaignApi.compliance.registerPerson(campaignId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['compliance-persons'] });
      qc.invalidateQueries({ queryKey: ['compliance-status'] });
      onClose();
    },
  });

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-amber-500" />
            <h3 className="text-base font-bold text-gray-900">Register Authorized Person</h3>
          </div>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400 hover:text-gray-600" /></button>
        </div>

        <div className="p-5 border-b bg-amber-50/50">
          <p className="text-xs text-amber-800 leading-relaxed">
            <strong>Form ECF 1 / ECF 2:</strong> Every candidate must register authorized persons
            with the IEBC before incurring campaign expenditure. Failure to register commits an
            offence under Reg. 5(5) of the {REGS_REF}.
          </p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            mut.mutate({ ...form, dateAppointed: new Date().toISOString().split('T')[0] });
          }}
          className="p-5 space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
            <input className="vc-input" required value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              placeholder="As per National ID" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ID / Passport No. *</label>
              <input className="vc-input" required value={form.idNumber}
                onChange={(e) => setForm({ ...form, idNumber: e.target.value })}
                placeholder="e.g. 12345678" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">KRA PIN</label>
              <input className="vc-input" value={form.pin}
                onChange={(e) => setForm({ ...form, pin: e.target.value })}
                placeholder="e.g. A012345678B" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
              <input type="email" className="vc-input" required value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="person@email.com" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
              <input type="tel" className="vc-input" required value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="07XX XXX XXX" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Gender *</label>
              <select className="vc-input" value={form.gender}
                onChange={(e) => setForm({ ...form, gender: e.target.value })}>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role *</label>
              <select className="vc-input" value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}>
                <option value="candidate">Candidate</option>
                <option value="agent">Agent</option>
                <option value="committee_member">Committee Member</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Postal Address</label>
            <input className="vc-input" value={form.postalAddress}
              onChange={(e) => setForm({ ...form, postalAddress: e.target.value })}
              placeholder="P.O. Box 00000, Nairobi" />
          </div>

          {mut.isError && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-2">
              Failed to register person. Please try again.
            </p>
          )}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 vc-btn-secondary">Cancel</button>
            <button type="submit" disabled={mut.isPending} className="flex-1 vc-btn-primary">
              {mut.isPending ? 'Registering...' : 'Register Person'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Register Bank Account Modal ─────────────────────────────
function RegisterBankModal({ campaignId, onClose }: { campaignId: string; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    bankName: '', branchName: '', accountNumber: '', currency: 'KES',
    signatories: '',
  });

  const mut = useMutation({
    mutationFn: (data: any) => campaignApi.compliance.registerBank(campaignId, {
      ...data,
      signatories: data.signatories.split(',').map((s: string) => s.trim()).filter(Boolean),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['compliance-bank'] });
      qc.invalidateQueries({ queryKey: ['compliance-status'] });
      onClose();
    },
  });

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b">
          <div className="flex items-center gap-2">
            <Landmark className="w-5 h-5 text-amber-500" />
            <h3 className="text-base font-bold text-gray-900">Register Campaign Account</h3>
          </div>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400 hover:text-gray-600" /></button>
        </div>

        <div className="p-5 border-b bg-blue-50/50">
          <p className="text-xs text-blue-800 leading-relaxed">
            <strong>Regulation 11:</strong> Every candidate shall open a dedicated bank account solely
            for campaign financing. All campaign transactions must pass through this account.
          </p>
        </div>

        <form
          onSubmit={(e) => { e.preventDefault(); mut.mutate(form); }}
          className="p-5 space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bank Name *</label>
            <input className="vc-input" required value={form.bankName}
              onChange={(e) => setForm({ ...form, bankName: e.target.value })}
              placeholder="e.g. Kenya Commercial Bank" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Branch *</label>
              <input className="vc-input" required value={form.branchName}
                onChange={(e) => setForm({ ...form, branchName: e.target.value })}
                placeholder="e.g. Kenyatta Avenue" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
              <select className="vc-input" value={form.currency}
                onChange={(e) => setForm({ ...form, currency: e.target.value })}>
                <option value="KES">KES (Kenya Shilling)</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Account Number *</label>
            <input className="vc-input" required value={form.accountNumber}
              onChange={(e) => setForm({ ...form, accountNumber: e.target.value })}
              placeholder="e.g. 1234567890" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Signatories (comma-separated) *</label>
            <input className="vc-input" required value={form.signatories}
              onChange={(e) => setForm({ ...form, signatories: e.target.value })}
              placeholder="John Doe, Jane Mwangi" />
          </div>

          {mut.isError && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-2">
              Failed to register account. Please try again.
            </p>
          )}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 vc-btn-secondary">Cancel</button>
            <button type="submit" disabled={mut.isPending} className="flex-1 vc-btn-primary">
              {mut.isPending ? 'Registering...' : 'Register Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Submit Report Modal ─────────────────────────────────────
function SubmitReportModal({ campaignId, reportType, onClose }: {
  campaignId: string; reportType: string; onClose: () => void;
}) {
  const qc = useQueryClient();
  const [notes, setNotes] = useState('');

  const mut = useMutation({
    mutationFn: (data: any) => campaignApi.compliance.submitReport(campaignId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['compliance-reports'] });
      qc.invalidateQueries({ queryKey: ['compliance-status'] });
      onClose();
    },
  });

  const typeLabels: Record<string, string> = {
    preliminary: 'Preliminary Report (Form ECF 6)',
    final:       'Final Report (Form ECF 6)',
    surplus:     'Surplus Funds Report (Form ECF 7)',
    auditor:     "Auditor's Report",
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-amber-500" />
            <h3 className="text-base font-bold text-gray-900">Submit Report</h3>
          </div>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400 hover:text-gray-600" /></button>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            mut.mutate({ type: reportType, notes, submittedDate: new Date().toISOString() });
          }}
          className="p-5 space-y-4"
        >
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
            <p className="text-sm font-medium text-gray-900">{typeLabels[reportType] ?? reportType}</p>
            <p className="text-xs text-gray-500 mt-1">
              This report will be submitted to the IEBC for review. Ensure all supporting
              documents are attached in the campaign media library.
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Additional Notes</label>
            <textarea className="vc-input" rows={3} value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any remarks or clarifications for the IEBC reviewer..." />
          </div>

          {mut.isError && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-2">
              Submission failed. Please try again.
            </p>
          )}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 vc-btn-secondary">Cancel</button>
            <button type="submit" disabled={mut.isPending} className="flex-1 vc-btn-primary">
              {mut.isPending ? 'Submitting...' : 'Submit to IEBC'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Tab 1: Compliance Dashboard ─────────────────────────────
function DashboardTab({ status, campaign, budget, contributions, expenses, iebcLimit }: {
  status: ComplianceStatus; campaign: any; budget: any;
  contributions: any[]; expenses: any[]; iebcLimit: number;
}) {
  const totalSpent = expenses.reduce((s: number, e: any) => s + Number(e.amount ?? 0), 0);
  const totalContribs = contributions.reduce((s: number, c: any) => s + Number(c.amount ?? 0), 0);

  // Compute single-source cap
  const contributorTotals = useMemo(() => {
    const map = new Map<string, number>();
    contributions.forEach((c: any) => {
      const name = c.contributorName ?? 'Unknown';
      map.set(name, (map.get(name) ?? 0) + Number(c.amount ?? 0));
    });
    return map;
  }, [contributions]);

  const maxSingleSource = Math.max(0, ...Array.from(contributorTotals.values()));
  const singleSourcePct = totalContribs > 0 ? (maxSingleSource / totalContribs) * 100 : 0;
  const spendPct = iebcLimit > 0 ? Math.round((totalSpent / iebcLimit) * 100) : 0;

  return (
    <div className="space-y-5">
      {/* Score + Checklist */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Score Card */}
        <div className={`bg-white border-2 ${scoreBorder(status.score)} rounded-2xl p-6 flex flex-col items-center justify-center`}>
          <ScoreRing score={status.score} />
          <p className={`text-sm font-bold mt-3 ${scoreColor(status.score)}`}>
            {status.score >= 80 ? 'COMPLIANT' : status.score >= 50 ? 'NEEDS ATTENTION' : 'NON-COMPLIANT'}
          </p>
          <p className="text-xs text-gray-500 mt-1 text-center">{ACT_REF}</p>
        </div>

        {/* Checklist */}
        <div className="lg:col-span-2 space-y-2">
          <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
            <FileCheck className="w-4 h-4 text-amber-500" />
            Compliance Checklist
          </h3>
          <ChecklistItem passed={status.authorizedPersons}
            label="1. Authorized Person(s) Registered"
            detail="Form ECF 1 filed with IEBC" />
          <ChecklistItem passed={status.bankAccountOpened}
            label="2. Campaign Financing Account Opened"
            detail="Dedicated bank account per Reg. 11" />
          <ChecklistItem passed={status.contributionsUpdated}
            label="3. Contribution Records Updated"
            detail="All contributions logged per Reg. 12" />
          <ChecklistItem passed={status.expenditureWithinLimits}
            label="4. Expenditure Within Limits"
            detail={`${fmtFull(totalSpent)} of ${fmtFull(iebcLimit)} IEBC gazette limit (${spendPct}%)`} />
          <ChecklistItem passed={status.singleSourceCompliant}
            label="5. Single-Source Cap Compliant"
            detail={`No contributor exceeds 20% — largest is ${singleSourcePct.toFixed(1)}% (Section 12(2))`} />
          <ChecklistItem passed={status.reportsFiledOnTime}
            label="6. Reports Filed on Time"
            detail="Preliminary & Final reports (Form ECF 6)" />
        </div>
      </div>

      {/* Key Dates Panel */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-3 bg-gray-50 border-b border-gray-100">
          <Calendar className="w-4 h-4 text-amber-500" />
          <h3 className="text-sm font-bold text-gray-900">Key Compliance Dates</h3>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-gray-100">
          {KEY_DATES.map((d) => (
            <div key={d.label} className="p-4 text-center">
              <p className="text-[10px] uppercase tracking-wide text-gray-500 font-medium">{d.label}</p>
              <p className="text-base font-bold text-gray-900 mt-1">{d.date}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">{d.note}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Gazette Reference */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
        <Scale className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-sm font-semibold text-amber-900">{GAZETTE_REF}</p>
          <p className="text-xs text-amber-700 mt-1 leading-relaxed">
            Spending limits gazetted under Section 15 of the {ACT_REF}. Limits are
            determined by position (President, Governor, Senator, MP, MCA) and constituency
            geography (population and area). Exceeding limits is a criminal offence.
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Tab 2: Authorized Persons ───────────────────────────────
function PersonsTab({ campaignId, persons }: {
  campaignId: string; persons: AuthorizedPerson[];
}) {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const removeMut = useMutation({
    mutationFn: (personId: string) => campaignApi.compliance.removePerson(campaignId, personId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['compliance-persons'] });
      qc.invalidateQueries({ queryKey: ['compliance-status'] });
    },
  });

  const roleLabel = (r: string) =>
    r === 'committee_member' ? 'Committee Member' : r.charAt(0).toUpperCase() + r.slice(1);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-amber-500" />
            Authorized Persons
          </h3>
          <p className="text-sm text-gray-500 mt-0.5">Form ECF 1 & ECF 2 — {REGS_REF}</p>
        </div>
        <button onClick={() => setShowModal(true)} className="vc-btn-primary inline-flex items-center gap-2 text-sm">
          <Plus className="w-4 h-4" /> Register New Person
        </button>
      </div>

      {/* Warning Banner */}
      <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
        <p className="text-sm text-red-800">
          <strong>Warning:</strong> Failure to register authorized persons before incurring campaign
          expenditure commits an offence under Reg. 5(5) of the {REGS_REF}.
        </p>
      </div>

      {/* Persons Table */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        {persons.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No authorized persons registered</p>
            <p className="text-xs text-gray-400 mt-1">Register at least one person to achieve compliance</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase border-b">
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">ID / Passport</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Date Appointed</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 w-16"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {persons.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{p.fullName}</p>
                      <p className="text-xs text-gray-400">{p.email}</p>
                    </td>
                    <td className="px-4 py-3 font-mono text-gray-700">{p.idNumber}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-2 py-1 rounded-full bg-amber-100 text-amber-700 font-medium">
                        {roleLabel(p.role)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {p.dateAppointed ? new Date(p.dateAppointed).toLocaleDateString('en-KE', {
                        day: 'numeric', month: 'short', year: 'numeric',
                      }) : '--'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                        p.status === 'active'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-red-100 text-red-700'
                      }`}>{p.status}</span>
                    </td>
                    <td className="px-4 py-3">
                      {p.status === 'active' && (
                        <button
                          onClick={() => { if (confirm('Remove this authorized person?')) removeMut.mutate(p.id); }}
                          className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"
                          title="Remove person"
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
        )}
      </div>

      {/* Form ECF 1 Requirements (Expandable) */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between px-5 py-3 text-left hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-blue-500" />
            <span className="text-sm font-semibold text-gray-900">Form ECF 1 Requirements</span>
          </div>
          {expanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
        </button>
        {expanded && (
          <div className="px-5 pb-4 text-xs text-gray-600 space-y-2 border-t border-gray-100 pt-3">
            <p>Under Reg. 5 of the {REGS_REF}, Form ECF 1 must include:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Full name, ID/Passport number, and KRA PIN of each authorized person</li>
              <li>Physical and postal address, email, and telephone number</li>
              <li>Gender and role (Candidate, Agent, or Committee Member)</li>
              <li>Declaration signed by the candidate and each authorized person</li>
              <li>Must be filed <strong>before</strong> any campaign expenditure is incurred</li>
            </ul>
            <p className="text-amber-700 font-medium mt-2">
              Form ECF 2 applies to political parties appointing campaign financing committees.
            </p>
          </div>
        )}
      </div>

      {showModal && <RegisterPersonModal campaignId={campaignId} onClose={() => setShowModal(false)} />}
    </div>
  );
}

// ── Tab 3: Campaign Financing Account ───────────────────────
function BankAccountTab({ campaignId, bankAccount }: {
  campaignId: string; bankAccount: BankAccount | null;
}) {
  const [showModal, setShowModal] = useState(false);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Landmark className="w-5 h-5 text-amber-500" />
            Campaign Financing Account
          </h3>
          <p className="text-sm text-gray-500 mt-0.5">Regulation 11 — {REGS_REF}</p>
        </div>
        {!bankAccount?.registered && (
          <button onClick={() => setShowModal(true)} className="vc-btn-primary inline-flex items-center gap-2 text-sm">
            <Plus className="w-4 h-4" /> Register Account
          </button>
        )}
      </div>

      {/* Account Status Card */}
      <div className={`bg-white border-2 rounded-2xl p-6 ${
        bankAccount?.registered ? 'border-emerald-300' : 'border-red-300'
      }`}>
        <div className="flex items-center gap-3 mb-4">
          {bankAccount?.registered
            ? <CheckCircle className="w-6 h-6 text-emerald-500" />
            : <XCircle className="w-6 h-6 text-red-500" />}
          <div>
            <p className={`text-lg font-bold ${bankAccount?.registered ? 'text-emerald-700' : 'text-red-700'}`}>
              {bankAccount?.registered ? 'Account Registered' : 'Not Registered'}
            </p>
            {bankAccount?.registeredDate && (
              <p className="text-xs text-gray-500">
                Registered on {new Date(bankAccount.registeredDate).toLocaleDateString('en-KE', {
                  day: 'numeric', month: 'long', year: 'numeric',
                })}
              </p>
            )}
          </div>
        </div>

        {bankAccount?.registered ? (
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-[10px] uppercase tracking-wide text-gray-500 mb-1">Bank Name</p>
              <p className="text-sm font-semibold text-gray-900">{bankAccount.bankName}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-[10px] uppercase tracking-wide text-gray-500 mb-1">Branch</p>
              <p className="text-sm font-semibold text-gray-900">{bankAccount.branchName}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-[10px] uppercase tracking-wide text-gray-500 mb-1">Account Number</p>
              <p className="text-sm font-semibold text-gray-900 font-mono">{bankAccount.accountNumber}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-[10px] uppercase tracking-wide text-gray-500 mb-1">Currency</p>
              <p className="text-sm font-semibold text-gray-900">{bankAccount.currency}</p>
            </div>
            {bankAccount.signatories.length > 0 && (
              <div className="col-span-2 bg-gray-50 rounded-xl p-4">
                <p className="text-[10px] uppercase tracking-wide text-gray-500 mb-2">Signatories</p>
                <div className="flex flex-wrap gap-2">
                  {bankAccount.signatories.map((s, i) => (
                    <span key={i} className="text-xs bg-white border border-gray-200 rounded-full px-3 py-1 text-gray-700 font-medium">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-4">
            <Building2 className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No campaign financing account registered</p>
            <p className="text-xs text-gray-400 mt-1">A dedicated bank account is required by law</p>
          </div>
        )}
      </div>

      {/* Rules Panel */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5">
        <h4 className="text-sm font-bold text-blue-900 mb-3 flex items-center gap-2">
          <Scale className="w-4 h-4 text-blue-500" />
          Account Rules (Regulation 11)
        </h4>
        <ul className="space-y-2 text-sm text-blue-800">
          <li className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
            Must be a separate account solely for campaign financing purposes
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
            All campaign financial transactions must pass through this account
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
            Close within 3 months after declaration of election results
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
            Submit bank statement together with the final expenditure report
          </li>
        </ul>
      </div>

      {showModal && <RegisterBankModal campaignId={campaignId} onClose={() => setShowModal(false)} />}
    </div>
  );
}

// ── Tab 4: Contributions & Compliance ───────────────────────
function ContributionsTab({ contributions, iebcLimit }: {
  contributions: any[]; iebcLimit: number;
}) {
  const totalContribs = contributions.reduce((s: number, c: any) => s + Number(c.amount ?? 0), 0);
  const capAmount = totalContribs * 0.2;

  // Group by contributor
  const contributorTotals = useMemo(() => {
    const map = new Map<string, { total: number; type: string }>();
    contributions.forEach((c: any) => {
      const name = c.contributorName ?? 'Unknown';
      const existing = map.get(name);
      map.set(name, {
        total: (existing?.total ?? 0) + Number(c.amount ?? 0),
        type: c.contributorType ?? 'individual',
      });
    });
    return map;
  }, [contributions]);

  const maxSingleSource = Math.max(0, ...Array.from(contributorTotals.values()).map((v) => v.total));
  const maxSinglePct = totalContribs > 0 ? (maxSingleSource / totalContribs) * 100 : 0;

  // Group by contribution type
  const typeBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    CONTRIBUTION_TYPES.forEach((t) => map.set(t, 0));
    contributions.forEach((c: any) => {
      const type = c.contributorType ?? c.sourceType ?? 'Individual';
      const matchedType = CONTRIBUTION_TYPES.find((t) => t.toLowerCase().includes(type.toLowerCase())) ?? 'Individual';
      map.set(matchedType, (map.get(matchedType) ?? 0) + Number(c.amount ?? 0));
    });
    return Array.from(map.entries()).filter(([, v]) => v > 0);
  }, [contributions]);

  return (
    <div className="space-y-5">
      <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
        <Receipt className="w-5 h-5 text-amber-500" />
        Contributions & Compliance
      </h3>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { label: 'Total Contributions', value: fmt(totalContribs), color: 'text-gray-900' },
          { label: 'IEBC Limit', value: fmt(iebcLimit), color: 'text-blue-600' },
          { label: '% of Limit Used', value: iebcLimit > 0 ? `${Math.round((totalContribs / iebcLimit) * 100)}%` : 'N/A', color: pctColor(iebcLimit > 0 ? Math.round((totalContribs / iebcLimit) * 100) : 0) },
          { label: 'Largest Single Source', value: fmt(maxSingleSource), color: maxSinglePct > 20 ? 'text-red-600' : 'text-gray-900' },
          { label: '20% Cap Amount', value: fmt(capAmount), color: 'text-amber-600' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white border border-gray-200 rounded-2xl p-3">
            <p className="text-[10px] uppercase tracking-wide text-gray-500">{label}</p>
            <p className={`text-base font-bold mt-0.5 ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Source Breakdown */}
      {typeBreakdown.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          <div className="px-5 py-3 bg-gray-50 border-b border-gray-100">
            <h4 className="text-sm font-bold text-gray-900">Contribution Sources (per Form ECF 5)</h4>
          </div>
          <div className="divide-y divide-gray-50">
            {typeBreakdown.map(([type, amount]) => {
              const pct = totalContribs > 0 ? Math.round((amount / totalContribs) * 100) : 0;
              return (
                <div key={type} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50">
                  <div className="flex items-center gap-3 flex-1">
                    <p className="text-sm text-gray-900 font-medium">{type}</p>
                    <div className="flex-1 max-w-[200px]">
                      <div className="w-full bg-gray-100 rounded-full h-1.5">
                        <div className={`h-1.5 rounded-full ${pct > 20 ? 'bg-red-500' : 'bg-amber-400'}`}
                          style={{ width: `${Math.min(pct, 100)}%` }} />
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`text-xs font-medium ${pct > 20 ? 'text-red-600' : 'text-gray-500'}`}>{pct}%</span>
                    <span className="text-sm font-semibold text-gray-900 w-28 text-right">{fmtFull(amount)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Contributions Table */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <div className="px-5 py-3 bg-gray-50 border-b border-gray-100">
          <h4 className="text-sm font-bold text-gray-900">All Contributions ({contributions.length})</h4>
        </div>
        {contributions.length === 0 ? (
          <div className="text-center py-12">
            <CreditCard className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No contributions recorded yet</p>
            <p className="text-xs text-gray-400 mt-1">Record contributions via the Budget page</p>
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[50vh] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white border-b z-10">
                <tr className="text-left text-xs font-semibold text-gray-500 uppercase">
                  <th className="px-4 py-2">Date</th>
                  <th className="px-4 py-2">Contributor</th>
                  <th className="px-4 py-2">Type</th>
                  <th className="px-4 py-2 text-right">Amount</th>
                  <th className="px-4 py-2 text-right">% of Total</th>
                  <th className="px-4 py-2">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {contributions.map((c: any, i: number) => {
                  const amt = Number(c.amount ?? 0);
                  const pct = totalContribs > 0 ? (amt / totalContribs) * 100 : 0;
                  const needsReceipt = amt > 20000;
                  return (
                    <tr key={c.id ?? i} className={`hover:bg-gray-50 ${pct > 20 ? 'bg-red-50/30' : ''}`}>
                      <td className="px-4 py-2 text-xs text-gray-500 whitespace-nowrap">
                        {c.contributionDate ? new Date(c.contributionDate).toLocaleDateString('en-KE', {
                          day: 'numeric', month: 'short', year: '2-digit',
                        }) : '--'}
                      </td>
                      <td className="px-4 py-2 text-gray-900 font-medium">{c.contributorName ?? 'Anonymous'}</td>
                      <td className="px-4 py-2">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 capitalize">
                          {(c.contributorType ?? '').replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-right font-semibold text-gray-900">{fmtFull(amt)}</td>
                      <td className="px-4 py-2 text-right">
                        <span className={`text-xs font-medium ${pct > 20 ? 'text-red-600 font-bold' : 'text-gray-500'}`}>
                          {pct.toFixed(1)}%
                          {pct > 20 && <AlertTriangle className="w-3 h-3 inline ml-1" />}
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        {needsReceipt ? (
                          <span className="text-xs text-amber-600 font-medium">Required (&gt;KES 20,000)</span>
                        ) : (
                          <span className="text-xs text-gray-400">--</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Anonymous contributions note */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-sm font-semibold text-amber-900">Anonymous Contributions</p>
          <p className="text-xs text-amber-700 mt-1 leading-relaxed">
            Anonymous contributions must be reported to the IEBC and remitted to the Consolidated
            Fund within 14 days of receipt — Reg. 17 of the {REGS_REF}.
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Tab 5: Expenditure Monitoring ───────────────────────────
function ExpenditureTab({ expenses, iebcLimit }: {
  expenses: any[]; iebcLimit: number;
}) {
  const totalSpent = expenses.reduce((s: number, e: any) => s + Number(e.amount ?? 0), 0);
  const overallPct = iebcLimit > 0 ? Math.round((totalSpent / iebcLimit) * 100) : 0;

  // Map expenses to IEBC categories
  const categorySpend = useMemo(() => {
    return IEBC_CATEGORIES.map((cat) => {
      const matching = expenses.filter((e: any) => {
        const code = (e.categoryCode ?? e.iebcCategory ?? '').toLowerCase();
        return code.includes(cat.code) || code.includes(cat.name.toLowerCase().split(' ')[0]);
      });
      const spent = matching.reduce((s: number, e: any) => s + Number(e.amount ?? 0), 0);
      const limit = iebcLimit > 0 ? iebcLimit * (cat.share / 100) : 0;
      const pct = limit > 0 ? Math.min(Math.round((spent / limit) * 100), 150) : 0;
      return { ...cat, spent, limit, pct };
    });
  }, [expenses, iebcLimit]);

  return (
    <div className="space-y-5">
      <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
        <Scale className="w-5 h-5 text-amber-500" />
        Expenditure Monitoring
      </h3>

      {/* Overall Limit Bar */}
      <div className={`bg-white border-2 rounded-2xl p-5 ${overallPct >= 90 ? 'border-red-300' : overallPct >= 70 ? 'border-amber-300' : 'border-emerald-300'}`}>
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-sm font-bold text-gray-900">Overall IEBC Spending Limit</p>
            <p className="text-xs text-gray-500 mt-0.5">{GAZETTE_REF}</p>
          </div>
          <div className="text-right">
            <p className={`text-2xl font-bold ${pctColor(overallPct)}`}>{overallPct}%</p>
            <p className="text-xs text-gray-500">{fmtFull(totalSpent)} of {fmtFull(iebcLimit)}</p>
          </div>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-4">
          <div className={`h-4 rounded-full transition-all ${pctBg(overallPct)}`}
            style={{ width: `${Math.min(overallPct, 100)}%` }} />
        </div>
        <div className="flex justify-between mt-2 text-xs text-gray-400">
          <span>KES 0</span>
          <span>50%</span>
          <span>{fmt(iebcLimit)}</span>
        </div>
      </div>

      {/* Category Progress Bars */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <div className="px-5 py-3 bg-gray-50 border-b border-gray-100">
          <h4 className="text-sm font-bold text-gray-900">
            IEBC Spending Categories — 11 Authorized Items
          </h4>
          <p className="text-xs text-gray-500 mt-0.5">
            Section (a)-(f) {ACT_REF} / Fifth Schedule
          </p>
        </div>
        <div className="divide-y divide-gray-50">
          {categorySpend.map((cat, i) => (
            <div key={cat.code} className="px-5 py-3.5">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-[9px] font-bold text-gray-500">{i + 1}</span>
                  </span>
                  <p className="text-sm font-medium text-gray-900">{cat.name}</p>
                  <span className="text-[10px] text-gray-400">({cat.share}%)</span>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  {cat.spent > 0 && (
                    <span className={`font-semibold ${cat.pct >= 90 ? 'text-red-600' : 'text-gray-700'}`}>
                      {fmtFull(cat.spent)}
                    </span>
                  )}
                  {cat.limit > 0 && (
                    <span className="text-gray-400">/ {fmt(cat.limit)}</span>
                  )}
                  <span className={`font-bold ${pctColor(cat.pct)}`}>{cat.pct}%</span>
                </div>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div className={`h-2 rounded-full transition-all ${pctBg(cat.pct)}`}
                  style={{ width: `${Math.min(cat.pct, 100)}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Overspend Alert */}
      {overallPct >= 90 && (
        <div className="bg-red-50 border-2 border-red-300 rounded-2xl p-5 flex items-start gap-3">
          <Ban className="w-6 h-6 text-red-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-bold text-red-900">
              Section 18(7) — Exceeding Spending Limits
            </p>
            <p className="text-xs text-red-700 mt-1 leading-relaxed">
              Failure to report exceeding the campaign spending limit is a criminal offence under
              Section 18(7) of the {ACT_REF}. Upon conviction, a candidate is liable to a fine
              not exceeding KES 2,000,000 or imprisonment for a term not exceeding 5 years, or both.
            </p>
          </div>
        </div>
      )}

      {/* Category Summary Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {categorySpend.filter((c) => c.spent > 0).sort((a, b) => b.spent - a.spent).slice(0, 4).map((cat) => (
          <div key={cat.code} className={`bg-white border rounded-2xl p-4 ${cat.pct >= 90 ? 'border-red-200' : 'border-gray-200'}`}>
            <p className="text-[10px] uppercase tracking-wide text-gray-500">{cat.name}</p>
            <p className="text-lg font-bold text-gray-900 mt-1">{fmt(cat.spent)}</p>
            <p className={`text-xs font-medium mt-0.5 ${pctColor(cat.pct)}`}>
              {cat.pct}% of {cat.share}% allocation
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Tab 6: Reports & Penalties ──────────────────────────────
function ReportsTab({ campaignId, reports, certificate, totalExpenses }: {
  campaignId: string;
  reports: ComplianceReport[];
  certificate: ComplianceCertificate | null;
  totalExpenses: number;
}) {
  const [submitType, setSubmitType] = useState<string | null>(null);

  const reportTimeline = [
    {
      type: 'preliminary' as const,
      label: 'Preliminary Report',
      form: 'Form ECF 6',
      due: 'Due after nomination',
      description: 'Initial declaration of campaign financing arrangements, including authorized persons, bank account details, and estimated budget.',
    },
    {
      type: 'final' as const,
      label: 'Final Report',
      form: 'Form ECF 6',
      due: 'Due within prescribed period after election',
      description: 'Complete record of all contributions received and expenditure incurred during the campaign period.',
    },
    {
      type: 'surplus' as const,
      label: 'Surplus Funds Report',
      form: 'Form ECF 7',
      due: 'If surplus exists',
      description: 'Report on disposal of surplus campaign funds. Surplus must be donated to a charitable cause or returned to contributors.',
    },
    {
      type: 'auditor' as const,
      label: "Auditor's Report",
      form: 'Independent Audit',
      due: 'Required if expenses > KES 1,000,000',
      description: 'Independent audit report required when total campaign expenses exceed KES 1,000,000.',
    },
  ];

  const statusStyles: Record<string, string> = {
    draft:        'bg-gray-100 text-gray-700',
    submitted:    'bg-blue-100 text-blue-700',
    under_review: 'bg-amber-100 text-amber-700',
    compliant:    'bg-emerald-100 text-emerald-700',
  };

  const statusLabels: Record<string, string> = {
    draft:        'Draft',
    submitted:    'Submitted',
    under_review: 'Under Review',
    compliant:    'Compliant',
  };

  return (
    <div className="space-y-5">
      <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
        <FileText className="w-5 h-5 text-amber-500" />
        Reports & Penalties
      </h3>

      {/* Report Timeline */}
      <div className="space-y-3">
        {reportTimeline.map((rt, idx) => {
          const report = reports.find((r) => r.type === rt.type);
          const status = report?.status ?? 'draft';
          const needsAudit = rt.type === 'auditor' && totalExpenses <= 1_000_000;

          return (
            <div key={rt.type} className={`bg-white border border-gray-200 rounded-2xl overflow-hidden ${needsAudit ? 'opacity-60' : ''}`}>
              <div className="flex items-center justify-between px-5 py-4">
                <div className="flex items-start gap-3">
                  <div className="flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      status === 'compliant' ? 'bg-emerald-100' :
                      status === 'submitted' || status === 'under_review' ? 'bg-blue-100' : 'bg-gray-100'
                    }`}>
                      {status === 'compliant'
                        ? <CheckCircle className="w-4 h-4 text-emerald-600" />
                        : status === 'submitted' || status === 'under_review'
                        ? <Clock className="w-4 h-4 text-blue-600" />
                        : <FileText className="w-4 h-4 text-gray-400" />}
                    </div>
                    {idx < reportTimeline.length - 1 && (
                      <div className="w-0.5 h-6 bg-gray-200 mt-1" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-gray-900">{rt.label}</p>
                      <span className="text-[10px] px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full font-medium">
                        {rt.form}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{rt.due}</p>
                    <p className="text-xs text-gray-600 mt-1 leading-relaxed max-w-lg">{rt.description}</p>
                    {report?.submittedDate && (
                      <p className="text-xs text-emerald-600 mt-1 font-medium">
                        Submitted: {new Date(report.submittedDate).toLocaleDateString('en-KE', {
                          day: 'numeric', month: 'long', year: 'numeric',
                        })}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusStyles[status]}`}>
                    {statusLabels[status]}
                  </span>
                  {status === 'draft' && !needsAudit && (
                    <button
                      onClick={() => setSubmitType(rt.type)}
                      className="vc-btn-primary text-xs py-1.5 px-3 inline-flex items-center gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5" /> Submit Report
                    </button>
                  )}
                  {needsAudit && (
                    <span className="text-[10px] text-gray-400 italic">Not required</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Certificate of Compliance */}
      <div className={`bg-white border-2 rounded-2xl p-5 ${
        certificate?.status === 'issued' ? 'border-emerald-300' :
        certificate?.status === 'denied' ? 'border-red-300' : 'border-gray-200'
      }`}>
        <div className="flex items-center gap-3 mb-3">
          <BadgeCheck className={`w-6 h-6 ${
            certificate?.status === 'issued' ? 'text-emerald-500' :
            certificate?.status === 'denied' ? 'text-red-500' : 'text-gray-400'
          }`} />
          <div>
            <p className="text-sm font-bold text-gray-900">Certificate of Compliance (Form ECF 8)</p>
            <p className="text-xs text-gray-500 mt-0.5">
              Issued by the IEBC upon satisfactory review of all reports
            </p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3 mt-4">
          {(['pending', 'issued', 'denied'] as const).map((s) => (
            <div key={s} className={`rounded-xl p-3 text-center border ${
              certificate?.status === s
                ? s === 'issued' ? 'border-emerald-300 bg-emerald-50' :
                  s === 'denied' ? 'border-red-300 bg-red-50' : 'border-amber-300 bg-amber-50'
                : 'border-gray-100 bg-gray-50'
            }`}>
              <p className={`text-sm font-bold ${
                certificate?.status === s ? (
                  s === 'issued' ? 'text-emerald-700' :
                  s === 'denied' ? 'text-red-700' : 'text-amber-700'
                ) : 'text-gray-400'
              }`}>
                {s === 'pending' ? 'Pending' : s === 'issued' ? 'Issued' : 'Denied'}
              </p>
              {certificate?.status === s && (
                <div className="w-2 h-2 rounded-full mx-auto mt-2 animate-pulse" style={{
                  backgroundColor: s === 'issued' ? '#10b981' : s === 'denied' ? '#ef4444' : '#f59e0b',
                }} />
              )}
            </div>
          ))}
        </div>
        {certificate?.issuedDate && certificate.status === 'issued' && (
          <p className="text-xs text-emerald-600 font-medium mt-3 text-center">
            Certificate issued on {new Date(certificate.issuedDate).toLocaleDateString('en-KE', {
              day: 'numeric', month: 'long', year: 'numeric',
            })}
          </p>
        )}
      </div>

      {/* Penalties Section */}
      <div className="bg-red-50 border-2 border-red-300 rounded-2xl p-5">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-6 h-6 text-red-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-base font-bold text-red-900">Penalties for Non-Compliance</p>
            <p className="text-xs text-red-500 mt-0.5">Sections 23 & 24 — {ACT_REF}</p>
            <div className="mt-3 space-y-3">
              <div className="bg-white/60 border border-red-200 rounded-xl p-3">
                <p className="text-sm font-semibold text-red-900">Criminal Penalties</p>
                <ul className="mt-1.5 space-y-1 text-xs text-red-800">
                  <li className="flex items-start gap-2">
                    <XCircle className="w-3.5 h-3.5 text-red-500 mt-0.5 flex-shrink-0" />
                    Fine not exceeding <strong>KES 2,000,000</strong>
                  </li>
                  <li className="flex items-start gap-2">
                    <XCircle className="w-3.5 h-3.5 text-red-500 mt-0.5 flex-shrink-0" />
                    Imprisonment for a term not exceeding <strong>5 years</strong>
                  </li>
                  <li className="flex items-start gap-2">
                    <XCircle className="w-3.5 h-3.5 text-red-500 mt-0.5 flex-shrink-0" />
                    Or <strong>both</strong> fine and imprisonment
                  </li>
                </ul>
              </div>
              <div className="bg-white/60 border border-red-200 rounded-xl p-3">
                <p className="text-sm font-semibold text-red-900">Additional Consequences</p>
                <ul className="mt-1.5 space-y-1 text-xs text-red-800">
                  <li className="flex items-start gap-2">
                    <XCircle className="w-3.5 h-3.5 text-red-500 mt-0.5 flex-shrink-0" />
                    Disqualification from holding public office
                  </li>
                  <li className="flex items-start gap-2">
                    <XCircle className="w-3.5 h-3.5 text-red-500 mt-0.5 flex-shrink-0" />
                    Election results may be nullified
                  </li>
                  <li className="flex items-start gap-2">
                    <XCircle className="w-3.5 h-3.5 text-red-500 mt-0.5 flex-shrink-0" />
                    Permanent record of compliance failure with IEBC
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {submitType && (
        <SubmitReportModal
          campaignId={campaignId}
          reportType={submitType}
          onClose={() => setSubmitType(null)}
        />
      )}
    </div>
  );
}

// ── Main Content ────────────────────────────────────────────
function ComplianceContent(): React.JSX.Element {
  const campaign = useMyCampaign();
  const user = useAppSelector((s) => s.auth.user) as any;
  const [tab, setTab] = useState<TabKey>('dashboard');

  const cid = campaign?.id ?? '';

  // ── Data Queries ────────────────────────────────────────
  const { data: complianceStatus, isLoading: statusLoading } = useQuery<ComplianceStatus>({
    queryKey: ['compliance-status', cid],
    queryFn: () => safe<ComplianceStatus>(
      () => campaignApi.compliance.getStatus(cid),
      {
        score: 0,
        authorizedPersons: false,
        bankAccountOpened: false,
        contributionsUpdated: false,
        expenditureWithinLimits: true,
        singleSourceCompliant: true,
        reportsFiledOnTime: false,
      },
    ),
    enabled: !!cid,
  });

  const { data: persons = [] } = useQuery<AuthorizedPerson[]>({
    queryKey: ['compliance-persons', cid],
    queryFn: () => safe<AuthorizedPerson[]>(
      () => campaignApi.compliance.getAuthorizedPersons(cid),
      [],
    ),
    enabled: !!cid,
  });

  const { data: bankAccount } = useQuery<BankAccount | null>({
    queryKey: ['compliance-bank', cid],
    queryFn: () => safe<BankAccount | null>(
      () => campaignApi.compliance.getBankAccount(cid),
      null,
    ),
    enabled: !!cid,
  });

  const { data: contributions = [] } = useQuery({
    queryKey: ['compliance-contributions', cid],
    queryFn: () => safe<any[]>(
      () => campaignApi.budget.listContribs(cid),
      [],
    ),
    enabled: !!cid,
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ['compliance-expenses', cid],
    queryFn: () => safe<any[]>(
      () => campaignApi.budget.listExpenses(cid),
      [],
    ),
    enabled: !!cid,
  });

  const { data: reports = [] } = useQuery<ComplianceReport[]>({
    queryKey: ['compliance-reports', cid],
    queryFn: () => safe<ComplianceReport[]>(
      () => campaignApi.compliance.getReports(cid),
      [],
    ),
    enabled: !!cid,
  });

  const { data: certificate } = useQuery<ComplianceCertificate | null>({
    queryKey: ['compliance-certificate', cid],
    queryFn: () => safe<ComplianceCertificate | null>(
      () => campaignApi.compliance.getCertificate(cid),
      { issued: false, formNumber: 'ECF 8', status: 'pending' },
    ),
    enabled: !!cid,
  });

  const { data: budget } = useQuery({
    queryKey: ['compliance-budget', cid],
    queryFn: () => safe<any>(
      () => campaignApi.budget.get(cid),
      null,
    ),
    enabled: !!cid,
  });

  const { data: iebcGazette } = useQuery({
    queryKey: ['compliance-gazette', campaign?.countyCode, (campaign as any)?.goals?.targetPosition],
    queryFn: async () => {
      if (!campaign) return null;
      const position = (campaign as any)?.goals?.targetPosition ?? (campaign as any)?.targetPosition;
      const countyCode = campaign.countyCode ?? campaign.county_code;
      if (!position || !countyCode) return null;
      try {
        const r = await campaignApi.budget.getIEBCGazetteLimit(position, countyCode, campaign.constituencyCode);
        return r.data?.data ?? r.data;
      } catch { return null; }
    },
    enabled: !!campaign,
    staleTime: 24 * 60 * 60 * 1000,
  });

  const iebcLimit = iebcGazette?.spending_limit_kes ?? budget?.iebcSpendingLimit ?? budget?.limitAmount ?? 0;
  const totalExpenses = expenses.reduce((s: number, e: any) => s + Number(e.amount ?? 0), 0);

  // Derive compliance status when backend is not yet built
  const status: ComplianceStatus = useMemo(() => {
    if (complianceStatus && complianceStatus.score > 0) return complianceStatus;

    const hasPersons = persons.length > 0;
    const hasBank = bankAccount?.registered ?? false;
    const hasContribs = contributions.length > 0;
    const withinLimits = iebcLimit > 0 ? totalExpenses <= iebcLimit : true;

    const contributorTotals = new Map<string, number>();
    contributions.forEach((c: any) => {
      const name = c.contributorName ?? 'Unknown';
      contributorTotals.set(name, (contributorTotals.get(name) ?? 0) + Number(c.amount ?? 0));
    });
    const totalContribs = contributions.reduce((s: number, c: any) => s + Number(c.amount ?? 0), 0);
    const maxSingle = Math.max(0, ...Array.from(contributorTotals.values()));
    const singleSourceOk = totalContribs === 0 || (maxSingle / totalContribs) <= 0.2;

    const reportsOk = reports.some((r) => r.status === 'submitted' || r.status === 'compliant');

    const checks = [hasPersons, hasBank, hasContribs, withinLimits, singleSourceOk, reportsOk];
    const passed = checks.filter(Boolean).length;
    const score = Math.round((passed / checks.length) * 100);

    return {
      score,
      authorizedPersons: hasPersons,
      bankAccountOpened: hasBank,
      contributionsUpdated: hasContribs,
      expenditureWithinLimits: withinLimits,
      singleSourceCompliant: singleSourceOk,
      reportsFiledOnTime: reportsOk,
    };
  }, [complianceStatus, persons, bankAccount, contributions, expenses, reports, iebcLimit, totalExpenses]);

  // ── No Campaign State ───────────────────────────────────
  if (!campaign) {
    return (
      <div className="bg-white border border-gray-200 rounded-2xl text-center py-16">
        <Shield className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500 text-base">No active campaign found.</p>
        <p className="text-sm text-gray-400 mt-1">Create a campaign to access IEBC compliance tools.</p>
        <a href="/campaign" className="inline-block mt-4 text-sm text-amber-600 hover:underline font-medium">
          Create your campaign
        </a>
      </div>
    );
  }

  // ── Loading State ───────────────────────────────────────
  if (statusLoading) {
    return (
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <Shield className="w-6 h-6 text-amber-500" />
          <h2 className="text-xl font-bold text-gray-900">IEBC Campaign Compliance</h2>
        </div>
        <div className="animate-pulse space-y-4">
          <div className="h-48 bg-gray-100 rounded-2xl" />
          <div className="grid grid-cols-3 gap-4">
            <div className="h-24 bg-gray-100 rounded-2xl" />
            <div className="h-24 bg-gray-100 rounded-2xl" />
            <div className="h-24 bg-gray-100 rounded-2xl" />
          </div>
          <div className="h-32 bg-gray-100 rounded-2xl" />
        </div>
      </div>
    );
  }

  // ── Tab Config ──────────────────────────────────────────
  const tabs: Array<{ key: TabKey; label: string; icon: React.ElementType }> = [
    { key: 'dashboard',     label: 'Dashboard',       icon: Shield },
    { key: 'persons',       label: 'Authorized Persons', icon: Users },
    { key: 'bank',          label: 'Bank Account',    icon: Landmark },
    { key: 'contributions', label: 'Contributions',   icon: Receipt },
    { key: 'expenditure',   label: 'Expenditure',     icon: Scale },
    { key: 'reports',       label: 'Reports',         icon: FileText },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Shield className="w-6 h-6 text-amber-500" />
            IEBC Campaign Compliance
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {campaign.name} — {ACT_REF}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className={`px-3 py-1.5 rounded-full text-xs font-bold border-2 ${scoreBorder(status.score)} ${scoreColor(status.score)}`}>
            {status.score}% Compliant
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-gray-200 overflow-x-auto">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              tab === key
                ? 'border-amber-500 text-amber-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === 'dashboard' && (
        <DashboardTab
          status={status}
          campaign={campaign}
          budget={budget}
          contributions={contributions}
          expenses={expenses}
          iebcLimit={iebcLimit}
        />
      )}

      {tab === 'persons' && (
        <PersonsTab campaignId={cid} persons={persons} />
      )}

      {tab === 'bank' && (
        <BankAccountTab campaignId={cid} bankAccount={bankAccount ?? null} />
      )}

      {tab === 'contributions' && (
        <ContributionsTab contributions={contributions} iebcLimit={iebcLimit} />
      )}

      {tab === 'expenditure' && (
        <ExpenditureTab expenses={expenses} iebcLimit={iebcLimit} />
      )}

      {tab === 'reports' && (
        <ReportsTab
          campaignId={cid}
          reports={reports}
          certificate={certificate ?? null}
          totalExpenses={totalExpenses}
        />
      )}
    </div>
  );
}

// ── Exported Page Component ─────────────────────────────────
export function MyCampaignCompliancePage() {
  return (
    <PageErrorBoundary page="IEBC Campaign Compliance">
      <ComplianceContent />
    </PageErrorBoundary>
  );
}
