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
  // ══════════════════════════════════════════════════════════
  //  PARTY NOMINATION ELECTIONS
  //
  //  Political parties use VoteCapsule™ to run internal
  //  nominations with the same evidence capture + reconciliation
  //  as the General Election — full auditability and integrity.
  // ══════════════════════════════════════════════════════════

  /**
   * POST /candidates/nominations
   * Create a Party Nomination election linked to a General Election.
   * Tenant = the political party.
   * Header: X-Tenant-Id (party tenant), X-User-Id, X-Party-Id
   */
  @Post('nominations')
  @HttpCode(HttpStatus.CREATED)
  async createPartyNomination(
    @Body() dto: {
      partyId: string;
      parentElectionId: string;
      name: string;
      electionYear: number;
      nominationOpenDate?: string;
      nominationVotingDate?: string;
      nominationDeadline?: string;
      nominationFeeKes?: number;
      maxCandidatesPerPosition?: number;
      description?: string;
    },
    @Headers('x-tenant-id') tenantId: string,
    @Headers('x-user-id')   userId:   string,
  ) {
    if (!tenantId) throw new BadRequestException('X-Tenant-Id header is required');
    if (!userId)   throw new BadRequestException('X-User-Id header is required');
    return this.service.createPartyNomination({ ...dto, tenantId }, userId);
  }

  /**
   * GET /candidates/nominations?parentElectionId=xxx
   * List all party nomination elections for a given general election.
   * Used by admin portal to see all parties' nominations.
   */
  @Get('nominations')
  async listPartyNominations(
    @Query('parentElectionId') parentElectionId?: string,
    @Headers('x-tenant-id') tenantId?: string,
  ) {
    if (parentElectionId) {
      return this.service.listPartyNominations(parentElectionId);
    }
    if (tenantId) {
      return this.service.listPartyNominationsForTenant(tenantId);
    }
    throw new BadRequestException('Either parentElectionId query param or X-Tenant-Id header is required');
  }

  /**
   * POST /candidates/nominations/:id/declare-winner
   * Declare the winner of a party nomination for a specific candidate.
   * Sets nominationWon=TRUE on winner, FALSE on all other candidates for same position.
   * Header: X-User-Id (party official declaring the result)
   */
  @Post('nominations/:id/declare-winner')
  @HttpCode(HttpStatus.OK)
  async declareNominationWinner(
    @Param('id') nominationElectionId: string,
    @Body('candidateId') candidateId: string,
    @Headers('x-user-id') userId: string,
  ) {
    if (!candidateId) throw new BadRequestException('candidateId is required in body');
    if (!userId)      throw new BadRequestException('X-User-Id header is required');
    return this.service.declareNominationWinner(nominationElectionId, candidateId, userId);
  }

  /**
   * POST /candidates/nominations/promote/:candidateId
   * Promote a nomination winner to the parent General Election
   * as a PARTY_SPONSORED candidate.
   *
   * Creates a new candidate in the General Election with:
   *   - sponsorshipType = PARTY_SPONSORED
   *   - status = PENDING_NOMINATION (still needs IEBC approval)
   *
   * Header: X-User-Id (party official)
   */
  @Post('nominations/promote/:candidateId')
  @HttpCode(HttpStatus.CREATED)
  async promoteNominationWinner(
    @Param('candidateId', ParseUUIDPipe) candidateId: string,
    @Headers('x-user-id') userId: string,
  ) {
    if (!userId) throw new BadRequestException('X-User-Id header is required');
    return this.service.promoteNominationWinner(candidateId, userId);
  }

  // ── General election creation ─────────────────────────────

  /**
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
   * Generic status update — validates transitions server-side.
   * Prefer the named lifecycle endpoints below for clarity.
   * CRITICAL: Requires X-User-Id.
   */
  @Patch('elections/:id/status')
  async updateElectionStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('status') status: ElectionStatus,
    @Headers('x-user-id') userId: string,
  ) {
    if (!status) throw new BadRequestException('status is required');
    if (!userId) throw new BadRequestException('X-User-Id header is required (must be authenticated)');
    this.logger.log(`updateElectionStatus: election=${id} status=${status} by user=${userId}`);
    return this.service.updateElectionStatus(id, status);
  }

  // ── Named lifecycle transitions ───────────────────────────

  /**
   * POST /candidates/elections/:id/nominations/open
   * PLANNING → NOMINATION — opens the candidate registration window.
   * CRITICAL: Requires X-User-Id (API Gateway injects after JWT validation).
   */
  @Post('elections/:id/nominations/open')
  @HttpCode(HttpStatus.OK)
  async openNominations(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('x-user-id') userId: string,
  ) {
    if (!userId) throw new BadRequestException('X-User-Id header is required (must be authenticated)');
    this.logger.log(`openNominations: election=${id} by user=${userId}`);
    return this.service.openNominations(id);
  }

  /**
   * POST /candidates/elections/:id/campaign/open
   * NOMINATION → CAMPAIGN — nominations close, campaigning begins.
   * CRITICAL: Requires X-User-Id.
   */
  @Post('elections/:id/campaign/open')
  @HttpCode(HttpStatus.OK)
  async openCampaign(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('x-user-id') userId: string,
  ) {
    if (!userId) throw new BadRequestException('X-User-Id header is required (must be authenticated)');
    this.logger.log(`openCampaign: election=${id} by user=${userId}`);
    return this.service.openCampaign(id);
  }

  /**
   * POST /candidates/elections/:id/voting/open
   * CAMPAIGN → ACTIVE — voting day begins, evidence capture opens.
   * Header: X-Tenant-Id, X-User-Id required.
   */
  @Post('elections/:id/voting/open')
  @HttpCode(HttpStatus.OK)
  async openVoting(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('x-tenant-id') tenantId: string,
    @Headers('x-user-id')   userId: string,
  ) {
    if (!tenantId) throw new BadRequestException('X-Tenant-Id header is required');
    if (!userId)   throw new BadRequestException('X-User-Id header is required (must be authenticated)');
    this.logger.log(`openVoting: election=${id} by user=${userId}`);
    return this.service.openVoting(id, tenantId);
  }

  /**
   * POST /candidates/elections/:id/voting/close
   * ACTIVE → TALLYING — polls close, counting begins.
   * CRITICAL: Requires X-User-Id.
   */
  @Post('elections/:id/voting/close')
  @HttpCode(HttpStatus.OK)
  async closePolls(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('x-user-id') userId: string,
  ) {
    if (!userId) throw new BadRequestException('X-User-Id header is required (must be authenticated)');
    this.logger.log(`closePolls: election=${id} by user=${userId}`);
    return this.service.closePolls(id);
  }

  /**
   * POST /candidates/elections/:id/results/publish
   * TALLYING → RESULTS_PUBLISHED — official results published.
   * AI ASSISTS, HUMANS DECIDE.
   * CRITICAL: Requires X-User-Id.
   */
  @Post('elections/:id/results/publish')
  @HttpCode(HttpStatus.OK)
  async publishResults(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('x-user-id') userId: string,
  ) {
    if (!userId) throw new BadRequestException('X-User-Id header is required (must be authenticated)');
    this.logger.log(`publishResults: election=${id} by user=${userId}`);
    return this.service.publishResults(id);
  }

  /**
   * POST /candidates/elections/:id/close
   * RESULTS_PUBLISHED → CLOSED — archive the election.
   * CRITICAL: Requires X-User-Id.
   */
  @Post('elections/:id/close')
  @HttpCode(HttpStatus.OK)
  async closeElection(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('x-user-id') userId: string,
  ) {
    if (!userId) throw new BadRequestException('X-User-Id header is required (must be authenticated)');
    this.logger.log(`closeElection: election=${id} by user=${userId}`);
    return this.service.closeElection(id);
  }

  /**
   * POST /candidates/elections/:id/cancel
   * Any state → CANCELLED. Provide reason in body.
   * CRITICAL: Requires X-User-Id.
   */
  @Post('elections/:id/cancel')
  @HttpCode(HttpStatus.OK)
  async cancelElection(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('reason') reason: string | undefined,
    @Headers('x-user-id') userId: string,
  ) {
    if (!userId) throw new BadRequestException('X-User-Id header is required (must be authenticated)');
    this.logger.log(`cancelElection: election=${id} by user=${userId} reason=${reason ?? 'none'}`);
    return this.service.cancelElection(id, reason);
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

  // ── Named approval workflow endpoints ────────────────────

  /**
   * POST /candidates/:id/nominate
   * PENDING_NOMINATION → NOMINATED
   * Records receipt of nomination papers by election authority.
   * Header: X-User-Id (election official)
   */
  @Post(':id/nominate')
  @HttpCode(HttpStatus.OK)
  async nominateCandidate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('gazetteReference')   gazetteReference: string,
    @Headers('x-user-id')       userId: string,
  ) {
    if (!userId) throw new BadRequestException('X-User-Id header is required');
    return this.service.nominateCandidate(id, userId, gazetteReference);
  }

  /**
   * POST /candidates/:id/approve
   * NOMINATED → APPROVED
   * Clears candidate for ballot. AI ASSISTS, HUMANS DECIDE.
   * Header: X-User-Id (election authority official)
   */
  @Post(':id/approve')
  @HttpCode(HttpStatus.OK)
  async approveCandidate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('gazetteReference')   gazetteReference: string,
    @Headers('x-user-id')       userId: string,
  ) {
    if (!userId) throw new BadRequestException('X-User-Id header is required');
    return this.service.approveCandidate(id, userId, gazetteReference);
  }

  /**
   * POST /candidates/:id/disqualify
   * NOMINATED|APPROVED → DISQUALIFIED
   * Reason and gazette reference required for legal record.
   * Header: X-User-Id (election authority official)
   */
  @Post(':id/disqualify')
  @HttpCode(HttpStatus.OK)
  async disqualifyCandidate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('reason')           reason: string,
    @Body('gazetteReference') gazetteReference: string,
    @Headers('x-user-id')     userId: string,
  ) {
    if (!userId) throw new BadRequestException('X-User-Id header is required');
    return this.service.disqualifyCandidate(id, userId, reason, gazetteReference);
  }

  /**
   * POST /candidates/:id/withdraw
   * PENDING_NOMINATION|NOMINATED|APPROVED → WITHDRAWN
   * Can be self-requested or authority-initiated.
   * Header: X-User-Id
   */
  @Post(':id/withdraw')
  @HttpCode(HttpStatus.OK)
  async withdrawCandidate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('reason')         reason?: string,
    @Body('withdrawalDate') withdrawalDate?: string,
    @Headers('x-user-id')   userId?: string,
  ) {
    if (!userId) throw new BadRequestException('X-User-Id header is required');
    return this.service.withdrawCandidate(id, userId, reason, withdrawalDate);
  }

  /**
   * POST /candidates/:id/elect
   * APPROVED → ELECTED — records official election result.
   * AI ASSISTS, HUMANS DECIDE.
   * Header: X-User-Id (election authority official)
   */
  @Post(':id/elect')
  @HttpCode(HttpStatus.OK)
  async electCandidate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('gazetteReference')   gazetteReference: string,
    @Headers('x-user-id')       userId: string,
  ) {
    if (!userId) throw new BadRequestException('X-User-Id header is required');
    return this.service.electCandidate(id, userId, gazetteReference);
  }

  /**
   * POST /candidates/:id/not-elected
   * APPROVED → NOT_ELECTED — records losing result.
   * Header: X-User-Id
   */
  @Post(':id/not-elected')
  @HttpCode(HttpStatus.OK)
  async markNotElected(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('gazetteReference')   gazetteReference: string,
    @Headers('x-user-id')       userId: string,
  ) {
    if (!userId) throw new BadRequestException('X-User-Id header is required');
    return this.service.markCandidateNotElected(id, userId, gazetteReference);
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
   * CRITICAL: Requires X-User-Id (election authority official).
   */
  @Post('ballot-refs')
  @HttpCode(HttpStatus.CREATED)
  async createBallotRef(
    @Body() dto: CreateBallotRefDto,
    @Headers('x-user-id') userId: string,
  ) {
    if (!userId) throw new BadRequestException('X-User-Id header is required (must be authenticated)');
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
