// ============================================================
// VoteCapsule — Form B Reconciliation Service
// services/evidence/src/reconciliation/reconciliation.service.ts
//
// The reconciliation engine that enforces the IEBC A→B→C chain.
// Form B totals MUST equal the mathematical sum of all Form As
// in the same constituency/ward.
//
// CRITICAL PRINCIPLE: Discrepancies create ALERTS for human
// review. They NEVER block publication. AI ASSISTS, HUMANS DECIDE.
// ============================================================
import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { FormBSubmitDto } from './dto/form-b-submit.dto';
import { FormCSubmitDto } from './dto/form-c-submit.dto';

// ── Result types ──────────────────────────────────────────────

export interface ReconciliationResult {
  status: 'MATCHED' | 'DISCREPANCY';
  alerts: ReconciliationAlert[];
  delta: Record<string, unknown>;
  formBsChecked?: number;
  expectedValidVotes?: number;
  formCValidVotes?: number;
}

export interface ReconciliationAlert {
  id?: string;
  alertType: string;
  severity: string;
  description: string;
  deltaJson?: Record<string, unknown>;
  delta?: Record<string, unknown>;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface MissingStation {
  iebcStationCode: string;
  stationName: string;
  wardCode: string;
  wardName: string;
  registeredVoters: number;
  hasFormA: boolean;
  formAStatus: string | null;
}

export interface ReconciliationSummary {
  electionId: string;
  byPosition: PositionSummary[];
  totals: {
    totalFormBs: number;
    matched: number;
    discrepancies: number;
    pending: number;
    awaitingForms: number;
    openAlerts: number;
  };
}

export interface FormCReconciliationSummary {
  position_code: string;
  form_type: string;
  county_code: string | null;
  status: string;
  total_valid_votes: number;
  declared_by_name: string;
  declared_at: Date;
  open_alerts: number;
}

export interface PositionSummary {
  positionCode: string;
  formType: string;
  totalFormBs: number;
  matched: number;
  discrepancies: number;
  pending: number;
  awaitingForms: number;
}

// ── Service ───────────────────────────────────────────────────

@Injectable()
export class ReconciliationService {
  private readonly logger = new Logger(ReconciliationService.name);

  constructor(private readonly dataSource: DataSource) {}

  // ── Submit Form B ─────────────────────────────────────────

  /**
   * Returning Officer submits a Form B collation record.
   * Validates internal consistency before persisting.
   * Automatically triggers reconciliation against Form As.
   */
  async submitFormB(dto: FormBSubmitDto): Promise<{ formBId: string; reconciliation: ReconciliationResult }> {
    // Step 1: Internal consistency validation
    const validation = this.validateFormBInternal(dto as unknown as FormBData);
    if (validation.errors.length > 0) {
      this.logger.warn(`Form B validation errors: ${validation.errors.join(', ')}`);
      // Log errors but don't block submission — create INTERNAL_MISMATCH alert later
    }

    // Step 2: Check for duplicate (one Form B per position per constituency per election)
    const existing = await this.dataSource.query<{ id: string }[]>(
      `SELECT id FROM iebc_form_b_collations
       WHERE election_id = $1
         AND position_code = $2
         AND county_code = $3
         AND COALESCE(constituency_code, '') = $4
         AND COALESCE(ward_code, '') = $5`,
      [
        dto.electionId,
        dto.positionCode,
        dto.countyCode,
        dto.constituencyCode ?? '',
        dto.wardCode ?? '',
      ],
    );
    if (existing.length > 0) {
      throw new ConflictException(
        `A Form B already exists for election ${dto.electionId}, position ${dto.positionCode}, ` +
        `constituency ${dto.constituencyCode ?? 'N/A'} (ID: ${existing[0].id}). ` +
        `Use the update endpoint to modify it.`,
      );
    }

    // Step 3: Persist Form B + candidates atomically
    const formBId = await this.dataSource.transaction(async (manager) => {
      // Insert form B header
      const headerResult = await manager.query<{ id: string }[]>(
        `INSERT INTO iebc_form_b_collations (
          tenant_id, election_id, election_year, position_code, form_type,
          county_code, constituency_code, ward_code,
          total_stations, stations_reported,
          registered_voters, ballots_issued, spoilt_ballots, rejected_ballots, valid_votes,
          reconciliation_status, status,
          returning_officer_name, returning_officer_id,
          signed_at, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8,
          $9, $10,
          $11, $12, $13, $14, $15,
          'PENDING', 'SUBMITTED',
          $16, $17,
          NOW(), NOW(), NOW()
        ) RETURNING id`,
        [
          dto.tenantId, dto.electionId, dto.electionYear, dto.positionCode, dto.formType,
          dto.countyCode, dto.constituencyCode ?? null, dto.wardCode ?? null,
          dto.totalStations, dto.stationsReported,
          dto.registeredVoters, dto.ballotsIssued, dto.spoiltBallots, dto.rejectedBallots, dto.validVotes,
          dto.returningOfficerName, dto.returningOfficerId ?? null,
        ],
      );
      const id = headerResult[0].id;

      // Insert candidate rows
      for (const c of dto.candidates) {
        await manager.query(
          `INSERT INTO iebc_form_b_candidates (
            form_b_id, ballot_number, candidate_name,
            running_mate_name, deputy_name, party_abbreviation, votes, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
          [id, c.ballotNumber, c.candidateName, c.runningMateName ?? null, c.deputyName ?? null, c.partyAbbreviation, c.votes],
        );
      }

      // If internal validation failed, create an internal mismatch alert now
      if (validation.errors.length > 0) {
        await manager.query(
          `INSERT INTO iebc_reconciliation_alerts (
            tenant_id, election_id, election_year, alert_type, severity,
            position_code, county_code, constituency_code, ward_code,
            form_b_id, description, delta_json, status, created_at, updated_at
          ) VALUES ($1, $2, $3, 'INTERNAL_MISMATCH', 'HIGH', $4, $5, $6, $7, $8, $9, $10, 'OPEN', NOW(), NOW())`,
          [
            dto.tenantId, dto.electionId, dto.electionYear,
            dto.positionCode, dto.countyCode, dto.constituencyCode ?? null, dto.wardCode ?? null,
            id,
            `Form B internal inconsistency: ${validation.errors.join('; ')}`,
            JSON.stringify({ errors: validation.errors }),
          ],
        );
      }

      return id;
    });

    this.logger.log(
      `Form B ${formBId} submitted — election ${dto.electionId}, position ${dto.positionCode}, ` +
      `constituency ${dto.constituencyCode ?? 'N/A'}`,
    );

    // Step 4: Run reconciliation against Form As
    const reconciliation = await this.reconcileFormB(formBId);

    return { formBId, reconciliation };
  }

  // ── Reconcile Form B against Form As ─────────────────────

  /**
   * Fetch all APPROVED/ANCHORED/PUBLISHED Form As for the same
   * election + position + constituency and compare their SUM against
   * the Form B values.
   *
   * Creates iebc_reconciliation_alerts for any discrepancy.
   * Updates reconciliation_status on the Form B record.
   *
   * NEVER auto-approves or auto-rejects — flags for human review only.
   */
  async reconcileFormB(formBId: string): Promise<ReconciliationResult> {
    // Fetch Form B header
    const formBs = await this.dataSource.query<FormBRow[]>(
      `SELECT fb.*, array_agg(
         json_build_object(
           'ballotNumber', fc.ballot_number,
           'candidateName', fc.candidate_name,
           'votes', fc.votes
         )
       ) AS candidates
       FROM iebc_form_b_collations fb
       LEFT JOIN iebc_form_b_candidates fc ON fc.form_b_id = fb.id
       WHERE fb.id = $1
       GROUP BY fb.id`,
      [formBId],
    );

    if (!formBs.length) {
      throw new NotFoundException(`Form B ${formBId} not found`);
    }
    const formB = formBs[0];

    // Fetch all eligible Form As: same election + position + constituency
    // Filter by constituency_code for MP/MCA/Governor/Senator/WomenRep
    // For PRESIDENT, match by county since 34As are per constituency but 34B can be national
    const formAs = await this.dataSource.query<FormARow[]>(
      `SELECT
         ec.iebc_station_code,
         ec.constituency_code,
         ec.ward_code,
         ec.tally_data,
         ec.valid_votes_form,
         ec.ballots_issued,
         ec.rejected_ballots_form,
         ec.spoilt_ballots,
         ec.status
       FROM evidence_capsules ec
       WHERE ec.election_id = $1
         AND ec.position_code = $2
         AND ec.tally_data IS NOT NULL
         AND ec.status IN ('APPROVED', 'ANCHORED', 'PUBLISHED')
         AND ec.is_deleted = FALSE
         AND (
           ($3::CHAR IS NULL AND ec.county_code = $4)
           OR
           ($3::CHAR IS NOT NULL AND ec.constituency_code = $3)
         )
         AND (
           ($5::CHAR IS NULL)
           OR
           ($5::CHAR IS NOT NULL AND ec.ward_code = $5)
         )`,
      [
        formB.election_id,
        formB.position_code,
        formB.constituency_code ?? null,
        formB.county_code,
        formB.ward_code ?? null,
      ],
    );

    // Compute expected totals from Form As
    let expectedValidVotes = 0;
    let expectedBallotsIssued = 0;
    const expectedCandidateVotes: Record<number, number> = {};

    for (const fa of formAs) {
      // Use extracted columns if available, else fall back to JSONB
      const tallyData = fa.tally_data as TallyDataJson | null;
      const validVotes = fa.valid_votes_form ?? tallyData?.validVotes ?? 0;
      const ballotsIssued = fa.ballots_issued ?? tallyData?.ballotsIssued ?? 0;

      expectedValidVotes += Number(validVotes);
      expectedBallotsIssued += Number(ballotsIssued);

      // Aggregate per-candidate votes from JSONB
      if (tallyData?.candidates) {
        for (const c of tallyData.candidates) {
          const bn = c.ballotNumber;
          expectedCandidateVotes[bn] = (expectedCandidateVotes[bn] ?? 0) + Number(c.votes ?? 0);
        }
      }
    }

    // Compare against Form B
    const alerts: ReconciliationAlert[] = [];
    const delta: ReconciliationResult['delta'] = {};

    const validVotesDelta = formB.valid_votes - expectedValidVotes;
    if (validVotesDelta !== 0) {
      delta.validVotes = validVotesDelta;
    }

    const ballotsIssuedDelta = formB.ballots_issued - expectedBallotsIssued;
    if (ballotsIssuedDelta !== 0) {
      delta.ballotsIssued = ballotsIssuedDelta;
    }

    // Per-candidate comparison against Form B candidates
    const formBCandidateRows = await this.dataSource.query<{ ballot_number: number; votes: number }[]>(
      `SELECT ballot_number, votes FROM iebc_form_b_candidates WHERE form_b_id = $1 ORDER BY ballot_number`,
      [formBId],
    );

    const candidateDelta: Record<number, number> = {};
    for (const fbCand of formBCandidateRows) {
      const bn = fbCand.ballot_number;
      const expected = expectedCandidateVotes[bn] ?? 0;
      const d = fbCand.votes - expected;
      if (d !== 0) {
        candidateDelta[bn] = d;
      }
    }
    if (Object.keys(candidateDelta).length > 0) {
      delta.candidates = candidateDelta;
    }

    // Determine overall status
    const hasMismatch = validVotesDelta !== 0 || ballotsIssuedDelta !== 0 || Object.keys(candidateDelta).length > 0;
    const reconciliationStatus = hasMismatch ? 'DISCREPANCY' : 'MATCHED';

    // Upsert reconciliation result on Form B
    await this.dataSource.query(
      `UPDATE iebc_form_b_collations
       SET reconciliation_status = $1,
           reconciliation_checked_at = NOW(),
           reconciliation_delta = $2,
           updated_at = NOW()
       WHERE id = $3`,
      [reconciliationStatus, JSON.stringify(delta), formBId],
    );

    // Create alerts for any discrepancy (transactionally, deduplicated)
    if (hasMismatch) {
      const severity = Math.abs(validVotesDelta) > 10 ? 'HIGH' : 'LOW';
      const description =
        `Form B valid_votes=${formB.valid_votes} but SUM(Form As)=${expectedValidVotes}. ` +
        `Delta=${validVotesDelta}. ` +
        `Stations reported: ${formAs.length} of ${formB.total_stations}.`;

      const alertResult = await this.dataSource.query<{ id: string }[]>(
        `INSERT INTO iebc_reconciliation_alerts (
          tenant_id, election_id, election_year, alert_type, severity,
          position_code, county_code, constituency_code, ward_code,
          form_b_id, description, delta_json, status, created_at, updated_at
        ) VALUES ($1, $2, $3, 'FORM_B_MISMATCH', $4, $5, $6, $7, $8, $9, $10, $11, 'OPEN', NOW(), NOW())
        ON CONFLICT DO NOTHING
        RETURNING id, alert_type, severity, description, delta_json`,
        [
          formB.tenant_id, formB.election_id, formB.election_year,
          severity,
          formB.position_code, formB.county_code,
          formB.constituency_code ?? null,
          formB.ward_code ?? null,
          formBId,
          description,
          JSON.stringify({
            form_b_valid_votes: formB.valid_votes,
            expected_valid_votes: expectedValidVotes,
            delta_valid_votes: validVotesDelta,
            form_b_ballots_issued: formB.ballots_issued,
            expected_ballots_issued: expectedBallotsIssued,
            delta_ballots_issued: ballotsIssuedDelta,
            candidate_deltas: candidateDelta,
            form_as_counted: formAs.length,
            total_stations: formB.total_stations,
          }),
        ],
      );

      for (const r of alertResult) {
        alerts.push({
          id: r.id,
          alertType: 'FORM_B_MISMATCH',
          severity,
          description,
          deltaJson: { validVotesDelta, ballotsIssuedDelta, candidateDelta },
        });
      }

      this.logger.warn(
        `Form B ${formBId} DISCREPANCY: Form B valid_votes=${formB.valid_votes}, ` +
        `SUM(Form As)=${expectedValidVotes}, delta=${validVotesDelta}`,
      );
    } else {
      this.logger.log(`Form B ${formBId} MATCHED — ${formAs.length} Form As summed correctly.`);
    }

    return { status: reconciliationStatus, alerts, delta };
  }

  // ── Internal consistency validation ──────────────────────

  /**
   * Validates the internal mathematical consistency of a Form B before or after submission.
   *
   * Rules (per IEBC regulations):
   * 1. ballots_issued == valid_votes + rejected_ballots + spoilt_ballots
   * 2. sum(candidate_votes) == valid_votes
   * 3. valid_votes <= registered_voters (turnout cannot exceed register)
   * 4. All vote counts >= 0
   */
  validateFormBInternal(data: FormBData): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    const { ballotsIssued, validVotes, rejectedBallots, spoiltBallots, registeredVoters, candidates } = data;

    // Rule 1: ballots_issued = valid + rejected + spoilt
    const expectedBallots = validVotes + rejectedBallots + spoiltBallots;
    if (ballotsIssued !== expectedBallots) {
      errors.push(
        `Ballots issued (${ballotsIssued}) ≠ validVotes(${validVotes}) + rejectedBallots(${rejectedBallots}) ` +
        `+ spoiltBallots(${spoiltBallots}) = ${expectedBallots}. Delta: ${ballotsIssued - expectedBallots}`,
      );
    }

    // Rule 2: sum(candidate_votes) == valid_votes
    const sumCandidates = candidates.reduce((sum, c) => sum + (c.votes ?? 0), 0);
    if (sumCandidates !== validVotes) {
      errors.push(
        `Sum of candidate votes (${sumCandidates}) ≠ valid_votes (${validVotes}). ` +
        `Delta: ${sumCandidates - validVotes}`,
      );
    }

    // Rule 3: turnout check
    if (validVotes > registeredVoters) {
      errors.push(
        `Valid votes (${validVotes}) exceeds registered voters (${registeredVoters}). ` +
        `Turnout cannot exceed 100%.`,
      );
    }

    // Rule 4: negative values
    for (const field of ['ballotsIssued', 'validVotes', 'rejectedBallots', 'spoiltBallots'] as const) {
      if ((data[field] ?? 0) < 0) {
        errors.push(`${field} cannot be negative (got ${data[field]})`);
      }
    }
    for (const c of candidates) {
      if ((c.votes ?? 0) < 0) {
        errors.push(`Candidate ${c.candidateName} (ballot #${c.ballotNumber}) has negative votes: ${c.votes}`);
      }
    }

    // Warning: very high turnout (> 95%)
    if (registeredVoters > 0) {
      const turnout = validVotes / registeredVoters;
      if (turnout > 0.95) {
        warnings.push(`Very high turnout: ${(turnout * 100).toFixed(1)}%. Verify against station registers.`);
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  // ── Missing Form As ───────────────────────────────────────

  /**
   * Returns polling stations in the Form B's constituency that have NOT
   * yet submitted a valid Form A (or are not yet APPROVED/ANCHORED/PUBLISHED).
   */
  async getMissingFormAs(formBId: string): Promise<MissingStation[]> {
    const formBs = await this.dataSource.query<FormBRow[]>(
      `SELECT * FROM iebc_form_b_collations WHERE id = $1`,
      [formBId],
    );
    if (!formBs.length) {
      throw new NotFoundException(`Form B ${formBId} not found`);
    }
    const formB = formBs[0];

    // Get all NEC stations in scope
    const stationsQuery = formB.ward_code
      ? `SELECT
           ps.iebc_station_code, ps.name AS station_name,
           w.iebc_code AS ward_code, w.name AS ward_name,
           ps.registered_voters
         FROM nec_polling_stations ps
         JOIN nec_wards w ON w.id = ps.ward_id
         JOIN nec_constituencies c ON c.id = ps.constituency_id
         WHERE w.iebc_code = $1 AND ps.active = TRUE`
      : formB.constituency_code
      ? `SELECT
           ps.iebc_station_code, ps.name AS station_name,
           w.iebc_code AS ward_code, w.name AS ward_name,
           ps.registered_voters
         FROM nec_polling_stations ps
         JOIN nec_wards w ON w.id = ps.ward_id
         JOIN nec_constituencies c ON c.id = ps.constituency_id
         WHERE c.iebc_code = $1 AND ps.active = TRUE`
      : `SELECT
           ps.iebc_station_code, ps.name AS station_name,
           w.iebc_code AS ward_code, w.name AS ward_name,
           ps.registered_voters
         FROM nec_polling_stations ps
         JOIN nec_wards w ON w.id = ps.ward_id
         JOIN nec_constituencies c ON c.id = ps.constituency_id
         JOIN nec_counties co ON co.id = c.county_id
         WHERE co.iebc_code = $1 AND ps.active = TRUE`;

    const scopeCode = formB.ward_code ?? formB.constituency_code ?? formB.county_code;
    const necStations = await this.dataSource.query<NecStation[]>(stationsQuery, [scopeCode]);

    // Get submitted Form As
    const submittedFormAs = await this.dataSource.query<{ iebc_station_code: string; status: string }[]>(
      `SELECT ec.iebc_station_code, ec.status
       FROM evidence_capsules ec
       WHERE ec.election_id = $1
         AND ec.position_code = $2
         AND ec.is_deleted = FALSE`,
      [formB.election_id, formB.position_code],
    );

    const submittedMap = new Map<string, string>();
    for (const fa of submittedFormAs) {
      submittedMap.set(fa.iebc_station_code, fa.status);
    }

    return necStations.map((station) => {
      const status = submittedMap.get(station.iebc_station_code) ?? null;
      return {
        iebcStationCode: station.iebc_station_code,
        stationName: station.station_name,
        wardCode: station.ward_code,
        wardName: station.ward_name,
        registeredVoters: station.registered_voters,
        hasFormA: status !== null,
        formAStatus: status,
      };
    });
  }

  // ── Reconciliation Summary (dashboard) ───────────────────

  /**
   * Returns aggregate reconciliation statistics for an election,
   * grouped by position_code, for the Authority portal dashboard.
   */
  async getReconciliationSummary(electionId: string): Promise<ReconciliationSummary> {
    const rows = await this.dataSource.query<SummaryRow[]>(
      `SELECT
         position_code,
         form_type,
         COUNT(*) AS total,
         COUNT(*) FILTER (WHERE reconciliation_status = 'MATCHED') AS matched,
         COUNT(*) FILTER (WHERE reconciliation_status = 'DISCREPANCY') AS discrepancies,
         COUNT(*) FILTER (WHERE reconciliation_status = 'PENDING') AS pending,
         COUNT(*) FILTER (WHERE reconciliation_status = 'AWAITING_FORMS') AS awaiting_forms
       FROM iebc_form_b_collations
       WHERE election_id = $1
       GROUP BY position_code, form_type
       ORDER BY position_code`,
      [electionId],
    );

    const alertCount = await this.dataSource.query<{ count: string }[]>(
      `SELECT COUNT(*) AS count FROM iebc_reconciliation_alerts WHERE election_id = $1 AND status = 'OPEN'`,
      [electionId],
    );

    const byPosition: PositionSummary[] = rows.map((r) => ({
      positionCode: r.position_code,
      formType: r.form_type,
      totalFormBs: Number(r.total),
      matched: Number(r.matched),
      discrepancies: Number(r.discrepancies),
      pending: Number(r.pending),
      awaitingForms: Number(r.awaiting_forms),
    }));

    const totals = byPosition.reduce(
      (acc, p) => ({
        totalFormBs: acc.totalFormBs + p.totalFormBs,
        matched: acc.matched + p.matched,
        discrepancies: acc.discrepancies + p.discrepancies,
        pending: acc.pending + p.pending,
        awaitingForms: acc.awaitingForms + p.awaitingForms,
        openAlerts: acc.openAlerts,
      }),
      {
        totalFormBs: 0,
        matched: 0,
        discrepancies: 0,
        pending: 0,
        awaitingForms: 0,
        openAlerts: Number(alertCount[0]?.count ?? 0),
      },
    );

    return { electionId, byPosition, totals };
  }

  // ── List Form Bs ──────────────────────────────────────────

  async listFormBs(params: {
    electionId: string;
    positionCode?: string;
    status?: string;
    reconciliationStatus?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ data: FormBSummary[]; total: number }> {
    const conditions: string[] = ['fb.election_id = $1'];
    const values: unknown[] = [params.electionId];
    let idx = 2;

    if (params.positionCode) {
      conditions.push(`fb.position_code = $${idx++}`);
      values.push(params.positionCode);
    }
    if (params.status) {
      conditions.push(`fb.status = $${idx++}`);
      values.push(params.status);
    }
    if (params.reconciliationStatus) {
      conditions.push(`fb.reconciliation_status = $${idx++}`);
      values.push(params.reconciliationStatus);
    }

    const where = conditions.join(' AND ');
    const limit = params.limit ?? 50;
    const offset = params.offset ?? 0;

    const [data, countResult] = await Promise.all([
      this.dataSource.query<FormBSummary[]>(
        `SELECT
           fb.id, fb.election_id, fb.position_code, fb.form_type,
           fb.county_code, fb.constituency_code, fb.ward_code,
           fb.total_stations, fb.stations_reported,
           fb.registered_voters, fb.ballots_issued, fb.valid_votes,
           fb.rejected_ballots, fb.spoilt_ballots,
           fb.reconciliation_status, fb.status,
           fb.returning_officer_name,
           fb.reconciliation_checked_at, fb.created_at,
           COUNT(a.id) AS open_alert_count
         FROM iebc_form_b_collations fb
         LEFT JOIN iebc_reconciliation_alerts a
           ON a.form_b_id = fb.id AND a.status = 'OPEN'
         WHERE ${where}
         GROUP BY fb.id
         ORDER BY fb.position_code, fb.constituency_code
         LIMIT $${idx} OFFSET $${idx + 1}`,
        [...values, limit, offset],
      ),
      this.dataSource.query<{ count: string }[]>(
        `SELECT COUNT(*) AS count FROM iebc_form_b_collations fb WHERE ${where}`,
        values,
      ),
    ]);

    return { data, total: Number(countResult[0]?.count ?? 0) };
  }

  // ── Get Form B detail ─────────────────────────────────────

  async getFormBDetail(formBId: string): Promise<FormBDetail> {
    const [formBRows, candidates, alerts] = await Promise.all([
      this.dataSource.query<FormBRow[]>(
        `SELECT * FROM iebc_form_b_collations WHERE id = $1`,
        [formBId],
      ),
      this.dataSource.query<{ ballot_number: number; candidate_name: string; party_abbreviation: string; votes: number }[]>(
        `SELECT ballot_number, candidate_name, party_abbreviation, votes
         FROM iebc_form_b_candidates WHERE form_b_id = $1 ORDER BY ballot_number`,
        [formBId],
      ),
      this.dataSource.query<AlertRow[]>(
        `SELECT id, alert_type, severity, description, status, delta_json, created_at
         FROM iebc_reconciliation_alerts
         WHERE form_b_id = $1
         ORDER BY created_at DESC`,
        [formBId],
      ),
    ]);

    if (!formBRows.length) {
      throw new NotFoundException(`Form B ${formBId} not found`);
    }

    return { ...formBRows[0], candidates, alerts };
  }

  // ── Alerts ────────────────────────────────────────────────

  async listAlerts(params: {
    electionId: string;
    severity?: string;
    status?: string;
    positionCode?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ data: AlertRow[]; total: number }> {
    const conditions: string[] = ['election_id = $1'];
    const values: unknown[] = [params.electionId];
    let idx = 2;

    if (params.severity) {
      conditions.push(`severity = $${idx++}`);
      values.push(params.severity);
    }
    if (params.status) {
      conditions.push(`status = $${idx++}`);
      values.push(params.status);
    }
    if (params.positionCode) {
      conditions.push(`position_code = $${idx++}`);
      values.push(params.positionCode);
    }

    const where = conditions.join(' AND ');
    const limit = params.limit ?? 50;
    const offset = params.offset ?? 0;

    const [data, countResult] = await Promise.all([
      this.dataSource.query<AlertRow[]>(
        `SELECT * FROM iebc_reconciliation_alerts
         WHERE ${where}
         ORDER BY severity DESC, created_at DESC
         LIMIT $${idx} OFFSET $${idx + 1}`,
        [...values, limit, offset],
      ),
      this.dataSource.query<{ count: string }[]>(
        `SELECT COUNT(*) AS count FROM iebc_reconciliation_alerts WHERE ${where}`,
        values,
      ),
    ]);

    return { data, total: Number(countResult[0]?.count ?? 0) };
  }

  async resolveAlert(
    alertId: string,
    resolvedBy: string,
    resolutionNotes: string,
    action: 'RESOLVED' | 'DISMISSED',
  ): Promise<void> {
    const result = await this.dataSource.query(
      `UPDATE iebc_reconciliation_alerts
       SET status = $1, resolved_by = $2, resolved_at = NOW(), resolution_notes = $3, updated_at = NOW()
       WHERE id = $4 AND status = 'OPEN'`,
      [action, resolvedBy, resolutionNotes, alertId],
    );

    if (!result.rowCount && result[1] === 0) {
      // Try fetching to see if it exists
      const exists = await this.dataSource.query(
        `SELECT id, status FROM iebc_reconciliation_alerts WHERE id = $1`,
        [alertId],
      );
      if (!exists.length) {
        throw new NotFoundException(`Alert ${alertId} not found`);
      }
      // Alert exists but is not OPEN — that's fine, just log
      this.logger.warn(`Alert ${alertId} is already resolved — ignoring resolve request`);
    }

    this.logger.log(`Alert ${alertId} ${action} by ${resolvedBy}`);
  }

  // ══════════════════════════════════════════════════════════
  //  LEVEL 3 — Form C vs SUM(Form Bs in county)
  //  Covers: GOVERNOR (37C), SENATOR (38C), WOMEN_REP (39C)
  //
  //  LEVEL 4 — Form 34C national vs SUM(all 34Bs nationally)
  //  Covers: PRESIDENT (34C)
  //
  //  Rule: Form C totals MUST equal the sum of all Form Bs
  //  for the same position within the county (or nationally).
  // ══════════════════════════════════════════════════════════

  /**
   * Submit a Form C declaration and immediately reconcile it
   * against all Form Bs in the same scope.
   *
   * Scope:
   *   - PRESIDENT (34C): county_code is NULL → sum ALL 34Bs nationally
   *   - GOVERNOR (37C) / SENATOR (38C) / WOMEN_REP (39C): sum all Bs in county
   */
  async submitAndReconcileFormC(dto: FormCSubmitDto): Promise<{ formCId: string; reconciliation: ReconciliationResult }> {
    const formCId = await this.dataSource.transaction(async (manager) => {
      // Insert Form C declaration record
      const result = await manager.query<{ id: string }[]>(
        `INSERT INTO iebc_form_c_declarations (
           tenant_id, election_id, election_year,
           position_code, form_type,
           county_code,
           total_form_bs, total_registered_voters,
           total_ballots_issued, total_valid_votes, total_rejected_ballots,
           declared_by_name, declared_by_id, declared_at,
           gazette_reference, status,
           created_at, updated_at
         ) VALUES (
           $1, $2, $3, $4, $5, $6,
           $7, $8, $9, $10, $11,
           $12, $13, NOW(),
           $14, 'DRAFT',
           NOW(), NOW()
         ) RETURNING id`,
        [
          dto.tenantId, dto.electionId, dto.electionYear,
          dto.positionCode, dto.formType,
          dto.countyCode ?? null,
          dto.totalFormBs ?? 0,
          dto.registeredVoters, dto.ballotsIssued, dto.validVotes, dto.rejectedBallots,
          dto.declaringOfficerName, dto.declaringOfficerId ?? null,
          dto.gazetteReference ?? null,
        ],
      );

      const fCId = result[0].id;

      // Insert per-candidate totals
      for (const cand of dto.candidates ?? []) {
        await manager.query(
          `INSERT INTO iebc_form_c_candidates
             (form_c_id, ballot_number, candidate_name, running_mate_name, deputy_name, party_abbreviation, total_votes)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            fCId,
            cand.ballotNumber,
            cand.candidateName,
            cand.runningMateName ?? null,
            cand.deputyName ?? null,
            cand.partyAbbreviation,
            cand.votes,
          ],
        );
      }

      return fCId;
    });

    // Immediately reconcile Form C against Form Bs
    const reconciliation = await this.reconcileFormC(formCId);
    return { formCId, reconciliation };
  }

  /**
   * LEVEL 3 / LEVEL 4 — Reconcile Form C against all Form Bs in scope.
   *
   * Presidential 34C: national scope — sums ALL 34Bs regardless of county.
   * Governor 37C / Senator 38C / Women Rep 39C: county scope — sums 37Bs/38Bs/39Bs for that county.
   *
   * Checks:
   *   1. formC.valid_votes == SUM(formB.valid_votes) in scope
   *   2. formC.candidate[x].votes == SUM(formB.candidate[x].votes) in scope
   *   3. formC.ballots_issued == SUM(formB.ballots_issued) in scope
   *   4. Internal: formC.valid_votes == SUM(formC.candidate_votes)
   */
  async reconcileFormC(formCId: string): Promise<ReconciliationResult> {
    // Fetch Form C
    const formCs = await this.dataSource.query<any[]>(
      `SELECT fc.*,
              array_agg(json_build_object(
                'ballotNumber', cc.ballot_number,
                'votes', cc.total_votes
              )) AS candidates
         FROM iebc_form_c_declarations fc
         LEFT JOIN iebc_form_c_candidates cc ON cc.form_c_id = fc.id
        WHERE fc.id = $1
        GROUP BY fc.id`,
      [formCId],
    );

    if (!formCs.length) throw new NotFoundException(`Form C ${formCId} not found`);
    const formC = formCs[0];

    const isNational = formC.position_code === 'PRESIDENT'; // 34C — aggregate nationally

    // Get corresponding Form B form type for this position
    const formBTypeMap: Record<string, string> = {
      PRESIDENT: 'FORM_34B',
      GOVERNOR:  'FORM_37B',
      SENATOR:   'FORM_38B',
      WOMEN_REP: 'FORM_39B',
      MP:        'FORM_35B', // MPs declare at 35B — no Form C needed, but handle gracefully
      MCA:       'FORM_36B', // MCAs declare at 36B — no Form C needed
    };
    const expectedFormBType = formBTypeMap[formC.position_code] ?? '';

    // Fetch all verified Form Bs in scope (MATCHED or DISCREPANCY — both count, discrepancy is flagged separately)
    const formBs = await this.dataSource.query<any[]>(
      `SELECT fb.valid_votes, fb.ballots_issued, fb.rejected_ballots, fb.county_code, fb.constituency_code,
              array_agg(json_build_object('ballotNumber', fc.ballot_number, 'votes', fc.votes)) AS candidates
         FROM iebc_form_b_collations fb
         LEFT JOIN iebc_form_b_candidates fc ON fc.form_b_id = fb.id
        WHERE fb.election_id = $1
          AND fb.position_code = $2
          AND fb.status IN ('SUBMITTED', 'VERIFIED', 'DECLARED')
          AND ($3::BOOLEAN = TRUE OR fb.county_code = $4)
        GROUP BY fb.id`,
      [
        formC.election_id,
        formC.position_code,
        isNational,          // if true, skip county filter
        formC.county_code,
      ],
    );

    // Aggregate expected totals from Form Bs
    let expectedValidVotes   = 0;
    let expectedBallotsIssued = 0;
    const expectedCandVotes: Record<number, number> = {};

    for (const fb of formBs) {
      expectedValidVotes    += Number(fb.valid_votes   ?? 0);
      expectedBallotsIssued += Number(fb.ballots_issued ?? 0);

      if (fb.candidates) {
        for (const c of fb.candidates) {
          if (c.ballotNumber != null) {
            expectedCandVotes[c.ballotNumber] = (expectedCandVotes[c.ballotNumber] ?? 0) + Number(c.votes ?? 0);
          }
        }
      }
    }

    const alerts: ReconciliationAlert[] = [];
    const delta: ReconciliationResult['delta'] = {};
    const scope = isNational ? 'National' : `${formC.county_code} County`;

    // Check 1: valid_votes match
    const vvDelta = Number(formC.total_valid_votes) - expectedValidVotes;
    if (vvDelta !== 0) {
      delta.validVotes = vvDelta;
      alerts.push({
        alertType: 'FORM_C_MISMATCH',
        severity: Math.abs(vvDelta) > 50 ? 'HIGH' : 'MEDIUM',
        description:
          `Form C (${formC.form_type}) ${scope} valid votes (${formC.total_valid_votes}) ` +
          `do not match sum of Form Bs (${expectedValidVotes}). Delta: ${vvDelta > 0 ? '+' : ''}${vvDelta}.`,
        delta: { validVotes: vvDelta },
      });
    }

    // Check 2: ballots issued match
    const biDelta = Number(formC.total_ballots_issued) - expectedBallotsIssued;
    if (biDelta !== 0) {
      delta.ballotsIssued = biDelta;
      alerts.push({
        alertType: 'FORM_C_MISMATCH',
        severity: 'MEDIUM',
        description:
          `Form C (${formC.form_type}) ${scope} ballots issued (${formC.total_ballots_issued}) ` +
          `do not match sum of Form Bs (${expectedBallotsIssued}). Delta: ${biDelta > 0 ? '+' : ''}${biDelta}.`,
        delta: { ballotsIssued: biDelta },
      });
    }

    // Check 3: per-candidate votes
    if (formC.candidates) {
      for (const c of formC.candidates) {
        if (c.ballotNumber == null) continue;
        const expected = expectedCandVotes[c.ballotNumber] ?? 0;
        const d = Number(c.votes) - expected;
        if (d !== 0) {
          delta[`candidate_${c.ballotNumber}`] = d;
          alerts.push({
            alertType: 'FORM_C_CANDIDATE_MISMATCH',
            severity: Math.abs(d) > 10 ? 'HIGH' : 'LOW',
            description:
              `Form C candidate ballot #${c.ballotNumber} — ` +
              `Form C shows ${c.votes} votes but sum of Form Bs shows ${expected}. Delta: ${d > 0 ? '+' : ''}${d}.`,
            delta: { candidateBallot: c.ballotNumber, delta: d },
          });
        }
      }
    }

    // Check 4: Form C internal — SUM(candidate_votes) == valid_votes
    if (formC.candidates?.length > 0) {
      const candSum = formC.candidates.reduce((s: number, c: any) => s + Number(c.votes ?? 0), 0);
      const intDelta = Number(formC.total_valid_votes) - candSum;
      if (intDelta !== 0) {
        alerts.push({
          alertType: 'CANDIDATE_SUM_MISMATCH',
          severity: 'HIGH',
          description:
            `Form C (${formC.form_type}) ${scope}: candidate votes sum (${candSum}) ` +
            `does not equal declared valid votes (${formC.total_valid_votes}). Delta: ${intDelta}.`,
          delta: { internalMismatch: intDelta },
        });
      }
    }

    const matched = alerts.length === 0;
    const newStatus = matched ? 'VERIFIED' : 'DISCREPANCY';

    // Update Form C status
    await this.dataSource.query(
      `UPDATE iebc_form_c_declarations
          SET status = $1, updated_at = NOW()
        WHERE id = $2`,
      [newStatus, formCId],
    );

    // Persist alerts
    for (const alert of alerts) {
      await this.dataSource.query(
        `INSERT INTO iebc_reconciliation_alerts
           (tenant_id, election_id, election_year, alert_type, severity,
            position_code, county_code, description, delta_json, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'OPEN', NOW(), NOW())
         ON CONFLICT DO NOTHING`,
        [
          formC.tenant_id,
          formC.election_id,
          formC.election_year,
          alert.alertType,
          alert.severity,
          formC.position_code,
          formC.county_code ?? null,
          alert.description,
          JSON.stringify(alert.delta),
        ],
      );
    }

    this.logger.log(
      `Form C reconciliation (${formC.form_type}, ${scope}): ${matched ? 'MATCHED ✅' : `DISCREPANCY ⚠️ — ${alerts.length} alerts`}`
    );

    return {
      status: matched ? 'MATCHED' : 'DISCREPANCY',
      formBsChecked: formBs.length,
      expectedValidVotes,
      formCValidVotes: Number(formC.total_valid_votes),
      alerts,
      delta,
    };
  }

  /**
   * Get a summary showing Form C reconciliation status for an election.
   * Shows which counties/positions have matched vs discrepancy Form Cs.
   */
  async getFormCReconciliationSummary(electionId: string): Promise<FormCReconciliationSummary[]> {
    return this.dataSource.query<FormCReconciliationSummary[]>(
      `SELECT
         fc.position_code,
         fc.form_type,
         fc.county_code,
         fc.status,
         fc.total_valid_votes,
         fc.declared_by_name,
         fc.declared_at,
         COUNT(a.id) FILTER (WHERE a.status = 'OPEN') AS open_alerts
       FROM iebc_form_c_declarations fc
       LEFT JOIN iebc_reconciliation_alerts a
         ON a.election_id = fc.election_id
         AND a.position_code = fc.position_code
         AND (a.county_code = fc.county_code OR (a.county_code IS NULL AND fc.county_code IS NULL))
       WHERE fc.election_id = $1
       GROUP BY fc.id
       ORDER BY fc.position_code, fc.county_code`,
      [electionId],
    );
  }
}

// ── Private helper types ──────────────────────────────────────

export interface FormBData {
  ballotsIssued: number;
  validVotes: number;
  rejectedBallots: number;
  spoiltBallots: number;
  registeredVoters: number;
  candidates: Array<{ ballotNumber: number; candidateName: string; votes: number }>;
}

interface FormBRow {
  id: string;
  tenant_id: string;
  election_id: string;
  election_year: number;
  position_code: string;
  form_type: string;
  county_code: string;
  constituency_code: string | null;
  ward_code: string | null;
  total_stations: number;
  stations_reported: number;
  registered_voters: number;
  ballots_issued: number;
  spoilt_ballots: number;
  rejected_ballots: number;
  valid_votes: number;
  reconciliation_status: string;
  status: string;
  returning_officer_name: string;
  reconciliation_checked_at: Date | null;
  created_at: Date;
}

export interface FormBSummary extends FormBRow {
  open_alert_count: number;
}

export interface FormBDetail extends FormBRow {
  candidates: Array<{ ballot_number: number; candidate_name: string; party_abbreviation: string; votes: number }>;
  alerts: AlertRow[];
}

interface FormARow {
  iebc_station_code: string;
  constituency_code: string;
  ward_code: string;
  tally_data: TallyDataJson | null;
  valid_votes_form: number | null;
  ballots_issued: number | null;
  rejected_ballots_form: number | null;
  spoilt_ballots: number | null;
  status: string;
}

interface TallyDataJson {
  validVotes?: number;
  ballotsIssued?: number;
  rejectedBallots?: number;
  spoiltBallots?: number;
  candidates?: Array<{ ballotNumber: number; votes: number }>;
}

interface NecStation {
  iebc_station_code: string;
  station_name: string;
  ward_code: string;
  ward_name: string;
  registered_voters: number;
}

export interface AlertRow {
  id: string;
  alert_type: string;
  severity: string;
  description: string;
  status: string;
  delta_json: Record<string, unknown>;
  constituency_code: string | null;
  position_code: string;
  form_b_id: string | null;
  created_at: Date;
}

interface SummaryRow {
  position_code: string;
  form_type: string;
  total: string;
  matched: string;
  discrepancies: string;
  pending: string;
  awaiting_forms: string;
}
