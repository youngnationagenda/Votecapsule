// ============================================================
// VoteCapsule™ — Election Service
// services/election/src/election.service.ts
//
// Orchestration layer — joins Candidate Service (elections,
// positions, parties, candidates) with Geography Service
// (NEC SSoT — polling stations, registered voters).
//
// This service owns NO database tables.
// All mutation is forwarded to Candidate Service.
// All geography data comes from Geography Service.
// ============================================================
import {
  Injectable, Logger, HttpException, NotFoundException,
  BadGatewayException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { AxiosError, AxiosRequestConfig } from 'axios';

import {
  ListElectionsQuery,
  ListPositionsQuery,
  ListCandidatesQuery,
  ListPollingStationsQuery,
  RegisteredVotersQuery,
  CreateElectionBody,
  RegisterCandidateBody,
} from './dto/election.dto';

@Injectable()
export class ElectionService {
  private readonly logger = new Logger(ElectionService.name);

  private readonly candidateUrl: string;
  private readonly geographyUrl: string;

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {
    this.candidateUrl = this.config.getOrThrow<string>('CANDIDATE_SERVICE_URL');
    this.geographyUrl = this.config.getOrThrow<string>('GEOGRAPHY_SERVICE_URL');
  }

  // ── Internal helpers ─────────────────────────────────────

  private async get<T>(baseUrl: string, path: string, params?: Record<string, any>): Promise<T> {
    const url = `${baseUrl}${path}`;
    try {
      const cfg: AxiosRequestConfig = {};
      if (params) {
        // Strip undefined values
        cfg.params = Object.fromEntries(
          Object.entries(params).filter(([, v]) => v !== undefined),
        );
      }
      const res = await firstValueFrom(this.http.get<T>(url, cfg));
      return res.data;
    } catch (err) {
      this.handleUpstreamError(err, url);
    }
  }

  private async post<T>(
    baseUrl: string,
    path: string,
    body: unknown,
    headers?: Record<string, string>,
  ): Promise<T> {
    const url = `${baseUrl}${path}`;
    try {
      const res = await firstValueFrom(
        this.http.post<T>(url, body, { headers }),
      );
      return res.data;
    } catch (err) {
      this.handleUpstreamError(err, url);
    }
  }

  private handleUpstreamError(err: unknown, url: string): never {
    const axiosErr = err as AxiosError;
    if (axiosErr.response) {
      const status = axiosErr.response.status;
      const data   = axiosErr.response.data as any;
      this.logger.warn(`Upstream ${url} → HTTP ${status}`);
      if (status === 404) throw new NotFoundException(data?.message ?? 'Resource not found');
      throw new HttpException(
        data?.message ?? 'Upstream service error',
        status,
      );
    }
    this.logger.error(`Upstream unreachable: ${url}`, axiosErr.message);
    throw new BadGatewayException(`Upstream service unavailable: ${url}`);
  }

  // ── Elections ────────────────────────────────────────────

  /** GET /elections — proxied from Candidate Service */
  async listElections(query: ListElectionsQuery) {
    return this.get(this.candidateUrl, '/candidates/elections', {
      tenantId: query.tenantId,
    });
  }

  /** GET /elections/active — active election for tenant */
  async getActiveElection(tenantId: string) {
    return this.get(
      this.candidateUrl,
      '/candidates/elections/active',
      undefined,
    );
    // Tenant header passed separately — see controller
  }

  /** GET /elections/:id — single election */
  async getElection(id: string) {
    return this.get(this.candidateUrl, `/candidates/elections/${id}`);
  }

  /** POST /elections — create election (proxied) */
  async createElection(
    body: CreateElectionBody,
    tenantId: string,
    userId: string,
  ) {
    return this.post(
      this.candidateUrl,
      '/candidates/elections',
      body,
      { 'x-tenant-id': tenantId, 'x-user-id': userId },
    );
  }

  // ── Positions ────────────────────────────────────────────

  /** GET /elections/:electionId/positions — all positions for election */
  async listPositions(electionId: string, query: ListPositionsQuery) {
    return this.get(
      this.candidateUrl,
      `/candidates/elections/${electionId}/positions`,
      { countyCode: query.countyCode },
    );
  }

  /** GET /positions/:id — single position */
  async getPosition(id: string) {
    return this.get(this.candidateUrl, `/candidates/positions/${id}`);
  }

  // ── Candidates ───────────────────────────────────────────

  /** GET /candidates — list candidates (proxied from Candidate Service) */
  async listCandidates(query: ListCandidatesQuery) {
    return this.get(this.candidateUrl, '/candidates', {
      electionId:       undefined, // caller may inject via addlParam
      positionId:       query.positionId,
      partyId:          query.partyId,
      countyCode:       query.countyCode,
      constituencyCode: query.constituencyCode,
      wardCode:         query.wardCode,
      status:           query.status,
      tenantId:         query.tenantId,
    });
  }

  /** GET /candidates/:id — single candidate with full context */
  async getCandidate(id: string) {
    return this.get(this.candidateUrl, `/candidates/${id}`);
  }

  /** POST /candidates/register — register a candidate (proxied) */
  async registerCandidate(
    body: RegisterCandidateBody,
    tenantId: string,
    userId: string,
  ) {
    return this.post(
      this.candidateUrl,
      '/candidates/register',
      body,
      { 'x-tenant-id': tenantId, 'x-user-id': userId },
    );
  }

  // ── Political Parties ────────────────────────────────────

  /** GET /parties — list all political parties */
  async listParties(countryCode = 'KEN', activeOnly = true) {
    return this.get(this.candidateUrl, '/candidates/parties', {
      countryCode,
      activeOnly: String(activeOnly),
    });
  }

  // ── Polling Stations (NEC SSoT via Geography Service) ────

  /** GET /polling-stations — all stations, filterable by NEC codes */
  async listPollingStations(query: ListPollingStationsQuery) {
    return this.get(this.geographyUrl, '/geography/polling-stations', {
      countyCode:       query.countyCode,
      constituencyCode: query.constituencyCode,
      wardCode:         query.wardCode,
      centreCode:       query.centreCode,
      stationType:      query.stationType,
      activeOnly:       query.activeOnly,
    });
  }

  /** GET /polling-stations/:code — single station by 15-digit IEBC code */
  async getPollingStation(code: string) {
    return this.get(this.geographyUrl, `/geography/polling-stations/${code}`);
  }

  /** GET /polling-stations/:code/validate — validate station code */
  async validateStation(code: string) {
    return this.get(
      this.geographyUrl,
      `/geography/polling-stations/${code}/validate`,
    );
  }

  // ── Registered Voters (NEC SSoT via Geography Service) ───

  /** GET /registered-voters — total or by-county */
  async getRegisteredVoters(query: RegisteredVotersQuery) {
    if (query.breakdown === 'county') {
      return this.get(this.geographyUrl, '/geography/registered-voters/by-county');
    }
    return this.get(this.geographyUrl, '/geography/registered-voters');
  }

  // ── Geography helpers ────────────────────────────────────

  /** GET /geography/counties */
  async listCounties(includeSpecial?: string) {
    return this.get(this.geographyUrl, '/geography/counties', {
      includeSpecial,
    });
  }

  /** GET /geography/constituencies — optionally filtered by county */
  async listConstituencies(countyCode?: string) {
    return this.get(this.geographyUrl, '/geography/constituencies', {
      countyCode,
    });
  }

  /** GET /geography/wards — optionally filtered by constituency */
  async listWards(constituencyCode?: string) {
    return this.get(this.geographyUrl, '/geography/wards', {
      constituencyCode,
    });
  }

  // ── Aggregate: Election Summary ──────────────────────────

  /**
   * GET /elections/:id/summary
   * Combines election + all positions + candidate counts + voter total
   * for an at-a-glance election dashboard view.
   */
  async getElectionSummary(electionId: string) {
    const [election, positions, voterTotal] = await Promise.all([
      this.getElection(electionId),
      this.listPositions(electionId, {}),
      this.get<{ total: number }>(this.geographyUrl, '/geography/registered-voters'),
    ]);

    // Candidate counts per position (parallel)
    const posArr: any[] = Array.isArray(positions) ? positions : [];
    const candidateCounts = await Promise.all(
      posArr.map(async (pos) => {
        try {
          const candidates: any[] = await this.get(
            this.candidateUrl,
            '/candidates',
            { positionId: pos.id },
          );
          return {
            positionId:   pos.id,
            positionCode: pos.positionCode,
            positionName: pos.positionName,
            total:        Array.isArray(candidates) ? candidates.length : 0,
          };
        } catch {
          return { positionId: pos.id, positionCode: pos.positionCode, total: 0 };
        }
      }),
    );

    return {
      election,
      candidateSummary: candidateCounts,
      registeredVoters: (voterTotal as any).total ?? 0,
    };
  }

  // ── Election lifecycle transitions ────────────────────────
  // Proxied to Candidate Service which owns the election records.

  /** PLANNING → NOMINATION */
  async openNominations(id: string): Promise<unknown> {
    return this.post(this.candidateUrl, `/elections/${id}/nominations/open`, {});
  }

  /** NOMINATION → CAMPAIGN */
  async openCampaign(id: string): Promise<unknown> {
    return this.post(this.candidateUrl, `/elections/${id}/campaign/open`, {});
  }

  /** CAMPAIGN → ACTIVE — also deactivates other elections for the tenant */
  async openVoting(id: string, tenantId: string): Promise<unknown> {
    return this.post(
      this.candidateUrl,
      `/elections/${id}/voting/open`,
      {},
      { 'x-tenant-id': tenantId },
    );
  }

  /** ACTIVE → TALLYING */
  async closePolls(id: string): Promise<unknown> {
    return this.post(this.candidateUrl, `/elections/${id}/voting/close`, {});
  }

  /** TALLYING → RESULTS_PUBLISHED */
  async publishResults(id: string): Promise<unknown> {
    return this.post(this.candidateUrl, `/elections/${id}/results/publish`, {});
  }

  /** RESULTS_PUBLISHED → CLOSED */
  async closeElection(id: string): Promise<unknown> {
    return this.post(this.candidateUrl, `/elections/${id}/close`, {});
  }

  /** Any → CANCELLED */
  async cancelElection(id: string, reason?: string): Promise<unknown> {
    return this.post(this.candidateUrl, `/elections/${id}/cancel`, { reason });
  }

  // ── Health ───────────────────────────────────────────────

  async health() {
    const checks = await Promise.allSettled([
      this.get(this.candidateUrl, '/health'),
      this.get(this.geographyUrl, '/health'),
    ]);
    return {
      service:   'election-service',
      status:    'ok',
      upstream: {
        candidateService: checks[0].status === 'fulfilled' ? 'ok' : 'error',
        geographyService: checks[1].status === 'fulfilled' ? 'ok' : 'error',
      },
    };
  }
}
