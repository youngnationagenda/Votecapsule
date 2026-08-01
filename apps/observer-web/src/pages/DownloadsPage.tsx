import React from 'react';
import { Download, FileText } from 'lucide-react';
const DOWNLOADS = [
  { name: 'National Results Export', desc: 'All published results by position', format: 'CSV/Excel' },
  { name: 'Turnout Statistics', desc: 'Voter turnout by county and constituency', format: 'Excel' },
  { name: 'Capsule Integrity Log', desc: 'All integrity-verified capsules with Hedera IDs', format: 'CSV' },
  { name: 'Anomaly Report', desc: 'AI-flagged incidents summary', format: 'PDF' },
  { name: 'Observer Incident Summary', desc: 'All logged observer incidents', format: 'PDF' },
];
export function DownloadsPage(): React.JSX.Element {
  return (
    <div className="space-y-6">
      <div><h2 className="text-xl font-bold text-gray-900">Downloads</h2><p className="text-sm text-gray-500">Export published data for independent analysis</p></div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {DOWNLOADS.map(d => (
          <div key={d.name} className="vc-card hover:shadow-md transition-shadow">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-sky-50 flex items-center justify-center flex-shrink-0"><FileText className="w-5 h-5 text-sky-600" /></div>
              <div className="flex-1"><h4 className="text-sm font-semibold text-gray-900">{d.name}</h4><p className="text-xs text-gray-500 mt-0.5">{d.desc}</p><p className="text-xs text-gray-400 mt-1">{d.format}</p></div>
            </div>
            <button className="mt-4 w-full vc-btn-secondary gap-2 text-xs justify-center"><Download className="w-3.5 h-3.5" />Download</button>
          </div>
        ))}
      </div>
    </div>
  );
}
