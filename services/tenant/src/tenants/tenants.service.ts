/**
 * Vote Capsule™ Tenant Service — Tenants Service
 *
 * Business logic for tenant management.
 * Tenants are organizations that use the Vote Capsule platform.
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

@Injectable()
export class TenantsService {
  private readonly logger = new Logger(TenantsService.name);

  constructor(@Inject(DATABASE_POOL) private readonly db: Pool) {}

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
