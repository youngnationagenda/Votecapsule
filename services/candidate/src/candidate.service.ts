// ============================================================
// VoteCapsule™ — Candidate Service Business Logic
// candidate-service/src/candidate.service.ts
//
// Manages the complete candidate lifecycle:
//   Elections → Positions → Parties → Candidates → Ballot refs
//
// Geography: All geography resolution goes through the Geography
// Service (NEC SSoT). This service stores iebc_codes only.
// ============================================================
import {
  Injectable, Logger, NotFoundException,
  ConflictException, BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, FindOptionsWhere } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom, timeout, catchError, of } from 'rxjs';

import { Election, ElectionStatus, ElectionType } from './entities/election.entity';
import { ElectionPosition }                     from './entities/election-position.entity';
import { PoliticalParty }                       from './entities/political-party.entity';
import { Candidate, CandidateStatus }           from './entities/candidate.entity';
import { CandidateStatusLog }                   from './entities/candidate-status-log.entity';
import { CandidateBallotRef }                   from './entities/candidate-ballot-ref.entity';

import { CreateElectionDto }           from './dto/create-election.dto';
import { CreatePositionDto }           from './dto/create-position.dto';
import { CreatePartyDto }              from './dto/create-party.dto';
import { RegisterCandidateDto }        from './dto/register-candidate.dto';
import { UpdateCandidateStatusDto }    from './dto/update-candidate-status.dto';
import { CreateBallotRefDto }          from './dto/create-ballot-ref.dto';

const HTTP_TIMEOUT = 5_000;

@Injectable()
export class CandidateService {
  private readonly logger = new Logger(CandidateService.name);
  private readonly geographyBaseUrl: string;

  constructor(
    @InjectRepository(Election)
    private readonly electionRepo: Repository<Election>,

    @InjectRepository(ElectionPosition)
    private readonly positionRepo: Repository<ElectionPosition>,

    @InjectRepository(PoliticalParty)
    private readonly partyRepo: Repository<PoliticalParty>,

    @InjectRepository(Candidate)
    private readonly candidateRepo: Repository<Candidate>,

    @InjectRepository(CandidateStatusLog)
    private readonly statusLogRepo: Repository<CandidateStatusLog>,

    @InjectRepository(CandidateBallotRef)
    private readonly ballotRefRepo: Repository<CandidateBallotRef>,

    private readonly dataSource:    DataSource,
    private readonly httpService:   HttpService,
    private readonly config:        ConfigService,
  ) {
    this.geographyBaseUrl = config.get(
      'GEOGRAPHY_SERVICE_URL',
      'http://geography-service:3004',
    );
  }

  // ══════════════════════════════════════════════════════════
  //  ELECTIONS
  // ══════════════════════════════════════════════════════════

  async createElection(dto: CreateElectionDto, tenantId: string, userId: string): Promise<Election> {
    const election = this.electionRepo.create({
      ...dto,
      tenantId,
      createdBy: userId,
      isActive:  false,
    });
    const saved = await this.electionRepo.save(election);
    this.logger.log(`Election created: ${saved.id} — ${saved.name} (${saved.electionYear})`);
    return saved;
  }

  async getElection(id: string): Promise<Election> {
    const election = await this.electionRepo.findOne({
      where: { id },
      relations: ['positions'],
    });
    if (!election) throw new NotFoundException(`Election ${id} not found`);
    return election;
  }

  async listElections(tenantId?: string): Promise<Election[]> {
    const where: FindOptionsWhere<Election> = {};
    if (tenantId) where.tenantId = tenantId;
    return this.electionRepo.find({
      where,
      order: { electionYear: 'DESC', createdAt: 'DESC' },
    });
  }

  async getActiveElection(tenantId: string): Promise<Election | null> {
    return this.electionRepo.findOne({
      where: { tenantId, isActive: true },
      relations: ['positions'],
    });
  }

  async activateElection(id: string, tenantId: string): Promise<Election> {
    return this.dataSource.transaction(async (manager) => {
      // Deactivate all other elections for this tenant
      await manager.update(Election, { tenantId, isActive: true }, { isActive: false });
      // Activate this one
      const election = await manager.findOne(Election, { where: { id } });
      if (!election) throw new NotFoundException(`Election ${id} not found`);
      if (election.tenantId !== tenantId) {
        throw new BadRequestException('Election does not belong to this tenant');
      }
      election.isActive = true;
      election.status = ElectionStatus.ACTIVE;
      return manager.save(election);
    });
  }

  async updateElectionStatus(id: string, status: ElectionStatus): Promise<Election> {
    const election = await this.getElection(id);
    this.assertValidTransition(election.status, status);
    election.status = status;
    // Keep isActive flag in sync with ACTIVE status
    if (status === ElectionStatus.ACTIVE)             election.isActive = true;
    if (status === ElectionStatus.TALLYING ||
        status === ElectionStatus.RESULTS_PUBLISHED ||
        status === ElectionStatus.CLOSED ||
        status === ElectionStatus.CANCELLED)          election.isActive = false;
    return this.electionRepo.save(election);
  }

  // ── Election lifecycle transition helpers ─────────────────

  /**
   * Valid forward transitions for the Kenya 2027 election lifecycle:
   *
   *   PLANNING → NOMINATION → CAMPAIGN → ACTIVE → TALLYING → RESULTS_PUBLISHED → CLOSED
   *   Any state → CANCELLED  (emergency cancel)
   *   TALLYING → ACTIVE      (reopen polling stations in special circumstances)
   */
  private assertValidTransition(from: ElectionStatus, to: ElectionStatus): void {
    if (to === ElectionStatus.CANCELLED) return; // Always allowed

    const allowed: Partial<Record<ElectionStatus, ElectionStatus[]>> = {
      [ElectionStatus.PLANNING]:          [ElectionStatus.NOMINATION],
      [ElectionStatus.NOMINATION]:        [ElectionStatus.CAMPAIGN],
      [ElectionStatus.CAMPAIGN]:          [ElectionStatus.ACTIVE],
      [ElectionStatus.ACTIVE]:            [ElectionStatus.TALLYING],
      [ElectionStatus.TALLYING]:          [ElectionStatus.RESULTS_PUBLISHED, ElectionStatus.ACTIVE],
      [ElectionStatus.RESULTS_PUBLISHED]: [ElectionStatus.CLOSED],
      [ElectionStatus.CLOSED]:            [],
      [ElectionStatus.CANCELLED]:         [],
    };

    const validNext = allowed[from] ?? [];
    if (!validNext.includes(to)) {
      throw new BadRequestException(
        `Invalid status transition: ${from} → ${to}. ` +
        `Allowed next states from ${from}: [${validNext.join(', ') || 'none'}]`
      );
    }
  }

  /**
   * Open the nomination period — PLANNING → NOMINATION
   */
  async openNominations(id: string): Promise<Election> {
    return this.updateElectionStatus(id, ElectionStatus.NOMINATION);
  }

  /**
   * Open the campaign period — NOMINATION → CAMPAIGN
   */
  async openCampaign(id: string): Promise<Election> {
    return this.updateElectionStatus(id, ElectionStatus.CAMPAIGN);
  }

  /**
   * Open voting day — CAMPAIGN → ACTIVE
   * Also deactivates all other elections for the tenant.
   */
  async openVoting(id: string, tenantId: string): Promise<Election> {
    return this.dataSource.transaction(async (manager) => {
      await manager.update(Election, { tenantId, isActive: true }, { isActive: false });
      const election = await manager.findOne(Election, { where: { id } });
      if (!election) throw new NotFoundException(`Election ${id} not found`);
      if (election.tenantId !== tenantId) throw new BadRequestException('Tenant mismatch');
      this.assertValidTransition(election.status, ElectionStatus.ACTIVE);
      election.status   = ElectionStatus.ACTIVE;
      election.isActive = true;
      return manager.save(election);
    });
  }

  /**
   * Close polls and begin tallying — ACTIVE → TALLYING
   */
  async closePolls(id: string): Promise<Election> {
    return this.updateElectionStatus(id, ElectionStatus.TALLYING);
  }

  /**
   * Publish official results — TALLYING → RESULTS_PUBLISHED
   */
  async publishResults(id: string): Promise<Election> {
    return this.updateElectionStatus(id, ElectionStatus.RESULTS_PUBLISHED);
  }

  /**
   * Archive the election — RESULTS_PUBLISHED → CLOSED
   */
  async closeElection(id: string): Promise<Election> {
    return this.updateElectionStatus(id, ElectionStatus.CLOSED);
  }

  /**
   * Emergency cancel — any state → CANCELLED
   */
  async cancelElection(id: string, reason?: string): Promise<Election> {
    const election = await this.getElection(id);
    if (election.status === ElectionStatus.CLOSED) {
      throw new BadRequestException('Cannot cancel a closed election');
    }
    election.status   = ElectionStatus.CANCELLED;
    election.isActive = false;
    if (reason) {
      election.description = `[CANCELLED: ${reason}] ${election.description ?? ''}`.trim();
    }
    return this.electionRepo.save(election);
  }

  // ══════════════════════════════════════════════════════════
  //  PARTY NOMINATION ELECTIONS
  //
  //  VALUE PROPOSITION: Political parties can use VoteCapsule™
  //  to run their internal nominations using the same rigorous
  //  evidence capture + reconciliation as the General Election.
  //  Nominations become auditable, transparent, and tamper-proof.
  //
  //  Flow:
  //    1. Party creates PARTY_NOMINATION election linked to GENERAL
  //    2. Party members register as candidates (sponsorshipType=SELF_SPONSORED)
  //    3. Nomination election runs through full lifecycle
  //    4. Results declared → winner marked nominationWon=TRUE
  //    5. Party promotes winner to GENERAL election (PARTY_SPONSORED)
  //    6. IEBC approves promoted candidate in GENERAL election
  // ══════════════════════════════════════════════════════════

  /**
   * Create a Party Nomination election linked to a General Election.
   * Only PARTY_NOMINATION type — GENERAL elections are created separately.
   */
  async createPartyNomination(
    dto: {
      tenantId:                string;
      partyId:                 string;
      parentElectionId:        string;  // The GENERAL election this feeds
      name:                    string;
      electionYear:            number;
      nominationOpenDate?:     string;
      nominationVotingDate?:   string;
      nominationDeadline?:     string;
      nominationFeeKes?:       number;
      maxCandidatesPerPosition?: number;
      description?:            string;
    },
    createdByUserId: string,
  ): Promise<Election> {
    // Verify parent election exists and is GENERAL type
    const parent = await this.getElection(dto.parentElectionId);
    if (parent.electionType !== ElectionType.GENERAL) {
      throw new BadRequestException(
        'Party nominations must be linked to a GENERAL election as parent.'
      );
    }

    const nomination = this.electionRepo.create({
      tenantId:                  dto.tenantId,
      name:                      dto.name,
      electionType:              ElectionType.PARTY_NOMINATION,
      electionYear:              dto.electionYear,
      nominationDeadline:        dto.nominationDeadline ? new Date(dto.nominationDeadline) : null,
      nominationVotingDate:      dto.nominationVotingDate ? new Date(dto.nominationVotingDate) : null,
      partyId:                   dto.partyId,
      parentElectionId:          dto.parentElectionId,
      nominationFeeKes:          dto.nominationFeeKes ?? 0,
      maxCandidatesPerPosition:  dto.maxCandidatesPerPosition ?? null,
      description:               dto.description ?? null,
      status:                    ElectionStatus.PLANNING,
      isActive:                  false,
      resultsPublic:             false,
      createdBy:                 createdByUserId,
    });

    const saved = await this.electionRepo.save(nomination);
    this.logger.log(
      `Party Nomination created: ${saved.id} — "${dto.name}" by party ${dto.partyId} ` +
      `linked to General Election ${dto.parentElectionId}`
    );
    return saved;
  }

  /**
   * List all party nomination elections for a given general election.
   * Used by admin portal to see all parties' nominations.
   */
  async listPartyNominations(parentElectionId: string): Promise<Election[]> {
    return this.electionRepo.find({
      where: {
        parentElectionId,
        electionType: ElectionType.PARTY_NOMINATION,
      },
      order: { createdAt: 'ASC' },
    });
  }

  /**
   * List party nominations for a specific party tenant.
   * Used by party portal to manage their own nominations.
   */
  async listPartyNominationsForTenant(tenantId: string): Promise<Election[]> {
    return this.electionRepo.find({
      where: {
        tenantId,
        electionType: ElectionType.PARTY_NOMINATION,
      },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Declare a nomination winner for a specific position in a
   * PARTY_NOMINATION election. Sets nominationWon=TRUE on winner,
   * nominationWon=FALSE on all other candidates for that position.
   *
   * This does NOT auto-promote — call promoteNominationWinner() next.
   */
  async declareNominationWinner(
    nominationElectionId: string,
    winnerId:             string,
    declaredBy:           string,
  ): Promise<{ winner: Candidate; losers: Candidate[] }> {
    const election = await this.getElection(nominationElectionId);
    if (election.electionType !== ElectionType.PARTY_NOMINATION) {
      throw new BadRequestException('declareNominationWinner only works on PARTY_NOMINATION elections');
    }
    if (!['RESULTS_PUBLISHED', 'TALLYING', 'CLOSED'].includes(election.status)) {
      throw new BadRequestException(
        `Cannot declare winner — election status is ${election.status}. ` +
        `Must be in TALLYING, RESULTS_PUBLISHED, or CLOSED state.`
      );
    }

    const winner = await this.getCandidate(winnerId);
    if (winner.electionId !== nominationElectionId) {
      throw new BadRequestException('Candidate does not belong to this nomination election');
    }

    // Get all candidates for the same position
    const siblings = await this.candidateRepo.find({
      where: { electionId: nominationElectionId, positionId: winner.positionId },
    });

    return this.dataSource.transaction(async (manager) => {
      const updatedWinner = await manager.save(Candidate, {
        ...winner,
        nominationWon: true,
        status: CandidateStatus.ELECTED,
      });

      await manager.save(CandidateStatusLog, {
        candidateId: winner.id,
        fromStatus:  winner.status,
        toStatus:    CandidateStatus.ELECTED,
        changedBy:   declaredBy,
        reason:      `Declared winner of party nomination for ${winner.position?.positionCode ?? 'position'}`,
      });

      const losers: Candidate[] = [];
      for (const sibling of siblings) {
        if (sibling.id === winner.id) continue;
        if (sibling.status === CandidateStatus.WITHDRAWN || sibling.status === CandidateStatus.DISQUALIFIED) continue;

        const updated = await manager.save(Candidate, {
          ...sibling,
          nominationWon: false,
          status: CandidateStatus.NOT_ELECTED,
        });
        losers.push(updated);
      }

      this.logger.log(
        `Nomination winner declared: ${winner.fullName} (${winner.id}) ` +
        `in election ${nominationElectionId}. Losers: ${losers.length}`
      );
      return { winner: updatedWinner, losers };
    });
  }

  /**
   * Promote a nomination winner to the parent GENERAL election
   * as a PARTY_SPONSORED candidate.
   *
   * Creates a new Candidate record in the GENERAL election with:
   *   - sponsorshipType = PARTY_SPONSORED
   *   - nominationElectionId → source nomination
   *   - promotedFromCandidateId → original nomination candidate
   *   - status = PENDING_NOMINATION (still needs IEBC approval)
   *
   * Enforces: max 1 party-sponsored candidate per party per position per election.
   */
  async promoteNominationWinner(
    nominationCandidateId: string,
    promotedBy:            string,
  ): Promise<Candidate> {
    const nomCandidate = await this.getCandidate(nominationCandidateId);
    if (!nomCandidate.nominationWon) {
      throw new BadRequestException('Only nomination winners can be promoted to the General Election');
    }

    const nominationElection = await this.getElection(nomCandidate.electionId);
    if (nominationElection.electionType !== ElectionType.PARTY_NOMINATION) {
      throw new BadRequestException('Source election must be a PARTY_NOMINATION');
    }
    if (!nominationElection.parentElectionId) {
      throw new BadRequestException('Nomination election has no parent General Election configured');
    }

    const generalElection = await this.getElection(nominationElection.parentElectionId);

    // Enforce uniqueness: check no other PARTY_SPONSORED candidate from same party + position
    const existingPromotion = await this.candidateRepo.findOne({
      where: {
        electionId:       generalElection.id,
        positionId:       nomCandidate.positionId,
        partyId:          nomCandidate.partyId ?? undefined,
        sponsorshipType:  'PARTY_SPONSORED',
      },
    });
    if (existingPromotion) {
      throw new BadRequestException(
        `Party already has a sponsored candidate for this position in the General Election. ` +
        `Candidate: ${existingPromotion.fullName} (${existingPromotion.id})`
      );
    }

    // Find matching position in the general election
    // positionCode and geographicLevel live on the ElectionPosition entity, not Candidate
    const nomPosition = nomCandidate.position;
    const generalPosition = await this.positionRepo.findOne({
      where: {
        electionId:   generalElection.id,
        positionCode: nomPosition?.positionCode ?? undefined,
        countyCode:   nomCandidate.countyCode   ?? undefined,
        constituencyCode: nomCandidate.constituencyCode ?? undefined,
        wardCode:     nomCandidate.wardCode     ?? undefined,
      },
    });
    if (!generalPosition) {
      throw new BadRequestException(
        `No matching position found in the General Election for ${nomPosition?.positionCode ?? 'unknown'} ` +
        `in constituency ${nomCandidate.constituencyCode ?? nomCandidate.countyCode}. ` +
        `Ensure the General Election has positions seeded (run migration 021).`
      );
    }

    // Create promoted candidate in general election
    return this.dataSource.transaction(async (manager) => {
      const promoted = manager.create(Candidate, {
        electionId:              generalElection.id,
        positionId:              generalPosition.id,
        partyId:                 nomCandidate.partyId,
        tenantId:                generalElection.tenantId, // IEBC tenant
        fullName:                nomCandidate.fullName,
        shortName:               nomCandidate.shortName,
        nationalId:              nomCandidate.nationalId,
        dateOfBirth:             nomCandidate.dateOfBirth,
        gender:                  nomCandidate.gender,
        // Geography from the candidate (NEC codes)
        countyCode:              nomCandidate.countyCode,
        constituencyCode:        nomCandidate.constituencyCode,
        wardCode:                nomCandidate.wardCode,
        runningMateName:         nomCandidate.runningMateName,
        runningMateNationalId:   nomCandidate.runningMateNationalId,
        gazetteReference:        nomCandidate.gazetteReference,
        photographUrl:           nomCandidate.photographUrl,
        // Promotion metadata
        sponsorshipType:         'PARTY_SPONSORED',
        nominationElectionId:    nominationElection.id,
        promotedFromCandidateId: nomCandidate.id,
        isIndependent:           false,
        status:                  CandidateStatus.PENDING_NOMINATION,
        createdBy:               promotedBy,
      });

      const saved = await manager.save(Candidate, promoted);

      // Status log
      await manager.save(CandidateStatusLog, {
        candidateId: saved.id,
        fromStatus:  null,
        toStatus:    CandidateStatus.PENDING_NOMINATION,
        changedBy:   promotedBy,
        reason:      `Promoted from party nomination election ${nominationElection.id} — ${nominationElection.name}`,
      });

      // Mark the nomination candidate as promoted (store note in gazetteReference field)
      await manager.update(Candidate, nomCandidate.id, {
        gazetteReference: `[PROMOTED to General Election ${generalElection.id}] ${nomCandidate.gazetteReference ?? ''}`.trim(),
      });

      this.logger.log(
        `Nomination winner promoted: ${nomCandidate.fullName} → General Election ${generalElection.id}. ` +
        `New candidate ID: ${saved.id}`
      );

      return saved;
    });
  }

  // ══════════════════════════════════════════════════════════
  //  POSITIONS
  // ══════════════════════════════════════════════════════════

  async createPosition(electionId: string, dto: CreatePositionDto): Promise<ElectionPosition> {
    // Verify election exists
    await this.getElection(electionId);

    // Validate geography codes against NEC SSoT (Geography Service)
    await this.validateGeographyCodes(dto);

    const position = this.positionRepo.create({ ...dto, electionId });
    const saved = await this.positionRepo.save(position);
    this.logger.log(`Position created: ${saved.id} — ${saved.positionCode} for election ${electionId}`);
    return saved;
  }

  async getPosition(id: string): Promise<ElectionPosition> {
    const pos = await this.positionRepo.findOne({
      where: { id },
      relations: ['election'],
    });
    if (!pos) throw new NotFoundException(`Position ${id} not found`);
    return pos;
  }

  async listPositionsByElection(electionId: string, countyCode?: string): Promise<ElectionPosition[]> {
    const where: FindOptionsWhere<ElectionPosition> = { electionId, active: true };
    if (countyCode) where.countyCode = countyCode;
    return this.positionRepo.find({
      where,
      order: { sortOrder: 'ASC', positionCode: 'ASC' },
    });
  }

  // ══════════════════════════════════════════════════════════
  //  POLITICAL PARTIES
  // ══════════════════════════════════════════════════════════

  async createParty(dto: CreatePartyDto): Promise<PoliticalParty> {
    const existing = await this.partyRepo.findOne({ where: { partyCode: dto.partyCode } });
    if (existing) {
      throw new ConflictException(`Party with code "${dto.partyCode}" already exists`);
    }
    const party = this.partyRepo.create(dto);
    const saved = await this.partyRepo.save(party);
    this.logger.log(`Political party created: ${saved.id} — ${saved.partyCode} ${saved.name}`);
    return saved;
  }

  async getParty(id: string): Promise<PoliticalParty> {
    const party = await this.partyRepo.findOne({ where: { id } });
    if (!party) throw new NotFoundException(`Party ${id} not found`);
    return party;
  }

  async listParties(countryCode = 'KEN', activeOnly = true): Promise<PoliticalParty[]> {
    const where: FindOptionsWhere<PoliticalParty> = { countryCode };
    if (activeOnly) where.isActive = true;
    return this.partyRepo.find({ where, order: { name: 'ASC' } });
  }

  async updateParty(id: string, updates: Partial<CreatePartyDto>): Promise<PoliticalParty> {
    const party = await this.getParty(id);
    Object.assign(party, updates);
    return this.partyRepo.save(party);
  }

  // ══════════════════════════════════════════════════════════
  //  CANDIDATES
  // ══════════════════════════════════════════════════════════

  async registerCandidate(
    dto: RegisterCandidateDto,
    tenantId: string,
    userId: string,
  ): Promise<Candidate> {
    // Verify election + position
    const election = await this.getElection(dto.electionId);
    const position = await this.getPosition(dto.positionId);

    if (election.tenantId !== tenantId) {
      throw new BadRequestException('Election does not belong to this tenant');
    }
    if (position.electionId !== dto.electionId) {
      throw new BadRequestException('Position does not belong to this election');
    }

    // Validate geography codes via NEC SSoT
    await this.validateGeographyCodes(dto);

    // Validate running mate requirement
    if (position.isRunningMateRequired && !dto.runningMateName) {
      throw new BadRequestException(`Position "${position.positionCode}" requires a running mate`);
    }

    // Idempotency: check for duplicate national ID in this election+position
    const existing = await this.candidateRepo.findOne({
      where: {
        electionId: dto.electionId,
        positionId: dto.positionId,
        nationalId: dto.nationalId,
      },
    });
    if (existing) {
      throw new ConflictException(
        `Candidate with national ID ${dto.nationalId} already registered for this position`
      );
    }

    const candidate = this.candidateRepo.create({
      ...dto,
      tenantId,
      createdBy: userId,
      status: CandidateStatus.PENDING_NOMINATION,
    });

    return this.dataSource.transaction(async (manager) => {
      const saved = await manager.save(Candidate, candidate);

      // Write initial status log
      await manager.save(CandidateStatusLog, {
        candidateId: saved.id,
        fromStatus:  null,
        toStatus:    CandidateStatus.PENDING_NOMINATION,
        changedBy:   userId,
        reason:      'Initial registration',
      });

      this.logger.log(`Candidate registered: ${saved.id} — ${saved.fullName} for ${position.positionCode}`);
      return saved;
    });
  }

  async getCandidate(id: string): Promise<Candidate> {
    const candidate = await this.candidateRepo.findOne({
      where: { id },
      relations: ['election', 'position', 'party', 'statusLog', 'ballotReferences'],
    });
    if (!candidate) throw new NotFoundException(`Candidate ${id} not found`);
    return candidate;
  }

  async listCandidates(opts: {
    electionId?: string;
    positionId?: string;
    partyId?:    string;
    countyCode?: string;
    constituencyCode?: string;
    wardCode?:   string;
    status?:     CandidateStatus;
    tenantId?:   string;
  }): Promise<Candidate[]> {
    const qb = this.candidateRepo.createQueryBuilder('c')
      .leftJoinAndSelect('c.party',    'party')
      .leftJoinAndSelect('c.position', 'position')
      .orderBy('c.ballotOrder', 'ASC')
      .addOrderBy('c.fullName', 'ASC');

    if (opts.electionId)       qb.andWhere('c.electionId = :electionId',             { electionId:       opts.electionId });
    if (opts.positionId)       qb.andWhere('c.positionId = :positionId',             { positionId:       opts.positionId });
    if (opts.partyId)          qb.andWhere('c.partyId = :partyId',                   { partyId:          opts.partyId });
    if (opts.countyCode)       qb.andWhere('c.countyCode = :countyCode',             { countyCode:       opts.countyCode });
    if (opts.constituencyCode) qb.andWhere('c.constituencyCode = :constituencyCode', { constituencyCode: opts.constituencyCode });
    if (opts.wardCode)         qb.andWhere('c.wardCode = :wardCode',                 { wardCode:         opts.wardCode });
    if (opts.status)           qb.andWhere('c.status = :status',                     { status:           opts.status });
    if (opts.tenantId)         qb.andWhere('c.tenantId = :tenantId',                 { tenantId:         opts.tenantId });

    return qb.getMany();
  }

  async updateCandidateStatus(
    id: string,
    dto: UpdateCandidateStatusDto,
    changedBy: string,
  ): Promise<Candidate> {
    return this.dataSource.transaction(async (manager) => {
      const candidate = await manager.findOne(Candidate, { where: { id } });
      if (!candidate) throw new NotFoundException(`Candidate ${id} not found`);

      const fromStatus = candidate.status;
      candidate.status = dto.status;

      if (dto.status === CandidateStatus.WITHDRAWN && dto.withdrawalDate) {
        candidate.withdrawalDate = new Date(dto.withdrawalDate);
      }
      if (dto.status === CandidateStatus.DISQUALIFIED && dto.reason) {
        candidate.disqualificationReason = dto.reason;
      }
      if (dto.gazetteReference) {
        candidate.gazetteReference = dto.gazetteReference;
      }

      const updated = await manager.save(Candidate, candidate);

      // Write status log — immutable audit trail
      await manager.save(CandidateStatusLog, {
        candidateId: id,
        fromStatus,
        toStatus:    dto.status,
        changedBy,
        reason:      dto.reason ?? null,
        gazetteRef:  dto.gazetteReference ?? null,
      });

      this.logger.log(`Candidate ${id} status: ${fromStatus} → ${dto.status} by ${changedBy}`);
      return updated;
    });
  }

  // ── Named candidate approval workflow methods ────────────

  /**
   * Valid candidate status transitions:
   *
   *   PENDING_NOMINATION → NOMINATED    (authority records receipt)
   *   NOMINATED          → APPROVED     (cleared by Election Authority)
   *   NOMINATED          → DISQUALIFIED (rejected at nomination stage)
   *   APPROVED           → DISQUALIFIED (disqualified post-clearance)
   *   PENDING_NOMINATION → WITHDRAWN    (candidate withdraws before nomination)
   *   NOMINATED          → WITHDRAWN    (candidate withdraws after nomination)
   *   APPROVED           → WITHDRAWN    (candidate withdraws after approval)
   */
  private assertValidCandidateTransition(from: CandidateStatus, to: CandidateStatus): void {
    const allowed: Partial<Record<CandidateStatus, CandidateStatus[]>> = {
      [CandidateStatus.PENDING_NOMINATION]: [CandidateStatus.NOMINATED, CandidateStatus.WITHDRAWN],
      [CandidateStatus.NOMINATED]:          [CandidateStatus.APPROVED, CandidateStatus.DISQUALIFIED, CandidateStatus.WITHDRAWN],
      [CandidateStatus.APPROVED]:           [CandidateStatus.ELECTED, CandidateStatus.NOT_ELECTED, CandidateStatus.DISQUALIFIED, CandidateStatus.WITHDRAWN],
      [CandidateStatus.ELECTED]:            [],  // Terminal — results are immutable
      [CandidateStatus.NOT_ELECTED]:        [],  // Terminal — results are immutable
      [CandidateStatus.WITHDRAWN]:          [],
      [CandidateStatus.DISQUALIFIED]:       [],
    };

    const validNext = allowed[from] ?? [];
    if (!validNext.includes(to)) {
      throw new BadRequestException(
        `Invalid candidate status transition: ${from} → ${to}. ` +
        `Allowed from ${from}: [${validNext.join(', ') || 'none'}]`
      );
    }
  }

  /**
   * Nominate a candidate — records authority receipt of nomination papers.
   * PENDING_NOMINATION → NOMINATED
   */
  async nominateCandidate(id: string, authorityUserId: string, gazetteReference?: string): Promise<Candidate> {
    const dto: UpdateCandidateStatusDto = {
      status:           CandidateStatus.NOMINATED,
      reason:           'Nomination papers received and recorded',
      gazetteReference,
    };
    this.assertValidCandidateTransition(
      (await this.getCandidate(id)).status,
      CandidateStatus.NOMINATED,
    );
    return this.updateCandidateStatus(id, dto, authorityUserId);
  }

  /**
   * Approve a candidate — cleared by Election Authority for ballot.
   * NOMINATED → APPROVED
   * AI ASSISTS, HUMANS DECIDE — final approval is always human.
   */
  async approveCandidate(id: string, authorityUserId: string, gazetteReference?: string): Promise<Candidate> {
    const dto: UpdateCandidateStatusDto = {
      status:           CandidateStatus.APPROVED,
      reason:           'Candidate cleared for ballot by Election Authority',
      gazetteReference,
    };
    this.assertValidCandidateTransition(
      (await this.getCandidate(id)).status,
      CandidateStatus.APPROVED,
    );
    return this.updateCandidateStatus(id, dto, authorityUserId);
  }

  /**
   * Disqualify a candidate — reason is required for the audit trail.
   * NOMINATED|APPROVED → DISQUALIFIED
   */
  async disqualifyCandidate(id: string, authorityUserId: string, reason: string, gazetteReference?: string): Promise<Candidate> {
    if (!reason?.trim()) throw new BadRequestException('Disqualification reason is required');
    const dto: UpdateCandidateStatusDto = {
      status:           CandidateStatus.DISQUALIFIED,
      reason,
      gazetteReference,
    };
    this.assertValidCandidateTransition(
      (await this.getCandidate(id)).status,
      CandidateStatus.DISQUALIFIED,
    );
    return this.updateCandidateStatus(id, dto, authorityUserId);
  }

  /**
   * Record election result — APPROVED → ELECTED
   * Called after official tally confirms a winner.
   * AI ASSISTS, HUMANS DECIDE.
   */
  async electCandidate(id: string, authorityUserId: string, gazetteReference?: string): Promise<Candidate> {
    const dto: UpdateCandidateStatusDto = {
      status:           CandidateStatus.ELECTED,
      reason:           'Declared elected per official tally',
      gazetteReference,
    };
    this.assertValidCandidateTransition(
      (await this.getCandidate(id)).status,
      CandidateStatus.ELECTED,
    );
    return this.updateCandidateStatus(id, dto, authorityUserId);
  }

  /**
   * Record non-election result — APPROVED → NOT_ELECTED
   * Called for all losing candidates after official tally.
   */
  async markCandidateNotElected(id: string, authorityUserId: string, gazetteReference?: string): Promise<Candidate> {
    const dto: UpdateCandidateStatusDto = {
      status:           CandidateStatus.NOT_ELECTED,
      reason:           'Official tally result recorded',
      gazetteReference,
    };
    this.assertValidCandidateTransition(
      (await this.getCandidate(id)).status,
      CandidateStatus.NOT_ELECTED,
    );
    return this.updateCandidateStatus(id, dto, authorityUserId);
  }

  /**
   * Withdraw a candidate — either self-requested or authority-initiated.
   * PENDING_NOMINATION | NOMINATED | APPROVED → WITHDRAWN
   */
  async withdrawCandidate(id: string, changedBy: string, reason?: string, withdrawalDate?: string): Promise<Candidate> {
    const dto: UpdateCandidateStatusDto = {
      status:         CandidateStatus.WITHDRAWN,
      reason:         reason ?? 'Withdrawn',
      withdrawalDate,
    };
    this.assertValidCandidateTransition(
      (await this.getCandidate(id)).status,
      CandidateStatus.WITHDRAWN,
    );
    return this.updateCandidateStatus(id, dto, changedBy);
  }

  async getCandidateStatusHistory(candidateId: string): Promise<CandidateStatusLog[]> {
    const candidate = await this.candidateRepo.findOne({ where: { id: candidateId } });
    if (!candidate) throw new NotFoundException(`Candidate ${candidateId} not found`);

    return this.statusLogRepo.find({
      where: { candidateId },
      order: { changedAt: 'ASC' },
    });
  }

  // ══════════════════════════════════════════════════════════
  //  BALLOT REFERENCES (AI cross-validation data)
  // ══════════════════════════════════════════════════════════

  async createBallotRef(dto: CreateBallotRefDto): Promise<CandidateBallotRef> {
    // Verify candidate exists
    const candidate = await this.candidateRepo.findOne({ where: { id: dto.candidateId } });
    if (!candidate) throw new NotFoundException(`Candidate ${dto.candidateId} not found`);

    const ref = this.ballotRefRepo.create(dto);
    return this.ballotRefRepo.save(ref);
  }

  /**
   * Returns all ballot references for a given election position.
   * Called by AI Verification Service during OCR cross-validation.
   * Returns ordered by ballot number for fast linear scan.
   */
  async getBallotRefsForPosition(
    positionId: string,
    iebcStationCode?: string,
  ): Promise<CandidateBallotRef[]> {
    const qb = this.ballotRefRepo.createQueryBuilder('br')
      .leftJoinAndSelect('br.candidate', 'candidate')
      .where('br.positionId = :positionId', { positionId })
      .andWhere('br.active = true')
      .orderBy('br.ballotNumber', 'ASC');

    if (iebcStationCode) {
      // Station-specific refs take precedence; fall back to NULL (all-station) refs
      qb.andWhere(
        '(br.iebcStationCode = :code OR br.iebcStationCode IS NULL)',
        { code: iebcStationCode },
      );
    }

    return qb.getMany();
  }

  // ══════════════════════════════════════════════════════════
  //  STATS
  // ══════════════════════════════════════════════════════════

  async getStats(electionId?: string): Promise<{
    totalCandidates:        number;
    byStatus:               Record<string, number>;
    byPosition:             Record<string, number>;
    independentCount:       number;
    approvedCount:          number;
    pendingNominationCount: number;
  }> {
    const qb = this.candidateRepo.createQueryBuilder('c');
    if (electionId) qb.where('c.electionId = :electionId', { electionId });

    const [statusCounts, positionCounts, totals] = await Promise.all([
      qb.clone()
        .select(['c.status AS status', 'COUNT(*) AS count'])
        .groupBy('c.status')
        .getRawMany(),

      qb.clone()
        .leftJoin('c.position', 'p')
        .select(['p.positionCode AS positionCode', 'COUNT(*) AS count'])
        .groupBy('p.positionCode')
        .getRawMany(),

      qb.clone()
        .select([
          'COUNT(*) AS total',
          'SUM(CASE WHEN c.isIndependent THEN 1 ELSE 0 END) AS independent',
          `SUM(CASE WHEN c.status = '${CandidateStatus.APPROVED}' THEN 1 ELSE 0 END) AS approved`,
          `SUM(CASE WHEN c.status = '${CandidateStatus.PENDING_NOMINATION}' THEN 1 ELSE 0 END) AS pending`,
        ])
        .getRawOne(),
    ]);

    return {
      totalCandidates:        parseInt(totals?.total ?? '0', 10),
      byStatus:               Object.fromEntries(statusCounts.map((r) => [r.status, parseInt(r.count, 10)])),
      byPosition:             Object.fromEntries(positionCounts.map((r) => [r.positionCode, parseInt(r.count, 10)])),
      independentCount:       parseInt(totals?.independent ?? '0', 10),
      approvedCount:          parseInt(totals?.approved ?? '0', 10),
      pendingNominationCount: parseInt(totals?.pending ?? '0', 10),
    };
  }

  // ══════════════════════════════════════════════════════════
  //  NOMINATION DISPUTES (Task 9)
  // ══════════════════════════════════════════════════════════

  async fileNominationDispute(data: {
    nominationElectionId: string;
    tenantId: string;
    filedBy: string;
    filedByName?: string;
    againstCandidateId?: string;
    againstCandidateName?: string;
    category: string;
    description: string;
  }): Promise<Record<string, unknown>> {
    await this.getElection(data.nominationElectionId); // validates election exists

    const result = await this.dataSource.query(
      `INSERT INTO candidate_nomination_disputes
         (nomination_election_id, tenant_id, filed_by, filed_by_name,
          against_candidate_id, against_candidate_name, category, description,
          status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'FILED', NOW(), NOW())
       RETURNING *`,
      [
        data.nominationElectionId,
        data.tenantId,
        data.filedBy,
        data.filedByName ?? null,
        data.againstCandidateId ?? null,
        data.againstCandidateName ?? null,
        data.category,
        data.description,
      ],
    );
    this.logger.log(`Dispute filed: ${result[0].id} for election ${data.nominationElectionId}`);
    return result[0] as Record<string, unknown>;
  }

  async listNominationDisputes(opts: {
    tenantId?: string;
    status?: string;
    nominationElectionId?: string;
  }): Promise<Record<string, unknown>[]> {
    const conditions: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (opts.tenantId) {
      conditions.push(`tenant_id = ${idx++}`);
      params.push(opts.tenantId);
    }
    if (opts.status) {
      conditions.push(`status = ${idx++}`);
      params.push(opts.status);
    }
    if (opts.nominationElectionId) {
      conditions.push(`nomination_election_id = ${idx++}`);
      params.push(opts.nominationElectionId);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const result = await this.dataSource.query(
      `SELECT * FROM candidate_nomination_disputes ${where} ORDER BY created_at DESC`,
      params,
    );
    return result as Record<string, unknown>[];
  }

  async getNominationDispute(id: string): Promise<Record<string, unknown>> {
    const result = await this.dataSource.query(
      'SELECT * FROM candidate_nomination_disputes WHERE id = $1',
      [id],
    );
    if (!result.length) throw new NotFoundException(`Dispute ${id} not found`);
    return result[0] as Record<string, unknown>;
  }

  async updateNominationDispute(
    id: string,
    data: { status?: string; resolution?: string; resolvedBy?: string },
  ): Promise<Record<string, unknown>> {
    await this.getNominationDispute(id); // validate exists

    const sets: string[] = ['updated_at = NOW()'];
    const params: unknown[] = [id];
    let idx = 2;

    if (data.status) {
      sets.push(`status = ${idx++}`);
      params.push(data.status);
    }
    if (data.resolution) {
      sets.push(`resolution = ${idx++}`);
      params.push(data.resolution);
    }
    if (data.resolvedBy) {
      sets.push(`resolved_by = ${idx++}`);
      params.push(data.resolvedBy);
    }
    const isResolved = data.status === 'RESOLVED' || data.status === 'DISMISSED';
    if (isResolved) {
      sets.push(`resolved_at = NOW()`);
    }

    const result = await this.dataSource.query(
      `UPDATE candidate_nomination_disputes SET ${sets.join(', ')} WHERE id = $1 RETURNING *`,
      params,
    );
    return result[0] as Record<string, unknown>;
  }

  async addDisputeEvidence(id: string, url: string, tenantId: string): Promise<Record<string, unknown>> {
    const dispute = await this.getNominationDispute(id);
    if ((dispute['tenant_id'] as string) !== tenantId) {
      throw new BadRequestException('You do not have access to this dispute');
    }
    const result = await this.dataSource.query(
      `UPDATE candidate_nomination_disputes
       SET evidence_urls = evidence_urls || $2::text[], updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id, `{${url}}`],
    );
    return result[0] as Record<string, unknown>;
  }

  // ══════════════════════════════════════════════════════════
  //  CANDIDATE-PARTY BRIDGE (Task 10)
  // ══════════════════════════════════════════════════════════

  async getCandidateNominationOrigin(candidateId: string): Promise<Record<string, unknown> | null> {
    const candidate = await this.getCandidate(candidateId);

    // If no nomination election linked, candidate was directly sponsored
    if (!candidate.nominationElectionId) return null;

    const nominationElection = await this.getElection(candidate.nominationElectionId);

    // Count all competitors in same nomination election + same position
    const competitorsResult = await this.dataSource.query(
      `SELECT COUNT(*) as count FROM candidate_candidates
       WHERE election_id = $1 AND position_id = $2`,
      [candidate.nominationElectionId, candidate.positionId],
    );
    const competitorsCount = parseInt(competitorsResult[0]?.count ?? '1', 10);

    return {
      nominationElectionId:   nominationElection.id,
      nominationElectionName: nominationElection.name,
      nominationDate:         nominationElection.nominationVotingDate ?? null,
      electionYear:           nominationElection.electionYear,
      partyId:                nominationElection.partyId,
      competitorsCount:       competitorsCount,
      votesReceived:          null, // Future: integrate with reporting service
      totalVotes:             null,
      promotedAt:             candidate.createdAt,
      promotedFromCandidateId: candidate.promotedFromCandidateId ?? null,
    };
  }

  // ══════════════════════════════════════════════════════════
  //  PRIVATE HELPERS
  // ══════════════════════════════════════════════════════════

  /**
   * Validates NEC iebc_codes against the Geography Service.
   * Non-fatal when Geography Service is unreailable — logs warning.
   * Geography Service is the NEC SSoT; we only store codes here.
   */
  private async validateGeographyCodes(dto: {
    countyCode?: string;
    constituencyCode?: string;
    wardCode?: string;
  }): Promise<void> {
    if (!dto.countyCode && !dto.constituencyCode && !dto.wardCode) return;

    // Validate county code exists in NEC if provided
    if (dto.countyCode) {
      const ok = await this.checkCountyExists(dto.countyCode);
      if (ok === false) {
        throw new BadRequestException(
          `County code "${dto.countyCode}" not found in NEC registry`
        );
      }
      // ok === null means Geography Service unavailable — allow with warning
    }
  }

  private async checkCountyExists(countyCode: string): Promise<boolean | null> {
    try {
      const url = `${this.geographyBaseUrl}/api/v1/geography/counties/${countyCode}`;
      const resp$ = this.httpService
        .get(url)
        .pipe(
          timeout(HTTP_TIMEOUT),
          catchError(() => of(null)),
        );
      const resp = await firstValueFrom(resp$);
      return resp !== null && resp.status === 200;
    } catch {
      this.logger.warn(`Geography Service unavailable — skipping county code validation for ${countyCode}`);
      return null; // graceful degradation
    }
  }
}
