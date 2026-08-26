// ============================================================
// VoteCapsule™ — Budget Export Utilities
// Shared across Party + Candidate portals
// Exports budget data in CSV, Excel (XLSX), and PDF formats
// ============================================================

export interface BudgetExportData {
  campaignName: string;
  candidateName?: string;
  partyName?: string;
  exportDate: string;
  summary: {
    totalAllocated: number;
    totalSpent: number;
    totalRemaining: number;
    iebcLimit?: number;
    iebcUsedPct?: number;
  };
  categories: Array<{
    name: string;
    allocated: number;
    spent: number;
    remaining: number;
    percentUsed: number;
  }>;
  expenses: Array<{
    date: string;
    description: string;
    category: string;
    amount: number;
    paymentMethod: string;
    payee: string;
    ward: string;
    status: string;
    reference: string;
  }>;
}

// ── CSV Export ────────────────────────────────────────────────
function escapeCSV(val: string | number | undefined): string {
  const s = String(val ?? '');
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function exportToCSV(data: BudgetExportData): string {
  const lines: string[] = [];

  // Header
  lines.push(`Campaign Budget Report - ${data.campaignName}`);
  lines.push(`Exported: ${data.exportDate}`);
  if (data.candidateName) lines.push(`Candidate: ${data.candidateName}`);
  if (data.partyName) lines.push(`Party: ${data.partyName}`);
  lines.push('');

  // Summary
  lines.push('=== BUDGET SUMMARY ===');
  lines.push(`Total Allocated,KES ${data.summary.totalAllocated}`);
  lines.push(`Total Spent,KES ${data.summary.totalSpent}`);
  lines.push(`Remaining,KES ${data.summary.totalRemaining}`);
  if (data.summary.iebcLimit) {
    lines.push(`IEBC Spending Limit,KES ${data.summary.iebcLimit}`);
    lines.push(`IEBC Limit Used,${data.summary.iebcUsedPct ?? 0}%`);
  }
  lines.push('');

  // Categories
  lines.push('=== BUDGET BY CATEGORY ===');
  lines.push('Category,Allocated (KES),Spent (KES),Remaining (KES),% Used');
  for (const cat of data.categories) {
    lines.push([
      escapeCSV(cat.name),
      cat.allocated,
      cat.spent,
      cat.remaining,
      `${cat.percentUsed}%`,
    ].join(','));
  }
  lines.push('');

  // Expenses
  lines.push('=== ALL EXPENSES ===');
  lines.push('Date,Description,Category,Amount (KES),Payment Method,Payee,Ward,Status,Reference');
  for (const exp of data.expenses) {
    lines.push([
      escapeCSV(exp.date),
      escapeCSV(exp.description),
      escapeCSV(exp.category),
      exp.amount,
      escapeCSV(exp.paymentMethod),
      escapeCSV(exp.payee),
      escapeCSV(exp.ward),
      escapeCSV(exp.status),
      escapeCSV(exp.reference),
    ].join(','));
  }

  return lines.join('\n');
}

// ── Excel (XLSX) Export ──────────────────────────────────────
// Uses a simple XML-based spreadsheet format that Excel can open
export function exportToExcel(data: BudgetExportData): string {
  const sheets: string[] = [];

  // Summary sheet
  const summaryRows = [
    ['Campaign Budget Report'],
    [data.campaignName],
    [`Exported: ${data.exportDate}`],
    [''],
    ['Metric', 'Amount (KES)'],
    ['Total Allocated', String(data.summary.totalAllocated)],
    ['Total Spent', String(data.summary.totalSpent)],
    ['Remaining', String(data.summary.totalRemaining)],
  ];
  if (data.summary.iebcLimit) {
    summaryRows.push(['IEBC Spending Limit', String(data.summary.iebcLimit)]);
    summaryRows.push(['IEBC Limit Used (%)', String(data.summary.iebcUsedPct ?? 0)]);
  }

  // Categories sheet data
  const catRows = [
    ['Category', 'Allocated (KES)', 'Spent (KES)', 'Remaining (KES)', '% Used'],
    ...data.categories.map(c => [c.name, String(c.allocated), String(c.spent), String(c.remaining), String(c.percentUsed)]),
  ];

  // Expenses sheet data
  const expRows = [
    ['Date', 'Description', 'Category', 'Amount (KES)', 'Payment Method', 'Payee', 'Ward', 'Status', 'Reference'],
    ...data.expenses.map(e => [e.date, e.description, e.category, String(e.amount), e.paymentMethod, e.payee, e.ward, e.status, e.reference]),
  ];

  function buildSheet(name: string, rows: string[][]): string {
    const xmlRows = rows.map(row =>
      `<Row>${row.map(cell => {
        const isNum = /^\d+(\.\d+)?$/.test(cell);
        return isNum
          ? `<Cell><Data ss:Type="Number">${cell}</Data></Cell>`
          : `<Cell><Data ss:Type="String">${cell.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</Data></Cell>`;
      }).join('')}</Row>`
    ).join('\n');

    return `<Worksheet ss:Name="${name}"><Table>${xmlRows}</Table></Worksheet>`;
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  <Styles>
    <Style ss:ID="Default"><Font ss:Size="11"/></Style>
    <Style ss:ID="Header"><Font ss:Bold="1" ss:Size="11"/></Style>
  </Styles>
  ${buildSheet('Summary', summaryRows)}
  ${buildSheet('Categories', catRows)}
  ${buildSheet('Expenses', expRows)}
</Workbook>`;

  return xml;
}

// ── PDF Export ───────────────────────────────────────────────
// Generates an HTML document that's styled for print/PDF
export function exportToPDFHtml(data: BudgetExportData): string {
  const fmtKES = (n: number) => `KES ${Number(n).toLocaleString()}`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Budget Report - ${data.campaignName}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 11px; color: #1a1a1a; padding: 24px; }
  h1 { font-size: 18px; font-weight: 700; margin-bottom: 4px; color: #0B3C6D; }
  h2 { font-size: 13px; font-weight: 700; margin: 16px 0 8px; padding-bottom: 4px; border-bottom: 2px solid #0B3C6D; color: #0B3C6D; }
  .meta { font-size: 10px; color: #666; margin-bottom: 16px; }
  .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 16px; }
  .summary-card { border: 1px solid #e5e7eb; border-radius: 6px; padding: 8px 12px; }
  .summary-card .label { font-size: 9px; text-transform: uppercase; color: #666; letter-spacing: 0.5px; }
  .summary-card .value { font-size: 14px; font-weight: 700; margin-top: 2px; }
  .iebc-badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 600; }
  .iebc-ok { background: #d1fae5; color: #065f46; }
  .iebc-warn { background: #fef3c7; color: #92400e; }
  .iebc-danger { background: #fee2e2; color: #991b1b; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 10px; }
  th { background: #f8fafc; font-weight: 600; text-align: left; padding: 6px 8px; border-bottom: 2px solid #e2e8f0; font-size: 9px; text-transform: uppercase; letter-spacing: 0.3px; color: #475569; }
  td { padding: 5px 8px; border-bottom: 1px solid #f1f5f9; }
  tr:hover td { background: #f8fafc; }
  .text-right { text-align: right; }
  .font-bold { font-weight: 700; }
  .total-row { background: #f1f5f9; font-weight: 700; }
  .status { display: inline-block; padding: 1px 6px; border-radius: 10px; font-size: 9px; font-weight: 500; }
  .status-approved { background: #d1fae5; color: #065f46; }
  .status-pending { background: #fef3c7; color: #92400e; }
  .status-rejected { background: #fee2e2; color: #991b1b; }
  .footer { margin-top: 24px; padding-top: 8px; border-top: 1px solid #e5e7eb; font-size: 9px; color: #999; text-align: center; }
  @media print { body { padding: 12px; } .no-print { display: none; } }
</style>
</head>
<body>
<h1>Campaign Budget Report</h1>
<p class="meta">
  ${data.campaignName}${data.candidateName ? ` · ${data.candidateName}` : ''}${data.partyName ? ` · ${data.partyName}` : ''}<br>
  Generated: ${data.exportDate}
</p>

<div class="summary-grid">
  <div class="summary-card"><div class="label">Allocated</div><div class="value">${fmtKES(data.summary.totalAllocated)}</div></div>
  <div class="summary-card"><div class="label">Spent</div><div class="value">${fmtKES(data.summary.totalSpent)}</div></div>
  <div class="summary-card"><div class="label">Remaining</div><div class="value" style="color:#059669">${fmtKES(data.summary.totalRemaining)}</div></div>
  <div class="summary-card"><div class="label">IEBC Compliance</div><div class="value">
    ${data.summary.iebcLimit
      ? `<span class="iebc-badge ${(data.summary.iebcUsedPct ?? 0) >= 95 ? 'iebc-danger' : (data.summary.iebcUsedPct ?? 0) >= 80 ? 'iebc-warn' : 'iebc-ok'}">${data.summary.iebcUsedPct}% used</span>`
      : 'N/A'}
  </div></div>
</div>

<h2>Budget by Category</h2>
<table>
  <thead><tr><th>Category</th><th class="text-right">Allocated</th><th class="text-right">Spent</th><th class="text-right">Remaining</th><th class="text-right">% Used</th></tr></thead>
  <tbody>
    ${data.categories.map(c => `<tr><td>${c.name}</td><td class="text-right">${fmtKES(c.allocated)}</td><td class="text-right">${fmtKES(c.spent)}</td><td class="text-right">${fmtKES(c.remaining)}</td><td class="text-right">${c.percentUsed}%</td></tr>`).join('\n')}
    <tr class="total-row"><td>TOTAL</td><td class="text-right">${fmtKES(data.summary.totalAllocated)}</td><td class="text-right">${fmtKES(data.summary.totalSpent)}</td><td class="text-right">${fmtKES(data.summary.totalRemaining)}</td><td class="text-right">${data.summary.totalAllocated > 0 ? Math.round((data.summary.totalSpent / data.summary.totalAllocated) * 100) : 0}%</td></tr>
  </tbody>
</table>

<h2>Expense Details (${data.expenses.length} records)</h2>
<table>
  <thead><tr><th>Date</th><th>Description</th><th>Category</th><th class="text-right">Amount</th><th>Payment</th><th>Payee</th><th>Ward</th><th>Status</th></tr></thead>
  <tbody>
    ${data.expenses.map(e => `<tr>
      <td>${e.date}</td><td>${e.description}</td><td>${e.category}</td>
      <td class="text-right font-bold">${fmtKES(e.amount)}</td>
      <td>${e.paymentMethod}</td><td>${e.payee}</td><td>${e.ward}</td>
      <td><span class="status status-${e.status}">${e.status}</span></td>
    </tr>`).join('\n')}
  </tbody>
</table>

<div class="footer">
  VoteCapsule™ Election Intelligence Cloud · Budget Report · ${data.exportDate}<br>
  This report is auto-generated. IEBC compliance data is advisory — verify with official records.
</div>

<script class="no-print">
  // Auto-trigger print dialog when opened
  window.onload = function() { window.print(); };
</script>
</body>
</html>`;
}

// ── Download helpers ─────────────────────────────────────────
export function downloadBlob(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function downloadCSV(data: BudgetExportData) {
  const csv = exportToCSV(data);
  const filename = `budget_${data.campaignName.replace(/\s+/g, '_').toLowerCase()}_${data.exportDate.replace(/\//g, '-')}.csv`;
  downloadBlob(csv, filename, 'text/csv;charset=utf-8');
}

export function downloadExcel(data: BudgetExportData) {
  const xml = exportToExcel(data);
  const filename = `budget_${data.campaignName.replace(/\s+/g, '_').toLowerCase()}_${data.exportDate.replace(/\//g, '-')}.xls`;
  downloadBlob(xml, filename, 'application/vnd.ms-excel');
}

export function downloadPDF(data: BudgetExportData) {
  const html = exportToPDFHtml(data);
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const win = window.open(url, '_blank');
  // Cleanup after a delay
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

// ── Convenience: build export data from raw API responses ────
export function buildExportData(opts: {
  campaignName: string;
  candidateName?: string;
  partyName?: string;
  budget: any;
  iebc: any;
  categories: any[];
  expenses: any[];
}): BudgetExportData {
  const { campaignName, candidateName, partyName, budget, iebc, categories, expenses } = opts;

  return {
    campaignName,
    candidateName,
    partyName,
    exportDate: new Date().toLocaleDateString('en-KE', { year: 'numeric', month: 'short', day: 'numeric' }),
    summary: {
      totalAllocated: Number(budget?.totalAllocated ?? 0),
      totalSpent: Number(budget?.totalSpent ?? 0),
      totalRemaining: Number(budget?.totalRemaining ?? (budget?.totalAllocated ?? 0) - (budget?.totalSpent ?? 0)),
      iebcLimit: Number(iebc?.iebcSpendingLimit ?? iebc?.limitAmount ?? 0) || undefined,
      iebcUsedPct: Math.round(Number(iebc?.percentageUsed ?? iebc?.limitPercentageUsed ?? 0)),
    },
    categories: categories.map((c: any) => {
      const alloc = Number(c.allocated ?? 0);
      const spent = Number(c.spent ?? 0);
      return {
        name: (c.categoryName ?? c.categoryCode ?? c.code ?? '').replace(/_/g, ' '),
        allocated: alloc,
        spent,
        remaining: Math.max(alloc - spent, 0),
        percentUsed: alloc > 0 ? Math.round((spent / alloc) * 100) : 0,
      };
    }),
    expenses: expenses.map((e: any) => ({
      date: e.expenseDate ? new Date(e.expenseDate).toLocaleDateString('en-KE') : '—',
      description: e.description ?? '',
      category: (e.categoryCode ?? '').replace(/_/g, ' '),
      amount: Number(e.amount ?? 0),
      paymentMethod: (e.paymentMethod ?? '').replace(/_/g, ' '),
      payee: e.payeeName ?? '',
      ward: e.wardCode ?? '',
      status: e.status ?? 'pending',
      reference: e.paymentReference ?? '',
    })),
  };
}
