import React, { useState } from 'react';
import { Download, FileText, Info } from 'lucide-react';

const DOWNLOADS = [
  { name: 'National Results (CSV)', desc: 'All published results by position, candidate, and county', format: 'CSV' },
  { name: 'Turnout Statistics', desc: 'Voter turnout aggregated by county and constituency', format: 'Excel' },
  { name: 'Incident Report', desc: 'All observer-logged incidents with timestamps and resolutions', format: 'PDF' },
  { name: 'Observer Summary', desc: 'Aggregated observer coverage and event log', format: 'PDF' },
  { name: 'Capsule Integrity Log', desc: 'All Hedera-anchored capsules with trust anchor batch IDs', format: 'CSV' },
];

export function DownloadsPage(): React.JSX.Element {
  const [toast, setToast] = useState<string | null>(null);

  const handleDownload = (name: string) => {
    setToast(name);
    setTimeout(() => setToast(null), 3000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Downloads</h2>
        <p className="text-sm text-gray-500 mt-1">Export published election data for independent analysis and reporting</p>
      </div>

      {toast && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center gap-2">
          <Info className="w-4 h-4 text-amber-500 flex-shrink-0" />
          <p className="text-sm text-amber-700"><span className="font-medium">{toast}</span> — Available after official publication</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {DOWNLOADS.map(d => (
          <div key={d.name} className="vc-card hover:shadow-md transition-shadow">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-sky-50 flex items-center justify-center flex-shrink-0">
                <FileText className="w-5 h-5 text-sky-600" />
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-gray-900">{d.name}</h4>
                <p className="text-xs text-gray-500 mt-0.5">{d.desc}</p>
                <p className="text-xs text-gray-400 mt-1">Format: {d.format}</p>
              </div>
            </div>
            <button
              onClick={() => handleDownload(d.name)}
              className="mt-4 w-full vc-btn-secondary gap-2 text-xs justify-center"
            >
              <Download className="w-3.5 h-3.5" />Download {d.format}
            </button>
          </div>
        ))}
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 space-y-1">
        <p className="text-xs font-semibold text-gray-700">Open Data License</p>
        <p className="text-xs text-gray-500">
          All published election data is made available under the Kenya Open Government Data License. You may use, reproduce, and distribute this data with attribution to the VoteCapsule™ platform and the Independent Electoral and Boundaries Commission (IEBC). Data becomes available once officially published by the Election Authority.
        </p>
      </div>
    </div>
  );
}
