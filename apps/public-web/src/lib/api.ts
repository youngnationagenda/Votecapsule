import axios from 'axios';

/**
 * Public API client for Vote Capsule.
 * All endpoints are publicly accessible — no authentication required.
 */
const api = axios.create({
  baseURL: 'https://483uyy43nc.execute-api.us-east-1.amazonaws.com/api/v1',
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
});

// ─── Trust & Verification ─────────────────────────────────────────────────────

export interface VerificationProof {
  capsuleId: string;
  sha256Hash: string;
  hederaTransactionId: string | null;
  hederaConsensusTimestamp: string | null;
  rfc3161Timestamp: string | null;
  rfc3161Tsa: string | null;
  merkleRoot: string | null;
  merkleProofPath: string[];
  chainOfCustody: CustodyEvent[];
  status: 'verified' | 'pending' | 'failed';
  verifiedAt: string | null;
}

export interface CustodyEvent {
  action: string;
  actor: string;
  timestamp: string;
  details?: string;
}

export async function verifyCapsule(capsuleId: string): Promise<VerificationProof> {
  const { data } = await api.get(`/trust/verify/${capsuleId}`);
  return data;
}

// ─── Geography: shared types ──────────────────────────────────────────────────

export interface County {
  id: number;
  iebcCode: string;
  name: string;
  registeredVoters: number;
}

export interface Constituency {
  id: number;
  iebcCode: string;
  name: string;
  registeredVoters: number;
}

export interface Ward {
  id: number;
  iebcCode: string;
  name: string;
  registeredVoters: number;
}

export interface PollingStation {
  id: number;
  iebcStationCode: string;
  streamNumber: number;
  name: string;
  registeredVoters: number;
  stationType: string;
  latitude: number | null;
  longitude: number | null;
  registrationCentre: { name: string; iebcCode: string } | null;
  ward: { id: number; iebcCode: string; name: string };
  constituency: { id: number; iebcCode: string; name: string };
  county: { id: number; iebcCode: string; name: string };
}

// ─── Geography: Stats ─────────────────────────────────────────────────────────

export interface GeographyStats {
  totalCounties: number;
  totalConstituencies: number;
  totalWards: number;
  totalStations: number;
  totalRegisteredVoters: number;
}

export async function getGeographyStats(): Promise<GeographyStats> {
  const { data } = await api.get('/geography/stats');
  return {
    totalCounties:        data.counties          ?? data.totalCounties          ?? 0,
    totalConstituencies:  data.constituencies    ?? data.totalConstituencies    ?? 0,
    totalWards:           data.wards             ?? data.totalWards             ?? 0,
    totalStations:        data.pollingStations   ?? data.totalStations          ?? 0,
    totalRegisteredVoters: data.totalRegisteredVoters ?? 0,
  };
}

// ─── Geography: Counties ─────────────────────────────────────────────────────

/** Returns all 47 counties. */
export async function getCounties(): Promise<County[]> {
  const { data } = await api.get('/geography/counties');
  return Array.isArray(data) ? data : (data?.data ?? []);
}

// ─── Geography: Constituencies ───────────────────────────────────────────────

/** Returns constituencies, optionally filtered by countyCode (3-digit IEBC). */
export async function getConstituencies(countyCode?: string): Promise<Constituency[]> {
  const params = countyCode ? { countyCode } : {};
  const { data } = await api.get('/geography/constituencies', { params });
  return Array.isArray(data) ? data : (data?.data ?? []);
}

// ─── Geography: Wards ────────────────────────────────────────────────────────

/** Returns wards, optionally filtered by constituencyCode (3-digit IEBC). */
export async function getWards(constituencyCode?: string): Promise<Ward[]> {
  const params = constituencyCode ? { constituencyCode } : {};
  const { data } = await api.get('/geography/wards', { params });
  return Array.isArray(data) ? data : (data?.data ?? []);
}

// ─── Geography: Polling Stations ─────────────────────────────────────────────

export interface PollingStationFilter {
  countyCode?: string;
  constituencyCode?: string;
  wardCode?: string;
  centreCode?: string;
}

/** Returns polling stations filtered by geography level. ALWAYS pass at least wardCode or constituencyCode to avoid 413. */
export async function getPollingStations(filter: PollingStationFilter): Promise<PollingStation[]> {
  const { data } = await api.get('/geography/polling-stations', { params: filter });
  return Array.isArray(data) ? data : (data?.data ?? data?.items ?? []);
}

/** Search polling stations by name. Uses /polling-stations/search?q= endpoint. */
export async function searchPollingStations(query: string, limit = 30): Promise<PollingStation[]> {
  if (!query || query.trim().length < 2) return [];
  const { data } = await api.get('/geography/polling-stations/search', {
    params: { q: query.trim(), limit },
  });
  return Array.isArray(data) ? data : (data?.data ?? []);
}

/** Voter lookup — returns polling stations for a given area (county required). */
export async function voterAreaLookup(
  countyCode: string,
  constituencyCode?: string,
  wardCode?: string,
): Promise<PollingStation[]> {
  const params: Record<string, string> = { countyCode };
  if (constituencyCode) params.constituencyCode = constituencyCode;
  if (wardCode) params.wardCode = wardCode;
  const { data } = await api.get('/geography/voters/lookup', { params });
  return Array.isArray(data) ? data : (data?.data ?? []);
}

/** Get a single polling station by 15-digit IEBC code. */
export async function getPollingStationByCode(code: string): Promise<PollingStation | null> {
  try {
    const { data } = await api.get(`/geography/polling-stations/${code}`);
    return data?.data ?? data;
  } catch {
    return null;
  }
}

// ─── Legacy compat exports ────────────────────────────────────────────────────

/** @deprecated use getPollingStations() with filter — kept for StationDetailPage compat */
export interface Station {
  code: string;
  name: string;
  countyName: string;
  constituencyName: string;
  wardName: string;
  registeredVoters: number;
}

export async function getStations(_query: { search?: string; county?: string } = {}): Promise<Station[]> {
  // This endpoint needs at least a filter or will 413. Return empty if no filter.
  return [];
}

export async function getStationByCode(code: string): Promise<Station> {
  const s = await getPollingStationByCode(code);
  return {
    code: s?.iebcStationCode ?? code,
    name: s?.name ?? '',
    countyName: s?.county?.name ?? '',
    constituencyName: s?.constituency?.name ?? '',
    wardName: s?.ward?.name ?? '',
    registeredVoters: s?.registeredVoters ?? 0,
  };
}

// ─── Elections ───────────────────────────────────────────────────────────────

export interface Election {
  id: string;
  name: string;
  type: string;
  date: string;
  status: string;
  description?: string;
}

export async function getElections(): Promise<Election[]> {
  const { data } = await api.get('/election/elections');
  return (data ?? []).map((e: Record<string, unknown>) => ({
    id:          e.id,
    name:        e.name,
    type:        (e.electionType  ?? e.type   ?? 'GENERAL') as string,
    date:        (e.electionDate  ?? e.date   ?? '')        as string,
    status:      ((e.status as string) ?? 'PLANNING').toLowerCase(),
    description: e.description as string | undefined,
  }));
}

// ─── Results ─────────────────────────────────────────────────────────────────

export interface PublicResult {
  id: string;
  electionId: string;
  positionName: string;
  geographyLevel: string;
  geographyName: string;
  geographyCode: string;
  candidates: CandidateResult[];
  totalVotes: number;
  stationsReported: number;
  totalStations: number;
  percentReported: number;
}

export interface CandidateResult {
  candidateId: string;
  candidateName: string;
  partyName: string;
  partyAbbreviation: string;
  votes: number;
  percentage: number;
}

export interface ResultsQuery {
  electionId?: string;
  positionName?: string;
  geographyLevel?: string;
  geographyCode?: string;
  page?: number;
  limit?: number;
}

export async function getPublicResults(query: ResultsQuery = {}): Promise<PublicResult[]> {
  const { data } = await api.get('/reporting/public/results', { params: query });
  return data;
}

// ─── Candidates ──────────────────────────────────────────────────────────────

export interface Candidate {
  id: string;
  fullName: string;
  partyName: string;
  partyAbbreviation: string;
  positionName: string;
  geographyName: string;
  photoUrl?: string;
}

export interface CandidatesQuery {
  search?: string;
  party?: string;
  position?: string;
  geography?: string;
  page?: number;
  limit?: number;
}

export async function getCandidates(query: CandidatesQuery = {}): Promise<Candidate[]> {
  const { data } = await api.get('/election/candidates', { params: query });
  return data;
}

export async function getCandidateById(id: string): Promise<Candidate> {
  const { data } = await api.get(`/election/candidates/${id}`);
  return data;
}

// ─── Reporting Progress ───────────────────────────────────────────────────────

export interface ReportingProgress {
  totalStations: number;
  stationsReported: number;
  percentReported: number;
  byCounty: CountyProgress[];
}

export interface CountyProgress {
  countyName: string;
  countyCode: string;
  totalStations: number;
  stationsReported: number;
  percentReported: number;
}

export async function getReportingProgress(): Promise<ReportingProgress> {
  const { data } = await api.get('/reporting/public/progress');
  return data;
}

export default api;
