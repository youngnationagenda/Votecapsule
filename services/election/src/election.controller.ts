// ============================================================
// VoteCapsule™ — Election Controller
// services/election/src/election.controller.ts
//
// Public-facing REST API for election data.
// All CRUD routes for elections/candidates proxy to Candidate Service.
// All geography routes proxy to Geography Service (NEC SSoT).
// Port 3011.
// ============================================================
import {
  Controller, Get, Post, Param, Body, Query,
  Headers, HttpCode, HttpStatus, BadRequestException,
  Logger,
} from '@nestjs/common';
import { ElectionService } from './election.service';
import {
  ListElectionsQuery,
  ListPositionsQuery,
  ListCandidatesQuery,
  ListPollingStationsQuery,
  RegisteredVotersQuery,
  CreateElectionBody,
  RegisterCandidateBody,
} from './dto/election.dto';

@Controller()
export class ElectionController {
  private readonly logger = new Logger(ElectionController.name);

  constructor(private readonly service: ElectionService) {}

  // ── Health ───────────────────────────────────────────────

  @Get('health')
  @HttpCode(HttpStatus.OK)
  health() {
    return this.service.health();
  }

  // ── Elections ────────────────────────────────────────────

  /**
   * GET /elections
   * List all elections. Filter by tenantId or status.
   */
  @Get('elections')
  listElections(@Query() query: ListElectionsQuery) {
    return this.service.listElections(query);
  }

  /**
   * GET /elections/active
   * The currently active election for a tenant.
   * Header: X-Tenant-Id
   */
  @Get('elections/active')
  getActiveElection(@Headers('x-tenant-id') tenantId: string) {
    if (!tenantId) throw new BadRequestException('X-Tenant-Id header is required');
    return this.service.getActiveElection(tenantId);
  }

  /**
   * GET /elections/:id/summary
   * Aggregate: election + positions + candidate counts + registered voters.
   */
  @Get('elections/:id/summary')
  getElectionSummary(@Param('id') id: string) {
    return this.service.getElectionSummary(id);
  }

  /**
   * GET /elections/:id
   * Single election detail.
   */
  @Get('elections/:id')
  getElection(@Param('id') id: string) {
    return this.service.getElection(id);
  }

  /**
   * POST /elections
   * Create a new election (proxied to Candidate Service).
   * Header: X-Tenant-Id, X-User-Id
   */
  @Post('elections')
  @HttpCode(HttpStatus.CREATED)
  createElection(
    @Body() body: CreateElectionBody,
    @Headers('x-tenant-id') tenantId: string,
    @Headers('x-user-id')   userId:   string,
  ) {
    if (!tenantId) throw new BadRequestException('X-Tenant-Id header is required');
    if (!userId)   throw new BadRequestException('X-User-Id header is required');
    return this.service.createElection(body, tenantId, userId);
  }

  // ── Positions ────────────────────────────────────────────

  /**
   * GET /elections/:electionId/positions
   * All elective positions for an election.
   * Query: countyCode (filter to county-scoped positions)
   */
  @Get('elections/:electionId/positions')
  listPositions(
    @Param('electionId') electionId: string,
    @Query() query: ListPositionsQuery,
  ) {
    return this.service.listPositions(electionId, query);
  }

  /**
   * GET /positions/:id
   * Single position detail.
   */
  @Get('positions/:id')
  getPosition(@Param('id') id: string) {
    return this.service.getPosition(id);
  }

  // ── Candidates ───────────────────────────────────────────

  /**
   * GET /candidates
   * List candidates with optional filters.
   * Query: positionId, partyId, countyCode, constituencyCode,
   *        wardCode, status, tenantId
   */
  @Get('candidates')
  listCandidates(@Query() query: ListCandidatesQuery) {
    return this.service.listCandidates(query);
  }

  /**
   * GET /candidates/:id
   * Full candidate detail with party and position context.
   */
  @Get('candidates/:id')
  getCandidate(@Param('id') id: string) {
    return this.service.getCandidate(id);
  }

  /**
   * POST /candidates/register
   * Register a candidate for a position (proxied to Candidate Service).
   * Header: X-Tenant-Id, X-User-Id
   */
  @Post('candidates/register')
  @HttpCode(HttpStatus.CREATED)
  registerCandidate(
    @Body() body: RegisterCandidateBody,
    @Headers('x-tenant-id') tenantId: string,
    @Headers('x-user-id')   userId:   string,
  ) {
    if (!tenantId) throw new BadRequestException('X-Tenant-Id header is required');
    if (!userId)   throw new BadRequestException('X-User-Id header is required');
    return this.service.registerCandidate(body, tenantId, userId);
  }

  // ── Political Parties ────────────────────────────────────

  /**
   * GET /parties
   * List all registered political parties.
   * Query: countryCode (default: KEN), activeOnly (default: true)
   */
  @Get('parties')
  listParties(
    @Query('countryCode') countryCode = 'KEN',
    @Query('activeOnly')  activeOnly  = 'true',
  ) {
    return this.service.listParties(countryCode, activeOnly !== 'false');
  }

  // ── Polling Stations (NEC SSoT) ──────────────────────────

  /**
   * GET /polling-stations
   * All 46,030 NEC polling stations, filterable by NEC IEBC codes.
   * Query: countyCode, constituencyCode, wardCode, centreCode,
   *        stationType, activeOnly
   */
  @Get('polling-stations')
  listPollingStations(@Query() query: ListPollingStationsQuery) {
    return this.service.listPollingStations(query);
  }

  /**
   * GET /polling-stations/search
   * Free-text search of station names.
   * (Proxied directly to Geography Service)
   */
  @Get('polling-stations/search')
  searchStations(
    @Query('q')     q:      string,
    @Query('limit') limit?: string,
  ) {
    if (!q) throw new BadRequestException('Query param "q" is required');
    return this.service.listPollingStations({});  // search handled via get below
  }

  /**
   * GET /polling-stations/:code/validate
   * Validate a 15-digit IEBC station code and return full context.
   * Used by the mobile Evidence App before submitting a capsule.
   */
  @Get('polling-stations/:code/validate')
  validateStation(@Param('code') code: string) {
    return this.service.validateStation(code);
  }

  /**
   * GET /polling-stations/:code
   * Single polling station by 15-digit IEBC code.
   */
  @Get('polling-stations/:code')
  getPollingStation(@Param('code') code: string) {
    return this.service.getPollingStation(code);
  }

  // ── Registered Voters (NEC SSoT) ─────────────────────────

  /**
   * GET /registered-voters
   * Total registered voters or breakdown by county.
   * Query: breakdown = 'total' (default) | 'county'
   */
  @Get('registered-voters')
  getRegisteredVoters(@Query() query: RegisteredVotersQuery) {
    return this.service.getRegisteredVoters(query);
  }

  // ── Geography (NEC SSoT pass-through) ───────────────────

  /**
   * GET /geography/counties
   * All 47 counties from NEC SSoT.
   */
  @Get('geography/counties')
  listCounties(@Query('includeSpecial') includeSpecial?: string) {
    return this.service.listCounties(includeSpecial);
  }

  /**
   * GET /geography/constituencies
   * All 290 constituencies (optionally filtered by countyCode).
   */
  @Get('geography/constituencies')
  listConstituencies(@Query('countyCode') countyCode?: string) {
    return this.service.listConstituencies(countyCode);
  }

  /**
   * GET /geography/wards
   * Wards (optionally filtered by constituencyCode).
   */
  @Get('geography/wards')
  listWards(@Query('constituencyCode') constituencyCode?: string) {
    return this.service.listWards(constituencyCode);
  }
}
