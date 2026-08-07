// ============================================================
// VoteCapsule — Reporting Service Unit Tests
// ============================================================
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken, getDataSourceToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';

import { ReportingService } from './reporting.service';
import { ResultSnapshot, ScopeLevel, PublicationStatus } from './entities/result-snapshot.entity';
import { Publication } from './entities/publication.entity';
import { ExportLog, ExportFormat, ExportStatus } from './entities/export-log.entity';

// ── Mocks ────────────────────────────────────────────────────

const createMockRepository = () => ({
  find: jest.fn().mockResolvedValue([]),
  findOne: jest.fn(),
  save: jest.fn().mockImplementation((e) => Promise.resolve({ id: 'snap-1', ...e })),
  create: jest.fn().mockImplementation((e) => ({ id: 'snap-1', ...e })),
  update: jest.fn().mockResolvedValue({ affected: 1 }),
  count: jest.fn().mockResolvedValue(0),
  createQueryBuilder: jest.fn(() => mockInsertQB),
});

const mockInsertQB = {
  insert: jest.fn().mockReturnThis(),
  into: jest.fn().mockReturnThis(),
  values: jest.fn().mockReturnThis(),
  orUpdate: jest.fn().mockReturnThis(),
  execute: jest.fn().mockResolvedValue({ affected: 1 }),
};

const mockTransactionManager = {
  save: jest.fn().mockImplementation((_entity, data) => Promise.resolve({ id: 'pub-1', ...data })),
  create: jest.fn().mockImplementation((_entity, data) => ({ id: 'pub-1', ...data })),
};

const mockDataSource = {
  query: jest.fn().mockResolvedValue([]),
  transaction: jest.fn().mockImplementation((cb) => cb(mockTransactionManager)),
  createQueryBuilder: jest.fn(() => mockInsertQB),
};

const mockConfig = {
  get: jest.fn().mockReturnValue(undefined),
};

const sampleSnapshot: Partial<ResultSnapshot> = {
  id: 'snap-1',
  tenantId: 'tenant-1',
  electionYear: 2027,
  positionCode: 'PRESIDENT',
  scopeLevel: ScopeLevel.NATIONAL,
  scopeName: 'Kenya',
  totalStations: 46030,
  stationsReporting: 40000,
  stationsPending: 6000,
  stationsRejected: 30,
  stationsFlagged: 120,
  completionPercent: 86.92,
  registeredVoters: 22000000,
  votesCast: 16000000,
  validVotes: 15800000,
  rejectedBallots: 200000,
  turnoutPercent: 72.73,
  avgAiConfidence: 0.89,
  minAiConfidence: 0.45,
  anomalyCount: 120,
  isFinal: false,
  publicationStatus: PublicationStatus.DRAFT,
};

describe('ReportingService', () => {
  let service: ReportingService;
  let snapshotRepo: ReturnType<typeof createMockRepository>;
  let publicationRepo: ReturnType<typeof createMockRepository>;
  let exportLogRepo: ReturnType<typeof createMockRepository>;

  beforeEach(async () => {
    snapshotRepo = createMockRepository();
    publicationRepo = createMockRepository();
    exportLogRepo = createMockRepository();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportingService,
        { provide: getRepositoryToken(ResultSnapshot), useValue: snapshotRepo },
        { provide: getRepositoryToken(Publication), useValue: publicationRepo },
        { provide: getRepositoryToken(ExportLog), useValue: exportLogRepo },
        { provide: getDataSourceToken(), useValue: mockDataSource },
        { provide: DataSource, useValue: mockDataSource },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    service = module.get<ReportingService>(ReportingService);
    jest.clearAllMocks();
  });

  // ── getSnapshot() ──────────────────────────────────────────

  describe('getSnapshot()', () => {
    it('should return snapshot when found', async () => {
      snapshotRepo.findOne.mockResolvedValue(sampleSnapshot);

      const result = await service.getSnapshot('snap-1');

      expect(result).toEqual(sampleSnapshot);
    });

    it('should throw NotFoundException when not found', async () => {
      snapshotRepo.findOne.mockResolvedValue(null);

      await expect(service.getSnapshot('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  // ── listSnapshots() ────────────────────────────────────────

  describe('listSnapshots()', () => {
    it('should query with tenantId filter', async () => {
      snapshotRepo.find.mockResolvedValue([sampleSnapshot]);

      const result = await service.listSnapshots({ tenantId: 'tenant-1' });

      expect(snapshotRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId: 'tenant-1' }),
        }),
      );
      expect(result).toHaveLength(1);
    });

    it('should apply all optional filters', async () => {
      snapshotRepo.find.mockResolvedValue([]);

      await service.listSnapshots({
        tenantId: 'tenant-1',
        electionYear: 2027,
        positionCode: 'PRESIDENT',
        scopeLevel: ScopeLevel.COUNTY,
        countyCode: '047',
      });

      expect(snapshotRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: 'tenant-1',
            electionYear: 2027,
            positionCode: 'PRESIDENT',
            scopeLevel: ScopeLevel.COUNTY,
            countyCode: '047',
          }),
        }),
      );
    });
  });

  // ── verifySnapshot() ───────────────────────────────────────

  describe('verifySnapshot()', () => {
    it('should change DRAFT to VERIFIED', async () => {
      const draft = { ...sampleSnapshot, publicationStatus: PublicationStatus.DRAFT };
      snapshotRepo.findOne.mockResolvedValue(draft);
      snapshotRepo.save.mockResolvedValue({ ...draft, publicationStatus: PublicationStatus.VERIFIED });

      const result = await service.verifySnapshot('snap-1', 'authority-admin-1');

      expect(snapshotRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          publicationStatus: PublicationStatus.VERIFIED,
          verifiedBy: 'authority-admin-1',
        }),
      );
    });

    it('should throw ConflictException if not in DRAFT state', async () => {
      snapshotRepo.findOne.mockResolvedValue({
        ...sampleSnapshot,
        publicationStatus: PublicationStatus.PUBLISHED,
      });

      await expect(
        service.verifySnapshot('snap-1', 'admin-1'),
      ).rejects.toThrow(ConflictException);
    });
  });

  // ── publishResults() ───────────────────────────────────────

  describe('publishResults()', () => {
    it('should publish VERIFIED snapshot and create Publication', async () => {
      const verified = {
        ...sampleSnapshot,
        publicationStatus: PublicationStatus.VERIFIED,
      };
      snapshotRepo.findOne.mockResolvedValue(verified);
      publicationRepo.count.mockResolvedValue(0);

      const result = await service.publishResults(
        { snapshotId: 'snap-1', isPublic: true },
        'publisher-1',
        'Dr. Chebukati',
      );

      expect(mockDataSource.transaction).toHaveBeenCalled();
      expect(mockTransactionManager.save).toHaveBeenCalledWith(
        ResultSnapshot,
        expect.objectContaining({
          publicationStatus: PublicationStatus.PUBLISHED,
          publishedBy: 'publisher-1',
        }),
      );
      expect(mockTransactionManager.create).toHaveBeenCalledWith(
        Publication,
        expect.objectContaining({
          publishedBy: 'publisher-1',
          publishedByName: 'Dr. Chebukati',
          isPublic: true,
          publicationVersion: 1,
        }),
      );
    });

    it('should throw BadRequestException if snapshot is DRAFT', async () => {
      snapshotRepo.findOne.mockResolvedValue({
        ...sampleSnapshot,
        publicationStatus: PublicationStatus.DRAFT,
      });

      await expect(
        service.publishResults({ snapshotId: 'snap-1' }, 'publisher-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should increment version for subsequent publications', async () => {
      snapshotRepo.findOne.mockResolvedValue({
        ...sampleSnapshot,
        publicationStatus: PublicationStatus.VERIFIED,
      });
      publicationRepo.count.mockResolvedValue(2); // 2 prior publications

      await service.publishResults({ snapshotId: 'snap-1' }, 'publisher-1');

      expect(mockTransactionManager.create).toHaveBeenCalledWith(
        Publication,
        expect.objectContaining({ publicationVersion: 3 }),
      );
    });
  });

  // ── getDashboard() ─────────────────────────────────────────

  describe('getDashboard()', () => {
    it('should return overview with positions and county coverage', async () => {
      const nationalSnaps = [
        { ...sampleSnapshot, positionCode: 'PRESIDENT', totalStations: 46030, stationsReporting: 40000, votesCast: 16000000, avgAiConfidence: 0.89, publicationStatus: PublicationStatus.PUBLISHED },
        { ...sampleSnapshot, positionCode: 'GOVERNOR', totalStations: 46030, stationsReporting: 35000, votesCast: 14000000, avgAiConfidence: 0.87, publicationStatus: PublicationStatus.DRAFT },
      ];
      const countySnaps = [
        { countyCode: '001', scopeName: 'Mombasa', totalStations: 1200, stationsReporting: 1000 },
      ];
      const publications = [{ id: 'pub-1', publishedAt: new Date() }];

      snapshotRepo.find
        .mockResolvedValueOnce(nationalSnaps)  // NATIONAL
        .mockResolvedValueOnce(countySnaps);   // COUNTY
      publicationRepo.find.mockResolvedValue(publications);

      const result = await service.getDashboard('tenant-1', 2027);

      expect(result.overview).toHaveProperty('electionYear', 2027);
      expect(result.overview).toHaveProperty('totalStations');
      expect(result.overview).toHaveProperty('publishedPositions', 1);
      expect(result.byPosition).toHaveLength(2);
      expect(result.coverageByCounty).toHaveLength(1);
      expect(result.recentPublications).toHaveLength(1);
    });
  });

  // ── getPublicResults() ─────────────────────────────────────

  describe('getPublicResults()', () => {
    it('should only return PUBLISHED snapshots', async () => {
      snapshotRepo.find.mockResolvedValue([]);

      await service.getPublicResults({
        electionYear: 2027,
        positionCode: 'PRESIDENT',
      });

      expect(snapshotRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            publicationStatus: PublicationStatus.PUBLISHED,
          }),
        }),
      );
    });
  });

  // ── getPublicProgress() ────────────────────────────────────

  describe('getPublicProgress()', () => {
    it('should use national snapshot when available', async () => {
      snapshotRepo.findOne.mockResolvedValue({
        electionYear: 2027,
        positionCode: 'PRESIDENT',
        totalStations: 46030,
        stationsReporting: 40000,
      });
      snapshotRepo.find.mockResolvedValue([
        { countyCode: '001', scopeName: 'Mombasa', totalStations: 1200, stationsReporting: 1000, completionPercent: 83.33 },
      ]);

      const result = await service.getPublicProgress({ electionYear: 2027 });

      expect(result.totalStations).toBe(46030);
      expect(result.stationsReported).toBe(40000);
      expect(result.byCounty).toHaveLength(1);
    });

    it('should fall back to county aggregation when no national snapshot', async () => {
      snapshotRepo.findOne.mockResolvedValue(null);
      snapshotRepo.find.mockResolvedValue([
        { countyCode: '001', scopeName: 'Mombasa', totalStations: 1200, stationsReporting: 1000 },
        { countyCode: '047', scopeName: 'Nairobi', totalStations: 3500, stationsReporting: 3000 },
      ]);

      const result = await service.getPublicProgress({ electionYear: 2027 });

      expect(result.totalStations).toBe(4700);
      expect(result.stationsReported).toBe(4000);
      expect(result.percentReported).toBeCloseTo(85.11, 1);
    });
  });

  // ── exportCsv() ────────────────────────────────────────────

  describe('exportCsv()', () => {
    it('should generate CSV with header and data rows', async () => {
      exportLogRepo.save.mockResolvedValue({ id: 'log-1' });
      snapshotRepo.find.mockResolvedValue([
        {
          scopeLevel: ScopeLevel.NATIONAL,
          scopeName: 'Kenya',
          countyCode: null,
          constituencyCode: null,
          wardCode: null,
          iebcStationCode: null,
          totalStations: 46030,
          stationsReporting: 40000,
          completionPercent: 86.92,
          registeredVoters: 22000000,
          votesCast: 16000000,
          validVotes: 15800000,
          rejectedBallots: 200000,
          turnoutPercent: 72.73,
          avgAiConfidence: 0.89,
          anomalyCount: 120,
          publicationStatus: PublicationStatus.PUBLISHED,
          publishedAt: new Date('2027-08-09'),
        },
      ]);

      const result = await service.exportCsv(
        { electionYear: 2027, positionCode: 'PRESIDENT', format: ExportFormat.CSV },
        'tenant-1',
        'admin-1',
      );

      expect(result.csv).toContain('scope_level,scope_name');
      expect(result.csv).toContain('NATIONAL');
      expect(result.csv).toContain('"Kenya"');
      expect(result.logId).toBe('log-1');
      expect(exportLogRepo.update).toHaveBeenCalledWith(
        'log-1',
        expect.objectContaining({ status: ExportStatus.COMPLETE }),
      );
    });

    it('should log FAILED status on error', async () => {
      exportLogRepo.save.mockResolvedValue({ id: 'log-1' });
      snapshotRepo.find.mockRejectedValue(new Error('DB connection lost'));

      await expect(
        service.exportCsv(
          { electionYear: 2027, positionCode: 'PRESIDENT', format: ExportFormat.CSV },
          'tenant-1',
          'admin-1',
        ),
      ).rejects.toThrow('DB connection lost');

      expect(exportLogRepo.update).toHaveBeenCalledWith(
        'log-1',
        expect.objectContaining({ status: ExportStatus.FAILED }),
      );
    });
  });

  // ── requestAsyncExport() ───────────────────────────────────

  describe('requestAsyncExport()', () => {
    it('should create pending export log and return immediately', async () => {
      exportLogRepo.save.mockResolvedValue({ id: 'log-2', status: ExportStatus.PENDING });

      const result = await service.requestAsyncExport(
        { electionYear: 2027, positionCode: 'GOVERNOR', format: ExportFormat.PDF },
        'tenant-1',
        'admin-1',
      );

      expect(result).toHaveProperty('status', ExportStatus.PENDING);
      expect(exportLogRepo.save).toHaveBeenCalled();
    });
  });

  // ── getExportLog() ─────────────────────────────────────────

  describe('getExportLog()', () => {
    it('should return export log when found', async () => {
      exportLogRepo.findOne.mockResolvedValue({ id: 'log-1', status: ExportStatus.COMPLETE });

      const result = await service.getExportLog('log-1');

      expect(result).toHaveProperty('status', ExportStatus.COMPLETE);
    });

    it('should throw NotFoundException when not found', async () => {
      exportLogRepo.findOne.mockResolvedValue(null);

      await expect(service.getExportLog('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  // ── getStats() ─────────────────────────────────────────────

  describe('getStats()', () => {
    it('should return aggregated counts', async () => {
      mockDataSource.query.mockResolvedValue([
        { total: '100', published: '30', verified: '20', draft: '50' },
      ]);
      publicationRepo.count.mockResolvedValue(30);
      exportLogRepo.count.mockResolvedValue(15);

      const result = await service.getStats('tenant-1');

      expect(result.totalSnapshots).toBe(100);
      expect(result.publishedCount).toBe(30);
      expect(result.verifiedCount).toBe(20);
      expect(result.draftCount).toBe(50);
      expect(result.totalPublications).toBe(30);
      expect(result.totalExports).toBe(15);
    });
  });

  // ── getAnalytics() ─────────────────────────────────────────

  describe('getAnalytics()', () => {
    it('should return coverage, flags, and hotspots', async () => {
      mockDataSource.query
        .mockResolvedValueOnce([{ flagged: '25', low_confidence: '8' }]) // flagged query
        .mockResolvedValueOnce([ // coverage query
          { county_code: '001', county_name: 'Mombasa', total_stations: '1200', reporting_stations: '1200' },
          { county_code: '047', county_name: 'Nairobi', total_stations: '3500', reporting_stations: '2000' },
        ])
        .mockResolvedValueOnce([ // hotspots query
          { county_code: '047', county_name: 'Nairobi', anomaly_count: '15', avg_confidence: '0.65' },
        ]);

      const result = await service.getAnalytics('tenant-1', 2027);

      expect(result.flaggedStations).toBe(25);
      expect(result.lowConfidence).toBe(8);
      expect(result.completedCounties).toBe(1); // Mombasa fully reported
      expect(result.pendingCounties).toBe(1);   // Nairobi still pending
      expect(result.anomalyHotspots).toHaveLength(1);
    });
  });

  // ── computeSnapshots() ─────────────────────────────────────

  describe('computeSnapshots()', () => {
    it('should return 0 computed when no rows found', async () => {
      mockDataSource.query.mockResolvedValue([]);

      const result = await service.computeSnapshots(
        { electionYear: 2027, positionCode: 'PRESIDENT' },
        'tenant-1',
      );

      expect(result.computed).toBe(0);
    });

    it('should compute snapshots grouped by scope levels', async () => {
      const rows = [
        {
          iebc_station_code: '001001001001001',
          county_code: '001', county_name: 'Mombasa',
          constituency_code: '001001', constituency_name: 'Changamwe',
          ward_code: '001001001', ward_name: 'Port Reitz',
          polling_station_name: 'Port Reitz Primary',
          registered_voters: '500',
          capsule_status: 'ANCHORED',
          ai_confidence_score: '0.92',
          ai_flagged: 'false',
          votes_cast: '380', valid_votes: '370', rejected_votes: '10',
        },
        {
          iebc_station_code: '001001001001002',
          county_code: '001', county_name: 'Mombasa',
          constituency_code: '001001', constituency_name: 'Changamwe',
          ward_code: '001001001', ward_name: 'Port Reitz',
          polling_station_name: 'Port Reitz Secondary',
          registered_voters: '600',
          capsule_status: 'ANCHORED',
          ai_confidence_score: '0.88',
          ai_flagged: 'false',
          votes_cast: '450', valid_votes: '440', rejected_votes: '10',
        },
      ];
      mockDataSource.query.mockResolvedValue(rows);

      const result = await service.computeSnapshots(
        { electionYear: 2027, positionCode: 'PRESIDENT' },
        'tenant-1',
      );

      // Should compute: 2 station + 1 ward + 1 constituency + 1 county + 1 national = 6
      expect(result.computed).toBe(6);
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
    });
  });
});
