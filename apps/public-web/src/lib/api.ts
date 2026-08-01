import axios from 'axios';

/**
 * Public API client for Vote Capsule.
 * All endpoints are publicly accessible — no authentication required.
 */
const api = axios.create({
  baseURL: 'https://483uyy43nc.execute-api.us-east-1.amazonaws.com/api/v1',
  timeout: 15_000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ─── Trust & Verification ────────────────────────────────────────────────────

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

// ─── Geography ───────────────────────────────────────────────────────────────

export interface GeographyStats {
  totalCounties: number;
  totalConstituencies: number;
  totalWards: number;
  totalStations: number;
  totalRegisteredVoters: number;
}

export async function getGeographyStats(): Promise<GeographyStats> {
  const { data } = await api.get('/geography/stats');
  return data;
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
  return data;
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

// ─── Stations ────────────────────────────────────────────────────────────────

export interface Station {
  code: string;
  name: string;
  countyName: string;
  constituencyName: string;
  wardName: string;
  registeredVoters: number;
}

export interface StationsQuery {
  search?: string;
  county?: string;
  constituency?: string;
  page?: number;
  limit?: number;
}

export async function getStations(query: StationsQuery = {}): Promise<Station[]> {
  const { data } = await api.get('/geography/polling-stations', { params: query });
  return data?.items ?? data?.data ?? data ?? [];
}

export async function getStationByCode(code: string): Promise<Station> {
  const { data } = await api.get(`/geography/polling-stations/${code}`);
  return data?.data ?? data;
}

// ─── Reporting Progress ──────────────────────────────────────────────────────

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
