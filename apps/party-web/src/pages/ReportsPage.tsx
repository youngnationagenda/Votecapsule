import React, { useState } from 'react';
import { FileText, Download, Info } from 'lucide-react';

const REPORTS = [
  { name: 'Party Results Summary', desc: 'All party candidates\' results grouped by position and county', format: 'PDF' },
  { name: 'Agent Activity Report', desc: 'Submission rates and activity log for all campaign agents', format: 'Excel' },
  { name: 'Candidate Performance', desc: 'Per-candidate vote percentage vs regional benchmarks', format: 'PDF' },
  { name: 'Station Coverage', desc: 'Stations with and without submitted capsules across your regions', format: 'Excel' },
];

export function ReportsPage(): React.JSX.Element {
  const [toast, setToast] = useState<string | null>(null);

  const handleDownload = (name: string) => {
    setToast(name);
    setTimeout(() => setToast(null), 3000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Reports</h2>
        <p className="text-sm text-gray-500 mt-1">Download party-specific election reports and data exports</p>
      </div>

      {toast && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center gap-2">
          <Info className="w-4 h-4 text-amber-500 flex-shrink-0" />
          <p className="text-sm text-amber-700"><span className="font-medium">{toast}</span> — Available after results publication</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {REPORTS.map(r => (
          <div key={r.name} className="vc-card hover:shadow-md transition-shadow">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center flex-shrink-0">
                <FileText className="w-5 h-5 text-violet-600" />
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-gray-900">{r.name}</h4>
                <p className="text-xs text-gray-500 mt-0.5">{r.desc}</p>
                <p className="text-xs text-gray-400 mt-1">Format: {r.format}</p>
              </div>
            </div>
            <button
              onClick={() => handleDownload(r.name)}
              className="mt-4 w-full vc-btn-secondary gap-2 text-xs justify-center"
            >
              <Download className="w-3.5 h-3.5" />Download {r.format}
            </button>
          </div>
        ))}
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 flex items-start gap-2">
        <Info className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-gray-500">
          Reports are generated from validated capsule data only. They become available once official results are published by the Election Authority. Contact your party administrator for access questions.
        </p>
      </div>
    </div>
  );
}
