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
  Logger, UseGuards, Req,
} from '@nestjs/common';
import { Request } from 'express';
import { ElectionService } from './election.service';
import { SubscriptionGuard } from './common/subscription.guard';
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
  @UseGuards(SubscriptionGuard)
  createElection(
    @Body() body: CreateElectionBody,
    @Headers('x-tenant-id') tenantId: string,
    @Headers('x-user-id')   userId:   string,
    @Req() req: Request,
  ) {
    if (!tenantId) throw new BadRequestException('X-Tenant-Id header is required');
    if (!userId)   throw new BadRequestException('X-User-Id header is required');
    // Expose tenantId on req for SubscriptionGuard header resolution
    (req as Request & { tenantIdFromHeader?: string }).tenantIdFromHeader = tenantId;
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
  @UseGuards(SubscriptionGuard)
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
    return this.service.searchStations(q, limit ? parseInt(limit, 10) : 20);
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

  // ── Election lifecycle transitions ───────────────────────

  /**
   * POST /elections/:id/nominations/open
   * PLANNING → NOMINATION — opens candidate registration.
   */
  @Post('elections/:id/nominations/open')
  @HttpCode(HttpStatus.OK)
  @UseGuards(SubscriptionGuard)
  openNominations(@Param('id') id: string) {
    return this.service.openNominations(id);
  }

  /**
   * POST /elections/:id/campaign/open
   * NOMINATION → CAMPAIGN — nominations close, campaigning begins.
   */
  @Post('elections/:id/campaign/open')
  @HttpCode(HttpStatus.OK)
  @UseGuards(SubscriptionGuard)
  openCampaign(@Param('id') id: string) {
    return this.service.openCampaign(id);
  }

  /**
   * POST /elections/:id/voting/open
   * CAMPAIGN → ACTIVE — voting day begins.
   * Header: X-Tenant-Id required.
   */
  @Post('elections/:id/voting/open')
  @HttpCode(HttpStatus.OK)
  @UseGuards(SubscriptionGuard)
  openVoting(
    @Param('id') id: string,
    @Headers('x-tenant-id') tenantId: string,
  ) {
    if (!tenantId) throw new BadRequestException('X-Tenant-Id header is required');
    return this.service.openVoting(id, tenantId);
  }

  /**
   * POST /elections/:id/voting/close
   * ACTIVE → TALLYING — polls close.
   * CRITICAL: Requires X-User-Id (injected by API Gateway after JWT validation).
   */
  @Post('elections/:id/voting/close')
  @HttpCode(HttpStatus.OK)
  closePolls(
    @Param('id') id: string,
    @Headers('x-user-id') userId: string,
  ) {
    if (!userId) throw new BadRequestException('X-User-Id header is required (must be authenticated)');
    this.logger.log(`closePolls: election=${id} by user=${userId}`);
    return this.service.closePolls(id);
  }

  /**
   * POST /elections/:id/results/publish
   * TALLYING → RESULTS_PUBLISHED — official results published.
   * AI ASSISTS, HUMANS DECIDE.
   * CRITICAL: Requires X-User-Id (injected by API Gateway after JWT validation).
   */
  @Post('elections/:id/results/publish')
  @HttpCode(HttpStatus.OK)
  publishResults(
    @Param('id') id: string,
    @Headers('x-user-id') userId: string,
  ) {
    if (!userId) throw new BadRequestException('X-User-Id header is required (must be authenticated)');
    this.logger.log(`publishResults: election=${id} by user=${userId}`);
    return this.service.publishResults(id);
  }

  /**
   * POST /elections/:id/close
   * RESULTS_PUBLISHED → CLOSED — archive.
   * CRITICAL: Requires X-User-Id (injected by API Gateway after JWT validation).
   */
  @Post('elections/:id/close')
  @HttpCode(HttpStatus.OK)
  closeElection(
    @Param('id') id: string,
    @Headers('x-user-id') userId: string,
  ) {
    if (!userId) throw new BadRequestException('X-User-Id header is required (must be authenticated)');
    this.logger.log(`closeElection: election=${id} by user=${userId}`);
    return this.service.closeElection(id);
  }

  /**
   * POST /elections/:id/cancel
   * Any → CANCELLED — emergency cancellation.
   * CRITICAL: Requires X-User-Id (injected by API Gateway after JWT validation).
   */
  @Post('elections/:id/cancel')
  @HttpCode(HttpStatus.OK)
  cancelElection(
    @Param('id') id: string,
    @Body('reason') reason: string | undefined,
    @Headers('x-user-id') userId: string,
  ) {
    if (!userId) throw new BadRequestException('X-User-Id header is required (must be authenticated)');
    this.logger.log(`cancelElection: election=${id} by user=${userId} reason=${reason ?? 'none'}`);
    return this.service.cancelElection(id, reason);
  }

  // ── IEBC Spending Limits (Campaign Financing Act, 2013) ──────

  /**
   * GET /iebc-limits
   * Return IEBC gazette spending limit for a given position + geography.
   * Query: position (GOVERNOR|SENATOR|WOMEN_REP|MP|MCA|PRESIDENT)
   *        countyCode (3-digit NEC code, e.g. 047)
   *        constituencyCode (3-digit NEC code, optional — required for MP/MCA)
   *
   * Source: IEBC Gazette Notice No. 12251, 7th August 2026
   */
  @Get('iebc-limits')
  getIEBCLimit(
    @Query('position')          position:          string,
    @Query('countyCode')        countyCode:         string,
    @Query('constituencyCode')  constituencyCode?:  string,
  ) {
    return this.service.getIEBCLimit(position, countyCode, constituencyCode);
  }

  /**
   * GET /iebc-categories
   * Return all 11 IEBC authorized spending categories with party-level limits.
   * Used by budget planner to suggest category allocations.
   */
  @Get('iebc-categories')
  getIEBCCategories() {
    return this.service.getIEBCCategories();
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
