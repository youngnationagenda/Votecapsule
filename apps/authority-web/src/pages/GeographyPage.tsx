import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MapPin, ChevronRight, Search } from 'lucide-react';
import { apiClient } from '../api/apiClient';
import { PageErrorBoundary } from '../components/PageErrorBoundary';

function GeographyPageContent(): React.JSX.Element {
  const [level, setLevel] = useState<'counties' | 'constituencies' | 'wards'>('counties');
  const [search, setSearch] = useState('');

  const { data: counties } = useQuery({ queryKey: ['geo', 'counties'], queryFn: () => apiClient.get('/geography/counties').then((r) => r.data?.data ?? r.data ?? []) });
  const { data: constituencies } = useQuery({ queryKey: ['geo', 'constituencies'], queryFn: () => apiClient.get('/geography/constituencies').then((r) => r.data?.data ?? r.data ?? []), enabled: level === 'constituencies' });
  const { data: wards } = useQuery({ queryKey: ['geo', 'wards'], queryFn: () => apiClient.get('/geography/wards').then((r) => r.data?.data ?? r.data ?? []), enabled: level === 'wards' });

  const rawData = level === 'counties' ? counties : level === 'constituencies' ? constituencies : wards;
  const filtered = (rawData ?? []).filter((item: any) =>
    !search || item.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Geographic Management</h2>
        <p className="text-sm text-gray-500 mt-1">NEC electoral geography — read-only reference data</p>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input className="vc-input pl-9" placeholder={`Search ${level}…`} value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-2">
          {(['counties', 'constituencies', 'wards'] as const).map((l) => (
            <button key={l} onClick={() => setLevel(l)}
              className={`px-3 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${level === l ? 'bg-emerald-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
              {l}
            </button>
          ))}
        </div>
      </div>

      <div className="vc-card">
        <div className="flex items-center gap-2 mb-4">
          <MapPin className="w-4 h-4 text-emerald-600" />
          <h3 className="font-semibold text-gray-900 capitalize">{level}</h3>
          <span className="text-sm text-gray-400">({filtered.length} records)</span>
        </div>
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-500">Loading geography data…</div>
        ) : (
          <table className="vc-table">
            <thead>
              <tr>
                <th>Code</th><th>Name</th>
                {level === 'constituencies' && <th>County</th>}
                {level === 'wards' && <th>Constituency</th>}
                <th>Registered Voters</th><th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 100).map((item: any) => (
                <tr key={item.id ?? item.code}>
                  <td className="font-mono text-xs text-gray-500">{item.code}</td>
                  <td className="font-medium">{item.name}</td>
                  {level === 'constituencies' && <td>{item.countyName ?? '—'}</td>}
                  {level === 'wards' && <td>{item.constituencyName ?? '—'}</td>}
                  <td>{item.registeredVoters?.toLocaleString() ?? '—'}</td>
                  <td><ChevronRight className="w-4 h-4 text-gray-300" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {filtered.length > 100 && <p className="text-xs text-gray-400 mt-3 text-center">Showing first 100 of {filtered.length}</p>}
      </div>
    </div>
  );
}

export function GeographyPage() {
  return (
    <PageErrorBoundary page="Geography">
      <GeographyPageContent />
    </PageErrorBoundary>
  );
}
