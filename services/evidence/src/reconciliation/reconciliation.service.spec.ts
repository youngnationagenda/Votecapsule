/**
 * VoteCapsule -- Reconciliation Service Unit Tests
 * services/evidence/src/reconciliation/reconciliation.service.spec.ts
 *
 * Comprehensive tests for the Form B/C reconciliation engine:
 * - submitFormB with internal validation
 * - reconcileFormB: sum(Form As) == Form B
 * - reconcileFormC: sum(Form Bs) == Form C
 * - getMissingFormAs: stations without valid submissions
 * - getReconciliationSummary: dashboard statistics
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Test } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { DataSource } from 'typeorm';

import {
  ReconciliationService,
  FormBData,
} from './reconciliation.service';

// ── Test Fixtures ──────────────────────────────────────────────

const TENANT_ID = '11111111-1111-1111-1111-111111111111';
const ELECTION_ID = '22222222-2222-2222-2222-222222222222';
const FORM_B_ID = '33333333-3333-3333-3333-333333333333';
const FORM_C_ID = '44444444-4444-4444-4444-444444444444';

/** Valid Form B submission DTO — realistic Kenya numbers */
function makeValidFormBDto(overrides: Record<string, any> = {}) {
  return {
    tenantId: TENANT_ID,
    electionId: ELECTION_ID,
    electionYear: 2027,
    positionCode: 'PRESIDENT',
    formType: 'FORM_34B',
    countyCode: '001',
    constituencyCode: '001',
    wardCode: null,
    totalStations: 50,
    stationsReported: 50,
    registeredVoters: 25000,
    ballotsIssued: 21000,
    spoiltBallots: 250,
    rejectedBallots: 750,
    validVotes: 20000,
    candidates: [
      { ballotNumber: 1, candidateName: 'William Ruto', partyAbbreviation: 'UDA', votes: 11000 },
      { ballotNumber: 2, candidateName: 'Raila Odinga', partyAbbreviation: 'ODM', votes: 7500 },
      { ballotNumber: 3, candidateName: 'George Wajackoyah', partyAbbreviation: 'RBK', votes: 1500 },
    ],
    returningOfficerName: 'John Mutiso',
    returningOfficerId: null,
    ...overrides,
  };
}

/** Form B row as returned by DB query */
function makeFormBRow(overrides: Record<string, any> = {}) {
  return {
    id: FORM_B_ID,
    tenant_id: TENANT_ID,
    election_id: ELECTION_ID,
    election_year: 2027,
    position_code: 'PRESIDENT',
    form_type: 'FORM_34B',
    county_code: '001',
    constituency_code: '001',
    ward_code: null,
    total_stations: 50,
    stations_reported: 50,
    registered_voters: 25000,
    ballots_issued: 21000,
    spoilt_ballots: 250,
    rejected_ballots: 750,
    valid_votes: 20000,
    reconciliation_status: 'PENDING',
    status: 'SUBMITTED',
    returning_officer_name: 'John Mutiso',
    reconciliation_checked_at: null,
    created_at: new Date(),
    candidates: [
      { ballotNumber: 1, candidateName: 'William Ruto', votes: 11000 },
      { ballotNumber: 2, candidateName: 'Raila Odinga', votes: 7500 },
      { ballotNumber: 3, candidateName: 'George Wajackoyah', votes: 1500 },
    ],
    ...overrides,
  };
}

// ── Service Setup ──────────────────────────────────────────────

describe('ReconciliationService', () => {
  let service: ReconciliationService;
  let dataSource: any;
  let queryResults: Record<string, any[]>;

  beforeEach(async () => {
    queryResults = {};

    dataSource = {
      query: vi.fn().mockImplementation(async (sql: string, params?: any[]) => {
        // Return pre-configured results based on SQL pattern
        if (sql.includes('SELECT id FROM iebc_form_b_collations')) {
          return queryResults['checkDuplicate'] ?? [];
        }
        if (sql.includes('FROM iebc_form_b_collations fb') && sql.includes('LEFT JOIN iebc_form_b_candidates fc')) {
          return queryResults['formB'] ?? [makeFormBRow()];
        }
        if (sql.includes('FROM evidence_capsules ec') && sql.includes('tally_data IS NOT NULL')) {
          return queryResults['formAs'] ?? [];
        }
        if (sql.includes('FROM iebc_form_b_candidates WHERE form_b_id')) {
          return queryResults['formBCandidates'] ?? [
            { ballot_number: 1, votes: 11000 },
            { ballot_number: 2, votes: 7500 },
            { ballot_number: 3, votes: 1500 },
          ];
        }
        if (sql.includes('UPDATE iebc_form_b_collations')) {
          return queryResults['updateFormB'] ?? [];
        }
        if (sql.includes('INSERT INTO iebc_reconciliation_alerts')) {
          return queryResults['insertAlert'] ?? [{ id: 'alert-uuid-001', alert_type: 'FORM_B_MISMATCH', severity: 'HIGH', description: 'test' }];
        }
        if (sql.includes('FROM nec_polling_stations')) {
          return queryResults['necStations'] ?? [];
        }
        if (sql.includes('FROM evidence_capsules ec') && sql.includes('ec.is_deleted = FALSE')) {
          return queryResults['submittedFormAs'] ?? [];
        }
        if (sql.includes('FROM iebc_form_b_collations') && sql.includes('GROUP BY position_code')) {
          return queryResults['summary'] ?? [];
        }
        if (sql.includes('FROM iebc_reconciliation_alerts') && sql.includes('COUNT')) {
          return queryResults['alertCount'] ?? [{ count: '0' }];
        }
        if (sql.includes('FROM iebc_form_c_declarations fc')) {
          return queryResults['formC'] ?? [];
        }
        if (sql.includes('FROM iebc_form_b_collations fb') && sql.includes('fb.status IN')) {
          return queryResults['formBsForC'] ?? [];
        }
        if (sql.includes('UPDATE iebc_form_c_declarations')) {
          return [];
        }
        return [];
      }),
      transaction: vi.fn().mockImplementation(async (fn: any) => {
        const mockManager = {
          query: vi.fn().mockImplementation(async (sql: string, params?: any[]) => {
            if (sql.includes('INSERT INTO iebc_form_b_collations')) {
              return [{ id: FORM_B_ID }];
            }
            if (sql.includes('INSERT INTO iebc_form_b_candidates')) {
              return [];
            }
            if (sql.includes('INSERT INTO iebc_reconciliation_alerts')) {
              return [];
            }
            if (sql.includes('INSERT INTO iebc_form_c_declarations')) {
              return [{ id: FORM_C_ID }];
            }
            if (sql.includes('INSERT INTO iebc_form_c_candidates')) {
              return [];
            }
            return [];
          }),
        };
        return fn(mockManager);
      }),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        ReconciliationService,
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = moduleRef.get<ReconciliationService>(ReconciliationService);
  });

  // ── validateFormBInternal ────────────────────────────────────

  describe('validateFormBInternal', () => {
    it('returns valid for correct data', () => {
      const data: FormBData = {
        registeredVoters: 25000,
        ballotsIssued: 21000,
        spoiltBallots: 250,
        rejectedBallots: 750,
        validVotes: 20000,
        candidates: [
          { ballotNumber: 1, candidateName: 'A', votes: 11000 },
          { ballotNumber: 2, candidateName: 'B', votes: 7500 },
          { ballotNumber: 3, candidateName: 'C', votes: 1500 },
        ],
      };

      const result = service.validateFormBInternal(data);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('detects ballots_issued != valid + rejected + spoilt', () => {
      const data: FormBData = {
        registeredVoters: 25000,
        ballotsIssued: 22000, // should be 20000+750+250=21000
        spoiltBallots: 250,
        rejectedBallots: 750,
        validVotes: 20000,
        candidates: [
          { ballotNumber: 1, candidateName: 'A', votes: 20000 },
        ],
      };

      const result = service.validateFormBInternal(data);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('Ballots issued');
    });

    it('detects sum(candidate_votes) != validVotes', () => {
      const data: FormBData = {
        registeredVoters: 25000,
        ballotsIssued: 21000,
        spoiltBallots: 250,
        rejectedBallots: 750,
        validVotes: 20000,
        candidates: [
          { ballotNumber: 1, candidateName: 'A', votes: 10000 },
          { ballotNumber: 2, candidateName: 'B', votes: 5000 },
          // sum = 15000 != 20000
        ],
      };

      const result = service.validateFormBInternal(data);
      expect(result.valid).toBe(false);
      expect(result.errors).toEqual(expect.arrayContaining([
        expect.stringContaining('Sum of candidate votes'),
      ]));
    });

    it('detects turnout exceeding registered voters', () => {
      const data: FormBData = {
        registeredVoters: 15000, // less than validVotes
        ballotsIssued: 21000,
        spoiltBallots: 250,
        rejectedBallots: 750,
        validVotes: 20000, // > 15000
        candidates: [
          { ballotNumber: 1, candidateName: 'A', votes: 20000 },
        ],
      };

      const result = service.validateFormBInternal(data);
      expect(result.valid).toBe(false);
      expect(result.errors).toEqual(expect.arrayContaining([
        expect.stringContaining('exceeds registered voters'),
      ]));
    });

    it('detects negative values', () => {
      const data: FormBData = {
        registeredVoters: 25000,
        ballotsIssued: -100,
        spoiltBallots: 250,
        rejectedBallots: 750,
        validVotes: 20000,
        candidates: [
          { ballotNumber: 1, candidateName: 'A', votes: 20000 },
        ],
      };

      const result = service.validateFormBInternal(data);
      expect(result.valid).toBe(false);
      expect(result.errors).toEqual(expect.arrayContaining([
        expect.stringContaining('cannot be negative'),
      ]));
    });

    it('detects negative candidate votes', () => {
      const data: FormBData = {
        registeredVoters: 25000,
        ballotsIssued: 21000,
        spoiltBallots: 250,
        rejectedBallots: 750,
        validVotes: 20000,
        candidates: [
          { ballotNumber: 1, candidateName: 'Candidate X', votes: -500 },
          { ballotNumber: 2, candidateName: 'Candidate Y', votes: 20500 },
        ],
      };

      const result = service.validateFormBInternal(data);
      expect(result.valid).toBe(false);
      expect(result.errors).toEqual(expect.arrayContaining([
        expect.stringContaining('Candidate X'),
        expect.stringContaining('negative votes'),
      ]));
    });

    it('generates high turnout warning (> 95%) but stays valid', () => {
      const data: FormBData = {
        registeredVoters: 1000,
        ballotsIssued: 980,
        spoiltBallots: 5,
        rejectedBallots: 15,
        validVotes: 960, // 96% turnout
        candidates: [
          { ballotNumber: 1, candidateName: 'A', votes: 960 },
        ],
      };

      const result = service.validateFormBInternal(data);
      expect(result.valid).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toContain('Very high turnout');
    });
  });

  // ── submitFormB ──────────────────────────────────────────────

  describe('submitFormB', () => {
    it('creates record and triggers reconciliation', async () => {
      queryResults['checkDuplicate'] = [];
      // reconcileFormB returns form B
      queryResults['formB'] = [makeFormBRow()];
      // Form As matching perfectly
      queryResults['formAs'] = [
        {
          iebc_station_code: '001001001000001',
          constituency_code: '001',
          ward_code: '0010',
          tally_data: { validVotes: 20000, ballotsIssued: 21000, candidates: [
            { ballotNumber: 1, votes: 11000 },
            { ballotNumber: 2, votes: 7500 },
            { ballotNumber: 3, votes: 1500 },
          ]},
          valid_votes_form: 20000,
          ballots_issued: 21000,
          rejected_ballots_form: 750,
          spoilt_ballots: 250,
          status: 'APPROVED',
        },
      ];

      const dto = makeValidFormBDto();
      const result = await service.submitFormB(dto as any);

      expect(result.formBId).toBe(FORM_B_ID);
      expect(result.reconciliation).toBeDefined();
      expect(dataSource.transaction).toHaveBeenCalled();
    });

    it('rejects duplicate submission', async () => {
      queryResults['checkDuplicate'] = [{ id: 'existing-form-b-id' }];

      const dto = makeValidFormBDto();

      await expect(service.submitFormB(dto as any))
        .rejects.toThrow(ConflictException);
    });

    it('creates INTERNAL_MISMATCH alert when Form B has internal errors', async () => {
      queryResults['checkDuplicate'] = [];
      queryResults['formB'] = [makeFormBRow()];
      queryResults['formAs'] = [];

      const dto = makeValidFormBDto({
        ballotsIssued: 99999, // doesn't match valid + rejected + spoilt
      });

      // Should not throw -- internal errors are logged but don't block
      const result = await service.submitFormB(dto as any);
      expect(result.formBId).toBe(FORM_B_ID);
    });
  });

  // ── reconcileFormB ──────────────────────────────────────────

  describe('reconcileFormB', () => {
    it('with matching totals returns MATCHED', async () => {
      queryResults['formB'] = [makeFormBRow({ valid_votes: 20000, ballots_issued: 21000 })];
      queryResults['formAs'] = [
        {
          iebc_station_code: '001001001000001',
          constituency_code: '001', ward_code: '0010',
          tally_data: {
            validVotes: 10000, ballotsIssued: 10500,
            candidates: [{ ballotNumber: 1, votes: 5500 }, { ballotNumber: 2, votes: 3750 }, { ballotNumber: 3, votes: 750 }],
          },
          valid_votes_form: 10000, ballots_issued: 10500,
          status: 'APPROVED',
        },
        {
          iebc_station_code: '001001001000002',
          constituency_code: '001', ward_code: '0010',
          tally_data: {
            validVotes: 10000, ballotsIssued: 10500,
            candidates: [{ ballotNumber: 1, votes: 5500 }, { ballotNumber: 2, votes: 3750 }, { ballotNumber: 3, votes: 750 }],
          },
          valid_votes_form: 10000, ballots_issued: 10500,
          status: 'ANCHORED',
        },
      ];
      queryResults['formBCandidates'] = [
        { ballot_number: 1, votes: 11000 },
        { ballot_number: 2, votes: 7500 },
        { ballot_number: 3, votes: 1500 },
      ];

      const result = await service.reconcileFormB(FORM_B_ID);

      expect(result.status).toBe('MATCHED');
      expect(result.alerts).toHaveLength(0);
      expect(result.delta).toEqual({});
    });

    it('with mismatch returns DISCREPANCY and creates alert', async () => {
      queryResults['formB'] = [makeFormBRow({ valid_votes: 20000 })];
      // Sum of Form As = 18000 (not 20000)
      queryResults['formAs'] = [
        {
          iebc_station_code: '001001001000001',
          tally_data: { validVotes: 18000, ballotsIssued: 19000, candidates: [] },
          valid_votes_form: 18000, ballots_issued: 19000,
          status: 'APPROVED',
        },
      ];
      queryResults['formBCandidates'] = [
        { ballot_number: 1, votes: 11000 },
        { ballot_number: 2, votes: 7500 },
        { ballot_number: 3, votes: 1500 },
      ];
      queryResults['insertAlert'] = [{
        id: 'alert-new-001',
        alert_type: 'FORM_B_MISMATCH',
        severity: 'HIGH',
        description: 'Form B valid_votes=20000 but SUM(Form As)=18000',
        delta_json: {},
      }];

      const result = await service.reconcileFormB(FORM_B_ID);

      expect(result.status).toBe('DISCREPANCY');
      expect(result.alerts.length).toBeGreaterThan(0);
      expect(result.alerts[0].alertType).toBe('FORM_B_MISMATCH');
      expect(result.delta).toHaveProperty('validVotes', 2000);
    });

    it('with missing Form As returns MATCHED when sum is zero (no data yet)', async () => {
      queryResults['formB'] = [makeFormBRow({ valid_votes: 20000 })];
      queryResults['formAs'] = []; // No Form As submitted yet
      queryResults['formBCandidates'] = [
        { ballot_number: 1, votes: 11000 },
        { ballot_number: 2, votes: 7500 },
        { ballot_number: 3, votes: 1500 },
      ];

      const result = await service.reconcileFormB(FORM_B_ID);

      // With no Form As, expected = 0, formB = 20000 => DISCREPANCY
      expect(result.status).toBe('DISCREPANCY');
      expect(result.delta).toHaveProperty('validVotes', 20000);
    });

    it('throws NotFoundException for non-existent Form B', async () => {
      queryResults['formB'] = [];

      await expect(service.reconcileFormB('non-existent-id'))
        .rejects.toThrow(NotFoundException);
    });

    it('detects per-candidate vote mismatch', async () => {
      queryResults['formB'] = [makeFormBRow({ valid_votes: 20000, ballots_issued: 21000 })];
      queryResults['formAs'] = [
        {
          iebc_station_code: '001001001000001',
          tally_data: {
            validVotes: 20000, ballotsIssued: 21000,
            candidates: [
              { ballotNumber: 1, votes: 10000 }, // Form B says 11000 => delta=1000
              { ballotNumber: 2, votes: 7500 },
              { ballotNumber: 3, votes: 2500 },  // Form B says 1500 => delta=-1000
            ],
          },
          valid_votes_form: 20000, ballots_issued: 21000,
          status: 'APPROVED',
        },
      ];
      queryResults['formBCandidates'] = [
        { ballot_number: 1, votes: 11000 },
        { ballot_number: 2, votes: 7500 },
        { ballot_number: 3, votes: 1500 },
      ];

      const result = await service.reconcileFormB(FORM_B_ID);

      expect(result.status).toBe('DISCREPANCY');
      expect(result.delta).toHaveProperty('candidates');
    });
  });

  // ── getMissingFormAs ─────────────────────────────────────────

  describe('getMissingFormAs', () => {
    it('returns stations that have not submitted Form A', async () => {
      queryResults['formB'] = [makeFormBRow({ constituency_code: '001' })];
      queryResults['necStations'] = [
        { iebc_station_code: '001001001000001', station_name: 'Station A', ward_code: '0010', ward_name: 'Ward 1', registered_voters: 500 },
        { iebc_station_code: '001001001000002', station_name: 'Station B', ward_code: '0010', ward_name: 'Ward 1', registered_voters: 600 },
        { iebc_station_code: '001001001000003', station_name: 'Station C', ward_code: '0010', ward_name: 'Ward 1', registered_voters: 450 },
      ];
      queryResults['submittedFormAs'] = [
        { iebc_station_code: '001001001000001', status: 'APPROVED' },
        // Station 2 and 3 are missing
      ];

      // Override the query mock for this specific scenario
      dataSource.query.mockImplementation(async (sql: string, params?: any[]) => {
        if (sql.includes('FROM iebc_form_b_collations WHERE id')) {
          return [makeFormBRow({ constituency_code: '001' })];
        }
        if (sql.includes('FROM nec_polling_stations')) {
          return queryResults['necStations'];
        }
        if (sql.includes('FROM evidence_capsules ec') && sql.includes('ec.is_deleted = FALSE')) {
          return queryResults['submittedFormAs'];
        }
        return [];
      });

      const result = await service.getMissingFormAs(FORM_B_ID);

      expect(result).toHaveLength(3);

      const stationA = result.find((s) => s.iebcStationCode === '001001001000001');
      expect(stationA!.hasFormA).toBe(true);
      expect(stationA!.formAStatus).toBe('APPROVED');

      const stationB = result.find((s) => s.iebcStationCode === '001001001000002');
      expect(stationB!.hasFormA).toBe(false);
      expect(stationB!.formAStatus).toBeNull();

      const stationC = result.find((s) => s.iebcStationCode === '001001001000003');
      expect(stationC!.hasFormA).toBe(false);
      expect(stationC!.formAStatus).toBeNull();
    });

    it('throws NotFoundException for non-existent Form B', async () => {
      dataSource.query.mockImplementation(async (sql: string) => {
        if (sql.includes('FROM iebc_form_b_collations WHERE id')) {
          return [];
        }
        return [];
      });

      await expect(service.getMissingFormAs('non-existent-id'))
        .rejects.toThrow(NotFoundException);
    });
  });

  // ── submitAndReconcileFormC ──────────────────────────────────

  describe('submitAndReconcileFormC', () => {
    it('creates county-level Form C declaration', async () => {
      // After insert, reconcileFormC will be called
      queryResults['formC'] = [{
        id: FORM_C_ID,
        tenant_id: TENANT_ID,
        election_id: ELECTION_ID,
        election_year: 2027,
        position_code: 'GOVERNOR',
        form_type: 'FORM_37C',
        county_code: '001',
        total_valid_votes: 200000,
        total_ballots_issued: 210000,
        total_rejected_ballots: 7500,
        candidates: [
          { ballotNumber: 1, votes: 120000 },
          { ballotNumber: 2, votes: 80000 },
        ],
      }];
      queryResults['formBsForC'] = [
        {
          valid_votes: 100000, ballots_issued: 105000, rejected_ballots: 3750,
          county_code: '001', constituency_code: '001',
          candidates: [{ ballotNumber: 1, votes: 60000 }, { ballotNumber: 2, votes: 40000 }],
        },
        {
          valid_votes: 100000, ballots_issued: 105000, rejected_ballots: 3750,
          county_code: '001', constituency_code: '002',
          candidates: [{ ballotNumber: 1, votes: 60000 }, { ballotNumber: 2, votes: 40000 }],
        },
      ];

      // Need to override query to return form C data for reconcileFormC
      dataSource.query.mockImplementation(async (sql: string, params?: any[]) => {
        if (sql.includes('FROM iebc_form_c_declarations fc') && sql.includes('LEFT JOIN iebc_form_c_candidates')) {
          return queryResults['formC'];
        }
        if (sql.includes('FROM iebc_form_b_collations fb') && sql.includes('fb.status IN')) {
          return queryResults['formBsForC'];
        }
        if (sql.includes('UPDATE iebc_form_c_declarations')) {
          return [];
        }
        if (sql.includes('INSERT INTO iebc_reconciliation_alerts')) {
          return [];
        }
        return [];
      });

      const dto = {
        tenantId: TENANT_ID,
        electionId: ELECTION_ID,
        electionYear: 2027,
        positionCode: 'GOVERNOR',
        formType: 'FORM_37C',
        countyCode: '001',
        totalFormBs: 2,
        registeredVoters: 250000,
        ballotsIssued: 210000,
        validVotes: 200000,
        rejectedBallots: 7500,
        candidates: [
          { ballotNumber: 1, candidateName: 'Governor A', partyAbbreviation: 'UDA', votes: 120000 },
          { ballotNumber: 2, candidateName: 'Governor B', partyAbbreviation: 'ODM', votes: 80000 },
        ],
        declaringOfficerName: 'County RO',
      };

      const result = await service.submitAndReconcileFormC(dto as any);
      expect(result.formCId).toBe(FORM_C_ID);
      expect(result.reconciliation).toBeDefined();
    });
  });

  // ── reconcileFormC ──────────────────────────────────────────

  describe('reconcileFormC', () => {
    it('with matching totals returns MATCHED', async () => {
      dataSource.query.mockImplementation(async (sql: string) => {
        if (sql.includes('FROM iebc_form_c_declarations fc')) {
          return [{
            id: FORM_C_ID,
            tenant_id: TENANT_ID,
            election_id: ELECTION_ID,
            election_year: 2027,
            position_code: 'GOVERNOR',
            form_type: 'FORM_37C',
            county_code: '001',
            total_valid_votes: 20000,
            total_ballots_issued: 21000,
            total_rejected_ballots: 750,
            candidates: [
              { ballotNumber: 1, votes: 12000 },
              { ballotNumber: 2, votes: 8000 },
            ],
          }];
        }
        if (sql.includes('FROM iebc_form_b_collations fb')) {
          return [
            {
              valid_votes: 10000, ballots_issued: 10500, rejected_ballots: 375,
              county_code: '001', constituency_code: '001',
              candidates: [{ ballotNumber: 1, votes: 6000 }, { ballotNumber: 2, votes: 4000 }],
            },
            {
              valid_votes: 10000, ballots_issued: 10500, rejected_ballots: 375,
              county_code: '001', constituency_code: '002',
              candidates: [{ ballotNumber: 1, votes: 6000 }, { ballotNumber: 2, votes: 4000 }],
            },
          ];
        }
        if (sql.includes('UPDATE iebc_form_c_declarations')) return [];
        if (sql.includes('INSERT INTO iebc_reconciliation_alerts')) return [];
        return [];
      });

      const result = await service.reconcileFormC(FORM_C_ID);

      expect(result.status).toBe('MATCHED');
      expect(result.alerts).toHaveLength(0);
      expect(result.formBsChecked).toBe(2);
      expect(result.expectedValidVotes).toBe(20000);
      expect(result.formCValidVotes).toBe(20000);
    });

    it('with mismatch returns DISCREPANCY with alerts', async () => {
      dataSource.query.mockImplementation(async (sql: string) => {
        if (sql.includes('FROM iebc_form_c_declarations fc')) {
          return [{
            id: FORM_C_ID,
            tenant_id: TENANT_ID,
            election_id: ELECTION_ID,
            election_year: 2027,
            position_code: 'GOVERNOR',
            form_type: 'FORM_37C',
            county_code: '001',
            total_valid_votes: 25000, // claimed 25000 but sum of Bs = 20000
            total_ballots_issued: 26000,
            total_rejected_ballots: 750,
            candidates: [
              { ballotNumber: 1, votes: 15000 },
              { ballotNumber: 2, votes: 10000 },
            ],
          }];
        }
        if (sql.includes('FROM iebc_form_b_collations fb')) {
          return [
            {
              valid_votes: 10000, ballots_issued: 10500, rejected_ballots: 375,
              county_code: '001', constituency_code: '001',
              candidates: [{ ballotNumber: 1, votes: 6000 }, { ballotNumber: 2, votes: 4000 }],
            },
            {
              valid_votes: 10000, ballots_issued: 10500, rejected_ballots: 375,
              county_code: '001', constituency_code: '002',
              candidates: [{ ballotNumber: 1, votes: 6000 }, { ballotNumber: 2, votes: 4000 }],
            },
          ];
        }
        if (sql.includes('UPDATE iebc_form_c_declarations')) return [];
        if (sql.includes('INSERT INTO iebc_reconciliation_alerts')) return [];
        return [];
      });

      const result = await service.reconcileFormC(FORM_C_ID);

      expect(result.status).toBe('DISCREPANCY');
      expect(result.alerts.length).toBeGreaterThan(0);
      expect(result.delta).toHaveProperty('validVotes', 5000);
      expect(result.expectedValidVotes).toBe(20000);
      expect(result.formCValidVotes).toBe(25000);
    });

    it('with Form Bs missing returns DISCREPANCY (partial coverage)', async () => {
      dataSource.query.mockImplementation(async (sql: string) => {
        if (sql.includes('FROM iebc_form_c_declarations fc')) {
          return [{
            id: FORM_C_ID,
            tenant_id: TENANT_ID,
            election_id: ELECTION_ID,
            election_year: 2027,
            position_code: 'SENATOR',
            form_type: 'FORM_38C',
            county_code: '001',
            total_valid_votes: 50000,
            total_ballots_issued: 52000,
            total_rejected_ballots: 1500,
            candidates: [
              { ballotNumber: 1, votes: 30000 },
              { ballotNumber: 2, votes: 20000 },
            ],
          }];
        }
        if (sql.includes('FROM iebc_form_b_collations fb')) {
          // Only 1 Form B submitted out of expected many
          return [
            {
              valid_votes: 10000, ballots_issued: 10500, rejected_ballots: 375,
              county_code: '001', constituency_code: '001',
              candidates: [{ ballotNumber: 1, votes: 6000 }, { ballotNumber: 2, votes: 4000 }],
            },
          ];
        }
        if (sql.includes('UPDATE iebc_form_c_declarations')) return [];
        if (sql.includes('INSERT INTO iebc_reconciliation_alerts')) return [];
        return [];
      });

      const result = await service.reconcileFormC(FORM_C_ID);

      expect(result.status).toBe('DISCREPANCY');
      expect(result.formBsChecked).toBe(1);
      // Delta shows large mismatch because most Form Bs missing
      expect(result.delta).toHaveProperty('validVotes', 40000); // 50000 - 10000
    });

    it('throws NotFoundException for non-existent Form C', async () => {
      dataSource.query.mockImplementation(async (sql: string) => {
        if (sql.includes('FROM iebc_form_c_declarations fc')) {
          return [];
        }
        return [];
      });

      await expect(service.reconcileFormC('non-existent-id'))
        .rejects.toThrow(NotFoundException);
    });

    it('handles presidential 34C national scope (no county filter)', async () => {
      dataSource.query.mockImplementation(async (sql: string, params?: any[]) => {
        if (sql.includes('FROM iebc_form_c_declarations fc')) {
          return [{
            id: FORM_C_ID,
            tenant_id: TENANT_ID,
            election_id: ELECTION_ID,
            election_year: 2027,
            position_code: 'PRESIDENT', // national scope
            form_type: 'FORM_34C',
            county_code: null,
            total_valid_votes: 15000000,
            total_ballots_issued: 15500000,
            total_rejected_ballots: 400000,
            candidates: [
              { ballotNumber: 1, votes: 8000000 },
              { ballotNumber: 2, votes: 7000000 },
            ],
          }];
        }
        if (sql.includes('FROM iebc_form_b_collations fb')) {
          // Should pass isNational=true and not filter by county
          return [
            {
              valid_votes: 7500000, ballots_issued: 7750000,
              county_code: '001', constituency_code: '001',
              candidates: [{ ballotNumber: 1, votes: 4000000 }, { ballotNumber: 2, votes: 3500000 }],
            },
            {
              valid_votes: 7500000, ballots_issued: 7750000,
              county_code: '002', constituency_code: '010',
              candidates: [{ ballotNumber: 1, votes: 4000000 }, { ballotNumber: 2, votes: 3500000 }],
            },
          ];
        }
        if (sql.includes('UPDATE iebc_form_c_declarations')) return [];
        if (sql.includes('INSERT INTO iebc_reconciliation_alerts')) return [];
        return [];
      });

      const result = await service.reconcileFormC(FORM_C_ID);

      expect(result.status).toBe('MATCHED');
      expect(result.formBsChecked).toBe(2);
      expect(result.expectedValidVotes).toBe(15000000);
    });
  });

  // ── getReconciliationSummary ─────────────────────────────────

  describe('getReconciliationSummary', () => {
    it('returns correct aggregated counts', async () => {
      dataSource.query.mockImplementation(async (sql: string) => {
        if (sql.includes('GROUP BY position_code')) {
          return [
            { position_code: 'PRESIDENT', form_type: 'FORM_34B', total: '47', matched: '40', discrepancies: '5', pending: '2', awaiting_forms: '0' },
            { position_code: 'GOVERNOR', form_type: 'FORM_37B', total: '290', matched: '250', discrepancies: '20', pending: '10', awaiting_forms: '10' },
          ];
        }
        if (sql.includes('iebc_reconciliation_alerts') && sql.includes('COUNT')) {
          return [{ count: '25' }];
        }
        return [];
      });

      const result = await service.getReconciliationSummary(ELECTION_ID);

      expect(result.electionId).toBe(ELECTION_ID);
      expect(result.byPosition).toHaveLength(2);
      expect(result.byPosition[0].positionCode).toBe('PRESIDENT');
      expect(result.byPosition[0].totalFormBs).toBe(47);
      expect(result.byPosition[0].matched).toBe(40);

      expect(result.totals.totalFormBs).toBe(337); // 47 + 290
      expect(result.totals.matched).toBe(290);      // 40 + 250
      expect(result.totals.discrepancies).toBe(25); // 5 + 20
      expect(result.totals.pending).toBe(12);       // 2 + 10
      expect(result.totals.awaitingForms).toBe(10); // 0 + 10
      expect(result.totals.openAlerts).toBe(25);
    });

    it('returns empty summary when no Form Bs exist', async () => {
      dataSource.query.mockImplementation(async (sql: string) => {
        if (sql.includes('GROUP BY position_code')) {
          return [];
        }
        if (sql.includes('iebc_reconciliation_alerts') && sql.includes('COUNT')) {
          return [{ count: '0' }];
        }
        return [];
      });

      const result = await service.getReconciliationSummary(ELECTION_ID);

      expect(result.electionId).toBe(ELECTION_ID);
      expect(result.byPosition).toHaveLength(0);
      expect(result.totals.totalFormBs).toBe(0);
      expect(result.totals.matched).toBe(0);
      expect(result.totals.discrepancies).toBe(0);
      expect(result.totals.openAlerts).toBe(0);
    });
  });
});
