/**
 * Vote Capsule™ Identity Service — Roles Service
 *
 * Manages roles and permissions.
 * System roles (is_system = TRUE) cannot be deleted.
 */

import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Inject,
  Logger,
} from '@nestjs/common';
import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { DATABASE_POOL } from '../database/database.module';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { AssignPermissionsDto } from './dto/assign-permissions.dto';

export interface Role {
  id: string;
  name: string;
  displayName: string | null;
  description: string | null;
  level: string;
  isSystem: boolean;
  createdAt: Date;
}

export interface Permission {
  id: string;
  resource: string;
  action: string;
  scope: string;
  description: string | null;
  createdAt: Date;
}

@Injectable()
export class RolesService {
  private readonly logger = new Logger(RolesService.name);

  constructor(@Inject(DATABASE_POOL) private readonly db: Pool) {}

  async findAll(): Promise<Role[]> {
    const result = await this.db.query<Role>(
      `SELECT id, name, display_name as "displayName", description, level,
              is_system as "isSystem", created_at as "createdAt"
       FROM roles ORDER BY level, name`,
    );
    return result.rows;
  }

  async findById(id: string): Promise<Role | null> {
    const result = await this.db.query<Role>(
      `SELECT id, name, display_name as "displayName", description, level,
              is_system as "isSystem", created_at as "createdAt"
       FROM roles WHERE id = $1`,
      [id],
    );
    return result.rows[0] ?? null;
  }

  async create(dto: CreateRoleDto): Promise<Role> {
    const existing = await this.db.query(
      'SELECT id FROM roles WHERE name = $1',
      [dto.name.toUpperCase()],
    );
    if ((existing.rowCount ?? 0) > 0) {
      throw new ConflictException(`Role with name '${dto.name}' already exists`);
    }

    const id = uuidv4();
    const result = await this.db.query<Role>(
      `INSERT INTO roles (id, name, display_name, description, level, is_system)
       VALUES ($1, $2, $3, $4, $5, FALSE)
       RETURNING id, name, display_name as "displayName", description, level,
                 is_system as "isSystem", created_at as "createdAt"`,
      [id, dto.name.toUpperCase(), dto.displayName ?? null, dto.description ?? null, dto.level],
    );

    this.logger.log(`Created role: ${dto.name}`);
    return result.rows[0]!;
  }

  async update(id: string, dto: UpdateRoleDto): Promise<Role> {
    const role = await this.findById(id);
    if (!role) throw new NotFoundException(`Role ${id} not found`);
    if (role.isSystem) throw new BadRequestException('System roles cannot be modified');

    const result = await this.db.query<Role>(
      `UPDATE roles SET
         display_name = COALESCE($2, display_name),
         description = COALESCE($3, description)
       WHERE id = $1
       RETURNING id, name, display_name as "displayName", description, level,
                 is_system as "isSystem", created_at as "createdAt"`,
      [id, dto.displayName ?? null, dto.description ?? null],
    );

    return result.rows[0]!;
  }

  async delete(id: string): Promise<void> {
    const role = await this.findById(id);
    if (!role) throw new NotFoundException(`Role ${id} not found`);
    if (role.isSystem) throw new BadRequestException('System roles cannot be deleted');

    await this.db.query('DELETE FROM roles WHERE id = $1', [id]);
    this.logger.log(`Deleted role: ${role.name}`);
  }

  async getRolePermissions(roleId: string): Promise<Permission[]> {
    const result = await this.db.query<Permission>(
      `SELECT p.id, p.resource, p.action, p.scope, p.description, p.created_at as "createdAt"
       FROM permissions p
       INNER JOIN role_permissions rp ON rp.permission_id = p.id
       WHERE rp.role_id = $1
       ORDER BY p.resource, p.action`,
      [roleId],
    );
    return result.rows;
  }

  async assignPermissions(roleId: string, dto: AssignPermissionsDto): Promise<void> {
    const role = await this.findById(roleId);
    if (!role) throw new NotFoundException(`Role ${roleId} not found`);

    const client = await this.db.connect();
    try {
      await client.query('BEGIN');

      // Remove existing permissions if replacing
      if (dto.replace) {
        await client.query('DELETE FROM role_permissions WHERE role_id = $1', [roleId]);
      }

      // Assign new permissions
      for (const permissionId of dto.permissionIds) {
        await client.query(
          `INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2)
           ON CONFLICT DO NOTHING`,
          [roleId, permissionId],
        );
      }

      await client.query('COMMIT');
      this.logger.log(`Assigned ${dto.permissionIds.length} permissions to role ${role.name}`);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async findAllPermissions(): Promise<Permission[]> {
    const result = await this.db.query<Permission>(
      `SELECT id, resource, action, scope, description, created_at as "createdAt"
       FROM permissions ORDER BY resource, action, scope`,
    );
    return result.rows;
  }
}
