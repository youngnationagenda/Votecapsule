/**
 * Vote Capsule™ Tenant Service — Members Service
 *
 * Manages tenant membership — who belongs to which organization.
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
import { AddMemberDto } from './dto/add-member.dto';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';

export interface TenantMember {
  id: string;
  tenantId: string;
  userId: string;
  roleId: string;
  status: string;
  joinedAt: Date;
}

@Injectable()
export class MembersService {
  private readonly logger = new Logger(MembersService.name);

  constructor(@Inject(DATABASE_POOL) private readonly db: Pool) {}

  async findByTenant(tenantId: string): Promise<TenantMember[]> {
    const result = await this.db.query<TenantMember>(
      `SELECT id, tenant_id as "tenantId", user_id as "userId",
              role_id as "roleId", status, joined_at as "joinedAt"
       FROM tenant_members WHERE tenant_id = $1 AND status != 'removed'
       ORDER BY joined_at`,
      [tenantId],
    );
    return result.rows;
  }

  async addMember(tenantId: string, dto: AddMemberDto): Promise<TenantMember> {
    const existing = await this.db.query(
      `SELECT id FROM tenant_members WHERE tenant_id = $1 AND user_id = $2 AND status != 'removed'`,
      [tenantId, dto.userId],
    );
    if ((existing.rowCount ?? 0) > 0) {
      throw new ConflictException('User is already a member of this tenant');
    }

    const id = uuidv4();
    const result = await this.db.query<TenantMember>(
      `INSERT INTO tenant_members (id, tenant_id, user_id, role_id, status)
       VALUES ($1, $2, $3, $4, 'active')
       RETURNING id, tenant_id as "tenantId", user_id as "userId",
                 role_id as "roleId", status, joined_at as "joinedAt"`,
      [id, tenantId, dto.userId, dto.roleId],
    );

    this.logger.log(`Added member ${dto.userId} to tenant ${tenantId}`);
    return result.rows[0]!;
  }

  async updateMemberRole(tenantId: string, userId: string, dto: UpdateMemberRoleDto): Promise<void> {
    const result = await this.db.query(
      `UPDATE tenant_members SET role_id = $3
       WHERE tenant_id = $1 AND user_id = $2 AND status != 'removed'`,
      [tenantId, userId, dto.roleId],
    );
    if (result.rowCount === 0) {
      throw new NotFoundException('Member not found in this tenant');
    }
    this.logger.log(`Updated role for member ${userId} in tenant ${tenantId}`);
  }

  async removeMember(tenantId: string, userId: string): Promise<void> {
    const result = await this.db.query(
      `UPDATE tenant_members SET status = 'removed'
       WHERE tenant_id = $1 AND user_id = $2 AND status != 'removed'`,
      [tenantId, userId],
    );
    if (result.rowCount === 0) {
      throw new NotFoundException('Member not found in this tenant');
    }
    this.logger.log(`Removed member ${userId} from tenant ${tenantId}`);
  }
}
