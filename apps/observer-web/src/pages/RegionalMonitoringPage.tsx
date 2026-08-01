import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MapPin, ChevronRight } from 'lucide-react';
import { apiClient } from '../api/apiClient';

export function RegionalMonitoringPage(): React.JSX.Element {
  const [selectedCounty, setSelectedCounty] = useState<string | null>(null);

  const { data: counties } = useQuery({ queryKey: ['geo','counties'], queryFn: () => apiClient.get('/geography/counties').then(r => r.data?.data ?? []) });
  const { data: constituencies } = useQuery({ queryKey: ['geo','constituencies', selectedCounty], queryFn: () => apiClient.get(`/geography/constituencies?countyCode=${selectedCounty}`).then(r => r.data?.data ?? []), enabled: !!selectedCounty });

  return (
    <div className="space-y-6">
      <div><h2 className="text-xl font-bold text-gray-900">Regional Monitoring</h2><p className="text-sm text-gray-500">Drill down: Country → County → Constituency → Ward → Station</p></div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="vc-card">
          <div className="flex items-center gap-2 mb-4"><MapPin className="w-4 h-4 text-sky-600" /><h3 className="font-semibold text-gray-900">Counties (47)</h3></div>
          <div className="space-y-1 max-h-96 overflow-y-auto">
            {(counties ?? []).map((c: any) => (
              <button key={c.id} onClick={() => setSelectedCounty(c.code)}
                className={`w-full flex items-center justify-between p-3 rounded-lg text-left transition-colors ${selectedCounty === c.code ? 'bg-sky-50 border border-sky-200' : 'hover:bg-gray-50'}`}>
                <div><p className="text-sm font-medium text-gray-900">{c.name}</p><p className="text-xs text-gray-500">{c.registeredVoters?.toLocaleString() ?? '—'} voters</p></div>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </button>
            ))}
          </div>
        </div>
        <div className="vc-card">
          <h3 className="font-semibold text-gray-900 mb-4">
            {selectedCounty ? `Constituencies in ${(counties ?? []).find((c: any) => c.code === selectedCounty)?.name ?? selectedCounty}` : 'Select a county →'}
          </h3>
          {!selectedCounty ? (
            <div className="text-center py-12 text-gray-400"><MapPin className="w-10 h-10 text-gray-200 mx-auto mb-3" /><p>Select a county to view constituencies</p></div>
          ) : (
            <div className="space-y-1 max-h-96 overflow-y-auto">
              {(constituencies ?? []).map((c: any) => (
                <div key={c.id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg">
                  <div><p className="text-sm font-medium text-gray-900">{c.name}</p><p className="text-xs text-gray-500">{c.registeredVoters?.toLocaleString() ?? '—'} voters</p></div>
                  <span className={`vc-badge ${c.reportingPercent > 80 ? 'bg-emerald-100 text-emerald-700' : c.reportingPercent > 40 ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'}`}>{c.reportingPercent ?? 0}%</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
