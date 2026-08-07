import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
// ============================================================
// VoteCapsule — Geography Service Unit Tests
// services/geography/src/geography.service.spec.ts
// ============================================================
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';

import { GeographyService } from './geography.service';
import { County } from './entities/county.entity';
import { Constituency } from './entities/constituency.entity';
import { Ward } from './entities/ward.entity';
import { RegistrationCentre } from './entities/registration-centre.entity';
import { PollingStation, StationType } from './entities/polling-station.entity';
import { ElectionVersion } from './entities/election-version.entity';

// ── Mock data ───────────────────────────────────────────────────
const mockCounties: Partial<County>[] = [
  { id: 1, iebcCode: '001', name: 'Mombasa', registeredVoters: 650000, active: true, isSpecial: false },
  { id: 2, iebcCode: '002', name: 'Kwale', registeredVoters: 350000, active: true, isSpecial: false },
  { id: 47, iebcCode: '047', name: 'Nairobi', registeredVoters: 2500000, active: true, isSpecial: false },
];

const mockConstituencies: Partial<Constituency>[] = [
  { id: 1, countyId: 1, iebcCode: '001', name: 'Changamwe', registeredVoters: 100000, active: true, isSpecial: false },
  { id: 2, countyId: 1, iebcCode: '002', name: 'Jomvu', registeredVoters: 90000, active: true, isSpecial: false },
  { id: 3, countyId: 2, iebcCode: '003', name: 'Msambweni', registeredVoters: 80000, active: true, isSpecial: false },
];

const mockWards: Partial<Ward>[] = [
  { id: 1, constituencyId: 1, iebcCode: '0001', name: 'Port Reitz', registeredVoters: 50000, active: true, isSpecial: false },
  { id: 2, constituencyId: 1, iebcCode: '0002', name: 'Kipevu', registeredVoters: 50000, active: true, isSpecial: false },
  { id: 3, constituencyId: 2, iebcCode: '0003', name: 'Jomvu Kuu', registeredVoters: 45000, active: true, isSpecial: false },
];

const mockStation: Partial<PollingStation> = {
  id: 1,
  iebcStationCode: '001001000100101',
  streamNumber: 1,
  name: 'Port Reitz Primary School',
  registeredVoters: 500,
  latitude: -4.0435,
  longitude: 39.6682,
  stationType: StationType.STANDARD,
  active: true,
  electionYear: 2022,
  registrationCentre: { id: 1, name: 'Port Reitz Centre', iebcCode: '0010010001' } as any,
  ward: { id: 1, name: 'Port Reitz', iebcCode: '0001' } as any,
  constituency: { id: 1, name: 'Changamwe', iebcCode: '001' } as any,
  county: { id: 1, name: 'Mombasa', iebcCode: '001' } as any,
};

// ── Mock repositories ───────────────────────────────────────────
const createMockRepo = () => ({
  find: vi.fn(),
  findOne: vi.fn(),
  count: vi.fn(),
  createQueryBuilder: vi.fn().mockReturnValue({
    select: vi.fn().mockReturnThis(),
    addSelect: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    andWhere: vi.fn().mockReturnThis(),
    leftJoinAndSelect: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    getRawOne: vi.fn().mockResolvedValue({ total: '22000000' }),
    getMany: vi.fn().mockResolvedValue([]),
  }),
});

describe('GeographyService', () => {
  let service: GeographyService;
  let countyRepo: any;
  let constRepo: any;
  let wardRepo: any;
  let centreRepo: any;
  let stationRepo: any;
  let electionVersionRepo: any;

  beforeEach(async () => {
    countyRepo = createMockRepo();
    constRepo = createMockRepo();
    wardRepo = createMockRepo();
    centreRepo = createMockRepo();
    stationRepo = createMockRepo();
    electionVersionRepo = createMockRepo();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GeographyService,
        { provide: getRepositoryToken(County), useValue: countyRepo },
        { provide: getRepositoryToken(Constituency), useValue: constRepo },
        { provide: getRepositoryToken(Ward), useValue: wardRepo },
        { provide: getRepositoryToken(RegistrationCentre), useValue: centreRepo },
        { provide: getRepositoryToken(PollingStation), useValue: stationRepo },
        { provide: getRepositoryToken(ElectionVersion), useValue: electionVersionRepo },
      ],
    }).compile();

    service = module.get<GeographyService>(GeographyService);
  });

  // ── Counties ──────────────────────────────────────────────────

  describe('getCounties', () => {
    it('should return all 47 counties (non-special, active)', async () => {
      countyRepo.find.mockResolvedValue(mockCounties);

      const result = await service.getCounties();

      expect(result).toHaveLength(3);
      expect(countyRepo.find).toHaveBeenCalledWith({
        where: { active: true, isSpecial: false },
        order: { iebcCode: 'ASC' },
      });
    });

    it('should include special counties when includeSpecial=true', async () => {
      countyRepo.find.mockResolvedValue(mockCounties);

      await service.getCounties(true);

      expect(countyRepo.find).toHaveBeenCalledWith({
        where: { active: true },
        order: { iebcCode: 'ASC' },
      });
    });
  });

  describe('getCountyByCode', () => {
    it('should return a county by IEBC code', async () => {
      countyRepo.findOne.mockResolvedValue(mockCounties[0]);

      const result = await service.getCountyByCode('001');
      expect(result.name).toBe('Mombasa');
    });

    it('should throw NotFoundException for invalid code', async () => {
      countyRepo.findOne.mockResolvedValue(null);

      await expect(service.getCountyByCode('999'))
        .rejects.toThrow(NotFoundException);
    });
  });

  // ── Constituencies ────────────────────────────────────────────

  describe('getConstituencies', () => {
    it('should return all constituencies when no filter', async () => {
      constRepo.find.mockResolvedValue(mockConstituencies);

      const result = await service.getConstituencies();

      expect(result).toHaveLength(3);
      expect(constRepo.find).toHaveBeenCalledWith({
        where: { active: true, isSpecial: false },
        order: { iebcCode: 'ASC' },
      });
    });

    it('should filter constituencies by countyCode', async () => {
      countyRepo.findOne.mockResolvedValue(mockCounties[0]); // county id=1
      constRepo.find.mockResolvedValue(
        mockConstituencies.filter((c) => c.countyId === 1),
      );

      const result = await service.getConstituencies('001');

      expect(result).toHaveLength(2);
      expect(constRepo.find).toHaveBeenCalledWith({
        where: { countyId: 1, active: true, isSpecial: false },
        order: { iebcCode: 'ASC' },
      });
    });

    it('should throw NotFoundException for invalid countyCode', async () => {
      countyRepo.findOne.mockResolvedValue(null);

      await expect(service.getConstituencies('999'))
        .rejects.toThrow(NotFoundException);
    });
  });

  // ── Wards ─────────────────────────────────────────────────────

  describe('getWards', () => {
    it('should return all wards when no filter', async () => {
      wardRepo.find.mockResolvedValue(mockWards);

      const result = await service.getWards();

      expect(result).toHaveLength(3);
    });

    it('should filter wards by constituencyCode', async () => {
      constRepo.findOne.mockResolvedValue(mockConstituencies[0]); // constituency id=1
      wardRepo.find.mockResolvedValue(
        mockWards.filter((w) => w.constituencyId === 1),
      );

      const result = await service.getWards('001');

      expect(result).toHaveLength(2);
      expect(wardRepo.find).toHaveBeenCalledWith({
        where: { constituencyId: 1, active: true, isSpecial: false },
        order: { iebcCode: 'ASC' },
      });
    });

    it('should throw NotFoundException for invalid constituencyCode', async () => {
      constRepo.findOne.mockResolvedValue(null);

      await expect(service.getWards('999'))
        .rejects.toThrow(NotFoundException);
    });
  });

  // ── Polling Stations ──────────────────────────────────────────

  describe('getPollingStations', () => {
    it('should return stations with query builder', async () => {
      const mockQb = {
        leftJoinAndSelect: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        andWhere: vi.fn().mockReturnThis(),
        getMany: vi.fn().mockResolvedValue([mockStation]),
      };
      stationRepo.createQueryBuilder.mockReturnValue(mockQb);

      const result = await service.getPollingStations({ wardCode: '0001' });

      expect(result).toHaveLength(1);
      expect(mockQb.andWhere).toHaveBeenCalled();
    });
  });

  // ── validateStation ───────────────────────────────────────────

  describe('validateStation', () => {
    it('should return station detail for valid 15-digit code', async () => {
      stationRepo.findOne.mockResolvedValue(mockStation);

      const result = await service.validateStation('001001000100101');

      expect(result.iebcStationCode).toBe('001001000100101');
      expect(result.name).toBe('Port Reitz Primary School');
      expect(result.countyName).toBe('Mombasa');
      expect(result.constituencyName).toBe('Changamwe');
      expect(result.wardName).toBe('Port Reitz');
      expect(result.registeredVoters).toBe(500);
      expect(result.stationType).toBe(StationType.STANDARD);
    });

    it('should throw NotFoundException for invalid code', async () => {
      stationRepo.findOne.mockResolvedValue(null);

      await expect(service.validateStation('999999999999999'))
        .rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException for non-existent station', async () => {
      stationRepo.findOne.mockResolvedValue(null);

      await expect(service.validateStation('000000000000000'))
        .rejects.toThrow(NotFoundException);
    });
  });

  // ── Voter Lookup ──────────────────────────────────────────────

  describe('getVoterLookup', () => {
    it('should return stations for a given county', async () => {
      const mockQb = {
        leftJoinAndSelect: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        andWhere: vi.fn().mockReturnThis(),
        getMany: vi.fn().mockResolvedValue([mockStation]),
      };
      stationRepo.createQueryBuilder.mockReturnValue(mockQb);

      const result = await service.getVoterLookup('001');

      expect(result).toHaveLength(1);
    });

    it('should return stations filtered by county + constituency', async () => {
      const mockQb = {
        leftJoinAndSelect: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        andWhere: vi.fn().mockReturnThis(),
        getMany: vi.fn().mockResolvedValue([mockStation, mockStation]),
      };
      stationRepo.createQueryBuilder.mockReturnValue(mockQb);

      const result = await service.getVoterLookup('001', '001');

      expect(result).toHaveLength(2);
    });

    it('should return empty array for non-matching area', async () => {
      const mockQb = {
        leftJoinAndSelect: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        andWhere: vi.fn().mockReturnThis(),
        getMany: vi.fn().mockResolvedValue([]),
      };
      stationRepo.createQueryBuilder.mockReturnValue(mockQb);

      const result = await service.getVoterLookup('099', '099');

      expect(result).toHaveLength(0);
    });
  });

  // ── Stats ─────────────────────────────────────────────────────

  describe('getStats', () => {
    it('should return complete geography stats', async () => {
      countyRepo.count.mockResolvedValue(47);
      constRepo.count.mockResolvedValue(290);
      wardRepo.count.mockResolvedValue(1450);
      centreRepo.count.mockResolvedValue(10000);
      stationRepo.count.mockResolvedValue(46030);
      electionVersionRepo.findOne.mockResolvedValue({ electionYear: 2027, isActive: true });

      const stats = await service.getStats();

      expect(stats.counties).toBe(47);
      expect(stats.constituencies).toBe(290);
      expect(stats.wards).toBe(1450);
      expect(stats.registrationCentres).toBe(10000);
      expect(stats.pollingStations).toBe(46030);
      expect(stats.electionYear).toBe(2027);
    });
  });

  // ── Search ────────────────────────────────────────────────────

  describe('searchStations', () => {
    it('should search stations by name pattern', async () => {
      stationRepo.find.mockResolvedValue([mockStation]);

      const result = await service.searchStations('Port Reitz');

      expect(result).toHaveLength(1);
      expect(stationRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 20,
          order: { name: 'ASC' },
        }),
      );
    });

    it('should respect custom limit', async () => {
      stationRepo.find.mockResolvedValue([]);

      await service.searchStations('xyz', 5);

      expect(stationRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ take: 5 }),
      );
    });
  });

  // ── Election Year ─────────────────────────────────────────────

  describe('getActiveElectionYear', () => {
    it('should return active election year', async () => {
      electionVersionRepo.findOne.mockResolvedValue({ electionYear: 2027, isActive: true });

      const year = await service.getActiveElectionYear();
      expect(year).toBe(2027);
    });

    it('should default to 2022 when no active version', async () => {
      electionVersionRepo.findOne.mockResolvedValue(null);

      const year = await service.getActiveElectionYear();
      expect(year).toBe(2022);
    });
  });
});
