import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { MapPin, ChevronRight, Building2, Search, Navigation } from 'lucide-react';
import { SearchInput } from '../components/SearchInput';
import { getStations } from '../lib/api';
import api from '../lib/api';

// ── Types ─────────────────────────────────────────────────────

interface County {
  id: number;
  iebcCode: string;
  name: string;
}

interface Constituency {
  id: number;
  iebcCode: string;
  name: string;
}

interface Ward {
  id: number;
  iebcCode: string;
  name: string;
}

interface LookupStation {
  id: number;
  iebcStationCode: string;
  streamNumber: number;
  name: string;
  registeredVoters: number;
  ward: { name: string; iebcCode: string };
  constituency: { name: string; iebcCode: string };
  county: { name: string; iebcCode: string };
  registrationCentre?: { name: string };
}

// ── Find My Station section ────────────────────────────────────

function FindMyStation() {
  const [selectedCounty, setSelectedCounty]       = useState('');
  const [selectedConst,  setSelectedConst]         = useState('');
  const [selectedWard,   setSelectedWard]          = useState('');
  const [lookupTriggered, setLookupTriggered]      = useState(false);

  // County list
  const { data: counties } = useQuery<County[]>({
    queryKey: ['counties'],
    queryFn: () => api.get('/geography/counties').then((r) => r.data?.data ?? r.data ?? []),
  });

  // Constituency list — loads after county selected
  const { data: constituencies } = useQuery<Constituency[]>({
    queryKey: ['constituencies', selectedCounty],
    queryFn: () =>
      api
        .get('/geography/constituencies', { params: { countyCode: selectedCounty } })
        .then((r) => r.data?.data ?? r.data ?? []),
    enabled: !!selectedCounty,
  });

  // Ward list — loads after constituency selected
  const { data: wards } = useQuery<Ward[]>({
    queryKey: ['wards', selectedConst],
    queryFn: () =>
      api
        .get('/geography/wards', { params: { constituencyCode: selectedConst } })
        .then((r) => r.data?.data ?? r.data ?? []),
    enabled: !!selectedConst,
  });

  // Lookup results — triggered by button
  const { data: lookupResults, isLoading: lookupLoading, refetch: triggerLookup } =
    useQuery<LookupStation[]>({
      queryKey: ['voter-lookup', selectedCounty, selectedConst, selectedWard],
      queryFn: () => {
        const params: Record<string, string> = { countyCode: selectedCounty };
        if (selectedConst) params.constituencyCode = selectedConst;
        if (selectedWard)  params.wardCode = selectedWard;
        return api
          .get('/geography/voters/lookup', { params })
          .then((r) => r.data?.data ?? r.data ?? []);
      },
      enabled: false,
    });

  const handleFind = async () => {
    if (!selectedCounty) return;
    setLookupTriggered(true);
    await triggerLookup();
  };

  return (
    <section className="mb-10 rounded-2xl border-2 border-brand-primary/20 bg-brand-primary/5 p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-primary text-white">
          <Navigation className="h-5 w-5" aria-hidden="true" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-neutral-900">Find My Polling Station</h2>
          <p className="text-sm text-neutral-500">
            Select your registration area from your voter card to find your polling station.
          </p>
        </div>
      </div>

      {/* Dropdowns */}
      <div className="grid gap-3 sm:grid-cols-3 mb-4">
        {/* County */}
        <div>
          <label className="block text-xs font-medium text-neutral-600 mb-1">
            County <span className="text-red-500">*</span>
          </label>
          <select
            value={selectedCounty}
            onChange={(e) => {
              setSelectedCounty(e.target.value);
              setSelectedConst('');
              setSelectedWard('');
              setLookupTriggered(false);
            }}
            className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-sm text-neutral-900 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
            aria-label="Select county"
          >
            <option value="">— Select County —</option>
            {(counties ?? []).map((c) => (
              <option key={c.iebcCode} value={c.iebcCode}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Constituency */}
        <div>
          <label className="block text-xs font-medium text-neutral-600 mb-1">
            Constituency
          </label>
          <select
            value={selectedConst}
            onChange={(e) => {
              setSelectedConst(e.target.value);
              setSelectedWard('');
              setLookupTriggered(false);
            }}
            disabled={!selectedCounty || !constituencies?.length}
            className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-sm text-neutral-900 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20 disabled:bg-neutral-100 disabled:text-neutral-400"
            aria-label="Select constituency"
          >
            <option value="">— All Constituencies —</option>
            {(constituencies ?? []).map((c) => (
              <option key={c.iebcCode} value={c.iebcCode}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Ward */}
        <div>
          <label className="block text-xs font-medium text-neutral-600 mb-1">
            Ward (optional)
          </label>
          <select
            value={selectedWard}
            onChange={(e) => { setSelectedWard(e.target.value); setLookupTriggered(false); }}
            disabled={!selectedConst || !wards?.length}
            className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-sm text-neutral-900 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20 disabled:bg-neutral-100 disabled:text-neutral-400"
            aria-label="Select ward"
          >
            <option value="">— All Wards —</option>
            {(wards ?? []).map((w) => (
              <option key={w.iebcCode} value={w.iebcCode}>
                {w.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Find button */}
      <button
        type="button"
        onClick={handleFind}
        disabled={!selectedCounty || lookupLoading}
        className="flex items-center gap-2 rounded-lg bg-brand-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        aria-label="Find my polling station"
      >
        <Search className="h-4 w-4" />
        {lookupLoading ? 'Searching…' : 'Find Stations'}
      </button>

      {/* Results */}
      {lookupTriggered && !lookupLoading && lookupResults !== undefined && (
        <div className="mt-5">
          {lookupResults.length === 0 ? (
            <div className="rounded-lg border border-neutral-200 bg-white p-5 text-center text-sm text-neutral-500">
              <MapPin className="mx-auto h-8 w-8 text-neutral-300 mb-2" aria-hidden="true" />
              No polling stations found for the selected area. Check your selection.
            </div>
          ) : (
            <>
              <p className="text-sm font-medium text-neutral-700 mb-2">
                {lookupResults.length.toLocaleString()} polling station
                {lookupResults.length !== 1 ? 's' : ''} found in your area:
              </p>
              <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-neutral-200 bg-neutral-50">
                    <tr>
                      <th className="px-4 py-3 font-medium text-neutral-700">Stream Name</th>
                      <th className="hidden px-4 py-3 font-medium text-neutral-700 sm:table-cell">Centre</th>
                      <th className="hidden px-4 py-3 font-medium text-neutral-700 md:table-cell">Ward</th>
                      <th className="px-4 py-3 text-right font-medium text-neutral-700">Voters</th>
                      <th className="hidden px-4 py-3 font-medium text-neutral-700 lg:table-cell">IEBC Code</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {lookupResults.map((station) => (
                      <tr key={station.iebcStationCode} className="hover:bg-neutral-50">
                        <td className="px-4 py-3 font-medium text-neutral-900">
                          {station.name}
                        </td>
                        <td className="hidden px-4 py-3 text-neutral-600 sm:table-cell">
                          {station.registrationCentre?.name ?? '—'}
                        </td>
                        <td className="hidden px-4 py-3 text-neutral-600 md:table-cell">
                          {station.ward?.name ?? '—'}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-neutral-600">
                          {station.registeredVoters.toLocaleString()}
                        </td>
                        <td className="hidden px-4 py-3 font-mono text-xs text-neutral-400 lg:table-cell">
                          {station.iebcStationCode}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}
    </section>
  );
}

// ── Main page ──────────────────────────────────────────────────

export function StationsPage() {
  const [search, setSearch] = useState('');
  const [countyFilter, setCountyFilter] = useState('');

  const { data: stations, isLoading, error } = useQuery({
    queryKey: ['stations', search, countyFilter],
    queryFn: () =>
      getStations({
        search: search || undefined,
        county: countyFilter || undefined,
      }),
  });

  return (
    <div className="container-narrow py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-neutral-900">Polling Stations</h1>
        <p className="mt-2 text-neutral-500">
          Search polling stations by name, code, or county. Click a station to view its results.
        </p>
      </div>

      {/* Find My Station — voter self-lookup */}
      <FindMyStation />

      {/* Filters */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <SearchInput
          placeholder="Search by station name or code..."
          onSearch={setSearch}
          ariaLabel="Search polling stations"
        />
        <input
          type="text"
          placeholder="Filter by county..."
          value={countyFilter}
          onChange={(e) => setCountyFilter(e.target.value)}
          className="rounded-lg border border-neutral-300 bg-white px-4 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
          aria-label="Filter by county"
        />
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg bg-neutral-200" />
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-semantic-error/30 bg-semantic-error-light p-4 text-sm text-semantic-error-dark">
          Unable to load stations. Please try again later.
        </div>
      )}

      {/* Empty */}
      {stations && stations.length === 0 && (
        <div className="rounded-lg border border-neutral-200 bg-white p-8 text-center">
          <MapPin className="mx-auto h-12 w-12 text-neutral-300" aria-hidden="true" />
          <p className="mt-4 text-neutral-500">No stations found matching your search.</p>
        </div>
      )}

      {/* Station List */}
      {stations && stations.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-neutral-200 bg-neutral-50">
              <tr>
                <th className="px-4 py-3 font-medium text-neutral-700">Station</th>
                <th className="hidden px-4 py-3 font-medium text-neutral-700 sm:table-cell">Code</th>
                <th className="hidden px-4 py-3 font-medium text-neutral-700 md:table-cell">County</th>
                <th className="hidden px-4 py-3 font-medium text-neutral-700 lg:table-cell">Constituency</th>
                <th className="px-4 py-3 text-right font-medium text-neutral-700">Voters</th>
                <th className="px-4 py-3" aria-label="Actions" />
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {stations.map((station) => (
                <tr key={station.code} className="hover:bg-neutral-50">
                  <td className="px-4 py-3">
                    <Link
                      to={`/stations/${station.code}`}
                      className="flex items-center gap-2 font-medium text-neutral-900 hover:text-brand-primary"
                    >
                      <Building2 className="h-4 w-4 shrink-0 text-neutral-400" aria-hidden="true" />
                      <span className="truncate">{station.name}</span>
                    </Link>
                  </td>
                  <td className="hidden px-4 py-3 font-mono text-xs text-neutral-500 sm:table-cell">
                    {station.code}
                  </td>
                  <td className="hidden px-4 py-3 text-neutral-600 md:table-cell">
                    {station.countyName}
                  </td>
                  <td className="hidden px-4 py-3 text-neutral-600 lg:table-cell">
                    {station.constituencyName}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-neutral-600">
                    {station.registeredVoters.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      to={`/stations/${station.code}`}
                      className="text-neutral-400 hover:text-brand-primary"
                      aria-label={`View ${station.name}`}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
