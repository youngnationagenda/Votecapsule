import React from 'react';
import { FileText, Download } from 'lucide-react';

const REPORTS = [
  { name: 'Party Results Summary', desc: 'All candidates\' results by position', format: 'PDF' },
  { name: 'Agent Performance Report', desc: 'Submission rate by agent', format: 'Excel' },
  { name: 'Station Coverage Map', desc: 'Stations with/without submitted capsules', format: 'PDF' },
  { name: 'Candidate Scorecard', desc: 'Per-candidate progress vs opponent', format: 'PDF' },
];

export function ReportsPage(): React.JSX.Element {
  return (
    <div className="space-y-6">
      <div><h2 className="text-xl font-bold text-gray-900">Reports</h2><p className="text-sm text-gray-500">Download party-specific election reports</p></div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {REPORTS.map(r => (
          <div key={r.name} className="vc-card hover:shadow-md transition-shadow">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center flex-shrink-0"><FileText className="w-5 h-5 text-violet-600" /></div>
              <div className="flex-1"><h4 className="text-sm font-semibold text-gray-900">{r.name}</h4><p className="text-xs text-gray-500 mt-0.5">{r.desc}</p><p className="text-xs text-gray-400 mt-1">Format: {r.format}</p></div>
            </div>
            <button className="mt-4 w-full vc-btn-secondary gap-2 text-xs justify-center"><Download className="w-3.5 h-3.5" />Generate Report</button>
          </div>
        ))}
      </div>
    </div>
  );
}
