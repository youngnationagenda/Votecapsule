/**
 * Vote Capsule™ — Transparency Portal: Polling Stations Page
 * Fully working: 47-county dropdown, sub-county, ward cascade, name search, pagination
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  MapPin, Building2, Search, Navigation, ChevronRight,
  ChevronLeft, Users, Hash, Loader2, XCircle, AlertCircle,
  ChevronDown,
} from 'lucide-react';
import {
  getCounties, getConstituencies, getWards,
  getPollingStations, searchPollingStations,
  type County, type Constituency, type Ward, type PollingStation,
} from '../lib/api';

// ── Helpers ───────────────────────────────────────────────────────────────────

function toTitleCase(s: string) {
  return s.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
}

// ── Custom select with loading spinner ───────────────────────────────────────

interface SelectFieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  disabled?: boolean;
  loading?: boolean;
}

function SelectField({
  label, value, onChange, options,
  placeholder = '— Select —', disabled, loading,
}: SelectFieldProps) {
  return (
    <div>
      <label className="block text-xs font-semibold text-neutral-600 mb-1.5">{label}</label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled || loading}
          className="w-full appearance-none rounded-xl border border-neutral-300 bg-white pl-3.5 pr-9 py-2.5 text-sm text-neutral-900 shadow-sm focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20 disabled:bg-neutral-100 disabled:text-neutral-400 disabled:cursor-not-allowed transition-colors"
        >
          <option value="">
            {loading ? 'Loading…' : placeholder}
          </option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400">
          {loading
            ? <Loader2 className="h-4 w-4 animate-spin" />
            : <ChevronDown className="h-4 w-4" />}
        </div>
      </div>
    </div>
  );
}

// ── Stat badge ────────────────────────────────────────────────────────────────

function StatBadge({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white px-4 py-3 text-center shadow-sm">
      <div className="text-xl font-bold text-brand-primary">
        {typeof value === 'number' ? value.toLocaleString() : value}
      </div>
      <div className="text-xs text-neutral-500 mt-0.5">{label}</div>
    </div>
  );
}

// ── Station table ─────────────────────────────────────────────────────────────

const PAGE_SIZE = 50;

interface StationResultsProps {
  stations: PollingStation[];
  isLoading: boolean;
  error: Error | null;
  label?: string;
}

function StationResults({ stations, isLoading, error, label }: StationResultsProps) {
  const [page, setPage] = useState(1);

  // Reset to page 1 when data changes
  useEffect(() => { setPage(1); }, [stations]);

  const totalPages = Math.max(1, Math.ceil(stations.length / PAGE_SIZE));
  const sliced = stations.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-neutral-500">
        <Loader2 className="h-8 w-8 animate-spin text-brand-primary" />
        <span className="text-sm">Loading stations…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
        <AlertCircle className="h-5 w-5 shrink-0" />
        <span>Failed to load stations. Please try again.</span>
      </div>
    );
  }

  if (stations.length === 0) {
    return (
      <div className="rounded-2xl border border-neutral-200 bg-white p-12 text-center">
        <MapPin className="mx-auto h-12 w-12 text-neutral-300" />
        <p className="mt-4 font-medium text-neutral-600">No polling stations found</p>
        <p className="mt-1 text-xs text-neutral-400">Try a different search term or location filter.</p>
      </div>
    );
  }

  return (
    <div>
      {/* Top bar */}
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <p className="text-sm text-neutral-600">
          <span className="font-bold text-neutral-900">{stations.length.toLocaleString()}</span>{' '}
          {label ?? 'polling stations'}
          {totalPages > 1 && (
            <span className="text-neutral-400 ml-2">· page {page} of {totalPages}</span>
          )}
        </p>
        {totalPages > 1 && (
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1.5 rounded-lg border border-neutral-200 hover:bg-neutral-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              aria-label="Previous page"
            >
              <ChevronLeft className="h-3.5 w-3.5 text-neutral-600" />
            </button>
            <span className="text-xs text-neutral-500 select-none min-w-[4rem] text-center">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-1.5 rounded-lg border border-neutral-200 hover:bg-neutral-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              aria-label="Next page"
            >
              <ChevronRight className="h-3.5 w-3.5 text-neutral-600" />
            </button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border border-neutral-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-neutral-200 bg-neutral-50">
            <tr>
              <th className="px-4 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wide">
                Station Name
              </th>
              <th className="hidden px-4 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wide sm:table-cell">
                IEBC Code
              </th>
              <th className="hidden px-4 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wide md:table-cell">
                County
              </th>
              <th className="hidden px-4 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wide lg:table-cell">
                Sub-County
              </th>
              <th className="hidden px-4 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wide xl:table-cell">
                Ward
              </th>
              <th className="px-4 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wide text-right">
                Voters
              </th>
              <th className="w-10 px-2 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {sliced.map((s) => (
              <tr key={s.iebcStationCode + '-' + s.streamNumber} className="hover:bg-neutral-50 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-start gap-2">
                    <Building2 className="h-4 w-4 shrink-0 text-neutral-400 mt-0.5" />
                    <div>
                      <div className="font-medium text-neutral-900 leading-tight">
                        {toTitleCase(s.name)}
                      </div>
                      <div className="text-xs text-neutral-400 mt-0.5">
                        Stream {s.streamNumber}
                        {s.registrationCentre && (
                          <span> · {toTitleCase(s.registrationCentre.name)}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="hidden px-4 py-3 sm:table-cell">
                  <span className="font-mono text-xs text-neutral-500 bg-neutral-100 px-2 py-0.5 rounded">
                    {s.iebcStationCode}
                  </span>
                </td>
                <td className="hidden px-4 py-3 md:table-cell text-sm text-neutral-700">
                  {toTitleCase(s.county?.name ?? '—')}
                </td>
                <td className="hidden px-4 py-3 lg:table-cell text-sm text-neutral-700">
                  {toTitleCase(s.constituency?.name ?? '—')}
                </td>
                <td className="hidden px-4 py-3 xl:table-cell text-sm text-neutral-700">
                  {toTitleCase(s.ward?.name ?? '—')}
                </td>
                <td className="px-4 py-3 text-right">
                  <span className="font-mono text-sm font-semibold text-neutral-700">
                    {s.registeredVoters.toLocaleString()}
                  </span>
                </td>
                <td className="px-2 py-3 text-right">
                  <Link
                    to={'/stations/' + s.iebcStationCode}
                    className="inline-flex items-center justify-center w-7 h-7 rounded-full hover:bg-brand-primary/10 text-neutral-400 hover:text-brand-primary transition-colors"
                    aria-label={'View ' + s.name}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Bottom pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-1.5 mt-5 flex-wrap">
          <button
            onClick={() => setPage(1)}
            disabled={page === 1}
            className="px-3 py-1.5 text-xs rounded-lg border border-neutral-200 hover:bg-neutral-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            « First
          </button>
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 text-xs rounded-lg border border-neutral-200 hover:bg-neutral-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            ‹ Prev
          </button>
          {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
            const start = Math.max(1, Math.min(page - 3, totalPages - 6));
            const p = start + i;
            if (p > totalPages) return null;
            return (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={'px-3 py-1.5 text-xs rounded-lg border transition-colors ' + (
                  p === page
                    ? 'bg-brand-primary text-white border-brand-primary font-semibold'
                    : 'border-neutral-200 hover:bg-neutral-50'
                )}
              >
                {p}
              </button>
            );
          })}
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1.5 text-xs rounded-lg border border-neutral-200 hover:bg-neutral-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Next ›
          </button>
          <button
            onClick={() => setPage(totalPages)}
            disabled={page === totalPages}
            className="px-3 py-1.5 text-xs rounded-lg border border-neutral-200 hover:bg-neutral-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Last »
          </button>
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function StationsPage() {
  // Search state
  const [searchInput,  setSearchInput]  = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cascading location filter
  const [countyCode,       setCountyCode]       = useState('');
  const [constituencyCode, setConstituencyCode] = useState('');
  const [wardCode,         setWardCode]         = useState('');

  // Mode: search takes priority over browse
  const isSearchMode = activeSearch.length >= 2;

  // ── Fetch counties (always) ──────────────────────────────────────────────
  const { data: counties = [], isLoading: countiesLoading } = useQuery<County[]>({
    queryKey: ['geo-counties'],
    queryFn: getCounties,
    staleTime: Infinity,
  });

  // ── Fetch constituencies when county selected ────────────────────────────
  const { data: constituencies = [], isLoading: constsLoading } = useQuery<Constituency[]>({
    queryKey: ['geo-constituencies', countyCode],
    queryFn: () => getConstituencies(countyCode),
    enabled: !!countyCode,
    staleTime: Infinity,
  });

  // ── Fetch wards when constituency selected ───────────────────────────────
  const { data: wards = [], isLoading: wardsLoading } = useQuery<Ward[]>({
    queryKey: ['geo-wards', constituencyCode],
    queryFn: () => getWards(constituencyCode),
    enabled: !!constituencyCode,
    staleTime: Infinity,
  });

  // ── Browse stations (need at least county selected) ──────────────────────
  const browseEnabled = !isSearchMode && !!countyCode;
  const browseFilter  = {
    ...(countyCode       && { countyCode }),
    ...(constituencyCode && { constituencyCode }),
    ...(wardCode         && { wardCode }),
  };

  const {
    data:      browseStations = [],
    isLoading: browseLoading,
    error:     browseError,
  } = useQuery<PollingStation[]>({
    queryKey: ['geo-stations-browse', countyCode, constituencyCode, wardCode],
    queryFn:  () => getPollingStations(browseFilter),
    enabled:  browseEnabled,
    staleTime: 60_000,
  });

  // ── Search stations ──────────────────────────────────────────────────────
  const {
    data:      searchResults = [],
    isLoading: searchLoading,
    error:     searchError,
  } = useQuery<PollingStation[]>({
    queryKey: ['geo-stations-search', activeSearch],
    queryFn:  () => searchPollingStations(activeSearch, 300),
    enabled:  isSearchMode,
    staleTime: 30_000,
  });

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setSearchInput(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setActiveSearch(v.trim()), 450);
  }, []);

  const clearSearch = useCallback(() => {
    setSearchInput('');
    setActiveSearch('');
  }, []);

  const handleCountyChange = useCallback((v: string) => {
    setCountyCode(v);
    setConstituencyCode('');
    setWardCode('');
    clearSearch();
  }, [clearSearch]);

  const handleConstituencyChange = useCallback((v: string) => {
    setConstituencyCode(v);
    setWardCode('');
    clearSearch();
  }, [clearSearch]);

  const handleWardChange = useCallback((v: string) => {
    setWardCode(v);
    clearSearch();
  }, [clearSearch]);

  const clearFilters = useCallback(() => {
    setCountyCode('');
    setConstituencyCode('');
    setWardCode('');
  }, []);

  // ── Derived display values ────────────────────────────────────────────────

  const selectedCounty       = counties.find((c) => c.iebcCode === countyCode);
  const selectedConstituency = constituencies.find((c) => c.iebcCode === constituencyCode);
  const selectedWard         = wards.find((w) => w.iebcCode === wardCode);

  const displayStations = isSearchMode ? searchResults : browseStations;
  const displayLoading  = isSearchMode ? searchLoading  : browseLoading;
  const displayError    = isSearchMode ? (searchError as Error | null) : (browseError as Error | null);
  const showResults     = isSearchMode ? (activeSearch.length >= 2) : browseEnabled;

  const resultLabel = isSearchMode
    ? 'station' + (displayStations.length !== 1 ? 's' : '') + ' matching "' + activeSearch + '"'
    : 'station' + (displayStations.length !== 1 ? 's' : '') + ' in selected area';

  const breadcrumb = [
    selectedCounty       ? toTitleCase(selectedCounty.name)       : null,
    selectedConstituency ? toTitleCase(selectedConstituency.name) : null,
    selectedWard         ? toTitleCase(selectedWard.name)         : null,
  ].filter(Boolean).join(' › ');

  return (
    <div className="container-narrow py-8">
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-neutral-900">Polling Stations</h1>
        <p className="mt-2 text-neutral-500 text-sm max-w-2xl">
          Browse all 45,805 NEC-registered polling stations across Kenya's 47 counties.
          Select a county to drill down by sub-county and ward, or search by station name.
        </p>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-8">
        <StatBadge label="Counties"         value={47}     />
        <StatBadge label="Constituencies"   value={290}    />
        <StatBadge label="Wards"            value={1447}   />
        <StatBadge label="Polling Stations" value={45805}  />
      </div>

      {/* Search bar */}
      <div className="mb-6">
        <label className="block text-sm font-semibold text-neutral-700 mb-2">
          <Search className="inline h-4 w-4 mr-1.5 -mt-0.5 text-brand-primary" />
          Search by Station Name
        </label>
        <div className="relative max-w-xl">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400 pointer-events-none" />
          <input
            type="search"
            value={searchInput}
            onChange={handleSearchChange}
            placeholder="e.g. Bomu Primary School, Kenyatta, St Francis…"
            className="w-full rounded-xl border border-neutral-300 bg-white pl-10 pr-10 py-3 text-sm text-neutral-900 shadow-sm placeholder:text-neutral-400 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20 transition-colors"
            aria-label="Search polling stations by name"
          />
          {searchInput && (
            <button
              onClick={clearSearch}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 transition-colors"
              aria-label="Clear search"
            >
              <XCircle className="h-4 w-4" />
            </button>
          )}
        </div>
        {searchInput.length > 0 && searchInput.length < 2 && (
          <p className="text-xs text-neutral-400 mt-1.5 ml-1">Type at least 2 characters to search.</p>
        )}
        {isSearchMode && (
          <p className="text-xs text-brand-primary mt-1.5 ml-1 font-medium">
            Searching across all 45,805 stations…
          </p>
        )}
      </div>

      {/* Location filter panel */}
      {!isSearchMode && (
        <div className="mb-6 rounded-2xl border border-neutral-200 bg-neutral-50 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-brand-primary" />
              <h2 className="text-sm font-semibold text-neutral-800">Filter by Location</h2>
            </div>
            {breadcrumb && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-medium text-brand-primary bg-brand-primary/10 px-2.5 py-1 rounded-full">
                  📍 {breadcrumb}
                </span>
                <button
                  onClick={clearFilters}
                  className="text-xs text-neutral-500 hover:text-red-600 flex items-center gap-1 transition-colors"
                >
                  <XCircle className="h-3.5 w-3.5" /> Clear
                </button>
              </div>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {/* County dropdown */}
            <SelectField
              label="1. County"
              value={countyCode}
              onChange={handleCountyChange}
              loading={countiesLoading}
              placeholder={countiesLoading ? 'Loading 47 counties…' : '— Select County —'}
              options={counties.map((c) => ({
                value: c.iebcCode,
                label: toTitleCase(c.name) + ' (' + c.registeredVoters.toLocaleString() + ' voters)',
              }))}
            />

            {/* Sub-County / Constituency dropdown */}
            <SelectField
              label="2. Sub-County / Constituency"
              value={constituencyCode}
              onChange={handleConstituencyChange}
              loading={constsLoading && !!countyCode}
              disabled={!countyCode}
              placeholder={
                !countyCode           ? '— Select county first —'
                : constsLoading       ? 'Loading constituencies…'
                : constituencies.length === 0 ? 'No constituencies found'
                : '— All Sub-Counties —'
              }
              options={constituencies.map((c) => ({
                value: c.iebcCode,
                label: toTitleCase(c.name),
              }))}
            />

            {/* Ward dropdown */}
            <SelectField
              label="3. Ward"
              value={wardCode}
              onChange={handleWardChange}
              loading={wardsLoading && !!constituencyCode}
              disabled={!constituencyCode}
              placeholder={
                !constituencyCode    ? '— Select sub-county first —'
                : wardsLoading       ? 'Loading wards…'
                : wards.length === 0 ? 'No wards found'
                : '— All Wards —'
              }
              options={wards.map((w) => ({
                value: w.iebcCode,
                label: toTitleCase(w.name) + ' (' + w.registeredVoters.toLocaleString() + ' voters)',
              }))}
            />
          </div>

          {/* Voter count for selected area */}
          {(selectedWard || selectedConstituency || selectedCounty) && (
            <div className="mt-4 flex items-center gap-2 text-sm">
              <Users className="h-4 w-4 text-brand-primary" />
              <span className="text-neutral-700">
                <span className="font-bold text-neutral-900">
                  {(
                    selectedWard?.registeredVoters ??
                    selectedConstituency?.registeredVoters ??
                    selectedCounty?.registeredVoters ?? 0
                  ).toLocaleString()}
                </span>
                {' '}registered voters in{' '}
                <span className="font-semibold">
                  {selectedWard
                    ? toTitleCase(selectedWard.name) + ' ward'
                    : selectedConstituency
                    ? toTitleCase(selectedConstituency.name) + ' sub-county'
                    : toTitleCase(selectedCounty!.name) + ' county'}
                </span>
              </span>
            </div>
          )}

          {/* Empty state hint */}
          {!countyCode && (
            <div className="mt-4 flex items-start gap-2 text-xs text-neutral-400">
              <Hash className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <span>
                Select a county from the dropdown above to browse polling stations.
                Narrowing by sub-county and ward will speed up results.
                Or use the search box to find a specific station directly.
              </span>
            </div>
          )}
        </div>
      )}

      {/* Results */}
      {showResults ? (
        <StationResults
          stations={displayStations}
          isLoading={displayLoading}
          error={displayError}
          label={resultLabel}
        />
      ) : !isSearchMode && !countyCode ? (
        /* Initial empty state */
        <div className="rounded-2xl border-2 border-dashed border-brand-primary/20 bg-brand-primary/5 p-10 text-center">
          <Navigation className="mx-auto h-14 w-14 text-brand-primary/30" />
          <h3 className="mt-4 text-lg font-semibold text-neutral-800">
            Browse Kenya's Polling Stations
          </h3>
          <p className="mt-2 text-sm text-neutral-500 max-w-md mx-auto">
            Use the <strong>location filter</strong> above to select a county, sub-county,
            and ward — or type a station name in the <strong>search box</strong> to find it directly.
          </p>
          <div className="mt-6 grid grid-cols-2 gap-3 max-w-xs mx-auto sm:grid-cols-4 sm:max-w-lg">
            <div className="rounded-lg bg-white border border-neutral-200 p-3 text-center">
              <div className="text-xl font-bold text-brand-primary">47</div>
              <div className="text-xs text-neutral-500">Counties</div>
            </div>
            <div className="rounded-lg bg-white border border-neutral-200 p-3 text-center">
              <div className="text-xl font-bold text-brand-primary">290</div>
              <div className="text-xs text-neutral-500">Sub-Counties</div>
            </div>
            <div className="rounded-lg bg-white border border-neutral-200 p-3 text-center">
              <div className="text-xl font-bold text-brand-primary">1,447</div>
              <div className="text-xs text-neutral-500">Wards</div>
            </div>
            <div className="rounded-lg bg-white border border-neutral-200 p-3 text-center">
              <div className="text-xl font-bold text-brand-primary">45,805</div>
              <div className="text-xs text-neutral-500">Stations</div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
