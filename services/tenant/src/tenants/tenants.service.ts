/**
 * Vote Capsule™ Tenant Service — Tenants Service
 *
 * Business logic for tenant management.
 * Tenants are organizations that use the Vote Capsule platform.
 *
 * Extended 2026-08-12 by Sonie:
 *  - updateSettingsJsonbKey()   — atomic JSONB sub-key merge
 *  - addOfficial()              — append to officials array
 *  - updateOfficial()           — update officials[index]
 *  - removeOfficial()           — splice officials[index]
 *  - updateLogoUrl()            — update top-level logo_url column
 *  - getNominationLimits()      — read from tenant_nomination_limits
 *  - updateNominationLimits()   — upsert tenant_nomination_limits
 */

import {
  Injectable,
  NotFoundException,
  ConflictException,
  Inject,
  Logger,
} from '@nestjs/common';
import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { DATABASE_POOL } from '../database/database.module';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { PaginationQuery, PaginatedResponse } from '@vote-capsule/types';

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  type: string;
  status: string;
  countryCode: string;
  logoUrl: string | null;
  primaryColor: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  settings: Record<string, unknown>;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface NominationLimits {
  maxNominations: number;
  maxCandidatesPerNomination: number;
  allowedPositions: string[];
  canRunNominations: boolean;
}

@Injectable()
export class TenantsService {
  private readonly logger = new Logger(TenantsService.name);

  constructor(@Inject(DATABASE_POOL) private readonly db: Pool) {}

  // ─────────────────────────────────────────────────────────────
  // Core CRUD
  // ─────────────────────────────────────────────────────────────

  async findAll(query: PaginationQuery): Promise<PaginatedResponse<Tenant>> {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 100);
    const offset = (page - 1) * limit;

    const countResult = await this.db.query<{ count: string }>(
      'SELECT COUNT(*) as count FROM tenants WHERE deleted_at IS NULL',
    );
    const total = parseInt(countResult.rows[0]?.count ?? '0', 10);

    const result = await this.db.query<Tenant>(
      `SELECT id, name, slug, type, status, country_code as "countryCode",
              logo_url as "logoUrl", primary_color as "primaryColor",
              contact_email as "contactEmail", contact_phone as "contactPhone",
              settings, created_by as "createdBy",
              created_at as "createdAt", updated_at as "updatedAt", deleted_at as "deletedAt"
       FROM tenants WHERE deleted_at IS NULL
       ORDER BY created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset],
    );

    return {
      data: result.rows,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page < Math.ceil(total / limit),
        hasPreviousPage: page > 1,
      },
    };
  }

  async findById(id: string): Promise<Tenant | null> {
    const result = await this.db.query<Tenant>(
      `SELECT id, name, slug, type, status, country_code as "countryCode",
              logo_url as "logoUrl", primary_color as "primaryColor",
              contact_email as "contactEmail", contact_phone as "contactPhone",
              settings, created_by as "createdBy",
              created_at as "createdAt", updated_at as "updatedAt", deleted_at as "deletedAt"
       FROM tenants WHERE id = $1 AND deleted_at IS NULL`,
      [id],
    );
    return result.rows[0] ?? null;
  }

  async findBySlug(slug: string): Promise<Tenant | null> {
    const result = await this.db.query<Tenant>(
      `SELECT id, name, slug, type, status, country_code as "countryCode",
              logo_url as "logoUrl", primary_color as "primaryColor",
              contact_email as "contactEmail", contact_phone as "contactPhone",
              settings, created_by as "createdBy",
              created_at as "createdAt", updated_at as "updatedAt", deleted_at as "deletedAt"
       FROM tenants WHERE slug = $1 AND deleted_at IS NULL`,
      [slug],
    );
    return result.rows[0] ?? null;
  }

  async create(dto: CreateTenantDto, createdBy: string): Promise<Tenant> {
    const slug = this.generateSlug(dto.name, dto.slug);

    const existingSlug = await this.db.query(
      'SELECT id FROM tenants WHERE slug = $1',
      [slug],
    );
    if ((existingSlug.rowCount ?? 0) > 0) {
      throw new ConflictException(`Slug '${slug}' is already taken`);
    }

    const id = uuidv4();
    const result = await this.db.query<Tenant>(
      `INSERT INTO tenants
         (id, name, slug, type, status, country_code, contact_email, contact_phone,
          logo_url, primary_color, settings, created_by)
       VALUES ($1, $2, $3, $4, 'active', $5, $6, $7, $8, $9, $10, $11)
       RETURNING id, name, slug, type, status, country_code as "countryCode",
                 logo_url as "logoUrl", primary_color as "primaryColor",
                 contact_email as "contactEmail", contact_phone as "contactPhone",
                 settings, created_by as "createdBy",
                 created_at as "createdAt", updated_at as "updatedAt", deleted_at as "deletedAt"`,
      [
        id, dto.name, slug, dto.type,
        dto.countryCode ?? 'KE',
        dto.contactEmail ?? null,
        dto.contactPhone ?? null,
        dto.logoUrl ?? null,
        dto.primaryColor ?? null,
        JSON.stringify(dto.settings ?? {}),
        createdBy,
      ],
    );

    this.logger.log(`Created tenant: ${dto.name} (${slug})`);
    return result.rows[0]!;
  }

  async update(id: string, dto: UpdateTenantDto): Promise<Tenant> {
    const tenant = await this.findById(id);
    if (!tenant) throw new NotFoundException(`Tenant ${id} not found`);

    const result = await this.db.query<Tenant>(
      `UPDATE tenants SET
         name = COALESCE($2, name),
         status = COALESCE($3, status),
         contact_email = COALESCE($4, contact_email),
         contact_phone = COALESCE($5, contact_phone),
         logo_url = COALESCE($6, logo_url),
         primary_color = COALESCE($7, primary_color),
         updated_at = NOW()
       WHERE id = $1 AND deleted_at IS NULL
       RETURNING id, name, slug, type, status, country_code as "countryCode",
                 logo_url as "logoUrl", primary_color as "primaryColor",
                 contact_email as "contactEmail", contact_phone as "contactPhone",
                 settings, created_by as "createdBy",
                 created_at as "createdAt", updated_at as "updatedAt", deleted_at as "deletedAt"`,
      [id, dto.name ?? null, dto.status ?? null, dto.contactEmail ?? null,
       dto.contactPhone ?? null, dto.logoUrl ?? null, dto.primaryColor ?? null],
    );

    return result.rows[0]!;
  }

  async softDelete(id: string): Promise<void> {
    const tenant = await this.findById(id);
    if (!tenant) throw new NotFoundException(`Tenant ${id} not found`);

    await this.db.query(
      'UPDATE tenants SET deleted_at = NOW(), updated_at = NOW() WHERE id = $1',
      [id],
    );
    this.logger.log(`Soft deleted tenant: ${id}`);
  }

  async getSettings(id: string): Promise<Record<string, unknown>> {
    const result = await this.db.query<{ key: string; value: unknown }>(
      `SELECT key, value FROM tenant_settings WHERE tenant_id = $1 ORDER BY key`,
      [id],
    );

    return Object.fromEntries(result.rows.map((r) => [r.key, r.value]));
  }

  async updateSettings(
    tenantId: string,
    settings: Record<string, unknown>,
    updatedBy: string,
  ): Promise<void> {
    const client = await this.db.connect();
    try {
      await client.query('BEGIN');
      for (const [key, value] of Object.entries(settings)) {
        await client.query(
          `INSERT INTO tenant_settings (id, tenant_id, key, value, updated_by)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (tenant_id, key) DO UPDATE SET value = EXCLUDED.value, updated_by = EXCLUDED.updated_by, updated_at = NOW()`,
          [uuidv4(), tenantId, key, JSON.stringify(value), updatedBy],
        );
      }
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getTenantStats(): Promise<Record<string, number>> {
    const result = await this.db.query<{ type: string; count: string }>(
      `SELECT type, COUNT(*) as count FROM tenants
       WHERE deleted_at IS NULL AND status = 'active'
       GROUP BY type`,
    );
    const stats: Record<string, number> = {};
    for (const row of result.rows) {
      stats[row.type] = parseInt(row.count, 10);
    }
    return stats;
  }

  // ─────────────────────────────────────────────────────────────
  // JSONB settings helpers (Party KYC / Branding / Social Media)
  // ─────────────────────────────────────────────────────────────

  /**
   * Atomically merges `data` into a top-level key of `tenants.settings` JSONB.
   * Example: updateSettingsJsonbKey(id, 'kyc', { phone: '+254...' })
   * ⟹  settings = jsonb_set(settings, '{kyc}', settings->'kyc' || '{"phone":"..."}')
   */
  async updateSettingsJsonbKey(
    tenantId: string,
    key: string,
    data: Record<string, unknown>,
  ): Promise<Tenant> {
    const tenant = await this.findById(tenantId);
    if (!tenant) throw new NotFoundException(`Tenant ${tenantId} not found`);

    await this.db.query(
      `UPDATE tenants
       SET settings = jsonb_set(
             COALESCE(settings, '{}'::jsonb),
             $2::text[],
             COALESCE(settings->$3, '{}'::jsonb) || $4::jsonb
           ),
           updated_at = NOW()
       WHERE id = $1`,
      [tenantId, `{${key}}`, key, JSON.stringify(data)],
    );

    const updated = await this.findById(tenantId);
    return updated!;
  }

  // ─────────────────────────────────────────────────────────────
  // Officials CRUD
  // ─────────────────────────────────────────────────────────────

  async addOfficial(tenantId: string, official: Record<string, unknown>): Promise<Tenant> {
    const tenant = await this.findById(tenantId);
    if (!tenant) throw new NotFoundException(`Tenant ${tenantId} not found`);

    await this.db.query(
      `UPDATE tenants
       SET settings = jsonb_set(
             COALESCE(settings, '{}'::jsonb),
             '{officials}',
             COALESCE(settings->'officials', '[]'::jsonb) || $2::jsonb
           ),
           updated_at = NOW()
       WHERE id = $1`,
      [tenantId, JSON.stringify(official)],
    );

    const updated = await this.findById(tenantId);
    return updated!;
  }

  async updateOfficial(
    tenantId: string,
    index: number,
    data: Record<string, unknown>,
  ): Promise<Tenant> {
    const tenant = await this.findById(tenantId);
    if (!tenant) throw new NotFoundException(`Tenant ${tenantId} not found`);

    const officials = (tenant.settings['officials'] as unknown[]) ?? [];
    if (index >= officials.length) {
      throw new NotFoundException(`Official at index ${index} does not exist`);
    }

    await this.db.query(
      `UPDATE tenants
       SET settings = jsonb_set(
             settings,
             $2::text[],
             (settings->'officials'->$3::int) || $4::jsonb
           ),
           updated_at = NOW()
       WHERE id = $1`,
      [tenantId, `{officials,${index}}`, index, JSON.stringify(data)],
    );

    const updated = await this.findById(tenantId);
    return updated!;
  }

  async removeOfficial(tenantId: string, index: number): Promise<void> {
    const tenant = await this.findById(tenantId);
    if (!tenant) throw new NotFoundException(`Tenant ${tenantId} not found`);

    const officials = (tenant.settings['officials'] as unknown[]) ?? [];
    if (index >= officials.length) {
      throw new NotFoundException(`Official at index ${index} does not exist`);
    }

    // PostgreSQL jsonb array element removal: (array) - index
    await this.db.query(
      `UPDATE tenants
       SET settings = jsonb_set(
             settings,
             '{officials}',
             (settings->'officials') - $2
           ),
           updated_at = NOW()
       WHERE id = $1`,
      [tenantId, index],
    );
  }

  // ─────────────────────────────────────────────────────────────
  // Logo URL helper (updates top-level column)
  // ─────────────────────────────────────────────────────────────

  async updateLogoUrl(tenantId: string, url: string): Promise<void> {
    await this.db.query(
      'UPDATE tenants SET logo_url = $2, updated_at = NOW() WHERE id = $1',
      [tenantId, url],
    );
  }

  // ─────────────────────────────────────────────────────────────
  // Nomination Limits (Task 8)
  // ─────────────────────────────────────────────────────────────

  async getNominationLimits(tenantId: string): Promise<NominationLimits> {
    const result = await this.db.query<{
      max_nominations: number;
      max_candidates_per_nomination: number;
      allowed_positions: string[];
      can_run_nominations: boolean;
    }>(
      `SELECT max_nominations, max_candidates_per_nomination,
              allowed_positions, can_run_nominations
       FROM tenant_nomination_limits
       WHERE tenant_id = $1`,
      [tenantId],
    );

    const row = result.rows[0];
    if (!row) {
      // Return safe defaults if no row exists
      return {
        maxNominations: 50,
        maxCandidatesPerNomination: 6,
        allowedPositions: [],
        canRunNominations: true,
      };
    }

    return {
      maxNominations: row.max_nominations,
      maxCandidatesPerNomination: row.max_candidates_per_nomination,
      allowedPositions: row.allowed_positions ?? [],
      canRunNominations: row.can_run_nominations,
    };
  }

  async updateNominationLimits(
    tenantId: string,
    data: {
      maxNominations?: number;
      maxCandidatesPerNomination?: number;
      allowedPositions?: string[];
      canRunNominations?: boolean;
    },
  ): Promise<NominationLimits> {
    const tenant = await this.findById(tenantId);
    if (!tenant) throw new NotFoundException(`Tenant ${tenantId} not found`);

    await this.db.query(
      `INSERT INTO tenant_nomination_limits
         (tenant_id, max_nominations, max_candidates_per_nomination, allowed_positions, can_run_nominations)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (tenant_id) DO UPDATE SET
         max_nominations               = COALESCE($2, tenant_nomination_limits.max_nominations),
         max_candidates_per_nomination = COALESCE($3, tenant_nomination_limits.max_candidates_per_nomination),
         allowed_positions             = COALESCE($4, tenant_nomination_limits.allowed_positions),
         can_run_nominations           = COALESCE($5, tenant_nomination_limits.can_run_nominations),
         updated_at                    = NOW()`,
      [
        tenantId,
        data.maxNominations ?? null,
        data.maxCandidatesPerNomination ?? null,
        data.allowedPositions ?? null,
        data.canRunNominations ?? null,
      ],
    );

    return this.getNominationLimits(tenantId);
  }

  // ─────────────────────────────────────────────────────────────
  // Private helpers
  // ─────────────────────────────────────────────────────────────

  private generateSlug(name: string, proposedSlug?: string): string {
    if (proposedSlug) {
      return proposedSlug.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    }
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 100);
  }
}
