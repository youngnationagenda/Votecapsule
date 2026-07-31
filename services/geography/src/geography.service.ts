// ============================================================
// VoteCapsule NEC — Geography Service
// services/geography/src/geography.service.ts
//
// The SINGLE SOURCE OF TRUTH for all election geography.
// Every other service must call these methods — never maintain
// its own copy of counties, wards, polling stations, or voters.
// ============================================================
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { County }              from './entities/county.entity';
import { Constituency }        from './entities/constituency.entity';
import { Ward }                from './entities/ward.entity';
import { RegistrationCentre }  from './entities/registration-centre.entity';
import { PollingStation, StationType } from './entities/polling-station.entity';
import { ElectionVersion }     from './entities/election-version.entity';

// ─── DTOs ────────────────────────────────────────────────────────────────────

export interface CountySummary {
  id: number;
  iebcCode: string;
  name: string;
  registeredVoters: number;
  constituencyCount?: number;
}

export interface PollingStationDetail {
  id: number;
  iebcStationCode: string;
  streamNumber: number;
  name: string;
  registeredVoters: number;
  centreName: string;
  wardName: string;
  wardCode: string;
  constituencyName: string;
  constituencyCode: string;
  countyName: string;
  countyCode: string;
  latitude: number | null;
  longitude: number | null;
  stationType: StationType;
  active: boolean;
  electionYear: number;
}

export interface GeographyStats {
  counties: number;
  constituencies: number;
  wards: number;
  registrationCentres: number;
  pollingStations: number;
  totalRegisteredVoters: number;
  electionYear: number;
}

// ─── Service ─────────────────────────────────────────────────────────────────

@Injectable()
export class GeographyService {
  constructor(
    @InjectRepository(County)
    private readonly countyRepo: Repository<County>,

    @InjectRepository(Constituency)
    private readonly constRepo: Repository<Constituency>,

    @InjectRepository(Ward)
    private readonly wardRepo: Repository<Ward>,

    @InjectRepository(RegistrationCentre)
    private readonly centreRepo: Repository<RegistrationCentre>,

    @InjectRepository(PollingStation)
    private readonly stationRepo: Repository<PollingStation>,

    @InjectRepository(ElectionVersion)
    private readonly electionVersionRepo: Repository<ElectionVersion>,
  ) {}

  // ── Countries / top-level ─────────────────────────────────────────────────

  async getActiveElectionYear(): Promise<number> {
    const ev = await this.electionVersionRepo.findOne({ where: { isActive: true } });
    return ev?.electionYear ?? 2022;
  }

  // ── Counties ──────────────────────────────────────────────────────────────

  async getCounties(includeSpecial = false): Promise<County[]> {
    return this.countyRepo.find({
      where: { active: true, ...(includeSpecial ? {} : { isSpecial: false }) },
      order: { iebcCode: 'ASC' },
    });
  }

  async getCountyByCode(iebcCode: string): Promise<County> {
    const county = await this.countyRepo.findOne({ where: { iebcCode } });
    if (!county) throw new NotFoundException(`County ${iebcCode} not found`);
    return county;
  }

  async getCountyStats(): Promise<CountySummary[]> {
    const counties = await this.countyRepo.find({
      where: { active: true, isSpecial: false },
      order: { iebcCode: 'ASC' },
    });
    return counties.map((c) => ({
      id: c.id,
      iebcCode: c.iebcCode,
      name: c.name,
      registeredVoters: c.registeredVoters,
    }));
  }

  // ── Constituencies ────────────────────────────────────────────────────────

  async getConstituencies(countyCode?: string): Promise<Constituency[]> {
    if (countyCode) {
      const county = await this.getCountyByCode(countyCode);
      return this.constRepo.find({
        where: { countyId: county.id, active: true, isSpecial: false },
        order: { iebcCode: 'ASC' },
      });
    }
    return this.constRepo.find({
      where: { active: true, isSpecial: false },
      order: { iebcCode: 'ASC' },
    });
  }

  async getConstituencyByCode(iebcCode: string): Promise<Constituency> {
    const c = await this.constRepo.findOne({
      where: { iebcCode },
      relations: ['county'],
    });
    if (!c) throw new NotFoundException(`Constituency ${iebcCode} not found`);
    return c;
  }

  // ── Wards ─────────────────────────────────────────────────────────────────

  async getWards(constituencyCode?: string): Promise<Ward[]> {
    if (constituencyCode) {
      const c = await this.getConstituencyByCode(constituencyCode);
      return this.wardRepo.find({
        where: { constituencyId: c.id, active: true, isSpecial: false },
        order: { iebcCode: 'ASC' },
      });
    }
    return this.wardRepo.find({
      where: { active: true, isSpecial: false },
      order: { iebcCode: 'ASC' },
    });
  }

  async getWardByCode(iebcCode: string): Promise<Ward> {
    const w = await this.wardRepo.findOne({
      where: { iebcCode },
      relations: ['constituency', 'constituency.county'],
    });
    if (!w) throw new NotFoundException(`Ward ${iebcCode} not found`);
    return w;
  }

  // ── Registration Centres ──────────────────────────────────────────────────

  async getRegistrationCentres(wardCode?: string): Promise<RegistrationCentre[]> {
    if (wardCode) {
      const ward = await this.getWardByCode(wardCode);
      return this.centreRepo.find({
        where: { wardId: ward.id, active: true },
        order: { iebcCode: 'ASC' },
      });
    }
    return this.centreRepo.find({
      where: { active: true },
      order: { iebcCode: 'ASC' },
    });
  }

  async getCentreByCode(iebcCode: string): Promise<RegistrationCentre> {
    const c = await this.centreRepo.findOne({
      where: { iebcCode },
      relations: ['ward', 'ward.constituency', 'ward.constituency.county'],
    });
    if (!c) throw new NotFoundException(`Registration Centre ${iebcCode} not found`);
    return c;
  }

  // ── Polling Stations ──────────────────────────────────────────────────────

  async getPollingStations(filters: {
    countyCode?:       string;
    constituencyCode?: string;
    wardCode?:         string;
    centreCode?:       string;
    stationType?:      StationType;
    activeOnly?:       boolean;
  } = {}): Promise<PollingStation[]> {
    const qb = this.stationRepo
      .createQueryBuilder('ps')
      .leftJoinAndSelect('ps.registrationCentre', 'rc')
      .leftJoinAndSelect('ps.ward', 'w')
      .leftJoinAndSelect('ps.constituency', 'co')
      .leftJoinAndSelect('ps.county', 'cy')
      .orderBy('ps.iebcStationCode', 'ASC');

    if (filters.activeOnly !== false) {
      qb.andWhere('ps.active = TRUE');
    }
    if (filters.stationType) {
      qb.andWhere('ps.station_type = :type', { type: filters.stationType });
    }
    if (filters.countyCode) {
      qb.andWhere('cy.iebc_code = :cc', { cc: filters.countyCode });
    }
    if (filters.constituencyCode) {
      qb.andWhere('co.iebc_code = :co', { co: filters.constituencyCode });
    }
    if (filters.wardCode) {
      qb.andWhere('w.iebc_code = :wc', { wc: filters.wardCode });
    }
    if (filters.centreCode) {
      qb.andWhere('rc.iebc_code = :rc', { rc: filters.centreCode });
    }
    return qb.getMany();
  }

  async getPollingStationByCode(iebcStationCode: string): Promise<PollingStation> {
    const ps = await this.stationRepo.findOne({
      where: { iebcStationCode },
      relations: [
        'registrationCentre',
        'ward',
        'ward.constituency',
        'ward.constituency.county',
        'constituency',
        'county',
      ],
    });
    if (!ps) throw new NotFoundException(`Polling Station ${iebcStationCode} not found`);
    return ps;
  }

  /**
   * Core NEC validation used by Evidence Capsule Service and AI Engine.
   * Returns the full station detail or throws NotFoundException.
   */
  async validateStation(iebcStationCode: string): Promise<PollingStationDetail> {
    const ps = await this.getPollingStationByCode(iebcStationCode);
    return {
      id:               ps.id,
      iebcStationCode:  ps.iebcStationCode,
      streamNumber:     ps.streamNumber,
      name:             ps.name,
      registeredVoters: ps.registeredVoters,
      centreName:       ps.registrationCentre.name,
      wardName:         ps.ward.name,
      wardCode:         ps.ward.iebcCode,
      constituencyName: ps.constituency.name,
      constituencyCode: ps.constituency.iebcCode,
      countyName:       ps.county.name,
      countyCode:       ps.county.iebcCode,
      latitude:         ps.latitude,
      longitude:        ps.longitude,
      stationType:      ps.stationType,
      active:           ps.active,
      electionYear:     ps.electionYear,
    };
  }

  /**
   * Search polling stations by name — used in Admin Portal and Agent App.
   */
  async searchStations(query: string, limit = 20): Promise<PollingStation[]> {
    return this.stationRepo.find({
      where: { name: ILike(`%${query}%`), active: true },
      relations: ['registrationCentre', 'ward', 'constituency', 'county'],
      take: limit,
      order: { name: 'ASC' },
    });
  }

  // ── Registered Voters ─────────────────────────────────────────────────────

  async getTotalRegisteredVoters(): Promise<number> {
    const result = await this.countyRepo
      .createQueryBuilder('c')
      .select('SUM(c.registered_voters)', 'total')
      .where('c.is_special = FALSE')
      .getRawOne();
    return parseInt(result?.total ?? '0', 10);
  }

  async getRegisteredVotersByCounty(): Promise<{ code: string; name: string; voters: number }[]> {
    const counties = await this.countyRepo.find({
      where: { active: true, isSpecial: false },
      order: { iebcCode: 'ASC' },
    });
    return counties.map((c) => ({
      code:   c.iebcCode,
      name:   c.name,
      voters: c.registeredVoters,
    }));
  }

  // ── Platform Stats ────────────────────────────────────────────────────────

  async getStats(): Promise<GeographyStats> {
    const [
      counties,
      constituencies,
      wards,
      centres,
      stations,
      totalVoters,
    ] = await Promise.all([
      this.countyRepo.count({ where: { active: true, isSpecial: false } }),
      this.constRepo.count({ where: { active: true, isSpecial: false } }),
      this.wardRepo.count({ where: { active: true, isSpecial: false } }),
      this.centreRepo.count({ where: { active: true } }),
      this.stationRepo.count({ where: { active: true, stationType: StationType.STANDARD } }),
      this.getTotalRegisteredVoters(),
    ]);

    const year = await this.getActiveElectionYear();

    return {
      counties,
      constituencies,
      wards,
      registrationCentres: centres,
      pollingStations:     stations,
      totalRegisteredVoters: totalVoters,
      electionYear: year,
    };
  }
}
