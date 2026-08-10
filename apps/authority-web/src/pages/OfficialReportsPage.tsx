import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FileText, Download, BarChart3, Loader2, CheckCircle } from 'lucide-react';
import { apiClient } from '../api/apiClient';
import { PageErrorBoundary } from '../components/PageErrorBoundary';

interface ReportTemplate {
  name: string;
  description: string;
  format: string;
  type: string;   // maps to backend report type
}

const REPORT_TEMPLATES: ReportTemplate[] = [
  { name: 'National Results Summary', description: 'Complete results by position', format: 'PDF', type: 'NATIONAL_RESULTS' },
  { name: 'County-Level Results', description: 'Breakdown by county', format: 'Excel', type: 'COUNTY_RESULTS' },
  { name: 'Constituency Tallies', description: 'All 290 constituency results', format: 'Excel', type: 'CONSTITUENCY_TALLIES' },
  { name: 'Voter Turnout Report', description: 'Turnout by region and station', format: 'Excel', type: 'VOTER_TURNOUT' },
  { name: 'AI Verification Report', description: 'AI confidence scores and flags', format: 'PDF', type: 'AI_VERIFICATION' },
  { name: 'Validation Audit Trail', description: 'All validator decisions with timestamps', format: 'PDF', type: 'VALIDATION_AUDIT' },
  { name: 'Trust Integrity Log', description: 'Hedera + RFC 3161 anchor records', format: 'PDF', type: 'TRUST_INTEGRITY' },
  { name: 'Observer Access Report', description: 'Observer activity log', format: 'PDF', type: 'OBSERVER_ACCESS' },
];

function OfficialReportsPageContent(): React.JSX.Element {
  const qc = useQueryClient();
  const [generating, setGenerating] = useState<string | null>(null);

  const { data: reports } = useQuery({
    queryKey: ['reports'],
    queryFn: () => apiClient.get('/reporting/reports').then((r) => r.data?.data ?? []),
  });

  // Generate a report via the reporting service export endpoint
  const generateMutation = useMutation({
    mutationFn: (template: ReportTemplate) => {
      setGenerating(template.type);
      return apiClient.post('/reporting/reports/exports', {
        reportType: template.type,
        format: template.format === 'Excel' ? 'csv' : 'pdf',
        electionYear: 2027,
      }, {
        headers: {
          'x-tenant-id': 'kenya-2027',
          'x-user-id': 'authority-user',
        },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reports'] });
      setGenerating(null);
    },
    onError: () => {
      setGenerating(null);
    },
  });

  // Download a generated report export
  const handleDownload = async (exportId: string) => {
    try {
      const { data } = await apiClient.get(`/reporting/reports/exports/${exportId}`);
      const result = data?.data ?? data;
      if (result?.downloadUrl) {
        window.open(result.downloadUrl, '_blank');
      }
    } catch {
      // Export may not be ready yet
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Official Reports</h2>
        <p className="text-sm text-gray-500 mt-1">Generate and download official election reports in PDF or Excel format</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {REPORT_TEMPLATES.map((template) => (
          <div key={template.name} className="vc-card hover:shadow-md transition-shadow">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
                <FileText className="w-5 h-5 text-emerald-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold text-gray-900">{template.name}</h4>
                <p className="text-xs text-gray-500 mt-0.5">{template.description}</p>
                <p className="text-xs text-gray-400 mt-1">Format: {template.format}</p>
              </div>
            </div>
            <button
              onClick={() => generateMutation.mutate(template)}
              disabled={generating === template.type}
              className="mt-4 w-full vc-btn-secondary gap-2 text-xs justify-center"
            >
              {generating === template.type ? (
                <><Loader2 className="w-3.5 h-3.5 animate-spin" />Generating…</>
              ) : (
                <><Download className="w-3.5 h-3.5" />Generate Report</>
              )}
            </button>
          </div>
        ))}
      </div>

      {generateMutation.isSuccess && (
        <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
          <CheckCircle className="w-4 h-4 text-emerald-600" />
          <p className="text-sm text-emerald-700">Report generation queued. It will appear below when ready.</p>
        </div>
      )}

      {reports && reports.length > 0 && (
        <div className="vc-card">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-4 h-4 text-emerald-600" />
            <h3 className="font-semibold text-gray-900">Generated Reports ({reports.length})</h3>
          </div>
          <table className="vc-table">
            <thead><tr><th>Report Name</th><th>Generated</th><th>Status</th><th>Download</th></tr></thead>
            <tbody>
              {reports.map((r: any) => (
                <tr key={r.id}>
                  <td className="font-medium">{r.name ?? r.reportType ?? '—'}</td>
                  <td className="text-sm text-gray-500">{r.createdAt ? new Date(r.createdAt).toLocaleString() : '—'}</td>
                  <td>
                    <span className={`vc-badge ${
                      r.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' :
                      r.status === 'PROCESSING' ? 'bg-amber-100 text-amber-700' :
                      'bg-gray-100 text-gray-500'
                    }`}>
                      {r.status ?? 'PENDING'}
                    </span>
                  </td>
                  <td>
                    <button
                      onClick={() => handleDownload(r.id)}
                      disabled={r.status !== 'COMPLETED'}
                      className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {(!reports || reports.length === 0) && (
        <div className="vc-card text-center py-12">
          <BarChart3 className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No reports generated yet</p>
          <p className="text-sm text-gray-400 mt-1">Click "Generate Report" above to create your first official report</p>
        </div>
      )}
    </div>
  );
}

export function OfficialReportsPage() {
  return (
    <PageErrorBoundary page="Official Reports">
      <OfficialReportsPageContent />
    </PageErrorBoundary>
  );
}
