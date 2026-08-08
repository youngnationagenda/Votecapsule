/**
 * useStationExplorer — Cascading Geography Logic Hook
 * ════════════════════════════════════════════════════
 * Encapsulates all state management for the polling station explorer:
 *   County (001–047) → Constituency → Ward → Polling Station
 *
 * Features:
 *  • Cascading selection: child resets when parent changes
 *  • Real-time search with 300ms debounce and min 2-char threshold
 *  • Sortable results (name, code, voters — asc/desc)
 *  • Client-side pagination (configurable page size)
 *  • Wired directly to NEC Geography Service via API Gateway
 */

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  getCounties, getConstituencies, getWards, getPollingStations,
  searchPollingStations,
  type County, type Constituency, type Ward, type PollingStation,
} from './api';

// ── Types ────────────────────────────────────────────────────────────────────

export type SortField = 'name' | 'code' | 'voters';
export type SortDirection = 'asc' | 'desc';

export interface SortConfig {
  field: SortField;
  direction: SortDirection;
}

export interface PaginationState {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface StationExplorerState {
  // Selections
  countyCode: string;
  constituencyCode: string;
  wardCode: string;

  // Data
  counties: County[];
  constituencies: Constituency[];
  wards: Ward[];
  stations: PollingStation[];
  paginatedStations: PollingStation[];

  // Loading states
  countiesLoading: boolean;
  constituenciesLoading: boolean;
  wardsLoading: boolean;
  stationsLoading: boolean;
  searchLoading: boolean;

  // Search
  searchQuery: string;
  activeSearchQuery: string;
  isSearchMode: boolean;

  // Sort
  sort: SortConfig;

  // Pagination
  pagination: PaginationState;

  // Derived
  selectedCounty: County | undefined;
  selectedConstituency: Constituency | undefined;
  selectedWard: Ward | undefined;
  breadcrumb: string[];
  areaVoterCount: number;
}

export interface StationExplorerActions {
  setCounty: (code: string) => void;
  setConstituency: (code: string) => void;
  setWard: (code: string) => void;
  setSearchQuery: (q: string) => void;
  clearSearch: () => void;
  clearFilters: () => void;
  setSort: (field: SortField) => void;
  setPage: (page: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  firstPage: () => void;
  lastPage: () => void;
}

// ── Configuration ────────────────────────────────────────────────────────────

const DEFAULT_PAGE_SIZE = 50;
const SEARCH_DEBOUNCE_MS = 300;
const SEARCH_MIN_CHARS = 2;
const SEARCH_RESULT_LIMIT = 500;

// ── Sort comparators ─────────────────────────────────────────────────────────

function sortStations(stations: PollingStation[], sort: SortConfig): PollingStation[] {
  const multiplier = sort.direction === 'asc' ? 1 : -1;

  return [...stations].sort((a, b) => {
    switch (sort.field) {
      case 'name':
        return multiplier * a.name.localeCompare(b.name);
      case 'code':
        return multiplier * a.iebcStationCode.localeCompare(b.iebcStationCode);
      case 'voters':
        return multiplier * (a.registeredVoters - b.registeredVoters);
      default:
        return 0;
    }
  });
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useStationExplorer(pageSize = DEFAULT_PAGE_SIZE) {
  // ── Selection state ──────────────────────────────────────────────────────
  const [countyCode, setCountyCode] = useState('');
  const [constituencyCode, setConstituencyCode] = useState('');
  const [wardCode, setWardCode] = useState('');

  // ── Search state ─────────────────────────────────────────────────────────
  const [searchQuery, setSearchQueryRaw] = useState('');
  const [activeSearchQuery, setActiveSearchQuery] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Sort state ───────────────────────────────────────────────────────────
  const [sort, setSort] = useState<SortConfig>({ field: 'name', direction: 'asc' });

  // ── Pagination state ─────────────────────────────────────────────────────
  const [page, setPage] = useState(1);

  // ── Computed flags ───────────────────────────────────────────────────────
  const isSearchMode = activeSearchQuery.length >= SEARCH_MIN_CHARS;

  // ── Data Queries ─────────────────────────────────────────────────────────

  // Counties — always loaded (47 items, cached forever)
  const {
    data: counties = [],
    isLoading: countiesLoading,
  } = useQuery<County[]>({
    queryKey: ['nec-counties'],
    queryFn: getCounties,
    staleTime: Infinity,
  });

  // Constituencies — loaded when a county is selected
  const {
    data: constituencies = [],
    isLoading: constituenciesLoading,
  } = useQuery<Constituency[]>({
    queryKey: ['nec-constituencies', countyCode],
    queryFn: () => getConstituencies(countyCode),
    enabled: !!countyCode,
    staleTime: Infinity,
  });

  // Wards — loaded when a constituency is selected
  const {
    data: wards = [],
    isLoading: wardsLoading,
  } = useQuery<Ward[]>({
    queryKey: ['nec-wards', constituencyCode],
    queryFn: () => getWards(constituencyCode),
    enabled: !!constituencyCode,
    staleTime: Infinity,
  });

  // Browse stations — needs at least a county
  const browseEnabled = !isSearchMode && !!countyCode;
  const {
    data: browseStations = [],
    isLoading: browseLoading,
  } = useQuery<PollingStation[]>({
    queryKey: ['nec-stations-browse', countyCode, constituencyCode, wardCode],
    queryFn: () => getPollingStations({
      countyCode,
      ...(constituencyCode && { constituencyCode }),
      ...(wardCode && { wardCode }),
    }),
    enabled: browseEnabled,
    staleTime: 60_000,
  });

  // Search stations — real-time with debounce
  const {
    data: searchStations = [],
    isLoading: searchLoading,
  } = useQuery<PollingStation[]>({
    queryKey: ['nec-stations-search', activeSearchQuery],
    queryFn: () => searchPollingStations(activeSearchQuery, SEARCH_RESULT_LIMIT),
    enabled: isSearchMode,
    staleTime: 30_000,
  });

  // ── Derived: sorted + paginated stations ─────────────────────────────────

  const rawStations = isSearchMode ? searchStations : browseStations;
  const sortedStations = useMemo(() => sortStations(rawStations, sort), [rawStations, sort]);

  const totalItems = sortedStations.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginatedStations = useMemo(
    () => sortedStations.slice((safePage - 1) * pageSize, safePage * pageSize),
    [sortedStations, safePage, pageSize],
  );

  // ── Derived: selections ──────────────────────────────────────────────────

  const selectedCounty = counties.find((c) => c.iebcCode === countyCode);
  const selectedConstituency = constituencies.find((c) => c.iebcCode === constituencyCode);
  const selectedWard = wards.find((w) => w.iebcCode === wardCode);

  const breadcrumb = [
    selectedCounty?.name,
    selectedConstituency?.name,
    selectedWard?.name,
  ].filter(Boolean) as string[];

  const areaVoterCount =
    selectedWard?.registeredVoters ??
    selectedConstituency?.registeredVoters ??
    selectedCounty?.registeredVoters ?? 0;

  // ── Reset page on data/sort change ───────────────────────────────────────
  useEffect(() => { setPage(1); }, [countyCode, constituencyCode, wardCode, activeSearchQuery, sort]);

  // ── Actions ──────────────────────────────────────────────────────────────

  const setCounty = useCallback((code: string) => {
    setCountyCode(code);
    setConstituencyCode('');
    setWardCode('');
  }, []);

  const setConstituency = useCallback((code: string) => {
    setConstituencyCode(code);
    setWardCode('');
  }, []);

  const setWard = useCallback((code: string) => {
    setWardCode(code);
  }, []);

  const setSearchQuery = useCallback((q: string) => {
    setSearchQueryRaw(q);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setActiveSearchQuery(q.trim());
    }, SEARCH_DEBOUNCE_MS);
  }, []);

  const clearSearch = useCallback(() => {
    setSearchQueryRaw('');
    setActiveSearchQuery('');
    if (debounceRef.current) clearTimeout(debounceRef.current);
  }, []);

  const clearFilters = useCallback(() => {
    setCountyCode('');
    setConstituencyCode('');
    setWardCode('');
  }, []);

  const toggleSort = useCallback((field: SortField) => {
    setSort((prev) => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  }, []);

  const nextPage = useCallback(() => setPage((p) => Math.min(totalPages, p + 1)), [totalPages]);
  const prevPage = useCallback(() => setPage((p) => Math.max(1, p - 1)), []);
  const firstPage = useCallback(() => setPage(1), []);
  const lastPage = useCallback(() => setPage(totalPages), [totalPages]);

  // ── Return ───────────────────────────────────────────────────────────────

  const state: StationExplorerState = {
    countyCode,
    constituencyCode,
    wardCode,
    counties,
    constituencies,
    wards,
    stations: sortedStations,
    paginatedStations,
    countiesLoading,
    constituenciesLoading,
    wardsLoading,
    stationsLoading: browseLoading,
    searchLoading,
    searchQuery,
    activeSearchQuery,
    isSearchMode,
    sort,
    pagination: {
      page: safePage,
      pageSize,
      totalItems,
      totalPages,
    },
    selectedCounty,
    selectedConstituency,
    selectedWard,
    breadcrumb,
    areaVoterCount,
  };

  const actions: StationExplorerActions = {
    setCounty,
    setConstituency,
    setWard,
    setSearchQuery,
    clearSearch,
    clearFilters,
    setSort: toggleSort,
    setPage,
    nextPage,
    prevPage,
    firstPage,
    lastPage,
  };

  return { state, actions };
}
