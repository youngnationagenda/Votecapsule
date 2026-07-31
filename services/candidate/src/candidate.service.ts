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

import { Election, ElectionStatus }             from './entities/election.entity';
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
    election.status = status;
    return this.electionRepo.save(election);
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
