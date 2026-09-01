// ============================================================
// VoteCapsule™ — IEBC Compliance Document Review (Authority Portal)
// Election Campaign Financing Act, 2013
// Reviews uploaded IEBC compliance docs across all campaigns/tenants.
// Authority officers can verify or reject each document.
// ============================================================
import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Shield, FileText, CheckCircle, XCircle, Clock, AlertTriangle,
  Search, Filter, Download, Eye, X, ChevronLeft, ChevronRight,
  FileCheck, Paperclip, Building2, User, RefreshCw,
} from 'lucide-react';
import { apiClient } from '../api/apiClient';

// ── Types ─────────────────────────────────────────────────────
interface ComplianceDoc {
  id: string;
  campaignId: string;
  tenantId: string;
  docCode: string;
  fileName: string;
  contentType: string | null;
  fileSizeBytes: number | null;
  status: 'pending' | 'verified' | 'rejected';
  reviewerNotes: string | null;
  uploadedAt: string;
  url: string;
}

// ── Constants ─────────────────────────────────────────────────
const DOC_LABELS: Record<string, string> = {
  ecf1:                  'Form ECF 1 — Appointment of Authorized Person(s)',
  ecf2:                  'Form ECF 2 — Declaration by Authorized Person',
  ecf3:                  'Form ECF 3 — Supporting Organization Notification',
  ecf4:                  'Form ECF 4 — Change of Authorized Person',
  id_copies:             'ID/Passport Copies of Authorized Persons',
  bank_statement:        'Campaign Bank Account Statement',
  bank_opening:          'Bank Account Opening Confirmation',
  expenditure_committee: 'Expenditure Committee Designation',
  ecf5:                  'Form ECF 5 — Contributions & Donations Report',
  ecf6_prelim:           'Form ECF 6 — Preliminary Expenditure Report',
  ecf6_final:            'Form ECF 6 — Final Expenditure Report',
  ecf7:                  'Form ECF 7 — Surplus Funds Report',
  auditor_report:        "Auditor's Report",
  receipts:              'Contribution Receipts (> KES 20,000)',
  ecf8:                  'Form ECF 8 — Certificate of Compliance',
};

const STATUS_TABS = [
  { key: 'pending',  label: 'Pending Review', color: 'amber'   },
  { key: 'verified', label: 'Verified',        color: 'emerald' },
  { key: 'rejected', label: 'Rejected',        color: 'red'     },
  { key: 'all',      label: 'All Documents',   color: 'gray'    },
] as const;

const PAGE_SIZE = 20;

// ── Helpers ───────────────────────────────────────────────────
function fmt(bytes: number | null): string {
  if (!bytes) return '—';
  if (bytes >= 1_048_576) return `${(bytes / 1_048_576).toFixed(1)} MB`;
  if (bytes >= 1_024)     return `${(bytes / 1_024).toFixed(0)} KB`;
  return `${bytes} B`;
}

function fmtDate(d: string): string {
  try {
    return new Date(d).toLocaleDateString('en-KE', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch { return d; }
}

// ── Review Modal ──────────────────────────────────────────────
function ReviewModal({
  doc,
  onClose,
}: {
  doc: ComplianceDoc;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [notes, setNotes] = useState(doc.reviewerNotes ?? '');
  const [previewOpen, setPreviewOpen] = useState(false);

  const reviewMut = useMutation({
    mutationFn: (payload: { status: string; notes: string }) =>
      apiClient.patch(
        `/campaign/campaigns/${doc.campaignId}/compliance/documents/${doc.docCode}/review`,
        payload,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['compliance-review-docs'] });
      onClose();
    },
  });

  const handleReview = (status: 'verified' | 'rejected') => {
    reviewMut.mutate({ status, notes });
  };

  const fileExt = doc.fileName.split('.').pop()?.toLowerCase() ?? '';
  const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileExt);
  const isPdf   = fileExt === 'pdf';

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
              <FileCheck className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">{DOC_LABELS[doc.docCode] ?? doc.docCode}</p>
              <p className="text-xs text-gray-500 mt-0.5">{doc.fileName} · {fmt(doc.fileSizeBytes)}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Document metadata */}
        <div className="px-5 py-3 bg-gray-50 border-b grid grid-cols-2 gap-4 text-xs">
          <div>
            <p className="text-gray-400 uppercase tracking-wide font-medium">Campaign ID</p>
            <p className="font-mono text-gray-700 mt-0.5 truncate">{doc.campaignId}</p>
          </div>
          <div>
            <p className="text-gray-400 uppercase tracking-wide font-medium">Uploaded</p>
            <p className="text-gray-700 mt-0.5">{fmtDate(doc.uploadedAt)}</p>
          </div>
          <div>
            <p className="text-gray-400 uppercase tracking-wide font-medium">Doc Code</p>
            <p className="font-mono text-gray-700 mt-0.5">{doc.docCode}</p>
          </div>
          <div>
            <p className="text-gray-400 uppercase tracking-wide font-medium">Current Status</p>
            <span className={`inline-flex items-center gap-1 mt-0.5 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
              doc.status === 'verified' ? 'bg-emerald-100 text-emerald-700' :
              doc.status === 'rejected' ? 'bg-red-100 text-red-700' :
              'bg-amber-100 text-amber-700'
            }`}>
              {doc.status === 'verified' ? <CheckCircle className="w-3 h-3" /> :
               doc.status === 'rejected' ? <XCircle className="w-3 h-3" /> :
               <Clock className="w-3 h-3" />}
              {doc.status.charAt(0).toUpperCase() + doc.status.slice(1)}
            </span>
          </div>
        </div>

        {/* Document preview */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* View document */}
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b">
              <p className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <Paperclip className="w-4 h-4 text-gray-400" />
                Document File
              </p>
              {doc.url && (
                <div className="flex items-center gap-2">
                  <a
                    href={doc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-100 px-3 py-1.5 rounded-lg hover:bg-emerald-200 transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" /> Open in new tab
                  </a>
                  <a
                    href={doc.url}
                    download={doc.fileName}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-600 bg-gray-100 px-3 py-1.5 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" /> Download
                  </a>
                </div>
              )}
            </div>

            {/* Inline preview for images */}
            {doc.url && isImage && (
              <div className="p-4 flex justify-center">
                <img
                  src={doc.url}
                  alt={doc.fileName}
                  className="max-h-64 max-w-full rounded-lg border border-gray-200 object-contain"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              </div>
            )}

            {/* PDF embed */}
            {doc.url && isPdf && (
              <div className="p-4">
                <iframe
                  src={doc.url}
                  className="w-full h-64 rounded-lg border border-gray-200"
                  title={doc.fileName}
                />
              </div>
            )}

            {/* Generic file info */}
            {!isImage && !isPdf && (
              <div className="p-4 text-center">
                <FileText className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">{doc.fileName}</p>
                <p className="text-xs text-gray-400 mt-0.5">{doc.contentType ?? 'Unknown type'} · {fmt(doc.fileSizeBytes)}</p>
              </div>
            )}
          </div>

          {/* Reviewer notes */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Reviewer Notes {doc.status === 'rejected' ? '(Required for rejection)' : '(Optional)'}
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Enter any notes, conditions, or reasons for rejection..."
              className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none"
            />
          </div>

          {reviewMut.isError && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              Review failed. Please try again.
            </p>
          )}
        </div>

        {/* Action buttons */}
        <div className="p-5 border-t flex items-center gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2.5 text-sm font-medium text-gray-700 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <div className="flex-1" />
          <button
            onClick={() => handleReview('rejected')}
            disabled={reviewMut.isPending}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-red-700 bg-red-100 hover:bg-red-200 rounded-xl transition-colors disabled:opacity-50"
          >
            <XCircle className="w-4 h-4" />
            {reviewMut.isPending ? 'Saving...' : 'Reject Document'}
          </button>
          <button
            onClick={() => handleReview('verified')}
            disabled={reviewMut.isPending}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors disabled:opacity-50"
          >
            <CheckCircle className="w-4 h-4" />
            {reviewMut.isPending ? 'Saving...' : 'Verify Document'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Stats Bar ─────────────────────────────────────────────────
function StatsBar({ pending, verified, rejected, total }: {
  pending: number; verified: number; rejected: number; total: number;
}) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {[
        { label: 'Pending Review', value: pending,  bg: 'bg-amber-50',   border: 'border-amber-200',   text: 'text-amber-700',   icon: Clock },
        { label: 'Verified',       value: verified,  bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', icon: CheckCircle },
        { label: 'Rejected',       value: rejected,  bg: 'bg-red-50',     border: 'border-red-200',     text: 'text-red-700',     icon: XCircle },
        { label: 'Total Documents', value: total,   bg: 'bg-gray-50',    border: 'border-gray-200',    text: 'text-gray-700',   icon: FileText },
      ].map(({ label, value, bg, border, text, icon: Icon }) => (
        <div key={label} className={`${bg} border ${border} rounded-2xl p-4`}>
          <div className="flex items-center justify-between">
            <Icon className={`w-5 h-5 ${text}`} />
            <span className={`text-2xl font-bold ${text}`}>{value}</span>
          </div>
          <p className={`text-xs font-medium ${text} mt-2`}>{label}</p>
        </div>
      ))}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────
export function ComplianceReviewPage(): React.JSX.Element {
  const qc = useQueryClient();
  const [activeStatus, setActiveStatus] = useState<'pending' | 'verified' | 'rejected' | 'all'>('pending');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [selectedDoc, setSelectedDoc] = useState<ComplianceDoc | null>(null);

  // We need a campaignId placeholder for the pending endpoint.
  // The endpoint uses tenantId from the auth header, not the campaignId param.
  // Use a sentinel UUID — the controller only uses x-tenant-id header.
  const SENTINEL_CAMPAIGN_ID = '00000000-0000-0000-0000-000000000000';

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['compliance-review-docs', activeStatus, page],
    queryFn: () =>
      apiClient
        .get(`/campaign/campaigns/${SENTINEL_CAMPAIGN_ID}/compliance/documents/pending`, {
          params: { status: activeStatus, page, limit: PAGE_SIZE },
        })
        .then((r) => r.data)
        .catch(() => ({ data: [], total: 0, page: 1, limit: PAGE_SIZE })),
    staleTime: 30_000,
  });

  const docs: ComplianceDoc[]  = data?.data ?? [];
  const total: number          = data?.total ?? 0;
  const totalPages             = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // Client-side search filter
  const filtered = useMemo(() => {
    if (!search) return docs;
    const q = search.toLowerCase();
    return docs.filter((d) =>
      d.fileName.toLowerCase().includes(q) ||
      d.docCode.toLowerCase().includes(q) ||
      (DOC_LABELS[d.docCode] ?? '').toLowerCase().includes(q) ||
      d.campaignId.toLowerCase().includes(q),
    );
  }, [docs, search]);

  // Count by status for stats bar
  const counts = useMemo(() => {
    const pending  = docs.filter(d => d.status === 'pending').length;
    const verified = docs.filter(d => d.status === 'verified').length;
    const rejected = docs.filter(d => d.status === 'rejected').length;
    return { pending, verified, rejected, total: docs.length };
  }, [docs]);

  const statusBadge = (status: string) => {
    if (status === 'verified') return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-700">
        <CheckCircle className="w-3 h-3" /> Verified
      </span>
    );
    if (status === 'rejected') return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-100 text-red-700">
        <XCircle className="w-3 h-3" /> Rejected
      </span>
    );
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-700">
        <Clock className="w-3 h-3" /> Pending
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Shield className="w-6 h-6 text-emerald-600" />
            IEBC Compliance Document Review
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Verify or reject uploaded IEBC compliance documents — Election Campaign Financing Act, 2013
          </p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isRefetching}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isRefetching ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Stats */}
      <StatsBar
        pending={counts.pending}
        verified={counts.verified}
        rejected={counts.rejected}
        total={total}
      />

      {/* Status tabs + search */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => { setActiveStatus(tab.key); setPage(1); }}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                activeStatus === tab.key
                  ? 'bg-white shadow-sm text-gray-900'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by filename, doc code, campaign ID..."
            className="pl-9 pr-3 py-2 w-full border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Document table */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="text-center py-16">
            <div className="w-8 h-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mx-auto" />
            <p className="text-sm text-gray-500 mt-3">Loading documents...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <FileCheck className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-base font-medium text-gray-500">
              {search ? `No documents matching "${search}"` : `No ${activeStatus !== 'all' ? activeStatus : ''} documents`}
            </p>
            <p className="text-sm text-gray-400 mt-1">
              {activeStatus === 'pending'
                ? 'All documents have been reviewed — excellent!'
                : 'Documents will appear here once candidates or parties upload them.'}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    <th className="px-4 py-3">Document</th>
                    <th className="px-4 py-3">Campaign</th>
                    <th className="px-4 py-3">File</th>
                    <th className="px-4 py-3">Uploaded</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map((doc) => (
                    <tr
                      key={doc.id}
                      className="hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => setSelectedDoc(doc)}
                    >
                      <td className="px-4 py-3">
                        <p className="font-semibold text-gray-900 text-xs">
                          {DOC_LABELS[doc.docCode] ?? doc.docCode}
                        </p>
                        <p className="text-[10px] font-mono text-gray-400 mt-0.5">{doc.docCode}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-mono text-xs text-gray-600 truncate max-w-[140px]">
                          {doc.campaignId.slice(0, 8)}…
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Paperclip className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                          <p className="text-xs text-gray-700 truncate max-w-[140px]">{doc.fileName}</p>
                        </div>
                        <p className="text-[10px] text-gray-400 mt-0.5">{fmt(doc.fileSizeBytes)}</p>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                        {fmtDate(doc.uploadedAt)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {statusBadge(doc.status)}
                        {doc.reviewerNotes && (
                          <p className="text-[10px] text-gray-400 mt-1 max-w-[100px] truncate mx-auto">
                            {doc.reviewerNotes}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={(e) => { e.stopPropagation(); setSelectedDoc(doc); }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Review
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-gray-200">
                <p className="text-xs text-gray-500">
                  Showing {((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, total)} of {total} documents
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="p-2 text-gray-500 hover:text-gray-700 disabled:opacity-40 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-sm font-medium text-gray-700">
                    Page {page} of {totalPages}
                  </span>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="p-2 text-gray-500 hover:text-gray-700 disabled:opacity-40 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Legal reference */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-sm font-semibold text-amber-800">IEBC Document Review Guidelines</p>
          <ul className="text-xs text-amber-700 mt-2 space-y-1 list-disc ml-4">
            <li>Verify that each document matches the required form — check for IEBC letterhead, signatures, and date.</li>
            <li>ID copies must be legible and match the registered authorized person's details.</li>
            <li>Bank account confirmation must show the campaign-specific account name.</li>
            <li>Rejecting a document resets the campaign's document compliance score — add rejection notes.</li>
            <li>Verified documents contribute to the campaign's IEBC compliance score (up to +14 points).</li>
          </ul>
        </div>
      </div>

      {/* Review modal */}
      {selectedDoc && (
        <ReviewModal doc={selectedDoc} onClose={() => setSelectedDoc(null)} />
      )}
    </div>
  );
}
