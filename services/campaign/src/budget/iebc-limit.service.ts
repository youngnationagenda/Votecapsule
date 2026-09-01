// ============================================================
// VoteCapsule™ — IEBC Limit Service  (Gazette GN 12251 · 7 Aug 2026)
// Resolves the correct IEBC spending limit for any position + geography.
//
// ── RULES PER IEBC FIFTH SCHEDULE ────────────────────────────
//
//  POSITION          SCHEDULE          SCOPE
//  ─────────────────────────────────────────────────────────
//  PRESIDENT         First Schedule    National (1 limit = KES 6.11 B)
//                                      NOTE: Presidential candidate's
//                                      campaign spending limit covers
//                                      the ENTIRE country — it is the
//                                      single national presidential limit.
//                                      We also surface the national
//                                      roll-up (sum of all county limits)
//                                      as contextual info.
//
//  GOVERNOR          Second Schedule   County level (county_code required)
//  SENATOR           Second Schedule   County level (county_code required)
//  WOMEN_REP         Second Schedule   County level (county_code required)
//
//  MP                Third Schedule    Constituency level (const_code req.)
//
//  MCA               Fourth Schedule   Ward level (ward_code required)
//
//  PARTY             Fifth Schedule    Party-wide — returns the 11
//                                      gazette line-item categories with
//                                      actual KES amounts (not percentages).
//                                      Total = KES 24.45 B.
// ============================================================
import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';

// ── Party categories (Fifth Schedule, GN 12251) ─────────────
// Actual gazette KES amounts per category
export interface PartyBudgetCategory {
  code:         string;
  name:         string;
  gazetteAmountKes: number;
  sharePercent: number;
}

export const PARTY_GAZETTE_CATEGORIES: PartyBudgetCategory[] = [
  { code: 'venues',          name: 'Venues for Campaign Rallies',         gazetteAmountKes:    375_052_688, sharePercent:  1.5 },
  { code: 'publicity',       name: 'Publicity Materials',                  gazetteAmountKes:  1_066_714_464, sharePercent:  4.4 },
  { code: 'advertising',     name: 'Advertising & Media',                  gazetteAmountKes:  2_517_509_489, sharePercent: 10.3 },
  { code: 'personnel',       name: 'Campaign Personnel',                   gazetteAmountKes:    332_922_614, sharePercent:  1.4 },
  { code: 'agents',          name: 'Election Agents',                      gazetteAmountKes:  2_081_162_296, sharePercent:  8.5 },
  { code: 'transport',       name: 'Transportation',                       gazetteAmountKes: 16_126_632_035, sharePercent: 66.0 },
  { code: 'communication',   name: 'Communication & Telephone',            gazetteAmountKes:    134_230_217, sharePercent:  0.5 },
  { code: 'nomination_fees', name: 'Nomination Fees',                      gazetteAmountKes:    213_818_044, sharePercent:  0.9 },
  { code: 'security',        name: 'Security',                             gazetteAmountKes:    285_090_725, sharePercent:  1.2 },
  { code: 'accommodation',   name: 'Accommodation & Travel',               gazetteAmountKes:     24_945_438, sharePercent:  0.1 },
  { code: 'administrative',  name: 'Administrative Cost',                  gazetteAmountKes:  1_292_094_521, sharePercent:  5.3 },
];

export const PARTY_TOTAL_LIMIT = 24_450_172_531;

export interface IEBCLimitResult {
  position:              string;
  spendingLimitKes:      number;
  schedule:              string;
  gazetteRef:            string;
  // Geography context
  countyCode?:           string;
  countyName?:           string;
  constituencyCode?:     string;
  constituencyName?:     string;
  wardCode?:             string;
  wardName?:             string;
  registeredVoters?:     number;
  wardCount?:            number;
  pollingStations?:      number;
  // For PRESIDENT — national roll-up
  nationalCountyTotal?:  number;  // sum of all 47 county governor limits
  nationalConstTotal?:   number;  // sum of all 290 constituency limits
  nationalWardTotal?:    number;  // sum of all ward MCA limits
  // For PARTY — 11 gazette line-item categories
  partyCategories?:      PartyBudgetCategory[];
  // Flags
  isComputed:            boolean;
  isPartyWide:           boolean;
  isNational:            boolean;
}

// ── Position normalisation ────────────────────────────────────
const POSITION_ALIASES: Record<string, string> = {
  PRESIDENT:                  'PRESIDENT',
  PRESIDENTIAL:               'PRESIDENT',
  GOVERNOR:                   'GOVERNOR',
  SENATOR:                    'SENATOR',
  WOMEN_REP:                  'WOMEN_REP',
  WOMEN_REPRESENTATIVE:       'WOMEN_REP',
  WOMEN_MEMBER:               'WOMEN_REP',
  COUNTY_WOMEN_REPRESENTATIVE:'WOMEN_REP',
  MP:                         'MP',
  MEMBER_OF_PARLIAMENT:       'MP',
  NATIONAL_ASSEMBLY:          'MP',
  MCA:                        'MCA',
  MEMBER_OF_COUNTY_ASSEMBLY:  'MCA',
  WARD_REP:                   'MCA',
  WARD:                       'MCA',
  PARTY:                      'PARTY',
  PARTY_WIDE:                 'PARTY',
};

@Injectable()
export class IEBCLimitService {
  private readonly logger = new Logger(IEBCLimitService.name);

  constructor(private readonly dataSource: DataSource) {}

  /**
   * Resolve the IEBC gazette spending limit for position + geography.
   *
   * PRESIDENT → returns the single national presidential limit (KES 6.11B)
   *             PLUS national roll-up totals for context.
   * PARTY     → returns KES 24.45B total with all 11 gazette categories.
   * GOVERNOR/SENATOR/WOMEN_REP → county limit (countyCode required).
   * MP        → constituency limit (constituencyCode required).
   * MCA       → ward limit (wardCode required).
   */
  async resolve(
    rawPosition:       string,
    countyCode?:       string | null,
    constituencyCode?: string | null,
    wardCode?:         string | null,
    isParty?:          boolean,
  ): Promise<IEBCLimitResult | null> {
    const pos = POSITION_ALIASES[(rawPosition ?? '').toUpperCase().trim().replace(/[\s\-]+/g, '_')] ?? null;
    if (!pos) {
      this.logger.warn(`Unknown position: "${rawPosition}"`);
      return null;
    }

    // ── PARTY (Fifth Schedule) ────────────────────────────────
    if (pos === 'PARTY' || isParty) {
      const rows = await this.dataSource.query(
        `SELECT total_limit_kes, gazette_ref, schedule, categories
         FROM iebc_party_limits WHERE election_year = 2027 LIMIT 1`,
      ).catch(() => []);

      const row = rows[0];
      const total = Number(row?.total_limit_kes ?? PARTY_TOTAL_LIMIT);

      return {
        position:         'PARTY',
        spendingLimitKes: total,
        schedule:         row?.schedule ?? 'Fifth Schedule',
        gazetteRef:       row?.gazette_ref ?? 'GN 12251 (7 Aug 2026)',
        partyCategories:  PARTY_GAZETTE_CATEGORIES,
        isComputed:       false,
        isPartyWide:      true,
        isNational:       true,
      };
    }

    // ── PRESIDENT (First Schedule) ────────────────────────────
    if (pos === 'PRESIDENT') {
      const rows = await this.dataSource.query(
        `SELECT spending_limit_kes, gazette_ref, schedule
         FROM iebc_presidential_limit WHERE election_year = 2027 LIMIT 1`,
      ).catch(() => []);

      const row = rows[0];
      const presLimit = Number(row?.spending_limit_kes ?? 6_112_543_133);

      // National roll-up totals (contextual — not additive to the pres. limit)
      const [countySum, constSum, wardSum] = await Promise.all([
        this.dataSource.query(
          `SELECT COALESCE(SUM(governor_limit), 0)::bigint AS total FROM iebc_county_limits WHERE election_year = 2027`,
        ).catch(() => [{ total: 0 }]),
        this.dataSource.query(
          `SELECT COALESCE(SUM(spending_limit_kes), 0)::bigint AS total FROM iebc_constituency_limits WHERE election_year = 2027`,
        ).catch(() => [{ total: 0 }]),
        this.dataSource.query(
          `SELECT COALESCE(SUM(mca_spending_limit), 0)::bigint AS total FROM iebc_ward_limits WHERE election_year = 2027`,
        ).catch(() => [{ total: 0 }]),
      ]);

      return {
        position:             'PRESIDENT',
        spendingLimitKes:     presLimit,
        schedule:             row?.schedule ?? 'First Schedule',
        gazetteRef:           row?.gazette_ref ?? 'GN 12251 (7 Aug 2026)',
        nationalCountyTotal:  Number(countySum[0]?.total ?? 0),
        nationalConstTotal:   Number(constSum[0]?.total ?? 0),
        nationalWardTotal:    Number(wardSum[0]?.total ?? 0),
        // Presidential candidate's budget also mirrors the party gazette categories
        // so they can plan spending across the 11 gazette items
        partyCategories:      PARTY_GAZETTE_CATEGORIES.map(c => ({
          ...c,
          // Scale party amounts proportionally to presidential limit
          gazetteAmountKes: Math.round(presLimit * (c.sharePercent / 100)),
        })),
        isComputed:           false,
        isPartyWide:          false,
        isNational:           true,
      };
    }

    // ── GOVERNOR / SENATOR / WOMEN_REP (Second Schedule) ─────
    if (['GOVERNOR', 'SENATOR', 'WOMEN_REP'].includes(pos)) {
      if (!countyCode) return null;
      const cc = countyCode.padStart(3, '0');

      const rows = await this.dataSource.query(
        `SELECT county_code, county_name, governor_limit, senator_limit,
                women_rep_limit, gazette_ref, schedule
         FROM iebc_county_limits
         WHERE county_code = $1 AND election_year = 2027 LIMIT 1`,
        [cc],
      ).catch(() => []);

      if (!rows.length) {
        this.logger.warn(`No county limit found for county_code=${cc}`);
        return null;
      }
      const row = rows[0];

      const geoRows = await this.dataSource.query(
        `SELECT registered_voters, ward_count, polling_station_count
         FROM nec_counties WHERE iebc_code = $1 LIMIT 1`,
        [cc],
      ).catch(() => []);
      const geo = geoRows[0];

      const limitField = pos === 'GOVERNOR' ? 'governor_limit'
                       : pos === 'SENATOR'  ? 'senator_limit'
                       : 'women_rep_limit';
      const limit = Number(row[limitField]);

      return {
        position:         pos,
        spendingLimitKes: limit,
        schedule:         row.schedule ?? 'Second Schedule',
        gazetteRef:       row.gazette_ref ?? 'GN 12251 (7 Aug 2026)',
        countyCode:       row.county_code,
        countyName:       row.county_name,
        registeredVoters: Number(geo?.registered_voters ?? 0),
        wardCount:        Number(geo?.ward_count ?? 0),
        pollingStations:  Number(geo?.polling_station_count ?? 0),
        // Proportional gazette categories scaled to this candidate's limit
        partyCategories:  PARTY_GAZETTE_CATEGORIES.map(c => ({
          ...c,
          gazetteAmountKes: Math.round(limit * (c.sharePercent / 100)),
        })),
        isComputed:       false,
        isPartyWide:      false,
        isNational:       false,
      };
    }

    // ── MP (Third Schedule) ───────────────────────────────────
    if (pos === 'MP') {
      if (!constituencyCode) return null;

      const rows = await this.dataSource.query(
        `SELECT constituency_code, constituency_name, county_code,
                spending_limit_kes, population, gazette_ref, schedule
         FROM iebc_constituency_limits
         WHERE constituency_code = $1::integer AND election_year = 2027 LIMIT 1`,
        [constituencyCode],
      ).catch(() => []);

      if (!rows.length) {
        this.logger.warn(`No constituency limit for code=${constituencyCode}`);
        return null;
      }
      const row = rows[0];

      const geoRows = await this.dataSource.query(
        `SELECT c.registered_voters, c.ward_count, c.polling_station_count,
                co.name AS county_name
         FROM nec_constituencies c
         JOIN nec_counties co ON co.id = c.county_id
         WHERE c.iebc_code = $1 LIMIT 1`,
        [String(constituencyCode).padStart(3, '0')],
      ).catch(() => []);
      const geo = geoRows[0];
      const limit = Number(row.spending_limit_kes);

      return {
        position:          'MP',
        spendingLimitKes:  limit,
        schedule:          row.schedule ?? 'Third Schedule',
        gazetteRef:        row.gazette_ref ?? 'GN 12251 (7 Aug 2026)',
        countyCode:        row.county_code,
        countyName:        geo?.county_name ?? '',
        constituencyCode:  String(row.constituency_code),
        constituencyName:  row.constituency_name,
        registeredVoters:  Number(geo?.registered_voters ?? row.population ?? 0),
        wardCount:         Number(geo?.ward_count ?? 0),
        pollingStations:   Number(geo?.polling_station_count ?? 0),
        partyCategories:   PARTY_GAZETTE_CATEGORIES.map(c => ({
          ...c,
          gazetteAmountKes: Math.round(limit * (c.sharePercent / 100)),
        })),
        isComputed:        false,
        isPartyWide:       false,
        isNational:        false,
      };
    }

    // ── MCA (Fourth Schedule) ─────────────────────────────────
    if (pos === 'MCA') {
      if (!wardCode) return null;
      const wc = wardCode.toString().replace(/\D/g, '').padStart(4, '0');

      const rows = await this.dataSource.query(
        `SELECT ward_code, ward_name, constituency_code, county_code,
                registered_voters, mca_spending_limit, gazette_ref, schedule
         FROM iebc_ward_limits
         WHERE ward_code = $1 AND election_year = 2027 LIMIT 1`,
        [wc],
      ).catch(() => []);

      if (!rows.length) {
        this.logger.warn(`No ward limit for ward_code=${wc}`);
        return null;
      }
      const row = rows[0];

      const geoRows = await this.dataSource.query(
        `SELECT w.registered_voters, w.polling_station_count,
                c.iebc_code AS const_code, c.name AS const_name,
                co.iebc_code AS county_code_geo, co.name AS county_name
         FROM nec_wards w
         JOIN nec_constituencies c  ON c.id  = w.constituency_id
         JOIN nec_counties       co ON co.id = c.county_id
         WHERE w.iebc_code = $1 LIMIT 1`,
        [wc],
      ).catch(() => []);
      const geo = geoRows[0];
      const limit = Number(row.mca_spending_limit);

      return {
        position:          'MCA',
        spendingLimitKes:  limit,
        schedule:          row.schedule ?? 'Fourth Schedule',
        gazetteRef:        row.gazette_ref ?? 'GN 12251 (7 Aug 2026)',
        countyCode:        geo?.county_code_geo ?? row.county_code,
        countyName:        geo?.county_name ?? '',
        constituencyCode:  geo?.const_code  ?? row.constituency_code,
        constituencyName:  geo?.const_name  ?? '',
        wardCode:          row.ward_code,
        wardName:          row.ward_name,
        registeredVoters:  Number(geo?.registered_voters ?? row.registered_voters ?? 0),
        pollingStations:   Number(geo?.polling_station_count ?? 0),
        partyCategories:   PARTY_GAZETTE_CATEGORIES.map(c => ({
          ...c,
          gazetteAmountKes: Math.round(limit * (c.sharePercent / 100)),
        })),
        isComputed:        false,
        isPartyWide:       false,
        isNational:        false,
      };
    }

    return null;
  }
}
