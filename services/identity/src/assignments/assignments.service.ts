/**
 * Vote Capsule™ Identity Service — Agent Assignments Service
 *
 * Manages the scoped assignment linking an agent to a specific election
 * and set of polling stations. Used by:
 *   - Mobile app (GET /assignments/me) — restricts agent capture scope
 *   - Party portal (CRUD) — party admin manages their agents' assignments
 *
 * Task 12 implementation per party.Sonie.md
 */

import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Inject,
} from '@nestjs/common';
import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { DATABASE_POOL } from '../database/database.module';

export interface AgentAssignment {
  id: string;
  tenantId: string;
  agentUserId: string;
  electionId: string;
  electionName: string;
  positionCode: string;
  areaName: string;
  countyCode: string | null;
  constituencyCode: string | null;
  wardCode: string | null;
  stations: PollingStation[];
  geofenceRadiusMeters: number;
  status: 'ACTIVE' | 'SUSPENDED' | 'COMPLETED';
  assignedBy: string | null;
  assignedAt: Date;
  expiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PollingStation {
  iebcCode: string;
  streamNumber: number;
  name: string;
  centreName: string;
  registeredVoters: number;
  latitude: number | null;
  longitude: number | null;
  countyCode: string;
  countyName: string;
  constituencyCode: string;
  constituencyName: string;
  wardCode: string;
  wardName: string;
}

export interface AssignmentWithAgent extends AgentAssignment {
  agentName: string | null;
  agentEmail: string;
  stationCount: number;
}

@Injectable()
export class AssignmentsService {
  private readonly logger = new Logger(AssignmentsService.name);

  constructor(@Inject(DATABASE_POOL) private readonly db: Pool) {}

  // ─────────────────────────────────────────────────────────────
  // GET /assignments/me — Mobile app endpoint
  // ─────────────────────────────────────────────────────────────

  /**
   * Returns the single ACTIVE assignment for the requesting agent.
   * Returns null (not an error) if no active assignment exists.
   * The mobile app shows "No Assignment" state when null.
   */
  async getMyAssignment(agentUserId: string, tenantId: string): Promise<AgentAssignment | null> {
    const result = await this.db.query<Record<string, unknown>>(
      `SELECT
         id,
         tenant_id        AS "tenantId",
         agent_user_id    AS "agentUserId",
         election_id      AS "electionId",
         election_name    AS "electionName",
         position_code    AS "positionCode",
         area_name        AS "areaName",
         county_code      AS "countyCode",
         constituency_code AS "constituencyCode",
         ward_code        AS "wardCode",
         stations,
         geofence_radius_meters AS "geofenceRadiusMeters",
         status,
         assigned_by      AS "assignedBy",
         assigned_at      AS "assignedAt",
         expires_at       AS "expiresAt",
         created_at       AS "createdAt",
         updated_at       AS "updatedAt"
       FROM agent_assignments
       WHERE agent_user_id = $1
         AND tenant_id = $2
         AND status = 'ACTIVE'
         AND (expires_at IS NULL OR expires_at > NOW())
       ORDER BY assigned_at DESC
       LIMIT 1`,
      [agentUserId, tenantId],
    );

    if (!result.rows.length) return null;
    return this.mapRow(result.rows[0]);
  }

  // ─────────────────────────────────────────────────────────────
  // GET /assignments?tenantId=X — Party portal list
  // ─────────────────────────────────────────────────────────────

  /**
   * Lists all assignments for a tenant with enriched agent info.
   * Used by the party portal assignment management screen.
   */
  async listByTenant(tenantId: string): Promise<AssignmentWithAgent[]> {
    const result = await this.db.query<Record<string, unknown>>(
      `SELECT
         aa.id,
         aa.tenant_id           AS "tenantId",
         aa.agent_user_id       AS "agentUserId",
         aa.election_id         AS "electionId",
         aa.election_name       AS "electionName",
         aa.position_code       AS "positionCode",
         aa.area_name           AS "areaName",
         aa.county_code         AS "countyCode",
         aa.constituency_code   AS "constituencyCode",
         aa.ward_code           AS "wardCode",
         aa.stations,
         aa.geofence_radius_meters AS "geofenceRadiusMeters",
         aa.status,
         aa.assigned_by         AS "assignedBy",
         aa.assigned_at         AS "assignedAt",
         aa.expires_at          AS "expiresAt",
         aa.created_at          AS "createdAt",
         aa.updated_at          AS "updatedAt",
         u.email                AS "agentEmail",
         TRIM(COALESCE(p.first_name,'') || ' ' || COALESCE(p.last_name,'')) AS "agentName",
         jsonb_array_length(aa.stations) AS "stationCount"
       FROM agent_assignments aa
       JOIN users u ON u.id = aa.agent_user_id
       LEFT JOIN user_profiles p ON p.user_id = aa.agent_user_id
       WHERE aa.tenant_id = $1
       ORDER BY aa.assigned_at DESC`,
      [tenantId],
    );

    return result.rows.map((row) => ({
      ...this.mapRow(row),
      agentEmail: String(row['agentEmail'] ?? ''),
      agentName: row['agentName'] ? String(row['agentName']) : null,
      stationCount: Number(row['stationCount'] ?? 0),
    }));
  }

  // ─────────────────────────────────────────────────────────────
  // POST /assignments — Create assignment
  // ─────────────────────────────────────────────────────────────

  /**
   * Creates a new agent assignment.
   *
   * Server-side enrichment:
   *   1. Verifies agent belongs to tenant
   *   2. Verifies election belongs to tenant (or is a shared GENERAL election)
   *   3. Looks up full station data from NEC geography tables
   *   4. Auto-derives election_name, position_code, area_name from election record
   *   5. Checks no existing ACTIVE assignment for agent+election
   */
  async create(data: {
    agentId: string;
    tenantId: string;
    electionId: string;
    stationCodes: string[];
    geofenceRadiusMeters?: number;
    assignedBy: string;
  }): Promise<AgentAssignment> {
    // 1. Verify agent exists and belongs to this tenant
    const agentCheck = await this.db.query(
      `SELECT u.id, u.email
       FROM users u
       JOIN tenant_members tm ON tm.user_id = u.id
       WHERE u.id = $1 AND tm.tenant_id = $2 AND u.deleted_at IS NULL AND tm.status = 'active'
       LIMIT 1`,
      [data.agentId, data.tenantId],
    );
    if (!agentCheck.rows.length) {
      throw new BadRequestException(
        `Agent ${data.agentId} does not belong to tenant ${data.tenantId}`,
      );
    }

    // 2. Fetch election details (candidate_elections table)
    const electionResult = await this.db.query<{
      id: string;
      name: string;
      position_code: string | null;
      election_type: string;
      tenant_id: string;
      county_code: string | null;
      constituency_code: string | null;
      ward_code: string | null;
    }>(
      `SELECT id, name, position_code, election_type, tenant_id,
              county_code, constituency_code, ward_code
       FROM candidate_elections
       WHERE id = $1`,
      [data.electionId],
    );

    if (!electionResult.rows.length) {
      throw new NotFoundException(`Election ${data.electionId} not found`);
    }
    const election = electionResult.rows[0]!;

    // Derive area name from geography codes
    const areaName = await this.deriveAreaName(
      election.county_code,
      election.constituency_code,
      election.ward_code,
    );

    // 3. Enrich station data from NEC geography tables
    const stations: PollingStation[] = [];
    for (const code of data.stationCodes) {
      const station = await this.enrichStation(code);
      if (station) stations.push(station);
      else this.logger.warn(`Station ${code} not found in NEC database — skipping`);
    }

    if (!stations.length) {
      throw new BadRequestException(
        'No valid stations found for the provided station codes',
      );
    }

    // 4. Check uniqueness — no existing ACTIVE assignment for agent+election
    const conflictCheck = await this.db.query(
      `SELECT id FROM agent_assignments
       WHERE agent_user_id = $1 AND election_id = $2 AND status = 'ACTIVE'`,
      [data.agentId, data.electionId],
    );
    if (conflictCheck.rows.length) {
      throw new ConflictException(
        `Agent already has an active assignment for election ${data.electionId}. ` +
          `Suspend or delete the existing assignment first.`,
      );
    }

    // 5. Insert
    const id = uuidv4();
    const result = await this.db.query<Record<string, unknown>>(
      `INSERT INTO agent_assignments (
         id, tenant_id, agent_user_id, election_id, election_name,
         position_code, area_name, county_code, constituency_code, ward_code,
         stations, geofence_radius_meters, status, assigned_by, assigned_at
       ) VALUES (
         $1, $2, $3, $4, $5,
         $6, $7, $8, $9, $10,
         $11::jsonb, $12, 'ACTIVE', $13, NOW()
       )
       RETURNING
         id, tenant_id AS "tenantId", agent_user_id AS "agentUserId",
         election_id AS "electionId", election_name AS "electionName",
         position_code AS "positionCode", area_name AS "areaName",
         county_code AS "countyCode", constituency_code AS "constituencyCode",
         ward_code AS "wardCode", stations,
         geofence_radius_meters AS "geofenceRadiusMeters",
         status, assigned_by AS "assignedBy", assigned_at AS "assignedAt",
         expires_at AS "expiresAt", created_at AS "createdAt", updated_at AS "updatedAt"`,
      [
        id,
        data.tenantId,
        data.agentId,
        data.electionId,
        election.name,
        election.position_code ?? 'GENERAL',
        areaName,
        election.county_code ?? null,
        election.constituency_code ?? null,
        election.ward_code ?? null,
        JSON.stringify(stations),
        data.geofenceRadiusMeters ?? 500,
        data.assignedBy,
      ],
    );

    this.logger.log(
      `Assignment created: ${id} — agent ${data.agentId} → election ${data.electionId} ` +
        `(${stations.length} stations)`,
    );

    return this.mapRow(result.rows[0]!);
  }

  // ─────────────────────────────────────────────────────────────
  // PATCH /assignments/:id — Update status or geofence
  // ─────────────────────────────────────────────────────────────

  async update(
    id: string,
    tenantId: string,
    data: { status?: 'ACTIVE' | 'SUSPENDED' | 'COMPLETED'; geofenceRadiusMeters?: number },
  ): Promise<AgentAssignment> {
    const existing = await this.findById(id, tenantId);
    if (!existing) throw new NotFoundException(`Assignment ${id} not found`);

    const sets: string[] = ['updated_at = NOW()'];
    const params: unknown[] = [id];
    let idx = 2;

    if (data.status) {
      sets.push(`status = $${idx++}`);
      params.push(data.status);
    }
    if (data.geofenceRadiusMeters !== undefined) {
      sets.push(`geofence_radius_meters = $${idx++}`);
      params.push(data.geofenceRadiusMeters);
    }

    const result = await this.db.query<Record<string, unknown>>(
      `UPDATE agent_assignments SET ${sets.join(', ')}
       WHERE id = $1 AND tenant_id = $2
       RETURNING
         id, tenant_id AS "tenantId", agent_user_id AS "agentUserId",
         election_id AS "electionId", election_name AS "electionName",
         position_code AS "positionCode", area_name AS "areaName",
         county_code AS "countyCode", constituency_code AS "constituencyCode",
         ward_code AS "wardCode", stations,
         geofence_radius_meters AS "geofenceRadiusMeters",
         status, assigned_by AS "assignedBy", assigned_at AS "assignedAt",
         expires_at AS "expiresAt", created_at AS "createdAt", updated_at AS "updatedAt"`,
      [...params, tenantId],
    );

    this.logger.log(`Assignment ${id} updated: status=${data.status ?? 'unchanged'}`);
    return this.mapRow(result.rows[0]!);
  }

  // ─────────────────────────────────────────────────────────────
  // DELETE /assignments/:id — Remove assignment
  // ─────────────────────────────────────────────────────────────

  async remove(id: string, tenantId: string): Promise<void> {
    const existing = await this.findById(id, tenantId);
    if (!existing) throw new NotFoundException(`Assignment ${id} not found`);

    await this.db.query(
      `DELETE FROM agent_assignments WHERE id = $1 AND tenant_id = $2`,
      [id, tenantId],
    );
    this.logger.log(`Assignment ${id} deleted`);
  }

  // ─────────────────────────────────────────────────────────────
  // GET /agents?tenantId=X — List agents for a tenant
  // ─────────────────────────────────────────────────────────────

  /**
   * Returns all users with an agent-class role in this tenant.
   * Used by the party portal assignment modal to populate agent selector.
   */
  async listAgentsForTenant(tenantId: string): Promise<
    { id: string; email: string; name: string | null; hasActiveAssignment: boolean }[]
  > {
    const result = await this.db.query<Record<string, unknown>>(
      `SELECT
         u.id,
         u.email,
         TRIM(COALESCE(p.first_name,'') || ' ' || COALESCE(p.last_name,'')) AS name,
         EXISTS (
           SELECT 1 FROM agent_assignments aa
           WHERE aa.agent_user_id = u.id
             AND aa.tenant_id = $1
             AND aa.status = 'ACTIVE'
         ) AS "hasActiveAssignment"
       FROM users u
       JOIN tenant_members tm ON tm.user_id = u.id AND tm.tenant_id = $1 AND tm.status = 'active'
       LEFT JOIN user_profiles p ON p.user_id = u.id
       LEFT JOIN user_roles ur ON ur.user_id = u.id
       LEFT JOIN roles r ON r.id = ur.role_id AND r.name IN ('CAPSULE_AGENT', 'PARTY_AGENT', 'FIELD_AGENT')
       WHERE u.deleted_at IS NULL
         AND r.id IS NOT NULL
       ORDER BY name ASC, u.email ASC`,
      [tenantId],
    );

    return result.rows.map((row) => ({
      id: String(row['id']),
      email: String(row['email']),
      name: row['name'] ? String(row['name']) || null : null,
      hasActiveAssignment: Boolean(row['hasActiveAssignment']),
    }));
  }

  // ─────────────────────────────────────────────────────────────
  // Private helpers
  // ─────────────────────────────────────────────────────────────

  private async findById(id: string, tenantId: string): Promise<AgentAssignment | null> {
    const result = await this.db.query<Record<string, unknown>>(
      `SELECT
         id, tenant_id AS "tenantId", agent_user_id AS "agentUserId",
         election_id AS "electionId", election_name AS "electionName",
         position_code AS "positionCode", area_name AS "areaName",
         county_code AS "countyCode", constituency_code AS "constituencyCode",
         ward_code AS "wardCode", stations,
         geofence_radius_meters AS "geofenceRadiusMeters",
         status, assigned_by AS "assignedBy", assigned_at AS "assignedAt",
         expires_at AS "expiresAt", created_at AS "createdAt", updated_at AS "updatedAt"
       FROM agent_assignments
       WHERE id = $1 AND tenant_id = $2`,
      [id, tenantId],
    );
    if (!result.rows.length) return null;
    return this.mapRow(result.rows[0]!);
  }

  /**
   * Enriches a polling station code with full NEC geographic context.
   * Looks up: nec_polling_stations → nec_wards → nec_constituencies → nec_counties
   */
  private async enrichStation(iebcCode: string): Promise<PollingStation | null> {
    const result = await this.db.query<Record<string, unknown>>(
      `SELECT
         ps.iebc_code              AS "iebcCode",
         ps.stream_number          AS "streamNumber",
         ps.polling_station_name   AS name,
         ps.registration_centre_name AS "centreName",
         ps.registered_voters      AS "registeredVoters",
         ps.latitude,
         ps.longitude,
         w.iebc_code               AS "wardCode",
         w.name                    AS "wardName",
         c.iebc_code               AS "constituencyCode",
         c.name                    AS "constituencyName",
         co.iebc_code              AS "countyCode",
         co.name                   AS "countyName"
       FROM nec_polling_stations ps
       JOIN nec_wards w           ON w.id = ps.ward_id
       JOIN nec_constituencies c  ON c.id = w.constituency_id
       JOIN nec_counties co       ON co.id = c.county_id
       WHERE ps.iebc_code = $1
       LIMIT 1`,
      [iebcCode],
    );

    if (!result.rows.length) return null;
    const row = result.rows[0]!;

    return {
      iebcCode:         String(row['iebcCode']),
      streamNumber:     Number(row['streamNumber'] ?? 1),
      name:             String(row['name'] ?? ''),
      centreName:       String(row['centreName'] ?? ''),
      registeredVoters: Number(row['registeredVoters'] ?? 0),
      latitude:         row['latitude'] != null ? Number(row['latitude']) : null,
      longitude:        row['longitude'] != null ? Number(row['longitude']) : null,
      wardCode:         String(row['wardCode'] ?? ''),
      wardName:         String(row['wardName'] ?? ''),
      constituencyCode: String(row['constituencyCode'] ?? ''),
      constituencyName: String(row['constituencyName'] ?? ''),
      countyCode:       String(row['countyCode'] ?? ''),
      countyName:       String(row['countyName'] ?? ''),
    };
  }

  /**
   * Derives a human-readable area name from NEC geographic codes.
   * Priority: ward → constituency → county
   */
  private async deriveAreaName(
    countyCode: string | null,
    constituencyCode: string | null,
    wardCode: string | null,
  ): Promise<string> {
    if (wardCode) {
      const r = await this.db.query<{ name: string }>(
        'SELECT name FROM nec_wards WHERE iebc_code = $1 LIMIT 1',
        [wardCode],
      );
      if (r.rows[0]) return `${r.rows[0].name} Ward`;
    }
    if (constituencyCode) {
      const r = await this.db.query<{ name: string }>(
        'SELECT name FROM nec_constituencies WHERE iebc_code = $1 LIMIT 1',
        [constituencyCode],
      );
      if (r.rows[0]) return `${r.rows[0].name} Constituency`;
    }
    if (countyCode) {
      const r = await this.db.query<{ name: string }>(
        'SELECT name FROM nec_counties WHERE iebc_code = $1 LIMIT 1',
        [countyCode],
      );
      if (r.rows[0]) return `${r.rows[0].name} County`;
    }
    return 'Kenya';
  }

  private mapRow(row: Record<string, unknown>): AgentAssignment {
    return {
      id:                   String(row['id']),
      tenantId:             String(row['tenantId']),
      agentUserId:          String(row['agentUserId']),
      electionId:           String(row['electionId']),
      electionName:         String(row['electionName']),
      positionCode:         String(row['positionCode']),
      areaName:             String(row['areaName'] ?? ''),
      countyCode:           row['countyCode'] ? String(row['countyCode']) : null,
      constituencyCode:     row['constituencyCode'] ? String(row['constituencyCode']) : null,
      wardCode:             row['wardCode'] ? String(row['wardCode']) : null,
      stations:             (row['stations'] as PollingStation[]) ?? [],
      geofenceRadiusMeters: Number(row['geofenceRadiusMeters'] ?? 500),
      status:               String(row['status']) as AgentAssignment['status'],
      assignedBy:           row['assignedBy'] ? String(row['assignedBy']) : null,
      assignedAt:           new Date(String(row['assignedAt'])),
      expiresAt:            row['expiresAt'] ? new Date(String(row['expiresAt'])) : null,
      createdAt:            new Date(String(row['createdAt'])),
      updatedAt:            new Date(String(row['updatedAt'])),
    };
  }
}
