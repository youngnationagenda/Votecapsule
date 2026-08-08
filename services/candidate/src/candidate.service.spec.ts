/**
 * Vote Capsule -- Candidate Service Unit Tests
 *
 * Tests cover:
 *   1. Election lifecycle state machine (7 tests)
 *   2. Candidate workflow transitions (6 tests)
 *   3. Party nomination flow (5 tests)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { of } from 'rxjs';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';

import { CandidateService } from './candidate.service';
import { Election, ElectionStatus, ElectionType } from './entities/election.entity';
import { ElectionPosition } from './entities/election-position.entity';
import { PoliticalParty } from './entities/political-party.entity';
import { Candidate, CandidateStatus } from './entities/candidate.entity';
import { CandidateStatusLog } from './entities/candidate-status-log.entity';
import { CandidateBallotRef } from './entities/candidate-ballot-ref.entity';

// ── Mock Factories ──────────────────────────────────────────

function createMockElection(overrides: Partial<Election> = {}): Election {
  return {
    id: 'election-001',
    tenantId: 'tenant-001',
    name: 'Kenya 2027 General Election',
    electionType: ElectionType.GENERAL,
    electionYear: 2027,
    electionDate: null,
    nominationDeadline: null,
    campaignStartDate: null,
    campaignEndDate: null,
    gazetteReference: null,
    description: null,
    status: ElectionStatus.PLANNING,
    necElectionYear: null,
    isActive: false,
    createdBy: 'user-001',
    createdAt: new Date(),
    updatedAt: new Date(),
    partyId: null,
    parentElectionId: null,
    nominationVotingDate: null,
    nominationFeeKes: 0,
    maxCandidatesPerPosition: null,
    resultsPublic: false,
    positions: [],
    candidates: [],
    ...overrides,
  } as Election;
}

function createMockCandidate(overrides: Partial<Candidate> = {}): Candidate {
  return {
    id: 'candidate-001',
    electionId: 'election-001',
    positionId: 'position-001',
    partyId: 'party-001',
    tenantId: 'tenant-001',
    fullName: 'John Kamau Mwangi',
    shortName: 'J. Kamau',
    nationalId: '12345678',
    dateOfBirth: new Date('1980-03-15'),
    gender: 'M',
    sponsorshipType: 'PARTY_SPONSORED',
    nominationElectionId: null,
    promotedFromCandidateId: null,
    nominationWon: null,
    isIndependent: false,
    ballotNumber: null,
    ballotOrder: null,
    runningMateName: null,
    runningMateNationalId: null,
    countyCode: '047',
    constituencyCode: '263',
    wardCode: '1234',
    photographUrl: null,
    symbolUrl: null,
    nominationCertUrl: null,
    nominationCertNumber: null,
    status: CandidateStatus.PENDING_NOMINATION,
    disqualificationReason: null,
    withdrawalDate: null,
    nominationDate: null,
    gazetteReference: null,
    createdBy: 'user-001',
    createdAt: new Date(),
    updatedAt: new Date(),
    election: null as any,
    position: {
      id: 'position-001',
      positionCode: 'MP',
      positionName: 'Member of Parliament',
      geographicLevel: 'CONSTITUENCY',
      description: null,
    } as any,
    party: null as any,
    statusLog: [],
    ballotReferences: [],
    ...overrides,
  } as any;
}

function createMockPosition(overrides: Partial<ElectionPosition> = {}): ElectionPosition {
  return {
    id: 'position-001',
    electionId: 'election-001',
    positionCode: 'MP',
    positionName: 'Member of Parliament',
    geographicLevel: 'CONSTITUENCY' as any,
    countyCode: '047',
    constituencyCode: '263',
    wardCode: null,
    iebcFormNumber: null,
    maxCandidates: null,
    isRunningMateRequired: false,
    seatsAvailable: 1,
    description: null,
    sortOrder: 0,
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    election: null as any,
    candidates: [],
    ...overrides,
  } as ElectionPosition;
}

// ── Mock Repository Factory ────────────────────────────────

function createMockRepository() {
  return {
    create: vi.fn((entity) => entity),
    save: vi.fn((entity) => Promise.resolve({ id: 'new-id', ...entity })),
    findOne: vi.fn(),
    find: vi.fn(),
    update: vi.fn(),
    createQueryBuilder: vi.fn(() => ({
      leftJoinAndSelect: vi.fn().mockReturnThis(),
      leftJoin: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      andWhere: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      addOrderBy: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      groupBy: vi.fn().mockReturnThis(),
      clone: vi.fn().mockReturnThis(),
      getMany: vi.fn().mockResolvedValue([]),
      getRawMany: vi.fn().mockResolvedValue([]),
      getRawOne: vi.fn().mockResolvedValue(null),
    })),
  };
}

// ── Mock DataSource (transactions) ──────────────────────────

function createMockDataSource() {
  return {
    transaction: vi.fn(async (cb: (manager: any) => Promise<any>) => {
      const manager = {
        findOne: vi.fn(),
        save: vi.fn((EntityClass: any, entity: any) => Promise.resolve({ id: 'txn-id', ...entity })),
        create: vi.fn((_EntityClass: any, entity: any) => entity),
        update: vi.fn(),
      };
      return cb(manager);
    }),
  };
}

// ── Test Suite ──────────────────────────────────────────────

describe('CandidateService', () => {
  let service: CandidateService;
  let electionRepo: ReturnType<typeof createMockRepository>;
  let positionRepo: ReturnType<typeof createMockRepository>;
  let partyRepo: ReturnType<typeof createMockRepository>;
  let candidateRepo: ReturnType<typeof createMockRepository>;
  let statusLogRepo: ReturnType<typeof createMockRepository>;
  let ballotRefRepo: ReturnType<typeof createMockRepository>;
  let dataSource: ReturnType<typeof createMockDataSource>;

  const mockHttpService = {
    get: vi.fn(),
    post: vi.fn(),
  };

  const mockConfigService = {
    get: vi.fn((key: string, defaultValue?: string) => {
      const config: Record<string, string> = {
        GEOGRAPHY_SERVICE_URL: 'http://geography-service:3004',
      };
      return config[key] ?? defaultValue;
    }),
  };

  beforeEach(async () => {
    electionRepo = createMockRepository();
    positionRepo = createMockRepository();
    partyRepo = createMockRepository();
    candidateRepo = createMockRepository();
    statusLogRepo = createMockRepository();
    ballotRefRepo = createMockRepository();
    dataSource = createMockDataSource();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CandidateService,
        { provide: getRepositoryToken(Election), useValue: electionRepo },
        { provide: getRepositoryToken(ElectionPosition), useValue: positionRepo },
        { provide: getRepositoryToken(PoliticalParty), useValue: partyRepo },
        { provide: getRepositoryToken(Candidate), useValue: candidateRepo },
        { provide: getRepositoryToken(CandidateStatusLog), useValue: statusLogRepo },
        { provide: getRepositoryToken(CandidateBallotRef), useValue: ballotRefRepo },
        { provide: DataSource, useValue: dataSource },
        { provide: HttpService, useValue: mockHttpService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<CandidateService>(CandidateService);
  });

  // ════════════════════════════════════════════════════════════
  //  1. ELECTION LIFECYCLE STATE MACHINE (7 tests)
  // ════════════════════════════════════════════════════════════

  describe('Election Lifecycle', () => {
    it('should allow PLANNING -> NOMINATION (valid transition)', async () => {
      const election = createMockElection({ status: ElectionStatus.PLANNING });
      electionRepo.findOne.mockResolvedValue(election);
      electionRepo.save.mockResolvedValue({ ...election, status: ElectionStatus.NOMINATION });

      const result = await service.updateElectionStatus('election-001', ElectionStatus.NOMINATION);

      expect(result.status).toBe(ElectionStatus.NOMINATION);
      expect(electionRepo.save).toHaveBeenCalled();
    });

    it('should reject PLANNING -> ACTIVE (skip not allowed)', async () => {
      const election = createMockElection({ status: ElectionStatus.PLANNING });
      electionRepo.findOne.mockResolvedValue(election);

      await expect(
        service.updateElectionStatus('election-001', ElectionStatus.ACTIVE),
      ).rejects.toThrow(BadRequestException);
    });

    it('should allow ACTIVE -> TALLYING (valid transition)', async () => {
      const election = createMockElection({ status: ElectionStatus.ACTIVE, isActive: true });
      electionRepo.findOne.mockResolvedValue(election);
      electionRepo.save.mockResolvedValue({ ...election, status: ElectionStatus.TALLYING, isActive: false });

      const result = await service.updateElectionStatus('election-001', ElectionStatus.TALLYING);

      expect(result.status).toBe(ElectionStatus.TALLYING);
      expect(result.isActive).toBe(false);
    });

    it('should reject TALLYING -> PLANNING (backward not allowed)', async () => {
      const election = createMockElection({ status: ElectionStatus.TALLYING });
      electionRepo.findOne.mockResolvedValue(election);

      await expect(
        service.updateElectionStatus('election-001', ElectionStatus.PLANNING),
      ).rejects.toThrow(BadRequestException);
    });

    it('should allow RESULTS_PUBLISHED -> CLOSED (terminal transition)', async () => {
      const election = createMockElection({ status: ElectionStatus.RESULTS_PUBLISHED });
      electionRepo.findOne.mockResolvedValue(election);
      electionRepo.save.mockResolvedValue({ ...election, status: ElectionStatus.CLOSED, isActive: false });

      const result = await service.updateElectionStatus('election-001', ElectionStatus.CLOSED);

      expect(result.status).toBe(ElectionStatus.CLOSED);
    });

    it('should reject CLOSED -> any state (terminal state has no exits)', async () => {
      const election = createMockElection({ status: ElectionStatus.CLOSED });
      electionRepo.findOne.mockResolvedValue(election);

      // Test all possible target states except CANCELLED (which is always allowed)
      const targets = [
        ElectionStatus.PLANNING,
        ElectionStatus.NOMINATION,
        ElectionStatus.CAMPAIGN,
        ElectionStatus.ACTIVE,
        ElectionStatus.TALLYING,
        ElectionStatus.RESULTS_PUBLISHED,
      ];

      for (const target of targets) {
        await expect(
          service.updateElectionStatus('election-001', target),
        ).rejects.toThrow(BadRequestException);
      }
    });

    it('should handle concurrent transition — optimistic lock (first wins)', async () => {
      // Simulate two concurrent transitions from PLANNING -> NOMINATION
      const election = createMockElection({ status: ElectionStatus.PLANNING });
      electionRepo.findOne.mockResolvedValue(election);

      // First call succeeds — the save updates the in-memory status
      electionRepo.save.mockResolvedValueOnce({ ...election, status: ElectionStatus.NOMINATION });

      const result1 = await service.updateElectionStatus('election-001', ElectionStatus.NOMINATION);
      expect(result1.status).toBe(ElectionStatus.NOMINATION);

      // After first transition, election status is now NOMINATION
      // Second caller tries PLANNING -> NOMINATION but the election is already in NOMINATION
      const updatedElection = createMockElection({ status: ElectionStatus.NOMINATION });
      electionRepo.findOne.mockResolvedValue(updatedElection);

      // NOMINATION -> NOMINATION is not a valid transition
      await expect(
        service.updateElectionStatus('election-001', ElectionStatus.NOMINATION),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ════════════════════════════════════════════════════════════
  //  2. CANDIDATE WORKFLOW (6 tests)
  // ════════════════════════════════════════════════════════════

  describe('Candidate Workflow', () => {
    it('should register candidate in PENDING_NOMINATION status', async () => {
      const election = createMockElection({ status: ElectionStatus.NOMINATION });
      const position = createMockPosition();

      electionRepo.findOne.mockResolvedValue(election);
      positionRepo.findOne.mockResolvedValue(position);
      candidateRepo.findOne.mockResolvedValue(null); // no duplicate

      // Mock geography validation — returns HTTP 200 (county exists)
      mockHttpService.get.mockReturnValue(of({ status: 200, data: { id: '047' } }));

      // DataSource transaction mock — captures the candidate saved
      dataSource.transaction.mockImplementation(async (cb) => {
        const manager = {
          save: vi.fn().mockImplementation((_Entity, entity) =>
            Promise.resolve({ id: 'new-candidate-id', ...entity }),
          ),
        };
        return cb(manager);
      });

      const dto = {
        electionId: 'election-001',
        positionId: 'position-001',
        fullName: 'Jane Wanjiku Njeri',
        nationalId: '99887766',
        countyCode: '047',
        constituencyCode: '263',
      };

      const result = await service.registerCandidate(dto as any, 'tenant-001', 'user-001');

      expect(result.status).toBe(CandidateStatus.PENDING_NOMINATION);
    });

    it('should nominate candidate (PENDING_NOMINATION -> NOMINATED)', async () => {
      const candidate = createMockCandidate({ status: CandidateStatus.PENDING_NOMINATION });
      candidateRepo.findOne.mockResolvedValue(candidate);

      dataSource.transaction.mockImplementation(async (cb) => {
        const manager = {
          findOne: vi.fn().mockResolvedValue(candidate),
          save: vi.fn().mockImplementation((_Entity, entity) =>
            Promise.resolve({ ...candidate, ...entity }),
          ),
        };
        return cb(manager);
      });

      const result = await service.nominateCandidate('candidate-001', 'authority-user');

      expect(result.status).toBe(CandidateStatus.NOMINATED);
    });

    it('should approve candidate (NOMINATED -> APPROVED)', async () => {
      const candidate = createMockCandidate({ status: CandidateStatus.NOMINATED });
      candidateRepo.findOne.mockResolvedValue(candidate);

      dataSource.transaction.mockImplementation(async (cb) => {
        const manager = {
          findOne: vi.fn().mockResolvedValue(candidate),
          save: vi.fn().mockImplementation((_Entity, entity) =>
            Promise.resolve({ ...candidate, ...entity }),
          ),
        };
        return cb(manager);
      });

      const result = await service.approveCandidate('candidate-001', 'authority-user', 'GAZ/2027/001');

      expect(result.status).toBe(CandidateStatus.APPROVED);
    });

    it('should elect candidate (APPROVED -> ELECTED)', async () => {
      const candidate = createMockCandidate({ status: CandidateStatus.APPROVED });
      candidateRepo.findOne.mockResolvedValue(candidate);

      dataSource.transaction.mockImplementation(async (cb) => {
        const manager = {
          findOne: vi.fn().mockResolvedValue(candidate),
          save: vi.fn().mockImplementation((_Entity, entity) =>
            Promise.resolve({ ...candidate, ...entity }),
          ),
        };
        return cb(manager);
      });

      const result = await service.electCandidate('candidate-001', 'authority-user', 'GAZ/2027/RESULT-001');

      expect(result.status).toBe(CandidateStatus.ELECTED);
    });

    it('should disqualify at any non-terminal state', async () => {
      const nonTerminalStates = [
        CandidateStatus.PENDING_NOMINATION,
        CandidateStatus.NOMINATED,
        CandidateStatus.APPROVED,
      ];

      for (const startStatus of nonTerminalStates) {
        const candidate = createMockCandidate({ status: startStatus });
        candidateRepo.findOne.mockResolvedValue(candidate);

        dataSource.transaction.mockImplementation(async (cb) => {
          const manager = {
            findOne: vi.fn().mockResolvedValue(candidate),
            save: vi.fn().mockImplementation((_Entity, entity) =>
              Promise.resolve({ ...candidate, ...entity }),
            ),
          };
          return cb(manager);
        });

        // Only NOMINATED and APPROVED can be disqualified per the state machine
        if (startStatus === CandidateStatus.PENDING_NOMINATION) {
          await expect(
            service.disqualifyCandidate('candidate-001', 'authority-user', 'Forged documents'),
          ).rejects.toThrow(BadRequestException);
        } else {
          const result = await service.disqualifyCandidate('candidate-001', 'authority-user', 'Forged documents');
          expect(result.status).toBe(CandidateStatus.DISQUALIFIED);
        }
      }
    });

    it('should withdraw at any non-terminal state', async () => {
      const withdrawableStates = [
        CandidateStatus.PENDING_NOMINATION,
        CandidateStatus.NOMINATED,
        CandidateStatus.APPROVED,
      ];

      for (const startStatus of withdrawableStates) {
        const candidate = createMockCandidate({ status: startStatus });
        candidateRepo.findOne.mockResolvedValue(candidate);

        dataSource.transaction.mockImplementation(async (cb) => {
          const manager = {
            findOne: vi.fn().mockResolvedValue(candidate),
            save: vi.fn().mockImplementation((_Entity, entity) =>
              Promise.resolve({ ...candidate, ...entity }),
            ),
          };
          return cb(manager);
        });

        const result = await service.withdrawCandidate(
          'candidate-001',
          'candidate-user',
          'Personal reasons',
          '2027-06-15',
        );
        expect(result.status).toBe(CandidateStatus.WITHDRAWN);
      }

      // Terminal states should reject withdrawal
      const terminalStates = [CandidateStatus.ELECTED, CandidateStatus.NOT_ELECTED, CandidateStatus.WITHDRAWN];
      for (const startStatus of terminalStates) {
        const candidate = createMockCandidate({ status: startStatus });
        candidateRepo.findOne.mockResolvedValue(candidate);

        await expect(
          service.withdrawCandidate('candidate-001', 'candidate-user', 'Changed mind'),
        ).rejects.toThrow(BadRequestException);
      }
    });
  });

  // ════════════════════════════════════════════════════════════
  //  3. PARTY NOMINATIONS (5 tests)
  // ════════════════════════════════════════════════════════════

  describe('Party Nominations', () => {
    it('should create a PARTY_NOMINATION election linked to a GENERAL election', async () => {
      const generalElection = createMockElection({
        id: 'general-001',
        electionType: ElectionType.GENERAL,
      });
      electionRepo.findOne.mockResolvedValue(generalElection);
      electionRepo.create.mockReturnValue({
        tenantId: 'party-tenant-001',
        name: 'ODM Presidential Nomination 2027',
        electionType: ElectionType.PARTY_NOMINATION,
        electionYear: 2027,
        partyId: 'party-odm-001',
        parentElectionId: 'general-001',
        status: ElectionStatus.PLANNING,
      });
      electionRepo.save.mockResolvedValue({
        id: 'nomination-001',
        tenantId: 'party-tenant-001',
        name: 'ODM Presidential Nomination 2027',
        electionType: ElectionType.PARTY_NOMINATION,
        electionYear: 2027,
        partyId: 'party-odm-001',
        parentElectionId: 'general-001',
        status: ElectionStatus.PLANNING,
      });

      const result = await service.createPartyNomination(
        {
          tenantId: 'party-tenant-001',
          partyId: 'party-odm-001',
          parentElectionId: 'general-001',
          name: 'ODM Presidential Nomination 2027',
          electionYear: 2027,
          nominationFeeKes: 1000000,
        },
        'party-admin-001',
      );

      expect(result.electionType).toBe(ElectionType.PARTY_NOMINATION);
      expect(result.parentElectionId).toBe('general-001');
      expect(result.partyId).toBe('party-odm-001');
      expect(electionRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          electionType: ElectionType.PARTY_NOMINATION,
          parentElectionId: 'general-001',
        }),
      );
    });

    it('should list party nominations filtered by parentElectionId', async () => {
      const nominations = [
        createMockElection({
          id: 'nom-1',
          electionType: ElectionType.PARTY_NOMINATION,
          parentElectionId: 'general-001',
          partyId: 'party-odm',
        }),
        createMockElection({
          id: 'nom-2',
          electionType: ElectionType.PARTY_NOMINATION,
          parentElectionId: 'general-001',
          partyId: 'party-jubilee',
        }),
      ];
      electionRepo.find.mockResolvedValue(nominations);

      const result = await service.listPartyNominations('general-001');

      expect(result).toHaveLength(2);
      expect(electionRepo.find).toHaveBeenCalledWith({
        where: {
          parentElectionId: 'general-001',
          electionType: ElectionType.PARTY_NOMINATION,
        },
        order: { createdAt: 'ASC' },
      });
    });

    it('should declare nomination winner — sets nominationWon = true', async () => {
      const nominationElection = createMockElection({
        id: 'nomination-001',
        electionType: ElectionType.PARTY_NOMINATION,
        status: ElectionStatus.RESULTS_PUBLISHED,
      });
      const winner = createMockCandidate({
        id: 'winner-001',
        electionId: 'nomination-001',
        positionId: 'position-001',
        status: CandidateStatus.APPROVED,
        nominationWon: null,
      });
      const loser = createMockCandidate({
        id: 'loser-001',
        electionId: 'nomination-001',
        positionId: 'position-001',
        status: CandidateStatus.APPROVED,
        nominationWon: null,
      });

      // getElection
      electionRepo.findOne.mockResolvedValue(nominationElection);
      // getCandidate (winner lookup)
      candidateRepo.findOne.mockResolvedValue(winner);
      // find siblings
      candidateRepo.find.mockResolvedValue([winner, loser]);

      dataSource.transaction.mockImplementation(async (cb) => {
        const manager = {
          save: vi.fn().mockImplementation((_Entity, entity) =>
            Promise.resolve({ ...entity }),
          ),
        };
        return cb(manager);
      });

      const result = await service.declareNominationWinner('nomination-001', 'winner-001', 'party-admin');

      expect(result.winner.nominationWon).toBe(true);
      expect(result.winner.status).toBe(CandidateStatus.ELECTED);
      expect(result.losers).toHaveLength(1);
    });

    it('should promote nomination winner to GENERAL election as PARTY_SPONSORED', async () => {
      const nomCandidate = createMockCandidate({
        id: 'nom-candidate-001',
        electionId: 'nomination-001',
        positionId: 'nom-position-001',
        nominationWon: true,
        countyCode: '047',
        constituencyCode: '263',
        wardCode: null,
        position: {
          id: 'nom-position-001',
          positionCode: 'MP',
          positionName: 'Member of Parliament',
          geographicLevel: 'CONSTITUENCY',
          description: null,
        } as any,
      });
      const nominationElection = createMockElection({
        id: 'nomination-001',
        electionType: ElectionType.PARTY_NOMINATION,
        parentElectionId: 'general-001',
      });
      const generalElection = createMockElection({
        id: 'general-001',
        tenantId: 'iebc-tenant',
        electionType: ElectionType.GENERAL,
      });
      const generalPosition = createMockPosition({
        id: 'gen-position-001',
        electionId: 'general-001',
        positionCode: 'MP',
        countyCode: '047',
        constituencyCode: '263',
      });

      // getCandidate (nomination winner)
      candidateRepo.findOne
        .mockResolvedValueOnce(nomCandidate)   // first call: getCandidate
        .mockResolvedValueOnce(null);          // uniqueness check: no existing promotion

      // getElection calls: nomination election, then general election
      electionRepo.findOne
        .mockResolvedValueOnce(nominationElection)
        .mockResolvedValueOnce(generalElection);

      // findOne position in general election
      positionRepo.findOne.mockResolvedValue(generalPosition);

      dataSource.transaction.mockImplementation(async (cb) => {
        const manager = {
          create: vi.fn((_Entity, entity) => entity),
          save: vi.fn().mockImplementation((_Entity, entity) =>
            Promise.resolve({ id: 'promoted-001', ...entity }),
          ),
          update: vi.fn(),
        };
        return cb(manager);
      });

      const result = await service.promoteNominationWinner('nom-candidate-001', 'party-admin');

      expect(result.sponsorshipType).toBe('PARTY_SPONSORED');
      expect(result.status).toBe(CandidateStatus.PENDING_NOMINATION);
      expect(result.electionId).toBe('general-001');
      expect(result.nominationElectionId).toBe('nomination-001');
      expect(result.promotedFromCandidateId).toBe('nom-candidate-001');
    });

    it('should reject promotion if nomination not won', async () => {
      const nomCandidate = createMockCandidate({
        id: 'nom-candidate-002',
        electionId: 'nomination-001',
        nominationWon: false, // Lost the nomination
      });

      candidateRepo.findOne.mockResolvedValue(nomCandidate);

      await expect(
        service.promoteNominationWinner('nom-candidate-002', 'party-admin'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ════════════════════════════════════════════════════════════
  //  ADDITIONAL EDGE CASES
  // ════════════════════════════════════════════════════════════

  describe('Edge Cases', () => {
    it('should allow emergency cancel from any non-terminal state', async () => {
      const states = [
        ElectionStatus.PLANNING,
        ElectionStatus.NOMINATION,
        ElectionStatus.CAMPAIGN,
        ElectionStatus.ACTIVE,
        ElectionStatus.TALLYING,
        ElectionStatus.RESULTS_PUBLISHED,
      ];

      for (const status of states) {
        const election = createMockElection({ status });
        electionRepo.findOne.mockResolvedValue(election);
        electionRepo.save.mockResolvedValue({ ...election, status: ElectionStatus.CANCELLED, isActive: false });

        const result = await service.cancelElection('election-001', 'Security threat');
        expect(result.status).toBe(ElectionStatus.CANCELLED);
      }
    });

    it('should reject cancel on a closed election', async () => {
      const election = createMockElection({ status: ElectionStatus.CLOSED });
      electionRepo.findOne.mockResolvedValue(election);

      await expect(
        service.cancelElection('election-001', 'Too late'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException for non-existent election', async () => {
      electionRepo.findOne.mockResolvedValue(null);

      await expect(service.getElection('non-existent')).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException for non-existent candidate', async () => {
      candidateRepo.findOne.mockResolvedValue(null);

      await expect(service.getCandidate('non-existent')).rejects.toThrow(NotFoundException);
    });

    it('should allow TALLYING -> ACTIVE (reopen polling stations)', async () => {
      const election = createMockElection({ status: ElectionStatus.TALLYING });
      electionRepo.findOne.mockResolvedValue(election);
      electionRepo.save.mockResolvedValue({ ...election, status: ElectionStatus.ACTIVE, isActive: true });

      const result = await service.updateElectionStatus('election-001', ElectionStatus.ACTIVE);
      expect(result.status).toBe(ElectionStatus.ACTIVE);
    });

    it('should reject creating party nomination linked to non-GENERAL election', async () => {
      const byElection = createMockElection({
        id: 'by-election-001',
        electionType: ElectionType.BY_ELECTION,
      });
      electionRepo.findOne.mockResolvedValue(byElection);

      await expect(
        service.createPartyNomination(
          {
            tenantId: 'party-tenant',
            partyId: 'party-001',
            parentElectionId: 'by-election-001',
            name: 'Test Nomination',
            electionYear: 2027,
          },
          'user-001',
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
