import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MapPin, ChevronRight, Activity } from 'lucide-react';
import { apiClient } from '../api/apiClient';

export function RegionalMonitoringPage(): React.JSX.Element {
  const [selectedCounty, setSelectedCounty] = useState<string | null>(null);
  const [selectedCountyName, setSelectedCountyName] = useState<string>('');

  const { data: counties, isLoading: loadingCounties } = useQuery({
    queryKey: ['geo', 'counties'],
    queryFn: () => apiClient.get('/geography/counties').then(r => r.data?.data ?? []),
  });

  const { data: progress } = useQuery({
    queryKey: ['observer', 'progress'],
    queryFn: () => apiClient.get('/reporting/public/progress').then(r => r.data?.data ?? {}),
  });

  const { data: constituencies, isLoading: loadingConstituencies } = useQuery({
    queryKey: ['geo', 'constituencies', selectedCounty],
    queryFn: () => apiClient.get(`/geography/constituencies?countyCode=${selectedCounty}`).then(r => r.data?.data ?? []),
    enabled: !!selectedCounty,
  });

  const totalStations = progress?.totalStations ?? 0;
  const reportedStations = progress?.reportedStations ?? 0;
  const nationalPct = totalStations > 0 ? Math.round((reportedStations / totalStations) * 100) : 0;

  const handleCountySelect = (code: string, name: string) => {
    setSelectedCounty(code);
    setSelectedCountyName(name);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Regional Monitoring</h2>
        <p className="text-sm text-gray-500 mt-1">Drill down from national → county → constituency level reporting</p>
      </div>

      <div className="vc-card">
        <div className="flex items-center gap-2 mb-2">
          <Activity className="w-4 h-4 text-sky-600" />
          <h3 className="font-semibold text-gray-900">National Progress</h3>
          <span className="ml-auto text-sm font-bold text-gray-900">{nationalPct}%</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-3">
          <div className="bg-sky-500 h-3 rounded-full transition-all duration-500" style={{ width: `${nationalPct}%` }} />
        </div>
        <p className="text-xs text-gray-400 mt-2">{reportedStations.toLocaleString()} of {totalStations.toLocaleString()} stations reported</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="vc-card">
          <div className="flex items-center gap-2 mb-4">
            <MapPin className="w-4 h-4 text-sky-600" />
            <h3 className="font-semibold text-gray-900">Counties ({(counties ?? []).length})</h3>
          </div>
          {loadingCounties ? (
            <div className="text-center py-10"><MapPin className="w-8 h-8 text-gray-200 mx-auto mb-2 animate-pulse" /><p className="text-gray-400 text-sm">Loading counties…</p></div>
          ) : (
            <div className="space-y-1 max-h-96 overflow-y-auto pr-1">
              {(counties ?? []).map((c: any) => (
                <button
                  key={c.id ?? c.code}
                  onClick={() => handleCountySelect(c.code, c.name)}
                  className={`w-full flex items-center justify-between p-3 rounded-lg text-left transition-colors ${selectedCounty === c.code ? 'bg-sky-50 border border-sky-200' : 'hover:bg-gray-50 border border-transparent'}`}
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">{c.name}</p>
                    <p className="text-xs text-gray-500">{c.registeredVoters?.toLocaleString() ?? '—'} voters</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="vc-card">
          <h3 className="font-semibold text-gray-900 mb-4">
            {selectedCounty ? `Constituencies — ${selectedCountyName}` : 'Select a county'}
          </h3>
          {!selectedCounty ? (
            <div className="text-center py-10 text-gray-400">
              <MapPin className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="text-sm">Click a county to view its constituencies</p>
            </div>
          ) : loadingConstituencies ? (
            <div className="text-center py-10"><Activity className="w-6 h-6 text-gray-200 mx-auto mb-2 animate-pulse" /><p className="text-gray-400 text-sm">Loading…</p></div>
          ) : (
            <div className="space-y-1 max-h-96 overflow-y-auto pr-1">
              {(constituencies ?? []).map((c: any) => {
                const pct = c.reportingPercent ?? 0;
                return (
                  <div key={c.id ?? c.code} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{c.name}</p>
                      <p className="text-xs text-gray-500">{c.registeredVoters?.toLocaleString() ?? '—'} voters</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-gray-100 rounded-full h-1.5">
                        <div className={`h-1.5 rounded-full ${pct > 80 ? 'bg-emerald-500' : pct > 40 ? 'bg-amber-500' : 'bg-gray-400'}`} style={{ width: `${pct}%` }} />
                      </div>
                      <span className={`vc-badge text-xs ${pct > 80 ? 'bg-emerald-100 text-emerald-700' : pct > 40 ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'}`}>{pct}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
