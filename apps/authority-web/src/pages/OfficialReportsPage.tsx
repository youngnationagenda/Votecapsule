import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileText, Download, BarChart3 } from 'lucide-react';
import { apiClient } from '../api/apiClient';

export function OfficialReportsPage(): React.JSX.Element {
  const { data: reports } = useQuery({
    queryKey: ['reports'],
    queryFn: () => apiClient.get('/reporting/reports').then((r) => r.data?.data ?? []),
  });

  const reportTemplates = [
    { name: 'National Results Summary', description: 'Complete results by position', format: 'PDF' },
    { name: 'County-Level Results', description: 'Breakdown by county', format: 'PDF/Excel' },
    { name: 'Constituency Tallies', description: 'All 290 constituency results', format: 'Excel' },
    { name: 'Voter Turnout Report', description: 'Turnout by region and station', format: 'PDF/Excel' },
    { name: 'AI Verification Report', description: 'AI confidence scores and flags', format: 'PDF' },
    { name: 'Validation Audit Trail', description: 'All validator decisions with timestamps', format: 'PDF' },
    { name: 'Trust Integrity Log', description: 'Hedera + RFC 3161 anchor records', format: 'PDF' },
    { name: 'Observer Access Report', description: 'Observer activity log', format: 'PDF' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Official Reports</h2>
        <p className="text-sm text-gray-500 mt-1">Generate and download official election reports in PDF or Excel format</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {reportTemplates.map((template) => (
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
            <button className="mt-4 w-full vc-btn-secondary gap-2 text-xs justify-center">
              <Download className="w-3.5 h-3.5" />Generate Report
            </button>
          </div>
        ))}
      </div>

      {reports && reports.length > 0 && (
        <div className="vc-card">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-4 h-4 text-emerald-600" />
            <h3 className="font-semibold text-gray-900">Generated Reports</h3>
          </div>
          <table className="vc-table">
            <thead><tr><th>Report Name</th><th>Generated</th><th>Status</th><th>Download</th></tr></thead>
            <tbody>
              {reports.map((r: any) => (
                <tr key={r.id}>
                  <td className="font-medium">{r.name}</td>
                  <td>{new Date(r.createdAt).toLocaleString()}</td>
                  <td><span className="vc-badge bg-emerald-100 text-emerald-700">{r.status}</span></td>
                  <td><button className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100"><Download className="w-4 h-4" /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
