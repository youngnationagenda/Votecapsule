import React from 'react';
import { Download, FileText } from 'lucide-react';
const DOWNLOADS = [
  { name: 'My Results Summary', desc: 'Results for your position by station', format: 'PDF' },
  { name: 'Station Coverage Report', desc: 'Coverage map for your constituency', format: 'Excel' },
  { name: 'Turnout Report', desc: 'Voter turnout in your region', format: 'PDF' },
  { name: 'Integrity Verification Log', desc: 'Trust verification records for your capsules', format: 'PDF' },
];
export function DownloadsPage(): React.JSX.Element {
  return (
    <div className="space-y-6">
      <div><h2 className="text-xl font-bold text-gray-900">Downloads</h2><p className="text-sm text-gray-500">Reports and exports restricted to your assigned region</p></div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {DOWNLOADS.map(d => (
          <div key={d.name} className="vc-card hover:shadow-md transition-shadow">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0"><FileText className="w-5 h-5 text-amber-600" /></div>
              <div className="flex-1"><h4 className="text-sm font-semibold text-gray-900">{d.name}</h4><p className="text-xs text-gray-500 mt-0.5">{d.desc}</p><p className="text-xs text-gray-400 mt-1">{d.format}</p></div>
            </div>
            <button className="mt-4 w-full vc-btn-secondary gap-2 text-xs justify-center"><Download className="w-3.5 h-3.5" />Download</button>
          </div>
        ))}
      </div>
    </div>
  );
}
