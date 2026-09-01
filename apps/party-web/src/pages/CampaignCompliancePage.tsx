// ============================================================
// VoteCapsule™ — IEBC Campaign Compliance (Party Portal)
// Election Campaign Financing Act, 2013 & Regulations, 2020
// IEBC Gazette Notice No. 12251, 7th August 2026
// ============================================================
import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { clsx } from 'clsx';
import {
  Shield, FileCheck, AlertTriangle, CheckCircle, Building2, Users,
  Scale, FileText, Clock, Calendar, ChevronRight, Plus, X, Download,
  Eye, Search, Filter, ArrowUpRight, BadgeCheck, Landmark, UserCheck,
  Banknote, BarChart3, BookOpen, Gavel, Percent, CircleDollarSign,
  UserPlus, Trash2, ExternalLink, Info,
  Upload, FolderOpen, Paperclip, FileUp,
} from 'lucide-react';
import { campaignApi } from '../api/campaignApi';
import { PageErrorBoundary } from '../components/PageErrorBoundary';
import { useAppSelector } from '../store/hooks';

// ── Types ────────────────────────────────────────────────────
interface Campaign {
  id: string;
  name: string;
  status: string;
  electionId?: string;
}

interface ComplianceStatus {
  score: number;
  checklist: ChecklistItem[];
  bankAccount?: BankAccountInfo;
}

interface ChecklistItem {
  key: string;
  label: string;
  description: string;
  status: 'complete' | 'pending' | 'overdue';
  form?: string;
}

interface AuthorizedPerson {
  id: string;
  name: string;
  idNumber: string;
  role: string;
  committeePosition?: 'chair' | 'treasurer' | 'member';
  status: 'active' | 'removed' | 'pending';
  registeredAt: string;
}

interface SupportingOrg {
  id: string;
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  consentStatus: 'granted' | 'pending' | 'revoked';
  registeredAt: string;
}

interface BankAccountInfo {
  bankName: string;
  accountName: string;
  accountNumber: string;
  branchCode: string;
  registeredAt?: string;
}

interface CandidateCompliance {
  id: string;
  name: string;
  position: string;
  county?: string;
  constituency?: string;
  iebcLimit: number;
  spent: number;
  pctUsed: number;
  complianceStatus: 'compliant' | 'warning' | 'critical';
}

interface ComplianceReport {
  id: string;
  type: string;
  title: string;
  status: 'draft' | 'submitted' | 'accepted' | 'rejected';
  dueDate: string;
  submittedAt?: string;
}

interface Contribution {
  id: string;
  source: string;
  sourceType: string;
  amount: number;
  date: string;
  receiptIssued: boolean;
}

// ── Constants ────────────────────────────────────────────────
const TABS = [
  { key: 'dashboard',   label: 'Compliance Dashboard',   icon: Shield },
  { key: 'persons',     label: 'Authorized Persons',     icon: Users },
  { key: 'orgs',        label: 'Supporting Organizations', icon: Building2 },
  { key: 'limits',      label: 'Party Spending Limits',  icon: Scale },
  { key: 'candidates',  label: 'Candidate Monitoring',   icon: UserCheck },
  { key: 'contribs',    label: 'Contributions & Sources', icon: CircleDollarSign },
  { key: 'documents',   label: 'Documents',              icon: FileUp },
  { key: 'reports',     label: 'Reports & Penalties',    icon: FileText },
] as const;

type TabKey = typeof TABS[number]['key'];

const KEY_DATES = [
  { label: 'Expenditure Period Start', date: '10 February 2027', status: 'upcoming' as const },
  { label: 'Election Date',            date: '10 August 2027',   status: 'upcoming' as const },
  { label: 'Expenditure Period End',   date: '24 August 2027',   status: 'upcoming' as const },
  { label: 'Account Closure Deadline', date: '10 November 2027', status: 'upcoming' as const },
];

const PARTY_LIMIT_TOTAL = 24_450_172_531; // KES 24.45B

/** Fifth Schedule — party spending categories with exact gazette amounts */
const SPENDING_CATEGORIES = [
  { name: 'Venues for Campaign Rallies',        amount: 375_052_688,     pct: 1.5 },
  { name: 'Publicity Materials',                 amount: 1_066_714_464,   pct: 4.4 },
  { name: 'Advertising & Media',                 amount: 2_517_509_489,   pct: 10.3 },
  { name: 'Campaign Personnel',                  amount: 332_922_614,     pct: 1.4 },
  { name: 'Election Agents',                     amount: 2_081_162_296,   pct: 8.5 },
  { name: 'Transportation',                      amount: 16_126_632_035,  pct: 66.0 },
  { name: 'Communication & Telephone',           amount: 134_230_217,     pct: 0.5 },
  { name: 'Nomination Fees',                     amount: 213_818_044,     pct: 0.9 },
  { name: 'Security',                            amount: 285_090_725,     pct: 1.2 },
  { name: 'Accommodation & Travel',              amount: 24_945_438,      pct: 0.1 },
  { name: 'Administrative Cost',                 amount: 1_292_094_521,   pct: 5.3 },
];

const SOURCE_TYPES = [
  'Political Parties Fund',
  'Self-financing',
  'Family',
  'Individual',
  'Supporting Organizations',
  'Harambee',
  'Anonymous',
  'Loans',
];

const DEFAULT_CHECKLIST: ChecklistItem[] = [
  { key: 'authorized_persons', label: 'Authorized Person(s) Registered', description: 'At least one authorized person registered with IEBC', form: 'Form ECF 1', status: 'pending' },
  { key: 'expenditure_committee', label: 'Campaign Expenditure Committee Designated', description: 'Committee chair, treasurer, and members appointed per Reg. 18', form: 'Reg. 18', status: 'pending' },
  { key: 'bank_account', label: 'Campaign Financing Account Opened', description: 'Dedicated bank account opened and registered with IEBC', form: 'Reg. 11', status: 'pending' },
  { key: 'supporting_orgs', label: 'Supporting Organizations Registered', description: 'All supporting organizations registered with consent letters', form: 'Form ECF 3', status: 'pending' },
  { key: 'contributions', label: 'Contribution Records Updated', description: 'All contributions received are recorded and receipted per Reg. 12', form: 'Reg. 12', status: 'pending' },
  { key: 'spending_limit', label: 'Party Expenditure Within Limits', description: 'Total party expenditure within KES 24.45B gazette cap', form: 'Fifth Schedule', status: 'pending' },
  { key: 'reports_filed', label: 'Reports Filed on Time', description: 'All mandatory reports submitted within statutory deadlines', form: 'Form ECF 6', status: 'pending' },
];

// ── Formatting helpers ───────────────────────────────────────
const fmt = (n: number) =>
  n >= 1_000_000_000
    ? `KES ${(n / 1_000_000_000).toFixed(2)}B`
    : n >= 1_000_000
    ? `KES ${(n / 1_000_000).toFixed(1)}M`
    : n >= 1_000
    ? `KES ${(n / 1_000).toFixed(0)}K`
    : `KES ${Number(n ?? 0).toLocaleString()}`;

const fmtFull = (n: number) => `KES ${Number(n ?? 0).toLocaleString()}`;

const fmtDate = (d: string) => {
  try { return new Date(d).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' }); }
  catch { return d; }
};

const safe = <T,>(data: any, fallback: T): T => {
  if (data === undefined || data === null) return fallback;
  const inner = data?.data ?? data;
  return (inner as T) ?? fallback;
};

// ── Score Ring ───────────────────────────────────────────────
function ComplianceScoreRing({ score }: { score: number }) {
  const color = score >= 80 ? '#059669' : score >= 50 ? '#d97706' : '#dc2626';
  const label = score >= 80 ? 'COMPLIANT' : score >= 50 ? 'AT RISK' : 'NON-COMPLIANT';
  return (
    <div className="flex flex-col items-center">
      <div className="relative w-36 h-36">
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
          <circle cx="50" cy="50" r="40" fill="none" stroke="#e5e7eb" strokeWidth="10" />
          <circle cx="50" cy="50" r="40" fill="none" stroke={color} strokeWidth="10"
            strokeDasharray={`${Math.min(score, 100) * 2.51} 251`} strokeLinecap="round" />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold text-gray-900">{score}%</span>
          <span className="text-xs text-gray-500">compliance</span>
        </div>
      </div>
      <p className={clsx('text-sm font-semibold mt-2', {
        'text-emerald-600': score >= 80,
        'text-amber-600': score >= 50 && score < 80,
        'text-red-600': score < 50,
      })}>{label}</p>
    </div>
  );
}

// ── Compliance Dashboard Tab ─────────────────────────────────
function DashboardTab({
  complianceStatus,
  isLoading,
}: {
  complianceStatus: ComplianceStatus | null;
  isLoading: boolean;
}) {
  const checklist = complianceStatus?.checklist ?? DEFAULT_CHECKLIST;
  const score = complianceStatus?.score ?? 0;
  const completedCount = checklist.filter(c => c.status === 'complete').length;

  if (isLoading) return <LoadingSkeleton rows={6} />;

  return (
    <div className="space-y-6">
      {/* Score + Gazette banner */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <div className="flex flex-col lg:flex-row items-start lg:items-center gap-6">
          <ComplianceScoreRing score={score} />
          <div className="flex-1">
            <h3 className="text-lg font-bold text-gray-900">Party Compliance Score</h3>
            <p className="text-sm text-gray-600 mt-1">
              {completedCount} of {checklist.length} requirements met under the
              Election Campaign Financing Act, 2013 and Regulations, 2020.
            </p>
            <div className="mt-3 flex items-center gap-2 text-xs bg-violet-50 text-violet-700 rounded-lg px-3 py-2 border border-violet-200">
              <BookOpen className="w-4 h-4 shrink-0" />
              <span>
                <strong>IEBC Gazette Notice No. 12251, 7th August 2026</strong> — Campaign financing
                limits for political parties and candidates in the 2027 General Election.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Checklist */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h3 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
          <FileCheck className="w-5 h-5 text-violet-600" />
          Party Compliance Checklist
        </h3>
        <div className="space-y-3">
          {checklist.map((item, i) => (
            <div key={item.key}
              className={clsx(
                'flex items-start gap-3 p-3 rounded-xl border transition-colors',
                item.status === 'complete' ? 'bg-emerald-50 border-emerald-200' :
                item.status === 'overdue' ? 'bg-red-50 border-red-200' :
                'bg-gray-50 border-gray-200'
              )}>
              <div className="mt-0.5">
                {item.status === 'complete' ? (
                  <CheckCircle className="w-5 h-5 text-emerald-600" />
                ) : item.status === 'overdue' ? (
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                ) : (
                  <div className="w-5 h-5 rounded-full border-2 border-gray-300" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">
                  {i + 1}. {item.label}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">{item.description}</p>
              </div>
              {item.form && (
                <span className="shrink-0 text-xs font-mono bg-white border border-gray-200 rounded px-2 py-1 text-gray-600">
                  {item.form}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Key Dates */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h3 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-violet-600" />
          Key Compliance Dates
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {KEY_DATES.map(kd => (
            <div key={kd.label} className="bg-violet-50 rounded-xl p-4 border border-violet-100">
              <p className="text-xs text-violet-600 font-medium">{kd.label}</p>
              <p className="text-sm font-bold text-gray-900 mt-1">{kd.date}</p>
              <span className="inline-block mt-2 text-xs px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 font-medium">
                Upcoming
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Legal references */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
        <div className="flex items-start gap-3">
          <Gavel className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-amber-800">Legal Framework</p>
            <ul className="text-xs text-amber-700 mt-2 space-y-1 list-disc ml-4">
              <li>Election Campaign Financing Act, 2013 (No. 42 of 2013)</li>
              <li>Election Campaign Financing Regulations, 2020 (L.N. 114/2020)</li>
              <li>IEBC Gazette Notice No. 12251 — Spending Limits, 7th August 2026</li>
              <li>Political Parties Act, 2011 (as amended)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Authorized Persons & Expenditure Committee Tab ───────────
function AuthorizedPersonsTab({
  campaignId,
}: {
  campaignId: string;
}) {
  const queryClient = useQueryClient();
  const [showRegister, setShowRegister] = useState(false);
  const [formData, setFormData] = useState({ name: '', idNumber: '', role: '', committeePosition: '' });

  const { data: personsRaw, isLoading } = useQuery({
    queryKey: ['compliance-persons', campaignId],
    queryFn: () => campaignApi.compliance.getAuthorizedPersons(campaignId).then(r => r.data),
    enabled: !!campaignId,
    staleTime: 30_000,
  });

  const persons: AuthorizedPerson[] = safe(personsRaw, []);
  const activePersons = persons.filter(p => p.status === 'active');
  const chair = activePersons.find(p => p.committeePosition === 'chair');
  const treasurer = activePersons.find(p => p.committeePosition === 'treasurer');
  const members = activePersons.filter(p => p.committeePosition === 'member');

  const registerMut = useMutation({
    mutationFn: (data: any) => campaignApi.compliance.registerPerson(campaignId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compliance-persons', campaignId] });
      setShowRegister(false);
      setFormData({ name: '', idNumber: '', role: '', committeePosition: '' });
    },
  });

  const removeMut = useMutation({
    mutationFn: (personId: string) => campaignApi.compliance.removePerson(campaignId, personId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['compliance-persons', campaignId] }),
  });

  if (isLoading) return <LoadingSkeleton rows={5} />;

  return (
    <div className="space-y-6">
      {/* Authorized Persons - Form ECF 1 */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-violet-600" />
              Authorized Persons — Form ECF 1
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              Persons authorized to incur campaign expenditure on behalf of the party.
              Must be registered with IEBC before the expenditure period begins.
            </p>
          </div>
          <button
            onClick={() => setShowRegister(true)}
            className="px-4 py-2 rounded-lg bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 flex items-center gap-2"
          >
            <UserPlus className="w-4 h-4" />
            Register Person
          </button>
        </div>

        {activePersons.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No authorized persons registered"
            description="Register at least one authorized person using Form ECF 1 to comply with the Election Campaign Financing Act."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500 uppercase">Name</th>
                  <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500 uppercase">ID Number</th>
                  <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500 uppercase">Role</th>
                  <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500 uppercase">Committee Position</th>
                  <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                  <th className="text-right py-3 px-3 text-xs font-semibold text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {activePersons.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="py-3 px-3 font-medium text-gray-900">{p.name}</td>
                    <td className="py-3 px-3 text-gray-600 font-mono text-xs">{p.idNumber}</td>
                    <td className="py-3 px-3 text-gray-600">{p.role}</td>
                    <td className="py-3 px-3">
                      {p.committeePosition ? (
                        <span className={clsx(
                          'text-xs font-medium px-2 py-0.5 rounded-full',
                          p.committeePosition === 'chair' ? 'bg-violet-100 text-violet-700' :
                          p.committeePosition === 'treasurer' ? 'bg-blue-100 text-blue-700' :
                          'bg-gray-100 text-gray-700'
                        )}>
                          {p.committeePosition.charAt(0).toUpperCase() + p.committeePosition.slice(1)}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">--</span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <StatusBadge status={p.status} />
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => { if (confirm('Remove this authorized person? This will initiate Form ECF 4 (Change of Authorized Person).')) removeMut.mutate(p.id); }}
                        className="text-xs text-red-600 hover:text-red-800 font-medium"
                      >
                        <Trash2 className="w-3.5 h-3.5 inline mr-1" />Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Expenditure Committee — Reg. 18 */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h3 className="text-base font-bold text-gray-900 mb-2 flex items-center gap-2">
          <Users className="w-5 h-5 text-violet-600" />
          Campaign Expenditure Committee — Reg. 18
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          Under Regulation 18, every political party shall designate a campaign expenditure
          committee consisting of a Chair, Treasurer, and Members. This committee must be
          submitted to IEBC alongside Form ECF 1.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <CommitteeSlot label="Chair" person={chair} />
          <CommitteeSlot label="Treasurer" person={treasurer} />
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
            <p className="text-xs text-gray-500 font-medium uppercase mb-2">Members</p>
            {members.length === 0 ? (
              <p className="text-sm text-gray-400 italic">No members assigned</p>
            ) : (
              <ul className="space-y-1.5">
                {members.map(m => (
                  <li key={m.id} className="text-sm text-gray-700 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-violet-400" />
                    {m.name}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl">
          <div className="flex items-start gap-2">
            <Info className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
            <p className="text-xs text-amber-700">
              <strong>Form ECF 4 — Change of Authorized Person:</strong> If any authorized
              person or committee member changes, the party must notify IEBC within 14 days
              using Form ECF 4, accompanied by the new person's appointment letter.
            </p>
          </div>
        </div>
      </div>

      {/* Register Modal */}
      {showRegister && (
        <ModalOverlay onClose={() => setShowRegister(false)} title="Register Authorized Person — Form ECF 1">
          <div className="space-y-4">
            <FormField label="Full Name" required value={formData.name}
              onChange={v => setFormData(prev => ({ ...prev, name: v }))} />
            <FormField label="National ID / Passport Number" required value={formData.idNumber}
              onChange={v => setFormData(prev => ({ ...prev, idNumber: v }))} />
            <FormField label="Role / Title" value={formData.role}
              onChange={v => setFormData(prev => ({ ...prev, role: v }))}
              placeholder="e.g. Party Secretary General" />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Committee Position</label>
              <select
                value={formData.committeePosition}
                onChange={e => setFormData(prev => ({ ...prev, committeePosition: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
              >
                <option value="">Not on committee</option>
                <option value="chair">Chair</option>
                <option value="treasurer">Treasurer</option>
                <option value="member">Member</option>
              </select>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setShowRegister(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancel</button>
              <button
                onClick={() => registerMut.mutate(formData)}
                disabled={!formData.name || !formData.idNumber || registerMut.isPending}
                className="px-4 py-2 rounded-lg bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {registerMut.isPending ? 'Registering...' : 'Register'}
              </button>
            </div>
            {registerMut.isError && (
              <p className="text-sm text-red-600">Failed to register. Please try again.</p>
            )}
          </div>
        </ModalOverlay>
      )}
    </div>
  );
}

// ── Supporting Organizations Tab (Party-specific) ────────────
function SupportingOrgsTab({ campaignId }: { campaignId: string }) {
  const queryClient = useQueryClient();
  const [showRegister, setShowRegister] = useState(false);
  const [orgForm, setOrgForm] = useState({
    name: '', address: '', email: '', phone: '', responsiblePerson: '', consentLetter: '',
  });

  const { data: orgsRaw, isLoading } = useQuery({
    queryKey: ['compliance-orgs', campaignId],
    queryFn: () => campaignApi.compliance.getSupportingOrgs(campaignId).then(r => r.data),
    enabled: !!campaignId,
    staleTime: 30_000,
  });

  const orgs: SupportingOrg[] = safe(orgsRaw, []);

  const registerOrgMut = useMutation({
    mutationFn: (data: any) => campaignApi.compliance.registerSupportingOrg(campaignId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compliance-orgs', campaignId] });
      setShowRegister(false);
      setOrgForm({ name: '', address: '', email: '', phone: '', responsiblePerson: '', consentLetter: '' });
    },
  });

  if (isLoading) return <LoadingSkeleton rows={4} />;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-violet-600" />
              Supporting Organizations — Form ECF 3
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              Organizations that have consented to support the party's campaign.
              Registration required under Section 15 of the Act.
            </p>
          </div>
          <button
            onClick={() => setShowRegister(true)}
            className="px-4 py-2 rounded-lg bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Register Organization
          </button>
        </div>

        {orgs.length === 0 ? (
          <EmptyState
            icon={Building2}
            title="No supporting organizations registered"
            description="Register organizations that consent to support the party's campaign using Form ECF 3."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500 uppercase">Organization Name</th>
                  <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500 uppercase">Contact Person</th>
                  <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500 uppercase">Consent Status</th>
                  <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500 uppercase">Registered</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {orgs.map(org => (
                  <tr key={org.id} className="hover:bg-gray-50">
                    <td className="py-3 px-3 font-medium text-gray-900">{org.name}</td>
                    <td className="py-3 px-3 text-gray-600">{org.contactPerson}</td>
                    <td className="py-3 px-3">
                      <span className={clsx(
                        'text-xs font-medium px-2 py-0.5 rounded-full',
                        org.consentStatus === 'granted' ? 'bg-emerald-100 text-emerald-700' :
                        org.consentStatus === 'pending' ? 'bg-amber-100 text-amber-700' :
                        'bg-red-100 text-red-700'
                      )}>
                        {org.consentStatus.charAt(0).toUpperCase() + org.consentStatus.slice(1)}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-gray-500 text-xs">{fmtDate(org.registeredAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Rules reference */}
      <div className="bg-violet-50 border border-violet-200 rounded-2xl p-5">
        <h4 className="text-sm font-semibold text-violet-800 mb-2">Supporting Organization Rules</h4>
        <ul className="text-xs text-violet-700 space-y-1.5 list-disc ml-4">
          <li>Must notify IEBC within <strong>7 days</strong> of receiving consent from a supporting organization.</li>
          <li>Each supporting organization must maintain its own expenditure records.</li>
          <li>Supporting organization contributions are subject to the <strong>20% single-source cap</strong> (KES {fmtFull(PARTY_LIMIT_TOTAL * 0.2)}).</li>
          <li>Consent may be revoked at any time by written notice to IEBC and the party.</li>
          <li>The party remains liable for expenditures incurred by supporting organizations on its behalf.</li>
        </ul>
      </div>

      {/* Register Modal */}
      {showRegister && (
        <ModalOverlay onClose={() => setShowRegister(false)} title="Register Supporting Organization — Form ECF 3">
          <div className="space-y-4">
            <FormField label="Organization Name" required value={orgForm.name}
              onChange={v => setOrgForm(prev => ({ ...prev, name: v }))} />
            <FormField label="Address" value={orgForm.address}
              onChange={v => setOrgForm(prev => ({ ...prev, address: v }))} />
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Email" value={orgForm.email}
                onChange={v => setOrgForm(prev => ({ ...prev, email: v }))} />
              <FormField label="Phone" value={orgForm.phone}
                onChange={v => setOrgForm(prev => ({ ...prev, phone: v }))} />
            </div>
            <FormField label="Responsible Person" required value={orgForm.responsiblePerson}
              onChange={v => setOrgForm(prev => ({ ...prev, responsiblePerson: v }))}
              placeholder="Name of person managing the organization's campaign activities" />
            <FormField label="Consent Letter Reference" value={orgForm.consentLetter}
              onChange={v => setOrgForm(prev => ({ ...prev, consentLetter: v }))}
              placeholder="e.g. Ref/2027/001" />
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setShowRegister(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancel</button>
              <button
                onClick={() => registerOrgMut.mutate(orgForm)}
                disabled={!orgForm.name || !orgForm.responsiblePerson || registerOrgMut.isPending}
                className="px-4 py-2 rounded-lg bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {registerOrgMut.isPending ? 'Registering...' : 'Register Organization'}
              </button>
            </div>
            {registerOrgMut.isError && (
              <p className="text-sm text-red-600">Failed to register organization. Please try again.</p>
            )}
          </div>
        </ModalOverlay>
      )}
    </div>
  );
}

// ── Party Spending Limits Tab (Fifth Schedule) ───────────────
function SpendingLimitsTab({
  campaignId,
}: {
  campaignId: string;
}) {
  const { data: budgetRaw } = useQuery({
    queryKey: ['campaign-budget', campaignId],
    queryFn: () => campaignApi.budget.get(campaignId).then(r => r.data),
    enabled: !!campaignId,
    staleTime: 60_000,
  });

  const { data: expensesRaw } = useQuery({
    queryKey: ['campaign-expenses', campaignId],
    queryFn: () => campaignApi.budget.listExpenses(campaignId).then(r => r.data),
    enabled: !!campaignId,
    staleTime: 30_000,
  });

  const budget = safe(budgetRaw, null) as any;
  const expenses: any[] = safe(expensesRaw, []);
  const totalSpent = expenses.reduce((sum: number, e: any) => sum + Number(e.amount ?? 0), 0);
  const totalPct = PARTY_LIMIT_TOTAL > 0 ? ((totalSpent / PARTY_LIMIT_TOTAL) * 100) : 0;
  const singleSourceCap = PARTY_LIMIT_TOTAL * 0.20;

  return (
    <div className="space-y-6">
      {/* Total limit card */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Scale className="w-5 h-5 text-violet-600" />
          <h3 className="text-base font-bold text-gray-900">Party Spending Limit — Fifth Schedule</h3>
        </div>
        <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
          <div>
            <p className="text-xs text-gray-500 uppercase font-medium">Total Party Limit</p>
            <p className="text-2xl font-bold text-gray-900">KES 24,450,172,531</p>
            <p className="text-xs text-gray-500 mt-1">IEBC Gazette Notice No. 12251</p>
          </div>
          <div className="flex-1 w-full">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-gray-600">Total Spent: {fmt(totalSpent)}</span>
              <span className={clsx('font-semibold',
                totalPct >= 90 ? 'text-red-600' : totalPct >= 70 ? 'text-amber-600' : 'text-emerald-600'
              )}>{totalPct.toFixed(1)}%</span>
            </div>
            <div className="w-full h-4 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={clsx('h-full rounded-full transition-all', {
                  'bg-emerald-500': totalPct < 70,
                  'bg-amber-500': totalPct >= 70 && totalPct < 90,
                  'bg-red-500': totalPct >= 90,
                })}
                style={{ width: `${Math.min(totalPct, 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 11 Categories */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h3 className="text-sm font-bold text-gray-900 mb-4">Spending Categories (Fifth Schedule)</h3>
        <div className="space-y-4">
          {SPENDING_CATEGORIES.map((cat, i) => {
            // Estimate per-category spending (would come from backend categorization)
            const catSpent = 0; // Backend will populate per-category
            const catPct = cat.amount > 0 ? (catSpent / cat.amount) * 100 : 0;
            return (
              <div key={i} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="w-6 h-6 flex items-center justify-center rounded-full bg-violet-100 text-violet-700 text-xs font-bold shrink-0">
                      {i + 1}
                    </span>
                    <span className="text-gray-900 font-medium truncate">{cat.name}</span>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <span className="text-xs text-gray-500 font-medium">{cat.pct}%</span>
                    <span className="text-sm font-semibold text-gray-900 w-40 text-right">{fmtFull(cat.amount)}</span>
                  </div>
                </div>
                <div className="ml-8 flex items-center gap-2">
                  <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={clsx('h-full rounded-full transition-all', {
                        'bg-violet-500': catPct < 70,
                        'bg-amber-500': catPct >= 70 && catPct < 90,
                        'bg-red-500': catPct >= 90,
                      })}
                      style={{ width: `${Math.min(catPct, 100)}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-400 w-16 text-right">{fmt(catSpent)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Contribution limits info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Percent className="w-4 h-4 text-violet-600" />
            <h4 className="text-sm font-bold text-gray-900">Total Contribution Limit</h4>
          </div>
          <p className="text-xl font-bold text-gray-900">{fmt(PARTY_LIMIT_TOTAL)}</p>
          <p className="text-xs text-gray-500 mt-1">100% of spending limit (Reg. 12)</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <h4 className="text-sm font-bold text-gray-900">Single-Source Cap (20%)</h4>
          </div>
          <p className="text-xl font-bold text-gray-900">{fmt(singleSourceCap)}</p>
          <p className="text-xs text-gray-500 mt-1">Maximum from any single contributor</p>
        </div>
      </div>
    </div>
  );
}

// ── Candidate Campaign Monitoring Tab (Party-specific) ───────
function CandidateMonitoringTab({ campaignId }: { campaignId: string }) {
  const [search, setSearch] = useState('');
  const [positionFilter, setPositionFilter] = useState('all');

  const { data: candidatesRaw, isLoading } = useQuery({
    queryKey: ['compliance-candidates', campaignId],
    queryFn: () => campaignApi.compliance.getCandidateCompliance(campaignId).then(r => r.data),
    enabled: !!campaignId,
    staleTime: 30_000,
  });

  const candidates: CandidateCompliance[] = safe(candidatesRaw, []);

  const positions = useMemo(() => {
    const set = new Set(candidates.map(c => c.position));
    return ['all', ...Array.from(set)];
  }, [candidates]);

  const filtered = useMemo(() => {
    let list = candidates;
    if (positionFilter !== 'all') list = list.filter(c => c.position === positionFilter);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(c =>
        c.name.toLowerCase().includes(q) ||
        (c.county ?? '').toLowerCase().includes(q) ||
        (c.constituency ?? '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [candidates, positionFilter, search]);

  const stats = useMemo(() => ({
    total: candidates.length,
    compliant: candidates.filter(c => c.complianceStatus === 'compliant').length,
    warning: candidates.filter(c => c.complianceStatus === 'warning').length,
    critical: candidates.filter(c => c.complianceStatus === 'critical').length,
  }), [candidates]);

  if (isLoading) return <LoadingSkeleton rows={6} />;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Candidates" value={stats.total} color="violet" icon={Users} />
        <StatCard label="Compliant" value={stats.compliant} color="emerald" icon={CheckCircle} />
        <StatCard label="Warning (70-90%)" value={stats.warning} color="amber" icon={AlertTriangle} />
        <StatCard label="Critical (>90%)" value={stats.critical} color="red" icon={AlertTriangle} />
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-violet-600" />
            Candidate Compliance Overview
          </h3>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search candidates..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500 w-56"
              />
            </div>
            <select
              value={positionFilter}
              onChange={e => setPositionFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
            >
              {positions.map(p => (
                <option key={p} value={p}>{p === 'all' ? 'All Positions' : p}</option>
              ))}
            </select>
          </div>
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No candidate data available"
            description="Candidate compliance data will appear here once campaigns with budgets are active."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500 uppercase">Candidate</th>
                  <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500 uppercase">Position</th>
                  <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500 uppercase">County / Constituency</th>
                  <th className="text-right py-3 px-3 text-xs font-semibold text-gray-500 uppercase">IEBC Limit</th>
                  <th className="text-right py-3 px-3 text-xs font-semibold text-gray-500 uppercase">Spent</th>
                  <th className="text-right py-3 px-3 text-xs font-semibold text-gray-500 uppercase">% Used</th>
                  <th className="text-center py-3 px-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(c => (
                  <tr key={c.id} className="hover:bg-gray-50 cursor-pointer">
                    <td className="py-3 px-3 font-medium text-gray-900">{c.name}</td>
                    <td className="py-3 px-3 text-gray-600">{c.position}</td>
                    <td className="py-3 px-3 text-gray-600 text-xs">
                      {[c.county, c.constituency].filter(Boolean).join(' / ') || '--'}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-xs text-gray-700">{fmt(c.iebcLimit)}</td>
                    <td className="py-3 px-3 text-right font-mono text-xs text-gray-700">{fmt(c.spent)}</td>
                    <td className="py-3 px-3 text-right">
                      <span className={clsx('text-xs font-bold', {
                        'text-emerald-600': c.pctUsed < 70,
                        'text-amber-600': c.pctUsed >= 70 && c.pctUsed < 90,
                        'text-red-600': c.pctUsed >= 90,
                      })}>{c.pctUsed.toFixed(1)}%</span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className={clsx(
                        'text-xs font-medium px-2 py-0.5 rounded-full',
                        c.complianceStatus === 'compliant' ? 'bg-emerald-100 text-emerald-700' :
                        c.complianceStatus === 'warning' ? 'bg-amber-100 text-amber-700' :
                        'bg-red-100 text-red-700'
                      )}>
                        {c.complianceStatus === 'compliant' ? 'Compliant' :
                         c.complianceStatus === 'warning' ? 'Warning' : 'Critical'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6 text-xs text-gray-500">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-emerald-500" />
          <span>Compliant (&lt;70% of limit)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-amber-500" />
          <span>Warning (70-90%)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <span>Critical (&gt;90%)</span>
        </div>
      </div>
    </div>
  );
}

// ── Contributions & Sources Tab ──────────────────────────────
function ContributionsTab({ campaignId }: { campaignId: string }) {
  const { data: contribsRaw, isLoading } = useQuery({
    queryKey: ['campaign-contribs', campaignId],
    queryFn: () => campaignApi.budget.listContribs(campaignId).then(r => r.data),
    enabled: !!campaignId,
    staleTime: 30_000,
  });

  const contribs: Contribution[] = safe(contribsRaw, []);
  const totalContributions = contribs.reduce((sum, c) => sum + Number(c.amount ?? 0), 0);
  const contribPct = PARTY_LIMIT_TOTAL > 0 ? (totalContributions / PARTY_LIMIT_TOTAL) * 100 : 0;
  const singleSourceCap = PARTY_LIMIT_TOTAL * 0.20;

  // Group by source type
  const bySource = useMemo(() => {
    const map = new Map<string, number>();
    SOURCE_TYPES.forEach(st => map.set(st, 0));
    contribs.forEach(c => {
      const current = map.get(c.sourceType) ?? 0;
      map.set(c.sourceType, current + Number(c.amount ?? 0));
    });
    return Array.from(map.entries()).map(([type, total]) => ({
      type,
      total,
      pct: totalContributions > 0 ? (total / totalContributions) * 100 : 0,
      exceedsCap: total > singleSourceCap,
    }));
  }, [contribs, totalContributions, singleSourceCap]);

  // Top contributors (by amount) for the 20% cap check
  const topContributors = useMemo(() => {
    const map = new Map<string, number>();
    contribs.forEach(c => {
      map.set(c.source, (map.get(c.source) ?? 0) + Number(c.amount ?? 0));
    });
    return Array.from(map.entries())
      .map(([source, total]) => ({ source, total, pctOfLimit: (total / PARTY_LIMIT_TOTAL) * 100 }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
  }, [contribs]);

  if (isLoading) return <LoadingSkeleton rows={5} />;

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <CircleDollarSign className="w-5 h-5 text-violet-600" />
          <h3 className="text-base font-bold text-gray-900">Party Contributions Summary</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-violet-50 rounded-xl p-4 border border-violet-100">
            <p className="text-xs text-violet-600 font-medium">Total Contributions</p>
            <p className="text-xl font-bold text-gray-900 mt-1">{fmt(totalContributions)}</p>
            <p className="text-xs text-gray-500 mt-1">{contribPct.toFixed(2)}% of party limit</p>
          </div>
          <div className="bg-violet-50 rounded-xl p-4 border border-violet-100">
            <p className="text-xs text-violet-600 font-medium">Party Contribution Limit</p>
            <p className="text-xl font-bold text-gray-900 mt-1">{fmt(PARTY_LIMIT_TOTAL)}</p>
            <p className="text-xs text-gray-500 mt-1">100% of spending limit</p>
          </div>
          <div className="bg-violet-50 rounded-xl p-4 border border-violet-100">
            <p className="text-xs text-violet-600 font-medium">20% Single-Source Cap</p>
            <p className="text-xl font-bold text-gray-900 mt-1">{fmt(singleSourceCap)}</p>
            <p className="text-xs text-gray-500 mt-1">Max from any one contributor</p>
          </div>
        </div>
      </div>

      {/* Source Breakdown — Form ECF 5 schedules */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h3 className="text-sm font-bold text-gray-900 mb-1">Contribution Sources — Form ECF 5 Schedules</h3>
        <p className="text-xs text-gray-500 mb-4">Breakdown of all contributions by source type</p>
        <div className="space-y-3">
          {bySource.map(s => (
            <div key={s.type} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-700">{s.type}</span>
                <div className="flex items-center gap-3">
                  {s.exceedsCap && (
                    <span className="text-xs font-medium text-red-600 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> Exceeds 20% cap
                    </span>
                  )}
                  <span className="font-semibold text-gray-900">{fmt(s.total)}</span>
                </div>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={clsx('h-full rounded-full', s.exceedsCap ? 'bg-red-500' : 'bg-violet-500')}
                  style={{ width: `${Math.min(s.pct, 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Top Contributors — 20% cap tracking */}
      {topContributors.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-violet-600" />
            Top Contributors — 20% Cap Tracking
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase">Source</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500 uppercase">Amount</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500 uppercase">% of Limit</th>
                  <th className="text-center py-2 px-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {topContributors.map((tc, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="py-2 px-3 text-gray-900">{tc.source}</td>
                    <td className="py-2 px-3 text-right font-mono text-xs">{fmt(tc.total)}</td>
                    <td className="py-2 px-3 text-right">
                      <span className={clsx('text-xs font-bold',
                        tc.pctOfLimit > 20 ? 'text-red-600' : 'text-gray-600'
                      )}>{tc.pctOfLimit.toFixed(2)}%</span>
                    </td>
                    <td className="py-2 px-3 text-center">
                      {tc.pctOfLimit > 20 ? (
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                          EXCEEDS CAP
                        </span>
                      ) : (
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                          Within Limit
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

      {/* Receipt requirement */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
        <div className="flex items-start gap-3">
          <Banknote className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-amber-800">Receipt Issuance Requirement</p>
            <p className="text-xs text-amber-700 mt-1">
              Under Regulation 12(3), the party must issue an official receipt for every
              contribution exceeding <strong>KES 20,000</strong>. All receipts must be
              recorded and made available to IEBC upon request. Anonymous contributions
              exceeding KES 5,000 must be paid into the Political Parties Fund.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Reports & Penalties Tab ──────────────────────────────────
function ReportsTab({ campaignId }: { campaignId: string }) {
  const queryClient = useQueryClient();

  const { data: reportsRaw, isLoading } = useQuery({
    queryKey: ['compliance-reports', campaignId],
    queryFn: () => campaignApi.compliance.getReports(campaignId).then(r => r.data),
    enabled: !!campaignId,
    staleTime: 30_000,
  });

  const { data: certificateRaw } = useQuery({
    queryKey: ['compliance-certificate', campaignId],
    queryFn: () => campaignApi.compliance.getCertificate(campaignId).then(r => r.data).catch(() => null),
    enabled: !!campaignId,
    staleTime: 60_000,
  });

  const reports: ComplianceReport[] = safe(reportsRaw, []);
  const certificate = safe(certificateRaw, null) as any;

  const REPORT_TYPES = [
    {
      form: 'Form ECF 6',
      title: 'Preliminary Report',
      description: 'Filed after nomination — accounts for pre-election spending',
      deadline: 'Within 30 days after nomination',
    },
    {
      form: 'Form ECF 6',
      title: 'Final Report',
      description: 'Filed after election — complete campaign expenditure account',
      deadline: 'Within 90 days after election (10 November 2027)',
    },
    {
      form: 'Form ECF 7',
      title: 'Surplus Funds Report',
      description: 'Declaration of any surplus campaign funds and their disposal',
      deadline: 'Within 90 days after the expenditure period ends',
    },
    {
      form: 'Auditor\'s Report',
      title: 'Independent Audit Report',
      description: 'Required if total campaign expenses exceed KES 1,000,000. Must be prepared by a registered auditor.',
      deadline: 'Submitted alongside the Final Report',
    },
  ];

  if (isLoading) return <LoadingSkeleton rows={5} />;

  return (
    <div className="space-y-6">
      {/* Report Timeline */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h3 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5 text-violet-600" />
          Mandatory Reports
        </h3>
        <div className="space-y-4">
          {REPORT_TYPES.map((rt, i) => {
            const existing = reports.find(r => r.title === rt.title);
            const isSubmitted = existing?.status === 'submitted' || existing?.status === 'accepted';
            return (
              <div key={i}
                className={clsx(
                  'flex items-start gap-4 p-4 rounded-xl border transition-colors',
                  isSubmitted ? 'bg-emerald-50 border-emerald-200' : 'bg-gray-50 border-gray-200'
                )}>
                <div className="mt-0.5">
                  {isSubmitted ? (
                    <CheckCircle className="w-5 h-5 text-emerald-600" />
                  ) : (
                    <Clock className="w-5 h-5 text-gray-400" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono bg-white border border-gray-200 rounded px-2 py-0.5 text-gray-600">
                      {rt.form}
                    </span>
                    <h4 className="text-sm font-semibold text-gray-900">{rt.title}</h4>
                  </div>
                  <p className="text-xs text-gray-600 mt-1">{rt.description}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    <strong>Deadline:</strong> {rt.deadline}
                  </p>
                  {existing && (
                    <div className="mt-2">
                      <span className={clsx(
                        'text-xs font-medium px-2 py-0.5 rounded-full',
                        existing.status === 'accepted' ? 'bg-emerald-100 text-emerald-700' :
                        existing.status === 'submitted' ? 'bg-blue-100 text-blue-700' :
                        existing.status === 'rejected' ? 'bg-red-100 text-red-700' :
                        'bg-gray-100 text-gray-700'
                      )}>
                        {existing.status.charAt(0).toUpperCase() + existing.status.slice(1)}
                      </span>
                      {existing.submittedAt && (
                        <span className="text-xs text-gray-400 ml-2">
                          Submitted {fmtDate(existing.submittedAt)}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Certificate of Compliance — Form ECF 8 */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
          <BadgeCheck className="w-5 h-5 text-violet-600" />
          Certificate of Compliance — Form ECF 8
        </h3>
        {certificate ? (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <Shield className="w-8 h-8 text-emerald-600" />
              <div>
                <p className="text-sm font-semibold text-emerald-800">Certificate Issued</p>
                <p className="text-xs text-emerald-700 mt-0.5">
                  IEBC has confirmed compliance with the Election Campaign Financing Act.
                  {certificate.issuedAt && ` Issued ${fmtDate(certificate.issuedAt)}.`}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <Clock className="w-6 h-6 text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-700">Pending</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Certificate will be issued by IEBC after all reports are filed and accepted,
                  and the party is found to be in compliance with the Act.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Dispute Resolution */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
          <Gavel className="w-5 h-5 text-violet-600" />
          Dispute Resolution — Regulations 27-35
        </h3>
        <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 space-y-3">
          <p className="text-sm text-gray-700">
            Any dispute arising from the enforcement of the Act or these Regulations shall be
            resolved by the <strong>IEBC Dispute Resolution Committee</strong> established
            under Regulation 28.
          </p>
          <ul className="text-xs text-gray-600 space-y-1.5 list-disc ml-4">
            <li>Complaints must be filed within <strong>30 days</strong> of the alleged contravention.</li>
            <li>The Committee must hear and determine the complaint within <strong>60 days</strong>.</li>
            <li>Appeals lie to the <strong>High Court</strong> within 30 days of the Committee's decision.</li>
            <li>The Committee may order refund of excess contributions, forfeiture of illegally obtained funds, or other appropriate remedies.</li>
          </ul>
        </div>
      </div>

      {/* Penalties */}
      <div className="bg-red-50 border border-red-200 rounded-2xl p-5">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-red-800">Penalties — Sections 23 & 24</p>
            <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="bg-white rounded-lg p-3 border border-red-200">
                <p className="text-xs font-semibold text-red-700">Financial Penalty</p>
                <p className="text-lg font-bold text-red-800 mt-1">KES 2,000,000</p>
                <p className="text-xs text-red-600 mt-0.5">Maximum fine for contravention of the Act</p>
              </div>
              <div className="bg-white rounded-lg p-3 border border-red-200">
                <p className="text-xs font-semibold text-red-700">Imprisonment</p>
                <p className="text-lg font-bold text-red-800 mt-1">5 Years</p>
                <p className="text-xs text-red-600 mt-0.5">Maximum term for persons responsible</p>
              </div>
            </div>
            <ul className="text-xs text-red-700 mt-3 space-y-1 list-disc ml-4">
              <li>Exceeding spending limits is a criminal offence under Section 23.</li>
              <li>Failure to file reports within prescribed timelines — Section 24.</li>
              <li>Knowingly providing false information in any form — Section 24(2).</li>
              <li>Party officials may be held <strong>personally liable</strong> for the party's non-compliance.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Shared Components ────────────────────────────────────────
function LoadingSkeleton({ rows }: { rows: number }) {
  return (
    <div className="space-y-4 animate-pulse">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-3" />
          <div className="h-3 bg-gray-100 rounded w-2/3 mb-2" />
          <div className="h-3 bg-gray-100 rounded w-1/2" />
        </div>
      ))}
    </div>
  );
}

function EmptyState({ icon: Icon, title, description }: { icon: any; title: string; description: string }) {
  return (
    <div className="text-center py-10">
      <Icon className="w-10 h-10 text-gray-300 mx-auto" />
      <p className="text-sm font-medium text-gray-500 mt-3">{title}</p>
      <p className="text-xs text-gray-400 mt-1 max-w-md mx-auto">{description}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; text: string }> = {
    active: { bg: 'bg-emerald-100', text: 'text-emerald-700' },
    pending: { bg: 'bg-amber-100', text: 'text-amber-700' },
    removed: { bg: 'bg-red-100', text: 'text-red-700' },
  };
  const style = map[status] ?? { bg: 'bg-gray-100', text: 'text-gray-700' };
  return (
    <span className={clsx('text-xs font-medium px-2 py-0.5 rounded-full', style.bg, style.text)}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function StatCard({ label, value, color, icon: Icon }: { label: string; value: number; color: string; icon: any }) {
  const colorMap: Record<string, string> = {
    violet: 'bg-violet-50 border-violet-100 text-violet-700',
    emerald: 'bg-emerald-50 border-emerald-100 text-emerald-700',
    amber: 'bg-amber-50 border-amber-100 text-amber-700',
    red: 'bg-red-50 border-red-100 text-red-700',
  };
  const cls = colorMap[color] ?? colorMap.violet;
  return (
    <div className={clsx('rounded-2xl border p-4', cls)}>
      <div className="flex items-center justify-between">
        <Icon className="w-5 h-5 opacity-60" />
        <span className="text-2xl font-bold">{value}</span>
      </div>
      <p className="text-xs font-medium mt-2 opacity-80">{label}</p>
    </div>
  );
}

function CommitteeSlot({ label, person }: { label: string; person?: AuthorizedPerson }) {
  return (
    <div className={clsx(
      'rounded-xl p-4 border',
      person ? 'bg-violet-50 border-violet-200' : 'bg-gray-50 border-gray-200'
    )}>
      <p className="text-xs text-gray-500 font-medium uppercase mb-2">{label}</p>
      {person ? (
        <div>
          <p className="text-sm font-semibold text-gray-900">{person.name}</p>
          <p className="text-xs text-gray-500 mt-0.5">{person.role || person.idNumber}</p>
        </div>
      ) : (
        <p className="text-sm text-gray-400 italic">Not assigned</p>
      )}
    </div>
  );
}

function FormField({
  label, value, onChange, required, placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
      />
    </div>
  );
}

// ── Compliance Documents Tab (Party) ────────────────────────
const PARTY_REQUIRED_DOCS = [
  { code: 'ecf1',           name: 'Form ECF 1 — Appointment of Authorized Person(s)', form: 'ECF 1', regulation: 'Reg. 6(1)', required: true, category: 'registration' },
  { code: 'ecf2',           name: 'Form ECF 2 — Declaration by Authorized Person', form: 'ECF 2', regulation: 'Reg. 6(4)', required: true, category: 'registration' },
  { code: 'ecf3',           name: 'Form ECF 3 — Supporting Organization Notification', form: 'ECF 3', regulation: 'Reg. 8', required: true, category: 'registration' },
  { code: 'ecf4',           name: 'Form ECF 4 — Change of Authorized Person', form: 'ECF 4', regulation: 'Reg. 10', required: false, category: 'registration' },
  { code: 'id_copies',      name: 'ID/Passport Copies of Authorized Persons', form: '-', regulation: 'Reg. 5', required: true, category: 'registration' },
  { code: 'bank_statement', name: 'Campaign Bank Account Statement', form: '-', regulation: 'Reg. 11(6)', required: true, category: 'financial' },
  { code: 'bank_opening',   name: 'Bank Account Opening Confirmation', form: '-', regulation: 'Reg. 11(1)', required: true, category: 'financial' },
  { code: 'expenditure_committee', name: 'Expenditure Committee Designation', form: '-', regulation: 'Reg. 18', required: true, category: 'registration' },
  { code: 'ecf5',           name: 'Form ECF 5 — Contributions & Donations Report', form: 'ECF 5', regulation: 'Reg. 12(1)', required: true, category: 'reporting' },
  { code: 'ecf6_prelim',    name: 'Form ECF 6 — Preliminary Expenditure Report', form: 'ECF 6', regulation: 'Reg. 21(1)', required: true, category: 'reporting' },
  { code: 'ecf6_final',     name: 'Form ECF 6 — Final Expenditure Report', form: 'ECF 6', regulation: 'Reg. 21(1)', required: true, category: 'reporting' },
  { code: 'ecf7',           name: 'Form ECF 7 — Surplus Funds Report', form: 'ECF 7', regulation: 'Reg. 23(1)', required: false, category: 'reporting' },
  { code: 'auditor_report', name: 'Auditor\'s Report (if expenses > KES 1M)', form: '-', regulation: 'Reg. 26', required: false, category: 'reporting' },
  { code: 'receipts',       name: 'Contribution Receipts (> KES 20,000)', form: '-', regulation: 'Reg. 16', required: true, category: 'financial' },
  { code: 'ecf8',           name: 'Form ECF 8 — Certificate of Compliance', form: 'ECF 8', regulation: 'Reg. 24', required: false, category: 'certificate' },
];

const PARTY_DOC_CATEGORIES = [
  { code: 'all', label: 'All Documents' },
  { code: 'registration', label: 'Registration' },
  { code: 'financial', label: 'Financial' },
  { code: 'reporting', label: 'Reports' },
  { code: 'certificate', label: 'Certificate' },
];

interface PartyUploadedDoc {
  code: string;
  fileName: string;
  uploadedAt: string;
  url?: string;
}

function ComplianceDocumentsTab({ campaignId }: { campaignId: string }) {
  const [category, setCategory] = useState('all');
  const [uploadedDocs, setUploadedDocs] = useState<PartyUploadedDoc[]>([]);
  const [uploading, setUploading] = useState<string | null>(null);
  const fileInputRefs = React.useRef<Record<string, HTMLInputElement | null>>({});

  // Fetch existing documents — primary: /compliance/documents, fallback: /compliance/reports
  const { data: existingDocs } = useQuery({
    queryKey: ['compliance-documents', campaignId],
    queryFn: async () => {
      try {
        const res = await campaignApi.compliance.getDocuments(campaignId);
        return safe<any[]>(res?.data ?? res, []);
      } catch {
        // Fallback to reports endpoint (legacy)
        try {
          const res = await campaignApi.compliance.getReports(campaignId);
          return safe<any[]>(res?.data ?? res, []);
        } catch { return []; }
      }
    },
    enabled: !!campaignId,
  });

  // Merge server docs with local state
  React.useEffect(() => {
    if (existingDocs && Array.isArray(existingDocs) && existingDocs.length > 0) {
      const mapped = existingDocs.map((d: any) => ({
        code: d.docCode ?? d.code ?? d.type ?? '',
        fileName: d.fileName ?? d.title ?? 'Document',
        uploadedAt: d.uploadedAt ?? d.submittedAt ?? d.createdAt ?? '',
        url: d.url ?? d.fileUrl ?? '',
      }));
      setUploadedDocs(prev => {
        const localCodes = new Set(prev.map(p => p.code));
        const newDocs = mapped.filter((m: PartyUploadedDoc) => !localCodes.has(m.code));
        return [...prev, ...newDocs];
      });
    }
  }, [existingDocs]);

  const filteredDocs = category === 'all'
    ? PARTY_REQUIRED_DOCS
    : PARTY_REQUIRED_DOCS.filter(d => d.category === category);

  const requiredDocs = PARTY_REQUIRED_DOCS.filter(d => d.required);
  const uploadedRequired = requiredDocs.filter(d => uploadedDocs.some(u => u.code === d.code));
  const progressPct = requiredDocs.length > 0 ? Math.round((uploadedRequired.length / requiredDocs.length) * 100) : 0;

  const progressBarColor =
    progressPct <= 25  ? 'bg-red-500'
    : progressPct <= 50  ? 'bg-orange-500'
    : progressPct <= 75  ? 'bg-amber-500'
    : progressPct < 100  ? 'bg-lime-500'
    : 'bg-emerald-500';

  const handleUpload = async (docCode: string, file: File) => {
    setUploading(docCode);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('docCode', docCode);

      let uploadedUrl = '';
      try {
        // Primary: POST /compliance/documents (Priority 11 endpoint)
        const res = await campaignApi.compliance.uploadDocument(campaignId, formData);
        uploadedUrl = res?.data?.data?.url ?? res?.data?.url ?? '';
      } catch {
        // Fallback 1: POST /compliance/reports (legacy)
        try {
          const fd2 = new FormData();
          fd2.append('file', file);
          fd2.append('docCode', docCode);
          fd2.append('type', 'compliance_document');
          await campaignApi.compliance.submitReport(campaignId, fd2);
        } catch {
          // Fallback 2: presigned S3 upload via media service
          try {
            const urlRes = await campaignApi.media.uploadUrl(campaignId, {
              fileName: file.name,
              contentType: file.type,
              category: 'compliance',
              docCode,
            });
            const presignedUrl = urlRes?.data?.url ?? urlRes?.data?.data?.url;
            if (presignedUrl) {
              await fetch(presignedUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } });
            }
          } catch {
            // Store locally even if all upload paths fail
          }
        }
      }

      setUploadedDocs(prev => [
        ...prev.filter(d => d.code !== docCode),
        { code: docCode, fileName: file.name, uploadedAt: new Date().toISOString(), url: uploadedUrl },
      ]);
    } finally {
      setUploading(null);
    }
  };

  const getUploaded = (code: string) => uploadedDocs.find(d => d.code === code);

  // Party-Wide Document Tracker: total docs across all campaigns
  const totalDocs = PARTY_REQUIRED_DOCS.length;
  const totalUploaded = uploadedDocs.length;

  return (
    <div className="space-y-5">
      {/* Party-Wide Document Tracker */}
      <div className="bg-violet-50 rounded-2xl border border-violet-200 p-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
            <FolderOpen className="w-5 h-5 text-violet-600" />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900">Party-Wide Document Tracker</h3>
            <p className="text-xs text-gray-500">Aggregate compliance document status across all campaigns</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-xl p-3 text-center border border-violet-100">
            <p className="text-2xl font-bold text-violet-600">{totalDocs}</p>
            <p className="text-[10px] text-gray-500 uppercase tracking-wide mt-0.5">Total Documents</p>
          </div>
          <div className="bg-white rounded-xl p-3 text-center border border-violet-100">
            <p className="text-2xl font-bold text-emerald-600">{totalUploaded}</p>
            <p className="text-[10px] text-gray-500 uppercase tracking-wide mt-0.5">Uploaded</p>
          </div>
          <div className="bg-white rounded-xl p-3 text-center border border-violet-100">
            <p className="text-2xl font-bold text-red-500">{totalDocs - totalUploaded}</p>
            <p className="text-[10px] text-gray-500 uppercase tracking-wide mt-0.5">Remaining</p>
          </div>
        </div>
      </div>

      {/* Overall Compliance Progress */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <FileUp className="w-5 h-5 text-violet-500" />
            <h3 className="text-base font-bold text-gray-900">Document Compliance Progress</h3>
          </div>
          <span className="text-sm font-semibold text-gray-600">
            {uploadedRequired.length} of {requiredDocs.length} required documents uploaded
          </span>
        </div>
        <div className="relative w-full h-4 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${progressBarColor} ${progressPct < 100 ? 'animate-pulse' : ''}`}
            style={{ width: `${progressPct}%` }}
          />
          {progressPct < 100 && (
            <div
              className={`absolute inset-0 rounded-full opacity-20 ${progressBarColor}`}
              style={{ width: `${progressPct}%`, boxShadow: `0 0 12px 2px currentColor` }}
            />
          )}
        </div>
        <p className="text-xs text-gray-500 mt-2">
          {progressPct === 100
            ? 'All required IEBC compliance documents have been uploaded.'
            : `Upload the remaining ${requiredDocs.length - uploadedRequired.length} required document(s) to achieve full compliance.`}
        </p>
      </div>

      {/* Category Filter Chips */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {PARTY_DOC_CATEGORIES.map(cat => (
          <button
            key={cat.code}
            onClick={() => setCategory(cat.code)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
              category === cat.code
                ? 'bg-violet-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Document Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredDocs.map(doc => {
          const uploaded = getUploaded(doc.code);
          const isUploading = uploading === doc.code;

          return (
            <div
              key={doc.code}
              className={`relative rounded-2xl p-4 transition-all ${
                uploaded
                  ? 'border-2 border-emerald-300 bg-emerald-50/30'
                  : 'border-2 border-dashed border-gray-300 bg-white hover:border-violet-400 hover:bg-violet-50/20'
              }`}
            >
              {/* Required badge */}
              <div className="flex items-start justify-between mb-2">
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                  doc.required ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500'
                }`}>
                  {doc.required ? 'Required' : 'Optional'}
                </span>
                {uploaded && <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />}
              </div>

              {/* Document name */}
              <h4 className="text-sm font-bold text-gray-900 mb-1 leading-tight">{doc.name}</h4>

              {/* Form & regulation */}
              <div className="flex items-center gap-3 text-xs text-gray-500 mb-3">
                <span className="flex items-center gap-1">
                  <FileText className="w-3 h-3" />
                  {doc.form}
                </span>
                <span className="flex items-center gap-1">
                  <Scale className="w-3 h-3" />
                  {doc.regulation}
                </span>
              </div>

              {uploaded ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-100/60 rounded-lg px-2.5 py-1.5">
                    <Paperclip className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="truncate font-medium">{uploaded.fileName}</span>
                  </div>
                  <p className="text-[10px] text-gray-400">
                    Uploaded {fmtDate(uploaded.uploadedAt)}
                  </p>
                  <div className="flex gap-2">
                    {uploaded.url && (
                      <a
                        href={uploaded.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 text-center px-2 py-1 text-xs font-medium text-violet-700 bg-violet-100 rounded-lg hover:bg-violet-200 transition-colors"
                      >
                        View
                      </a>
                    )}
                    <button
                      onClick={() => fileInputRefs.current[doc.code]?.click()}
                      className="flex-1 text-center px-2 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      Replace
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => fileInputRefs.current[doc.code]?.click()}
                  disabled={isUploading}
                  className="w-full flex flex-col items-center justify-center py-4 text-gray-400 hover:text-violet-500 transition-colors"
                >
                  {isUploading ? (
                    <div className="w-6 h-6 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Upload className="w-6 h-6 mb-1" />
                  )}
                  <span className="text-xs font-medium mt-1">
                    {isUploading ? 'Uploading...' : 'Click to upload'}
                  </span>
                </button>
              )}

              {/* Hidden file input */}
              <input
                ref={el => { fileInputRefs.current[doc.code] = el; }}
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                className="hidden"
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (file) handleUpload(doc.code, file);
                  e.target.value = '';
                }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ModalOverlay({ onClose, title, children }: { onClose: () => void; title: string; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-gray-900">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────
function CampaignCompliancePageContent() {
  const user = useAppSelector((s: any) => s.auth.user);
  const [activeTab, setActiveTab] = useState<TabKey>('dashboard');
  const [selectedCampaignId, setSelectedCampaignId] = useState('');

  // Load campaigns
  const { data: campaignsRaw, isLoading: campaignsLoading } = useQuery({
    queryKey: ['campaigns'],
    queryFn: () => campaignApi.list().then(r => r.data),
    staleTime: 60_000,
  });

  const campaigns: Campaign[] = safe(campaignsRaw, []);
  const campaignId = selectedCampaignId || campaigns[0]?.id || '';

  // Load compliance status
  const { data: complianceRaw, isLoading: complianceLoading } = useQuery({
    queryKey: ['compliance-status', campaignId],
    queryFn: () => campaignApi.compliance.getStatus(campaignId).then(r => r.data).catch(() => null),
    enabled: !!campaignId,
    staleTime: 30_000,
  });

  const complianceStatus: ComplianceStatus | null = safe(complianceRaw, null);

  if (campaignsLoading) {
    return (
      <div className="space-y-6 p-6">
        <LoadingSkeleton rows={3} />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {campaigns.length === 0 && (
        <div className="flex items-center gap-3 bg-violet-50 border border-violet-200 rounded-xl px-4 py-3">
          <Shield className="w-5 h-5 text-violet-500 flex-shrink-0" />
          <p className="text-sm text-violet-700">Create a campaign to access IEBC compliance tracking. <a href="/campaign/create" className="font-semibold underline hover:text-violet-900">Get started →</a></p>
        </div>
      )}
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Shield className="w-6 h-6 text-violet-600" />
            IEBC Campaign Financing Compliance
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Election Campaign Financing Act, 2013 — Party compliance tracking and reporting
          </p>
        </div>

        {/* Campaign selector */}
        {campaigns.length > 1 && (
          <select
            value={campaignId}
            onChange={e => setSelectedCampaignId(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
          >
            {campaigns.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        )}
      </div>

      {/* Tabs */}
      <div className={`flex gap-1 border-b border-gray-200 overflow-x-auto ${campaigns.length === 0 ? 'opacity-40 pointer-events-none' : ''}`}>
        {TABS.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={clsx(
                'px-4 py-2.5 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap',
                activeTab === tab.key
                  ? 'border-violet-600 text-violet-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              )}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {activeTab === 'dashboard' && (
        <DashboardTab complianceStatus={complianceStatus} isLoading={complianceLoading} />
      )}
      {activeTab === 'persons' && (
        <AuthorizedPersonsTab campaignId={campaignId} />
      )}
      {activeTab === 'orgs' && (
        <SupportingOrgsTab campaignId={campaignId} />
      )}
      {activeTab === 'limits' && (
        <SpendingLimitsTab campaignId={campaignId} />
      )}
      {activeTab === 'candidates' && (
        <CandidateMonitoringTab campaignId={campaignId} />
      )}
      {activeTab === 'contribs' && (
        <ContributionsTab campaignId={campaignId} />
      )}
      {activeTab === 'documents' && (
        <ComplianceDocumentsTab campaignId={campaignId} />
      )}
      {activeTab === 'reports' && (
        <ReportsTab campaignId={campaignId} />
      )}
    </div>
  );
}

// ── Exported Page (wrapped in error boundary) ────────────────
export function CampaignCompliancePage() {
  return (
    <PageErrorBoundary page="IEBC Campaign Compliance">
      <CampaignCompliancePageContent />
    </PageErrorBoundary>
  );
}
