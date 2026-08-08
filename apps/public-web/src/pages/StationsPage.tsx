/**
 * Vote Capsule™ — Transparency Portal: Polling Stations Explorer
 * ═══════════════════════════════════════════════════════════════
 * Full NEC-backed station lookup with:
 *  • 47 counties with IEBC codes (001 Mombasa → 047 Nairobi)
 *  • Cascading: County → Constituency → Ward → Polling Stations
 *  • Real-time search (300ms debounce, 2-char minimum)
 *  • Column sorting (name, IEBC code, registered voters)
 *  • Client-side pagination (50 per page)
 *
 * Data: Wired directly to NEC database via Geography Service
 * Reference: Inspired by forms.iebc.or.ke and transtally.co.ke patterns
 */

import { Link } from 'react-router-dom';
import {
  MapPin, Building2, Search, ChevronRight, ChevronLeft,
  Users, Loader2, XCircle, ChevronDown,
  ArrowUpDown, ArrowUp, ArrowDown, RotateCcw, Hash,
} from 'lucide-react';
import { useStationExplorer, type SortField } from '../lib/useStationExplorer';
import type { PollingStation } from '../lib/api';

// ── Helpers ──────────────────────────────────────────────────────────────────

function toTitleCase(s: string) {
  return s.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
}

function formatCode(code: string) {
  return code.padStart(3, '0');
}

// ── County Select with IEBC Codes ────────────────────────────────────────────

interface CountySelectProps {
  counties: { iebcCode: string; name: string; registeredVoters: number }[];
  value: string;
  onChange: (code: string) => void;
  loading: boolean;
}

function CountySelect({ counties, value, onChange, loading }: CountySelectProps) {
  return (
    <div className="relative">
      <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1.5">
        County
      </label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={loading}
          className="w-full appearance-none rounded-lg border border-neutral-300 bg-white pl-3.5 pr-10 py-2.5 text-sm text-neutral-900 shadow-sm focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 disabled:bg-neutral-100 disabled:text-neutral-400 disabled:cursor-not-allowed transition-colors"
        >
          <option value="">
            {loading ? 'Loading counties…' : '— Select County (001–047) —'}
          </option>
          {counties.map((c) => (
            <option key={c.iebcCode} value={c.iebcCode}>
              {formatCode(c.iebcCode)} — {toTitleCase(c.name)} ({c.registeredVoters.toLocaleString()} voters)
            </option>
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

// ── Generic Cascading Select ─────────────────────────────────────────────────

interface CascadeSelectProps {
  label: string;
  value: string;
  onChange: (code: string) => void;
  options: { iebcCode: string; name: string; registeredVoters?: number }[];
  loading: boolean;
  disabled: boolean;
  placeholder: string;
  disabledPlaceholder: string;
}

function CascadeSelect({
  label, value, onChange, options, loading, disabled, placeholder, disabledPlaceholder,
}: CascadeSelectProps) {
  return (
    <div>
      <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1.5">
        {label}
      </label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled || loading}
          className="w-full appearance-none rounded-lg border border-neutral-300 bg-white pl-3.5 pr-10 py-2.5 text-sm text-neutral-900 shadow-sm focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 disabled:bg-neutral-100 disabled:text-neutral-400 disabled:cursor-not-allowed transition-colors"
        >
          <option value="">
            {loading ? 'Loading…' : disabled ? disabledPlaceholder : placeholder}
          </option>
          {options.map((o) => (
            <option key={o.iebcCode} value={o.iebcCode}>
              {formatCode(o.iebcCode)} — {toTitleCase(o.name)}
              {o.registeredVoters != null ? ` (${o.registeredVoters.toLocaleString()})` : ''}
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400">
          {loading && !disabled
            ? <Loader2 className="h-4 w-4 animate-spin" />
            : <ChevronDown className="h-4 w-4" />}
        </div>
      </div>
    </div>
  );
}

// ── Sort Header ──────────────────────────────────────────────────────────────

interface SortHeaderProps {
  label: string;
  field: SortField;
  currentField: SortField;
  currentDirection: 'asc' | 'desc';
  onSort: (field: SortField) => void;
  className?: string;
}

function SortHeader({ label, field, currentField, currentDirection, onSort, className = '' }: SortHeaderProps) {
  const active = currentField === field;
  return (
    <th
      className={`px-4 py-3 text-xs font-semibold uppercase tracking-wide cursor-pointer select-none hover:bg-neutral-100 transition-colors ${active ? 'text-emerald-700' : 'text-neutral-500'} ${className}`}
      onClick={() => onSort(field)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {active ? (
          currentDirection === 'asc'
            ? <ArrowUp className="h-3 w-3" />
            : <ArrowDown className="h-3 w-3" />
        ) : (
          <ArrowUpDown className="h-3 w-3 opacity-40" />
        )}
      </span>
    </th>
  );
}

// ── Pagination Controls ──────────────────────────────────────────────────────

interface PaginationProps {
  page: number;
  totalPages: number;
  onFirst: () => void;
  onPrev: () => void;
  onNext: () => void;
  onLast: () => void;
  onPage: (p: number) => void;
}

function Pagination({ page, totalPages, onFirst, onPrev, onNext, onLast, onPage }: PaginationProps) {
  if (totalPages <= 1) return null;

  // Generate page numbers: show up to 7 centered around current
  const windowSize = 7;
  const start = Math.max(1, Math.min(page - Math.floor(windowSize / 2), totalPages - windowSize + 1));
  const pages = Array.from(
    { length: Math.min(windowSize, totalPages) },
    (_, i) => start + i,
  ).filter((p) => p >= 1 && p <= totalPages);

  return (
    <nav className="flex items-center justify-center gap-1 mt-5 flex-wrap" aria-label="Pagination">
      <button
        onClick={onFirst}
        disabled={page === 1}
        className="px-2.5 py-1.5 text-xs rounded-md border border-neutral-200 hover:bg-neutral-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        aria-label="First page"
      >
        First
      </button>
      <button
        onClick={onPrev}
        disabled={page === 1}
        className="p-1.5 rounded-md border border-neutral-200 hover:bg-neutral-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        aria-label="Previous page"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
      </button>

      {pages.map((p) => (
        <button
          key={p}
          onClick={() => onPage(p)}
          className={`min-w-[2rem] px-2 py-1.5 text-xs rounded-md border transition-colors ${
            p === page
              ? 'bg-emerald-700 text-white border-emerald-700 font-bold'
              : 'border-neutral-200 hover:bg-neutral-50 text-neutral-700'
          }`}
          aria-label={`Page ${p}`}
          aria-current={p === page ? 'page' : undefined}
        >
          {p}
        </button>
      ))}

      <button
        onClick={onNext}
        disabled={page === totalPages}
        className="p-1.5 rounded-md border border-neutral-200 hover:bg-neutral-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        aria-label="Next page"
      >
        <ChevronRight className="h-3.5 w-3.5" />
      </button>
      <button
        onClick={onLast}
        disabled={page === totalPages}
        className="px-2.5 py-1.5 text-xs rounded-md border border-neutral-200 hover:bg-neutral-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        aria-label="Last page"
      >
        Last
      </button>
    </nav>
  );
}

// ── Station Row ──────────────────────────────────────────────────────────────

function StationRow({ station }: { station: PollingStation }) {
  return (
    <tr className="hover:bg-emerald-50/40 transition-colors group">
      <td className="px-4 py-3">
        <div className="flex items-start gap-2.5">
          <Building2 className="h-4 w-4 shrink-0 text-neutral-400 mt-0.5 group-hover:text-emerald-600 transition-colors" />
          <div>
            <div className="font-medium text-neutral-900 leading-tight">
              {toTitleCase(station.name)}
            </div>
            <div className="text-xs text-neutral-400 mt-0.5">
              Stream {station.streamNumber}
              {station.registrationCentre && (
                <span className="hidden sm:inline"> · {toTitleCase(station.registrationCentre.name)}</span>
              )}
            </div>
          </div>
        </div>
      </td>
      <td className="hidden sm:table-cell px-4 py-3">
        <code className="text-xs text-neutral-600 bg-neutral-100 px-2 py-0.5 rounded font-mono">
          {station.iebcStationCode}
        </code>
      </td>
      <td className="hidden md:table-cell px-4 py-3 text-sm text-neutral-700">
        {toTitleCase(station.county?.name ?? '—')}
      </td>
      <td className="hidden lg:table-cell px-4 py-3 text-sm text-neutral-700">
        {toTitleCase(station.constituency?.name ?? '—')}
      </td>
      <td className="hidden xl:table-cell px-4 py-3 text-sm text-neutral-700">
        {toTitleCase(station.ward?.name ?? '—')}
      </td>
      <td className="px-4 py-3 text-right">
        <span className="font-mono text-sm font-semibold text-neutral-800">
          {station.registeredVoters.toLocaleString()}
        </span>
      </td>
      <td className="px-2 py-3 text-right">
        <Link
          to={'/stations/' + station.iebcStationCode}
          className="inline-flex items-center justify-center w-7 h-7 rounded-full hover:bg-emerald-100 text-neutral-400 hover:text-emerald-700 transition-colors"
          aria-label={'View details for ' + station.name}
        >
          <ChevronRight className="h-4 w-4" />
        </Link>
      </td>
    </tr>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

export function StationsPage() {
  const { state, actions } = useStationExplorer(50);

  const showResults = state.isSearchMode || !!state.countyCode;
  const isLoading = state.isSearchMode ? state.searchLoading : state.stationsLoading;

  return (
    <div className="container-narrow py-8 px-4 sm:px-6">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-lg bg-emerald-700 flex items-center justify-center">
            <MapPin className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-neutral-900 leading-tight">
              Polling Station Finder
            </h1>
            <p className="text-sm text-neutral-500">
              NEC-registered stations across all 47 counties
            </p>
          </div>
        </div>
      </header>

      {/* ── Search Bar ─────────────────────────────────────────────────────── */}
      <div className="mb-6">
        <div className="relative max-w-2xl">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-neutral-400 pointer-events-none" />
          <input
            type="search"
            value={state.searchQuery}
            onChange={(e) => actions.setSearchQuery(e.target.value)}
            placeholder="Search by station name — e.g. Bomu Primary, Kenyatta, St Francis…"
            className="w-full rounded-xl border border-neutral-300 bg-white pl-11 pr-10 py-3.5 text-sm text-neutral-900 shadow-sm placeholder:text-neutral-400 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 transition-colors"
            aria-label="Search polling stations by name"
          />
          {state.searchQuery && (
            <button
              onClick={actions.clearSearch}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 transition-colors"
              aria-label="Clear search"
            >
              <XCircle className="h-4.5 w-4.5" />
            </button>
          )}
        </div>
        {state.searchQuery.length > 0 && state.searchQuery.length < 2 && (
          <p className="text-xs text-neutral-400 mt-1.5 ml-1">Type at least 2 characters to search.</p>
        )}
        {state.isSearchMode && state.searchLoading && (
          <p className="text-xs text-emerald-600 mt-1.5 ml-1 flex items-center gap-1.5">
            <Loader2 className="h-3 w-3 animate-spin" /> Searching all stations…
          </p>
        )}
      </div>

      {/* ── Cascading Location Filters ─────────────────────────────────────── */}
      {!state.isSearchMode && (
        <div className="mb-6 rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <h2 className="text-sm font-semibold text-neutral-800 flex items-center gap-2">
              <MapPin className="h-4 w-4 text-emerald-600" />
              Browse by Location
            </h2>
            {state.countyCode && (
              <button
                onClick={actions.clearFilters}
                className="text-xs text-neutral-500 hover:text-red-600 flex items-center gap-1 transition-colors"
              >
                <RotateCcw className="h-3 w-3" /> Reset
              </button>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {/* County (001–047) */}
            <CountySelect
              counties={state.counties}
              value={state.countyCode}
              onChange={actions.setCounty}
              loading={state.countiesLoading}
            />

            {/* Constituency */}
            <CascadeSelect
              label="Constituency / Sub-County"
              value={state.constituencyCode}
              onChange={actions.setConstituency}
              options={state.constituencies}
              loading={state.constituenciesLoading}
              disabled={!state.countyCode}
              placeholder="— All Constituencies —"
              disabledPlaceholder="— Select county first —"
            />

            {/* Ward */}
            <CascadeSelect
              label="Ward"
              value={state.wardCode}
              onChange={actions.setWard}
              options={state.wards}
              loading={state.wardsLoading}
              disabled={!state.constituencyCode}
              placeholder="— All Wards —"
              disabledPlaceholder="— Select constituency first —"
            />
          </div>

          {/* Breadcrumb + voter count */}
          {state.breadcrumb.length > 0 && (
            <div className="mt-4 flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-medium bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-full">
                <MapPin className="h-3 w-3" />
                {state.breadcrumb.map((s) => toTitleCase(s)).join(' › ')}
              </div>
              {state.areaVoterCount > 0 && (
                <div className="flex items-center gap-1.5 text-xs text-neutral-600">
                  <Users className="h-3.5 w-3.5 text-neutral-400" />
                  <span>
                    <span className="font-bold text-neutral-900">{state.areaVoterCount.toLocaleString()}</span> registered voters
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Empty state */}
          {!state.countyCode && (
            <p className="mt-4 text-xs text-neutral-400 flex items-start gap-2">
              <Hash className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              Select a county to browse its polling stations. Narrow by constituency and ward for faster results.
            </p>
          )}
        </div>
      )}

      {/* ── Results ────────────────────────────────────────────────────────── */}
      {showResults ? (
        <div>
          {/* Result count + loading */}
          {isLoading ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-neutral-500">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
              <span className="text-sm">Loading stations…</span>
            </div>
          ) : state.stations.length === 0 ? (
            <div className="rounded-xl border border-neutral-200 bg-white p-12 text-center">
              <MapPin className="mx-auto h-12 w-12 text-neutral-300" />
              <p className="mt-4 font-medium text-neutral-600">No polling stations found</p>
              <p className="mt-1 text-xs text-neutral-400">Try a different search or location filter.</p>
            </div>
          ) : (
            <>
              {/* Summary bar */}
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <p className="text-sm text-neutral-600">
                  <span className="font-bold text-neutral-900">{state.pagination.totalItems.toLocaleString()}</span>
                  {' '}station{state.pagination.totalItems !== 1 ? 's' : ''}
                  {state.isSearchMode && (
                    <span className="text-neutral-400"> matching "{state.activeSearchQuery}"</span>
                  )}
                  {state.pagination.totalPages > 1 && (
                    <span className="text-neutral-400 ml-2">
                      · Page {state.pagination.page} of {state.pagination.totalPages}
                    </span>
                  )}
                </p>
              </div>

              {/* Table */}
              <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white shadow-sm">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-neutral-200 bg-neutral-50">
                    <tr>
                      <SortHeader
                        label="Station Name"
                        field="name"
                        currentField={state.sort.field}
                        currentDirection={state.sort.direction}
                        onSort={actions.setSort}
                      />
                      <SortHeader
                        label="IEBC Code"
                        field="code"
                        currentField={state.sort.field}
                        currentDirection={state.sort.direction}
                        onSort={actions.setSort}
                        className="hidden sm:table-cell"
                      />
                      <th className="hidden md:table-cell px-4 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wide">
                        County
                      </th>
                      <th className="hidden lg:table-cell px-4 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wide">
                        Constituency
                      </th>
                      <th className="hidden xl:table-cell px-4 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wide">
                        Ward
                      </th>
                      <SortHeader
                        label="Voters"
                        field="voters"
                        currentField={state.sort.field}
                        currentDirection={state.sort.direction}
                        onSort={actions.setSort}
                        className="text-right"
                      />
                      <th className="w-10 px-2 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {state.paginatedStations.map((s) => (
                      <StationRow
                        key={s.iebcStationCode + '-' + s.streamNumber}
                        station={s}
                      />
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <Pagination
                page={state.pagination.page}
                totalPages={state.pagination.totalPages}
                onFirst={actions.firstPage}
                onPrev={actions.prevPage}
                onNext={actions.nextPage}
                onLast={actions.lastPage}
                onPage={actions.setPage}
              />
            </>
          )}
        </div>
      ) : (
        /* Initial empty state — guide users */
        <div className="rounded-xl border-2 border-dashed border-emerald-200 bg-emerald-50/30 p-10 text-center">
          <MapPin className="mx-auto h-14 w-14 text-emerald-300" />
          <h3 className="mt-4 text-lg font-semibold text-neutral-800">
            Find Your Polling Station
          </h3>
          <p className="mt-2 text-sm text-neutral-500 max-w-md mx-auto">
            Search by station name above, or select your county from the dropdown
            to browse all stations in your area.
          </p>
          <div className="mt-6 grid grid-cols-2 gap-3 max-w-xs mx-auto sm:grid-cols-4 sm:max-w-lg">
            <div className="rounded-lg bg-white border border-neutral-200 p-3 text-center shadow-sm">
              <div className="text-xl font-bold text-emerald-700">47</div>
              <div className="text-xs text-neutral-500">Counties</div>
            </div>
            <div className="rounded-lg bg-white border border-neutral-200 p-3 text-center shadow-sm">
              <div className="text-xl font-bold text-emerald-700">290</div>
              <div className="text-xs text-neutral-500">Constituencies</div>
            </div>
            <div className="rounded-lg bg-white border border-neutral-200 p-3 text-center shadow-sm">
              <div className="text-xl font-bold text-emerald-700">1,447</div>
              <div className="text-xs text-neutral-500">Wards</div>
            </div>
            <div className="rounded-lg bg-white border border-neutral-200 p-3 text-center shadow-sm">
              <div className="text-xl font-bold text-emerald-700">46,030</div>
              <div className="text-xs text-neutral-500">Stations</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
