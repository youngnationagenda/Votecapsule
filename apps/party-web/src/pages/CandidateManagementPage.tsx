/**
 * VoteCapsule™ — Candidate Management Page (Party Portal)
 *
 * Lists all party candidates.
 * Single registration → delegates to PartyCandidatesPage sponsorship flow.
 * Bulk registration  → BulkUploadModal (Excel / CSV / Word / PDF).
 *
 * Excel parsing:  SheetJS loaded lazily from CDN (runs in user's browser)
 * Word parsing:   Mammoth loaded lazily from CDN
 * CSV/TSV:        Native JS (no library needed)
 * PDF:            Basic text-stream extraction (text-based PDFs only)
 */

import React, { useState, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Users, Search, UserPlus, ExternalLink, Upload, X, AlertCircle,
  CheckCircle2, Download, Loader2, AlertTriangle, FileSpreadsheet, FileText, File,
  ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../api/apiClient';
import { useAppSelector } from '../store/hooks';
import { PageErrorBoundary } from '../components/PageErrorBoundary';

// ── Status badge colours ────────────────────────────────────────
const STATUS_COLOR: Record<string, string> = {
  PENDING_NOMINATION: 'bg-amber-100 text-amber-700',
  NOMINATED:          'bg-blue-100 text-blue-700',
  APPROVED:           'bg-emerald-100 text-emerald-700',
  ELECTED:            'bg-violet-100 text-violet-700',
  NOT_ELECTED:        'bg-gray-100 text-gray-600',
  DISQUALIFIED:       'bg-red-100 text-red-700',
  WITHDRAWN:          'bg-gray-100 text-gray-500',
};

// ══════════════════════════════════════════════════════════════
//  BULK UPLOAD — shared types + helpers
// ══════════════════════════════════════════════════════════════

interface ParsedCandidate {
  _rowNum: number;
  fullName: string;
  nationalId: string;
  position: string;
  countyCode: string;
  constituencyCode: string;
  wardCode: string;
  gender: string;
  dateOfBirth: string;
  email: string;
  phone: string;
  electionId: string;
  positionId: string;
  _errors: string[];
  _selected: boolean;
}

// Column header aliases → field name
const COL_MAP: Record<string, keyof Omit<ParsedCandidate, '_rowNum' | '_errors' | '_selected'>> = {
  'full name': 'fullName', 'fullname': 'fullName', 'name': 'fullName', 'candidate': 'fullName', 'candidate name': 'fullName',
  'national id': 'nationalId', 'nationalid': 'nationalId', 'id number': 'nationalId', 'id no': 'nationalId', 'id': 'nationalId', 'national_id': 'nationalId',
  'position': 'position', 'pos': 'position', 'seat': 'position', 'elective position': 'position',
  'county code': 'countyCode', 'countycode': 'countyCode', 'county': 'countyCode', 'county_code': 'countyCode',
  'constituency code': 'constituencyCode', 'constituency': 'constituencyCode', 'constituencycode': 'constituencyCode', 'constituency_code': 'constituencyCode',
  'ward code': 'wardCode', 'wardcode': 'wardCode', 'ward': 'wardCode', 'ward_code': 'wardCode',
  'gender': 'gender', 'sex': 'gender',
  'date of birth': 'dateOfBirth', 'dob': 'dateOfBirth', 'dateofbirth': 'dateOfBirth', 'birth date': 'dateOfBirth', 'date_of_birth': 'dateOfBirth',
  'email': 'email', 'e-mail': 'email', 'email address': 'email',
  'phone': 'phone', 'phone number': 'phone', 'mobile': 'phone', 'telephone': 'phone', 'tel': 'phone',
  'election id': 'electionId', 'electionid': 'electionId', 'election_id': 'electionId',
  'position id': 'positionId', 'positionid': 'positionId', 'position_id': 'positionId',
};

const VALID_POSITIONS = ['PRESIDENT', 'GOVERNOR', 'SENATOR', 'WOMEN_REP', 'MP', 'MCA'];

// ── Native CSV parser (handles quoted fields) ─────────────────
function parseCSVText(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return [];
  function splitRow(row: string): string[] {
    const out: string[] = [];
    let inQuote = false, cur = '';
    for (let i = 0; i < row.length; i++) {
      const ch = row[i];
      if (ch === '"' && !inQuote)                          { inQuote = true; continue; }
      if (ch === '"' && inQuote && row[i + 1] === '"')     { cur += '"'; i++; continue; }
      if (ch === '"' && inQuote)                           { inQuote = false; continue; }
      if (ch === ',' && !inQuote)                          { out.push(cur.trim()); cur = ''; continue; }
      cur += ch;
    }
    out.push(cur.trim());
    return out;
  }
  const headers = splitRow(lines[0]).map(h => h.replace(/^"|"$/g, '').toLowerCase().trim());
  return lines.slice(1).map(line => {
    const vals = splitRow(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = vals[i] ?? ''; });
    return row;
  });
}

// ── Map raw column object → ParsedCandidate with validation ──
function mapToCandidate(raw: Record<string, string>, rowNum: number): ParsedCandidate {
  const out: any = {};
  for (const [rawKey, rawVal] of Object.entries(raw)) {
    const field = COL_MAP[rawKey.toLowerCase().trim()];
    if (field) out[field] = (rawVal ?? '').trim();
  }
  const position = ((out.position ?? '') as string).toUpperCase().replace(/[\s-]/g, '_').trim();
  const errors: string[] = [];
  if (!out.fullName)   errors.push('Full name required');
  if (!out.nationalId) errors.push('National ID required');
  if (!position)       errors.push('Position required');
  else if (!VALID_POSITIONS.includes(position)) errors.push(`Position must be one of: ${VALID_POSITIONS.join(', ')}`);
  if (out.countyCode       && !/^\d{3}$/.test(out.countyCode))       errors.push('County code must be 3 digits');
  if (out.constituencyCode && !/^\d{3}$/.test(out.constituencyCode)) errors.push('Constituency code must be 3 digits');
  if (out.wardCode         && !/^\d{4}$/.test(out.wardCode))         errors.push('Ward code must be 4 digits');
  return {
    _rowNum: rowNum, _errors: errors, _selected: errors.length === 0,
    fullName: out.fullName ?? '', nationalId: out.nationalId ?? '',
    position, countyCode: out.countyCode ?? '', constituencyCode: out.constituencyCode ?? '',
    wardCode: out.wardCode ?? '', gender: ((out.gender ?? '') as string).toUpperCase(),
    dateOfBirth: out.dateOfBirth ?? '', email: out.email ?? '', phone: out.phone ?? '',
    electionId: out.electionId ?? '', positionId: out.positionId ?? '',
  };
}

// ── CDN lazy-loader ───────────────────────────────────────────
function loadScript(src: string, globalName: string): Promise<any> {
  return new Promise((resolve, reject) => {
    if ((window as any)[globalName]) { resolve((window as any)[globalName]); return; }
    const el = document.createElement('script');
    el.src = src;
    el.onload = () => resolve((window as any)[globalName]);
    el.onerror = () => reject(new Error(`Failed to load ${globalName}`));
    document.head.appendChild(el);
  });
}
const getXLSX    = () => loadScript('https://cdn.sheetjs.com/xlsx-0.20.2/package/dist/xlsx.full.min.js', 'XLSX');
const getMammoth = () => loadScript('https://cdn.jsdelivr.net/npm/mammoth@1.6.0/mammoth.browser.min.js', 'mammoth');

// ── File parser dispatcher ────────────────────────────────────
async function parseFile(file: File): Promise<{ rows: Record<string, string>[]; warning?: string }> {
  const ext = (file.name.split('.').pop() ?? '').toLowerCase();

  if (ext === 'csv' || ext === 'tsv') {
    const text = await file.text();
    if (ext === 'tsv') {
      const lines = text.split(/\r?\n/).filter(l => l.trim());
      const headers = lines[0].split('\t').map(h => h.toLowerCase().trim());
      const rows = lines.slice(1).map(l => {
        const vals = l.split('\t');
        const r: Record<string, string> = {};
        headers.forEach((h, i) => { r[h] = vals[i]?.trim() ?? ''; });
        return r;
      });
      return { rows };
    }
    return { rows: parseCSVText(text) };
  }

  if (ext === 'xlsx' || ext === 'xls') {
    const XLSX = await getXLSX();
    const ab   = await file.arrayBuffer();
    const wb   = XLSX.read(ab, { type: 'array' });
    const ws   = wb.Sheets[wb.SheetNames[0]];
    const json: Record<string, any>[] = XLSX.utils.sheet_to_json(ws, { defval: '' });
    const rows = json.map(r => {
      const out: Record<string, string> = {};
      for (const [k, v] of Object.entries(r)) out[k.toLowerCase().trim()] = String(v ?? '').trim();
      return out;
    });
    return { rows };
  }

  if (ext === 'docx' || ext === 'doc') {
    const mammoth = await getMammoth();
    const ab      = await file.arrayBuffer();
    const { value: text } = await mammoth.extractRawText({ arrayBuffer: ab });
    const rows = parseCSVText(text ?? '');
    return rows.length > 0
      ? { rows, warning: 'Word document extracted as text — verify the preview before submitting.' }
      : { rows: [], warning: 'No data table found in Word document. Ensure the document has comma-separated rows with a header line, or use CSV/Excel.' };
  }

  if (ext === 'pdf') {
    try {
      const ab      = await file.arrayBuffer();
      const bytes   = new Uint8Array(ab);
      const decoder = new TextDecoder('latin1');
      const raw     = decoder.decode(bytes);
      const tjs     = raw.match(/\(([^)]+)\)\s*Tj/g) ?? [];
      const parts   = tjs.map(t => { const m = t.match(/\(([^)]+)\)/); return m ? m[1] : ''; }).filter(Boolean);
      const rows    = parseCSVText(parts.join(','));
      return rows.length > 0
        ? { rows, warning: 'PDF text extracted — verify the preview carefully before submitting.' }
        : { rows: [], warning: 'Could not extract structured data from this PDF. For best results use CSV or Excel.' };
    } catch {
      return { rows: [], warning: 'PDF parsing failed. Please use CSV or Excel format.' };
    }
  }

  return { rows: [], warning: `Unsupported file type ".${ext}". Use CSV, Excel (.xlsx), Word (.docx), or PDF.` };
}

// ── CSV template download ─────────────────────────────────────
function downloadTemplate() {
  const header  = 'fullName,nationalId,position,countyCode,constituencyCode,wardCode,gender,dateOfBirth,email,phone,electionId,positionId';
  const example = 'John Kamau Mwangi,12345678,MP,047,123,,MALE,1980-01-15,john@party.ke,0712345678,,';
  const blob    = new Blob([`${header}\n${example}\n`], { type: 'text/csv' });
  const url     = URL.createObjectURL(blob);
  const a       = Object.assign(document.createElement('a'), { href: url, download: 'candidate_bulk_template.csv' });
  a.click(); URL.revokeObjectURL(url);
}

// ══════════════════════════════════════════════════════════════
//  BULK UPLOAD MODAL
// ══════════════════════════════════════════════════════════════
function BulkUploadModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const qc      = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep]             = useState<'upload' | 'preview' | 'result'>('upload');
  const [loading, setLoading]       = useState(false);
  const [warning, setWarning]       = useState('');
  const [rows, setRows]             = useState<ParsedCandidate[]>([]);
  const [result, setResult]         = useState<{ succeeded: any[]; failed: any[] } | null>(null);
  const [dragOver, setDragOver]     = useState(false);

  const handleFile = useCallback(async (file: File) => {
    setLoading(true); setWarning('');
    try {
      const { rows: rawRows, warning: w } = await parseFile(file);
      if (w) setWarning(w);
      const parsed = rawRows
        .filter(r => Object.values(r).some(v => v))
        .map((r, i) => mapToCandidate(r, i + 2));
      setRows(parsed);
      setStep('preview');
    } catch (e: any) {
      setWarning(`Parse error: ${e?.message ?? 'unknown'}`);
    } finally {
      setLoading(false);
    }
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    const f = e.dataTransfer.files[0]; if (f) handleFile(f);
  }, [handleFile]);

  const toggleRow = (i: number) =>
    setRows(prev => prev.map((r, j) => j === i ? { ...r, _selected: !r._selected } : r));

  const validRows   = rows.filter(r => r._selected && r._errors.length === 0);
  const invalidRows = rows.filter(r => r._errors.length > 0);

  const submitMut = useMutation({
    mutationFn: () =>
      apiClient.post('/candidate/candidates/register/bulk', {
        candidates: validRows.map(r => ({
          fullName:         r.fullName,
          nationalId:       r.nationalId,
          position:         r.position,
          ...(r.countyCode       ? { countyCode: r.countyCode }             : {}),
          ...(r.constituencyCode ? { constituencyCode: r.constituencyCode } : {}),
          ...(r.wardCode         ? { wardCode: r.wardCode }                 : {}),
          ...(r.gender           ? { gender: r.gender }                     : {}),
          ...(r.dateOfBirth      ? { dateOfBirth: r.dateOfBirth }           : {}),
          ...(r.email            ? { email: r.email }                       : {}),
          ...(r.phone            ? { phone: r.phone }                       : {}),
          ...(r.electionId       ? { electionId: r.electionId }             : {}),
          ...(r.positionId       ? { positionId: r.positionId }             : {}),
        })),
      }).then(r => r.data),
    onSuccess: (data) => {
      setResult(data); setStep('result');
      qc.invalidateQueries({ queryKey: ['all-candidates'] });
    },
  });

  // ── Step: Upload ────────────────────────────────────────────
  if (step === 'upload') return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div>
            <h2 className="text-base font-bold text-gray-900">Bulk Candidate Upload</h2>
            <p className="text-xs text-gray-500 mt-0.5">Register multiple candidates from a file</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4 text-gray-400" /></button>
        </div>

        <div className="p-5 space-y-4">
          {/* Drop zone */}
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            onClick={() => fileRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all select-none ${
              dragOver ? 'border-violet-400 bg-violet-50' : 'border-gray-200 hover:border-violet-300 hover:bg-gray-50'
            }`}
          >
            {loading ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
                <p className="text-sm text-gray-500">Parsing file…</p>
              </div>
            ) : (
              <>
                <Upload className="w-8 h-8 text-gray-300 mx-auto mb-3" />
                <p className="text-sm font-semibold text-gray-700">Drop file here or click to browse</p>
                <p className="text-xs text-gray-400 mt-1">Excel (.xlsx), CSV, Word (.docx), PDF</p>
              </>
            )}
          </div>
          <input ref={fileRef} type="file" className="hidden"
            accept=".xlsx,.xls,.csv,.tsv,.docx,.doc,.pdf"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }}
          />

          {warning && (
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3">
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700">{warning}</p>
            </div>
          )}

          {/* Format icons */}
          <div className="grid grid-cols-4 gap-2">
            {[
              { icon: FileSpreadsheet, label: 'Excel', ext: '.xlsx / .xls', bg: 'bg-emerald-50', fg: 'text-emerald-600' },
              { icon: FileText,        label: 'CSV',   ext: '.csv / .tsv',  bg: 'bg-blue-50',    fg: 'text-blue-600'    },
              { icon: File,            label: 'Word',  ext: '.docx',        bg: 'bg-indigo-50',  fg: 'text-indigo-600'  },
              { icon: File,            label: 'PDF',   ext: '.pdf',         bg: 'bg-red-50',     fg: 'text-red-600'     },
            ].map(({ icon: Icon, label, ext, bg, fg }) => (
              <div key={label} className={`flex flex-col items-center gap-1 p-2.5 rounded-xl ${bg}`}>
                <Icon className={`w-5 h-5 ${fg}`} />
                <span className="text-[10px] font-semibold text-gray-700">{label}</span>
                <span className="text-[9px] text-gray-400">{ext}</span>
              </div>
            ))}
          </div>

          {/* Template */}
          <div className="flex items-center justify-between bg-violet-50 border border-violet-100 rounded-xl px-4 py-3">
            <div>
              <p className="text-xs font-semibold text-violet-800">Download CSV template</p>
              <p className="text-[10px] text-violet-500 mt-0.5">Includes all required column headers</p>
            </div>
            <button onClick={downloadTemplate}
              className="flex items-center gap-1.5 text-xs font-medium text-violet-700 bg-white border border-violet-200 rounded-lg px-3 py-1.5 hover:bg-violet-50">
              <Download className="w-3.5 h-3.5" /> Download
            </button>
          </div>

          {/* Column guide */}
          <details className="text-xs">
            <summary className="cursor-pointer text-gray-500 hover:text-gray-700 font-medium select-none">
              Required & optional columns ▸
            </summary>
            <div className="mt-2 bg-gray-50 rounded-xl p-3 space-y-1 text-gray-600 leading-relaxed">
              <p><code className="font-semibold text-gray-900">fullName</code> — full legal name <span className="text-red-500">*</span></p>
              <p><code className="font-semibold text-gray-900">nationalId</code> — Kenya national ID <span className="text-red-500">*</span></p>
              <p><code className="font-semibold text-gray-900">position</code> — PRESIDENT / GOVERNOR / SENATOR / WOMEN_REP / MP / MCA <span className="text-red-500">*</span></p>
              <p><code className="font-semibold text-gray-900">countyCode</code> — 3-digit NEC code (e.g. 047)</p>
              <p><code className="font-semibold text-gray-900">constituencyCode</code> — 3-digit NEC code</p>
              <p><code className="font-semibold text-gray-900">wardCode</code> — 4-digit NEC code (MCA only)</p>
              <p><code className="font-semibold text-gray-900">gender</code> — MALE / FEMALE / OTHER</p>
              <p><code className="font-semibold text-gray-900">dateOfBirth</code> — YYYY-MM-DD</p>
              <p><code className="font-semibold text-gray-900">email</code>, <code className="font-semibold text-gray-900">phone</code></p>
              <p><code className="font-semibold text-gray-900">electionId</code>, <code className="font-semibold text-gray-900">positionId</code> — UUIDs</p>
            </div>
          </details>
        </div>

        <div className="flex gap-3 p-5 border-t border-gray-100">
          <button onClick={onClose} className="flex-1 vc-btn-secondary text-sm py-2.5">Cancel</button>
        </div>
      </div>
    </div>
  );

  // ── Step: Preview ───────────────────────────────────────────
  if (step === 'preview') return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div>
            <h2 className="text-base font-bold text-gray-900">Review Candidates</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {rows.length} rows · <span className="text-emerald-600 font-semibold">{validRows.length} ready</span>
              {invalidRows.length > 0 && <> · <span className="text-red-500 font-semibold">{invalidRows.length} with errors (skipped)</span></>}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => { setStep('upload'); setRows([]); setWarning(''); }}
              className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1 px-2 py-1 rounded hover:bg-gray-100">
              <Upload className="w-3.5 h-3.5" /> Re-upload
            </button>
            <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg">
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>
        </div>

        {warning && (
          <div className="mx-5 mt-4 flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700">{warning}</p>
          </div>
        )}

        <div className="flex-1 overflow-auto">
          <table className="w-full text-xs border-collapse">
            <thead className="sticky top-0 bg-gray-50 border-b border-gray-200 z-10">
              <tr>
                <th className="px-3 py-2.5 text-left w-8 font-semibold text-gray-600">✓</th>
                <th className="px-3 py-2.5 text-left font-semibold text-gray-600">#</th>
                <th className="px-3 py-2.5 text-left font-semibold text-gray-600">Full Name</th>
                <th className="px-3 py-2.5 text-left font-semibold text-gray-600">National ID</th>
                <th className="px-3 py-2.5 text-left font-semibold text-gray-600">Position</th>
                <th className="px-3 py-2.5 text-left font-semibold text-gray-600">County</th>
                <th className="px-3 py-2.5 text-left font-semibold text-gray-600">Gender</th>
                <th className="px-3 py-2.5 text-left font-semibold text-gray-600">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => {
                const hasErr = row._errors.length > 0;
                return (
                  <tr key={i} className={`border-b border-gray-100 ${hasErr ? 'bg-red-50' : row._selected ? 'hover:bg-gray-50' : 'opacity-50 bg-gray-50'}`}>
                    <td className="px-3 py-2">
                      <input type="checkbox" checked={row._selected && !hasErr} disabled={hasErr}
                        onChange={() => toggleRow(i)} className="rounded accent-violet-600" />
                    </td>
                    <td className="px-3 py-2 text-gray-400">{row._rowNum}</td>
                    <td className="px-3 py-2 font-medium text-gray-900">
                      {row.fullName || <span className="text-red-400 italic">missing</span>}
                    </td>
                    <td className="px-3 py-2 font-mono text-gray-600">
                      {row.nationalId || <span className="text-red-400 italic">missing</span>}
                    </td>
                    <td className="px-3 py-2">
                      {row.position
                        ? <span className="px-1.5 py-0.5 bg-violet-100 text-violet-700 rounded font-semibold">{row.position}</span>
                        : <span className="text-red-400 italic">missing</span>}
                    </td>
                    <td className="px-3 py-2 text-gray-500">{row.countyCode || '—'}</td>
                    <td className="px-3 py-2 text-gray-500">{row.gender || '—'}</td>
                    <td className="px-3 py-2">
                      {hasErr ? (
                        <span className="flex items-start gap-1 text-red-600">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                          {row._errors[0]}{row._errors.length > 1 ? ` +${row._errors.length - 1}` : ''}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-emerald-600">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Ready
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {submitMut.isError && (
          <div className="mx-5 mt-3 flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <p className="text-xs text-red-700">
              {(submitMut.error as any)?.response?.data?.message ?? 'Submit failed. Please try again.'}
            </p>
          </div>
        )}

        <div className="flex gap-3 p-5 border-t border-gray-100">
          <button onClick={onClose} className="vc-btn-secondary text-sm py-2.5 px-5">Cancel</button>
          <div className="flex-1" />
          <button
            onClick={() => submitMut.mutate()}
            disabled={validRows.length === 0 || submitMut.isPending}
            className="vc-btn-primary text-sm py-2.5 px-6 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitMut.isPending
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Registering…</>
              : <><Upload className="w-4 h-4" /> Register {validRows.length} Candidate{validRows.length !== 1 ? 's' : ''}</>}
          </button>
        </div>
      </div>
    </div>
  );

  // ── Step: Result ────────────────────────────────────────────
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="p-6 text-center">
          <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 ${(result?.succeeded.length ?? 0) > 0 ? 'bg-emerald-50' : 'bg-amber-50'}`}>
            {(result?.succeeded.length ?? 0) > 0
              ? <CheckCircle2 className="w-8 h-8 text-emerald-600" />
              : <AlertTriangle className="w-8 h-8 text-amber-500" />}
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-1">Upload Complete</h2>
          <p className="text-sm text-gray-500 mb-5">
            <span className="text-emerald-600 font-semibold">{result?.succeeded.length ?? 0} registered successfully</span>
            {(result?.failed.length ?? 0) > 0 && (
              <> · <span className="text-red-600 font-semibold">{result?.failed.length} failed</span></>
            )}
          </p>

          {(result?.failed.length ?? 0) > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-left mb-5 max-h-44 overflow-y-auto space-y-1">
              <p className="text-xs font-semibold text-red-700 mb-1.5">Failed rows — fix and re-upload:</p>
              {result?.failed.map((f: any, i: number) => (
                <p key={i} className="text-xs text-red-600">
                  Row {f.row}: <span className="font-medium">{f.fullName}</span> — {f.error}
                </p>
              ))}
            </div>
          )}

          <div className="flex gap-3">
            {(result?.failed.length ?? 0) > 0 && (
              <button onClick={() => { setStep('upload'); setRows([]); setResult(null); setWarning(''); }}
                className="flex-1 vc-btn-secondary text-sm py-2.5">
                Fix & Re-upload
              </button>
            )}
            <button onClick={() => { onSuccess(); onClose(); }} className="flex-1 vc-btn-primary text-sm py-2.5">
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
//  MAIN PAGE
// ══════════════════════════════════════════════════════════════
function CandidateManagementPageContent(): React.JSX.Element {
  const navigate  = useNavigate();
  const qc        = useQueryClient();
  const tenantId  = useAppSelector((s: any) => s.auth.user?.tenantId ?? '');
  const [search, setSearch]     = useState('');
  const [showBulk, setShowBulk] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const { data: candidates = [], isLoading } = useQuery({
    queryKey: ['all-candidates', tenantId],
    queryFn: () =>
      apiClient.get('/candidate/candidates', { params: { tenantId } })
        .then(r => r.data?.data ?? r.data ?? []),
    enabled: !!tenantId,
  });

  const filtered = (candidates as any[]).filter((c: any) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (c.fullName ?? '').toLowerCase().includes(q) ||
           (c.nationalId ?? '').includes(q) ||
           (c.positionCode ?? '').toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Candidate Management</h2>
          <p className="text-sm text-gray-500 mt-1">All candidates registered under your party</p>
        </div>

        {/* Split button */}
        <div className="relative flex">
          <button
            onClick={() => { navigate('/party-candidates'); setMenuOpen(false); }}
            className="vc-btn-primary rounded-r-none border-r border-violet-700 flex items-center gap-2 text-sm"
          >
            <UserPlus className="w-4 h-4" /> Add Candidate
          </button>
          <button
            onClick={() => setMenuOpen(v => !v)}
            className="vc-btn-primary rounded-l-none px-2.5"
            title="More options"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-full mt-1 w-52 bg-white border border-gray-200 rounded-xl shadow-lg z-20">
              <button
                onClick={() => { navigate('/party-candidates'); setMenuOpen(false); }}
                className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 rounded-t-xl"
              >
                <UserPlus className="w-4 h-4 text-violet-500" /> Single candidate
              </button>
              <button
                onClick={() => { setShowBulk(true); setMenuOpen(false); }}
                className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 rounded-b-xl border-t border-gray-100"
              >
                <Upload className="w-4 h-4 text-violet-500" /> Bulk upload (Excel / CSV)
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Info banner */}
      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700 flex items-start gap-2">
        <ExternalLink className="w-3.5 h-3.5 mt-0.5 shrink-0" />
        <span>
          To register a party-sponsored candidate with the full IEBC pipeline and gender compliance tracking,
          use the <strong>Party Candidates</strong> page. For quick bulk import use the{' '}
          <button className="underline font-semibold" onClick={() => setShowBulk(true)}>Bulk Upload</button> option.
        </span>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          className="vc-input pl-9"
          placeholder="Search by name, national ID, position…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Candidates table */}
      <div className="vc-card">
        {isLoading ? (
          <div className="text-center py-12 text-gray-400 flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin" /> Loading candidates…
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 text-sm mb-4">
              {search ? 'No candidates match your search.' : 'No candidates registered yet.'}
            </p>
            {!search && (
              <button onClick={() => setShowBulk(true)} className="vc-btn-primary text-sm inline-flex items-center gap-2">
                <Upload className="w-4 h-4" /> Bulk Upload Candidates
              </button>
            )}
          </div>
        ) : (
          <table className="vc-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Position</th>
                <th>National ID</th>
                <th>Region</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c: any) => (
                <tr key={c.id}>
                  <td className="font-medium">{c.fullName}</td>
                  <td><span className="vc-badge bg-violet-100 text-violet-700">{c.positionCode ?? '—'}</span></td>
                  <td className="font-mono text-xs text-gray-500">{c.nationalId}</td>
                  <td className="text-xs text-gray-500">{c.constituencyCode ?? c.countyCode ?? '—'}</td>
                  <td>
                    <span className={`vc-badge ${STATUS_COLOR[c.status] ?? 'bg-gray-100 text-gray-500'}`}>
                      {(c.status ?? 'PENDING').replace(/_/g, ' ')}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Bulk upload modal */}
      {showBulk && (
        <BulkUploadModal
          onClose={() => setShowBulk(false)}
          onSuccess={() => qc.invalidateQueries({ queryKey: ['all-candidates'] })}
        />
      )}
    </div>
  );
}

export function CandidateManagementPage() {
  return (
    <PageErrorBoundary page="Candidate Management">
      <CandidateManagementPageContent />
    </PageErrorBoundary>
  );
}
