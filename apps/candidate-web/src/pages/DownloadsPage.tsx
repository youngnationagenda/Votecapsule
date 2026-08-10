import React, { useState } from 'react';
import { Download, FileText, Info } from 'lucide-react';
import { PageErrorBoundary } from '../components/PageErrorBoundary';

const DOWNLOADS = [
  { name: 'My Results by Station', desc: 'Your vote count for every polling station in your constituency', format: 'PDF' },
  { name: 'Station Coverage Map', desc: 'Visual coverage map showing submitted vs pending stations', format: 'Excel' },
  { name: 'Agent Activity Log', desc: 'Timestamped activity log for all campaign agents in your region', format: 'PDF' },
  { name: 'Integrity Verification Report', desc: 'Hedera trust anchor records for all your capsules', format: 'PDF' },
];

function DownloadsPageContent(): React.JSX.Element {
  const [toast, setToast] = useState<string | null>(null);

  const handleDownload = (name: string) => {
    setToast(name);
    setTimeout(() => setToast(null), 3000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Downloads</h2>
        <p className="text-sm text-gray-500 mt-1">Reports and exports restricted to your assigned position and geography</p>
      </div>

      {toast && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center gap-2">
          <Info className="w-4 h-4 text-amber-500 flex-shrink-0" />
          <p className="text-sm text-amber-700"><span className="font-medium">{toast}</span> — Available after official publication</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {DOWNLOADS.map(d => (
          <div key={d.name} className="vc-card hover:shadow-md transition-shadow">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
                <FileText className="w-5 h-5 text-amber-600" />
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

      <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 flex items-start gap-2">
        <Info className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-gray-500">
          Downloads are available once official results are published by the Election Authority. All exports are scoped to your assigned position and geography only.
        </p>
      </div>
    </div>
  );
}

export function DownloadsPage() {
  return (
    <PageErrorBoundary page="Downloads">
      <DownloadsPageContent />
    </PageErrorBoundary>
  );
}
