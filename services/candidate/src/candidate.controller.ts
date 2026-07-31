// ============================================================
// VoteCapsule™ — Candidate Controller
// candidate-service/src/candidate.controller.ts
//
// REST API for election management, candidate registration,
// and ballot reference data.
//
// All geography is stored as NEC iebc_codes.
// Geography Service resolves names on demand.
// ============================================================
import {
  Controller, Get, Post, Patch, Param, Body, Query,
  Headers, HttpCode, HttpStatus, ParseUUIDPipe,
  BadRequestException, Logger,
} from '@nestjs/common';
import { CandidateService }           from './candidate.service';
import { CreateElectionDto }          from './dto/create-election.dto';
import { CreatePositionDto }          from './dto/create-position.dto';
import { CreatePartyDto }             from './dto/create-party.dto';
import { RegisterCandidateDto }       from './dto/register-candidate.dto';
import { UpdateCandidateStatusDto }   from './dto/update-candidate-status.dto';
import { CreateBallotRefDto }         from './dto/create-ballot-ref.dto';
import { ElectionStatus }             from './entities/election.entity';
import { CandidateStatus }            from './entities/candidate.entity';

@Controller('candidates')
export class CandidateController {
  private readonly logger = new Logger(CandidateController.name);

  constructor(private readonly service: CandidateService) {}

  // ══════════════════════════════════════════════════════════
  //  ELECTIONS
  // ══════════════════════════════════════════════════════════

  /**
   * POST /candidates/elections
   * Create a new election.
   * Header: X-Tenant-Id, X-User-Id
   */
  @Post('elections')
  @HttpCode(HttpStatus.CREATED)
  async createElection(
    @Body() dto: CreateElectionDto,
    @Headers('x-tenant-id') tenantId: string,
    @Headers('x-user-id')   userId:   string,
  ) {
    if (!tenantId) throw new BadRequestException('X-Tenant-Id header is required');
    if (!userId)   throw new BadRequestException('X-User-Id header is required');
    return this.service.createElection(dto, tenantId, userId);
  }

  /**
   * GET /candidates/elections
   * List elections. Filter by tenantId via query param.
   */
  @Get('elections')
  async listElections(@Query('tenantId') tenantId?: string) {
    return this.service.listElections(tenantId);
  }

  /**
   * GET /candidates/elections/active
   * Returns the currently active election for a tenant.
   * Header: X-Tenant-Id
   */
  @Get('elections/active')
  async getActiveElection(@Headers('x-tenant-id') tenantId: string) {
    if (!tenantId) throw new BadRequestException('X-Tenant-Id header is required');
    return this.service.getActiveElection(tenantId);
  }

  /**
   * GET /candidates/elections/:id
   */
  @Get('elections/:id')
  async getElection(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.getElection(id);
  }

  /**
   * PATCH /candidates/elections/:id/activate
   * Marks this election as active, deactivates all others for the tenant.
   * Header: X-Tenant-Id
   */
  @Patch('elections/:id/activate')
  async activateElection(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('x-tenant-id') tenantId: string,
  ) {
    if (!tenantId) throw new BadRequestException('X-Tenant-Id header is required');
    return this.service.activateElection(id, tenantId);
  }

  /**
   * PATCH /candidates/elections/:id/status
   * Update election status (PLANNING → NOMINATION → CAMPAIGN → ACTIVE → CLOSED).
   */
  @Patch('elections/:id/status')
  async updateElectionStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('status') status: ElectionStatus,
  ) {
    if (!status) throw new BadRequestException('status is required');
    return this.service.updateElectionStatus(id, status);
  }

  // ══════════════════════════════════════════════════════════
  //  POSITIONS
  // ══════════════════════════════════════════════════════════

  /**
   * POST /candidates/elections/:electionId/positions
   * Create a position for an election.
   */
  @Post('elections/:electionId/positions')
  @HttpCode(HttpStatus.CREATED)
  async createPosition(
    @Param('electionId', ParseUUIDPipe) electionId: string,
    @Body() dto: CreatePositionDto,
  ) {
    return this.service.createPosition(electionId, dto);
  }

  /**
   * GET /candidates/elections/:electionId/positions
   * List positions for an election.
   * Query: countyCode (optional — filter by county scope)
   */
  @Get('elections/:electionId/positions')
  async listPositions(
    @Param('electionId', ParseUUIDPipe) electionId: string,
    @Query('countyCode') countyCode?: string,
  ) {
    return this.service.listPositionsByElection(electionId, countyCode);
  }

  /**
   * GET /candidates/positions/:id
   */
  @Get('positions/:id')
  async getPosition(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.getPosition(id);
  }

  // ══════════════════════════════════════════════════════════
  //  POLITICAL PARTIES
  // ══════════════════════════════════════════════════════════

  /**
   * POST /candidates/parties
   * Register a political party.
   */
  @Post('parties')
  @HttpCode(HttpStatus.CREATED)
  async createParty(@Body() dto: CreatePartyDto) {
    return this.service.createParty(dto);
  }

  /**
   * GET /candidates/parties
   * List parties. Query: countryCode (default KEN), activeOnly (default true)
   */
  @Get('parties')
  async listParties(
    @Query('countryCode') countryCode = 'KEN',
    @Query('activeOnly')  activeOnly: string = 'true',
  ) {
    return this.service.listParties(countryCode, activeOnly !== 'false');
  }

  /**
   * GET /candidates/parties/:id
   */
  @Get('parties/:id')
  async getParty(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.getParty(id);
  }

  /**
   * PATCH /candidates/parties/:id
   * Update a party (logo URL, chairperson, active status, etc.)
   */
  @Patch('parties/:id')
  async updateParty(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updates: Partial<CreatePartyDto>,
  ) {
    return this.service.updateParty(id, updates);
  }

  // ══════════════════════════════════════════════════════════
  //  CANDIDATES
  // ══════════════════════════════════════════════════════════

  /**
   * POST /candidates/register
   * Register a candidate for a position.
   * Header: X-Tenant-Id, X-User-Id
   */
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async registerCandidate(
    @Body() dto: RegisterCandidateDto,
    @Headers('x-tenant-id') tenantId: string,
    @Headers('x-user-id')   userId:   string,
  ) {
    if (!tenantId) throw new BadRequestException('X-Tenant-Id header is required');
    if (!userId)   throw new BadRequestException('X-User-Id header is required');
    return this.service.registerCandidate(dto, tenantId, userId);
  }

  /**
   * GET /candidates
   * List candidates with optional filters.
   * Query: electionId, positionId, partyId, countyCode,
   *        constituencyCode, wardCode, status, tenantId
   */
  @Get()
  async listCandidates(
    @Query('electionId')       electionId?:       string,
    @Query('positionId')       positionId?:       string,
    @Query('partyId')          partyId?:          string,
    @Query('countyCode')       countyCode?:       string,
    @Query('constituencyCode') constituencyCode?: string,
    @Query('wardCode')         wardCode?:         string,
    @Query('status')           status?:           string,
    @Query('tenantId')         tenantId?:         string,
  ) {
    return this.service.listCandidates({
      electionId,
      positionId,
      partyId,
      countyCode,
      constituencyCode,
      wardCode,
      status: status as CandidateStatus | undefined,
      tenantId,
    });
  }

  /**
   * GET /candidates/:id
   * Get full candidate detail with relations.
   */
  @Get(':id')
  async getCandidate(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.getCandidate(id);
  }

  /**
   * PATCH /candidates/:id/status
   * Update candidate status (NOMINATED, APPROVED, WITHDRAWN, DISQUALIFIED).
   * AI ASSISTS, HUMANS DECIDE — no automated disqualification.
   * Header: X-User-Id (the election official making the change)
   */
  @Patch(':id/status')
  async updateCandidateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCandidateStatusDto,
    @Headers('x-user-id') userId: string,
  ) {
    if (!userId) throw new BadRequestException('X-User-Id header is required');
    return this.service.updateCandidateStatus(id, dto, userId);
  }

  /**
   * GET /candidates/:id/history
   * Get immutable status history for a candidate.
   * Accessible to observers, legal teams, and media.
   */
  @Get(':id/history')
  async getCandidateHistory(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.getCandidateStatusHistory(id);
  }

  // ══════════════════════════════════════════════════════════
  //  BALLOT REFERENCES (AI cross-validation data)
  // ══════════════════════════════════════════════════════════

  /**
   * POST /candidates/ballot-refs
   * Create a ballot reference record.
   * Called by Election Authority when ballot is printed.
   */
  @Post('ballot-refs')
  @HttpCode(HttpStatus.CREATED)
  async createBallotRef(@Body() dto: CreateBallotRefDto) {
    return this.service.createBallotRef(dto);
  }

  /**
   * GET /candidates/ballot-refs/by-position/:positionId
   * Returns ballot references for a position, ordered by ballot number.
   * Query: iebcStationCode (optional — station-specific overrides)
   *
   * PRIMARY CONSUMER: AI Verification Service uses this to cross-validate
   * OCR-extracted candidate names and ballot numbers from Form 35A.
   */
  @Get('ballot-refs/by-position/:positionId')
  async getBallotRefsForPosition(
    @Param('positionId', ParseUUIDPipe) positionId: string,
    @Query('iebcStationCode')           stationCode?: string,
  ) {
    return this.service.getBallotRefsForPosition(positionId, stationCode);
  }

  // ══════════════════════════════════════════════════════════
  //  STATS
  // ══════════════════════════════════════════════════════════

  /**
   * GET /candidates/stats
   * Returns candidate counts by status and position.
   * Query: electionId (optional)
   */
  @Get('stats')
  async getStats(@Query('electionId') electionId?: string) {
    return this.service.getStats(electionId);
  }
}
