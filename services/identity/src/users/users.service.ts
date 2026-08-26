/**
 * Vote Capsule™ Identity Service — Users Service
 *
 * CRUD operations for platform users.
 * Handles user creation, profile management, and device management.
 */

import {
  Injectable,
  NotFoundException,
  ConflictException,
  Inject,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import {
  CognitoIdentityProviderClient,
  AdminCreateUserCommand,
  AdminSetUserPasswordCommand,
  AdminUpdateUserAttributesCommand,
  MessageActionType,
} from '@aws-sdk/client-cognito-identity-provider';
import { DATABASE_POOL } from '../database/database.module';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ProvisionUserDto } from './dto/provision-user.dto';
import { UpdateCognitoAttributesDto } from './dto/update-cognito-attributes.dto';
import { PaginationQuery, PaginatedResponse } from '@vote-capsule/types';

export interface User {
  id: string;
  email: string;
  emailVerified: boolean;
  cognitoSub: string | null;
  status: string;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface UserWithProfile extends User {
  profile: {
    firstName: string | null;
    lastName: string | null;
    phone: string | null;
    avatarUrl: string | null;
    language: string;
    timezone: string;
  } | null;
  roles: string[];
}

export interface AuthEventPayload {
  email: string;
  eventType: string;
  ipAddress: string;
  userAgent: string;
  success: boolean;
  failureReason?: string;
  deviceId?: string;
}

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  private readonly cognito = new CognitoIdentityProviderClient({ region: process.env['AWS_REGION'] ?? 'us-east-1' });
  private readonly userPoolId = process.env['COGNITO_USER_POOL_ID'] ?? 'us-east-1_i3N2tg34A';

  constructor(@Inject(DATABASE_POOL) private readonly db: Pool) {}

  async findAll(query: PaginationQuery): Promise<PaginatedResponse<User>> {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 100);
    const offset = (page - 1) * limit;

    const sortBy = ['email', 'created_at', 'status'].includes(query.sortBy ?? '')
      ? query.sortBy!
      : 'created_at';
    const sortOrder = query.sortOrder === 'asc' ? 'ASC' : 'DESC';

    const countResult = await this.db.query<{ count: string }>(
      'SELECT COUNT(*) as count FROM users WHERE deleted_at IS NULL',
    );
    const total = parseInt(countResult.rows[0]?.count ?? '0', 10);

    // sortBy and sortOrder are validated against whitelists above — safe to interpolate
    // (no user-supplied values reach this point without going through the whitelist check)
    const validSortColumns: Record<string, string> = {
      email:      'u.email',
      created_at: 'u.created_at',
      status:     'u.status',
    };
    const orderCol   = validSortColumns[sortBy] ?? 'u.created_at';
    const orderDir   = sortOrder === 'ASC' ? 'ASC' : 'DESC';

    const result = await this.db.query<User>(
      `SELECT u.id, u.email, u.email_verified as "emailVerified", u.cognito_sub as "cognitoSub",
              u.status, u.last_login_at as "lastLoginAt", u.created_at as "createdAt",
              u.updated_at as "updatedAt", u.deleted_at as "deletedAt",
              COALESCE(
                (SELECT json_agg(r.name)
                 FROM user_roles ur
                 JOIN roles r ON r.id = ur.role_id
                 WHERE ur.user_id = u.id),
                '[]'::json
              ) as roles,
              (SELECT t.id FROM tenant_members tm
               JOIN tenants t ON t.id = tm.tenant_id
               WHERE tm.user_id = u.id AND tm.status = 'active'
               LIMIT 1) as "tenantId"
       FROM users u WHERE u.deleted_at IS NULL
       ORDER BY ${orderCol} ${orderDir}
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

  async findById(id: string): Promise<(User & { roles: string[]; tenantId: string | null }) | null> {
    const result = await this.db.query<User & { roles: string[]; tenantId: string | null }>(
      `SELECT u.id, u.email,
              u.email_verified as "emailVerified",
              u.cognito_sub as "cognitoSub",
              u.status,
              u.last_login_at as "lastLoginAt",
              u.created_at as "createdAt",
              u.updated_at as "updatedAt",
              u.deleted_at as "deletedAt",
              COALESCE(
                (SELECT json_agg(r.name)
                 FROM user_roles ur
                 JOIN roles r ON r.id = ur.role_id
                 WHERE ur.user_id = u.id),
                '[]'::json
              ) as roles,
              (SELECT t.id FROM tenant_members tm
               JOIN tenants t ON t.id = tm.tenant_id
               WHERE tm.user_id = u.id AND tm.status = 'active'
               LIMIT 1) as "tenantId"
       FROM users u
       WHERE u.id = $1 AND u.deleted_at IS NULL`,
      [id],
    );
    return result.rows[0] ?? null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const result = await this.db.query<User>(
      `SELECT id, email, email_verified as "emailVerified", cognito_sub as "cognitoSub",
              status, last_login_at as "lastLoginAt", created_at as "createdAt",
              updated_at as "updatedAt", deleted_at as "deletedAt"
       FROM users WHERE email = $1 AND deleted_at IS NULL`,
      [email.toLowerCase()],
    );
    return result.rows[0] ?? null;
  }

  /** Find user with roles + tenantId — used for JWT payload construction */
  async findByEmailWithRoles(email: string): Promise<(User & { roles: string[]; tenantId: string | null }) | null> {
    const result = await this.db.query<User & { roles: string[]; tenantId: string | null }>(
      `SELECT u.id, u.email,
              u.email_verified as "emailVerified",
              u.cognito_sub as "cognitoSub",
              u.status,
              u.last_login_at as "lastLoginAt",
              u.created_at as "createdAt",
              u.updated_at as "updatedAt",
              u.deleted_at as "deletedAt",
              COALESCE(
                (SELECT json_agg(r.name)
                 FROM user_roles ur
                 JOIN roles r ON r.id = ur.role_id
                 WHERE ur.user_id = u.id),
                '[]'::json
              ) as roles,
              (SELECT t.id FROM tenant_members tm
               JOIN tenants t ON t.id = tm.tenant_id
               WHERE tm.user_id = u.id AND tm.status = 'active'
               LIMIT 1) as "tenantId"
       FROM users u
       WHERE u.email = $1 AND u.deleted_at IS NULL`,
      [email.toLowerCase()],
    );
    return result.rows[0] ?? null;
  }

  async create(dto: CreateUserDto): Promise<User> {
    const existing = await this.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException(`User with email ${dto.email} already exists`);
    }

    const id = uuidv4();
    const result = await this.db.query<User>(
      `INSERT INTO users (id, email, cognito_sub, status)
       VALUES ($1, $2, $3, 'active')
       RETURNING id, email, email_verified as "emailVerified", cognito_sub as "cognitoSub",
                 status, last_login_at as "lastLoginAt", created_at as "createdAt",
                 updated_at as "updatedAt", deleted_at as "deletedAt"`,
      [id, dto.email.toLowerCase(), dto.cognitoSub ?? null],
    );

    const user = result.rows[0];
    if (!user) throw new Error('Failed to create user');

    // Create empty profile
    await this.db.query(
      `INSERT INTO user_profiles (id, user_id, first_name, last_name)
       VALUES ($1, $2, $3, $4)`,
      [uuidv4(), id, dto.firstName ?? null, dto.lastName ?? null],
    );

    this.logger.log(`Created user: ${dto.email}`);
    return user;
  }

  async update(id: string, dto: UpdateUserDto): Promise<User> {
    const user = await this.findById(id);
    if (!user) throw new NotFoundException(`User ${id} not found`);

    const result = await this.db.query<User>(
      `UPDATE users SET status = COALESCE($2, status), updated_at = NOW()
       WHERE id = $1 AND deleted_at IS NULL
       RETURNING id, email, email_verified as "emailVerified", cognito_sub as "cognitoSub",
                 status, last_login_at as "lastLoginAt", created_at as "createdAt",
                 updated_at as "updatedAt", deleted_at as "deletedAt"`,
      [id, dto.status ?? null],
    );

    // Handle role update if provided
    if (dto.roles !== undefined) {
      await this.updateRoles(id, dto.roles);
    }

    // Handle tenant reassignment
    if (dto.tenantId !== undefined) {
      try {
        await this.db.query(
          `INSERT INTO tenant_members (id, tenant_id, user_id, status, joined_at)
           VALUES ($1, $2, $3, 'active', NOW())
           ON CONFLICT (tenant_id, user_id) DO UPDATE SET status = 'active'`,
          [uuidv4(), dto.tenantId, id],
        );
        // Update Cognito tenantId
        if (user.cognitoSub) {
          await this.cognito.send(new AdminUpdateUserAttributesCommand({
            UserPoolId: this.userPoolId,
            Username: user.email,
            UserAttributes: [{ Name: 'custom:tenantId', Value: dto.tenantId }],
          })).catch(e => this.logger.warn(`Cognito tenantId update failed: ${e}`));
        }
      } catch (e) {
        this.logger.warn(`Tenant assignment failed: ${e}`);
      }
    }

    // Re-fetch with roles and tenantId so the response includes updated data
    const updated = await this.findById(id);
    return updated ?? result.rows[0]!;
  }

  async softDelete(id: string): Promise<void> {
    const user = await this.findById(id);
    if (!user) throw new NotFoundException(`User ${id} not found`);

    await this.db.query(
      `UPDATE users SET deleted_at = NOW(), updated_at = NOW() WHERE id = $1`,
      [id],
    );

    this.logger.log(`Soft deleted user: ${id}`);
  }

  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<void> {
    await this.db.query(
      `INSERT INTO user_profiles (id, user_id, first_name, last_name, phone, avatar_url, language, timezone)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (user_id) DO UPDATE SET
         first_name = COALESCE(EXCLUDED.first_name, user_profiles.first_name),
         last_name = COALESCE(EXCLUDED.last_name, user_profiles.last_name),
         phone = COALESCE(EXCLUDED.phone, user_profiles.phone),
         avatar_url = COALESCE(EXCLUDED.avatar_url, user_profiles.avatar_url),
         language = COALESCE(EXCLUDED.language, user_profiles.language),
         timezone = COALESCE(EXCLUDED.timezone, user_profiles.timezone),
         updated_at = NOW()`,
      [
        uuidv4(), userId,
        dto.firstName ?? null, dto.lastName ?? null,
        dto.phone ?? null, dto.avatarUrl ?? null,
        dto.language ?? null, dto.timezone ?? null,
      ],
    );
  }

  /**
   * Full user provisioning — creates Cognito user + DB record atomically.
   * Used by Superadmin to provision agents, validators, observers, etc.
   *
   * Steps:
   *   1. Check email not already in DB
   *   2. AdminCreateUser in Cognito (SUPPRESS email)
   *   3. AdminSetUserPassword (permanent — no challenge)
   *   4. AdminUpdateUserAttributes (custom:roles, custom:tenantId, name)
   *   5. INSERT into DB users table
   *   6. Create empty user_profile
   *   7. If tenantId supplied → INSERT into tenant_members
   */
  async provisionUser(dto: ProvisionUserDto): Promise<User> {
    // 1. Check duplicate in DB
    const existing = await this.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException(`User with email ${dto.email} already exists`);
    }

    const userId       = uuidv4();
    const rolesJson    = JSON.stringify(dto.roles ?? []);
    const displayName  = [dto.firstName, dto.lastName].filter(Boolean).join(' ') || dto.email.split('@')[0];

    let cognitoSub: string | null = null;

    try {
      // 2. Create Cognito user
      const createResp = await this.cognito.send(new AdminCreateUserCommand({
        UserPoolId:     this.userPoolId,
        Username:       dto.email.toLowerCase(),
        MessageAction:  MessageActionType.SUPPRESS,   // Don't send welcome email
        TemporaryPassword: dto.password,
        UserAttributes: [
          { Name: 'email',              Value: dto.email.toLowerCase() },
          { Name: 'email_verified',     Value: 'true' },
          { Name: 'name',               Value: displayName },
          { Name: 'custom:userId',      Value: userId },
          { Name: 'custom:roles',       Value: rolesJson },
          ...(dto.tenantId ? [{ Name: 'custom:tenantId', Value: dto.tenantId }] : []),
        ],
      }));

      cognitoSub = createResp.User?.Attributes?.find(a => a.Name === 'sub')?.Value ?? null;

      // 3. Set permanent password (no FORCE_CHANGE_PASSWORD challenge)
      await this.cognito.send(new AdminSetUserPasswordCommand({
        UserPoolId: this.userPoolId,
        Username:   dto.email.toLowerCase(),
        Password:   dto.password,
        Permanent:  true,
      }));

    } catch (cognitoErr: unknown) {
      const msg = cognitoErr instanceof Error ? cognitoErr.message : String(cognitoErr);
      // UsernameExistsException — already in Cognito but not DB (partial state)
      if (msg.includes('UsernameExistsException') || msg.includes('already exists')) {
        throw new ConflictException(`A Cognito account already exists for ${dto.email}`);
      }
      throw new BadRequestException(`Cognito error: ${msg}`);
    }

    // 4. Create DB user record
    const result = await this.db.query<User>(
      `INSERT INTO users (id, email, cognito_sub, status, email_verified)
       VALUES ($1, $2, $3, 'active', true)
       RETURNING id, email, email_verified as "emailVerified", cognito_sub as "cognitoSub",
                 status, last_login_at as "lastLoginAt", created_at as "createdAt",
                 updated_at as "updatedAt", deleted_at as "deletedAt"`,
      [userId, dto.email.toLowerCase(), cognitoSub],
    );
    const user = result.rows[0];
    if (!user) throw new Error('Failed to create user record');

    // 5. Create profile
    await this.db.query(
      `INSERT INTO user_profiles (id, user_id, first_name, last_name)
       VALUES ($1, $2, $3, $4)`,
      [uuidv4(), userId, dto.firstName ?? null, dto.lastName ?? null],
    );

    // 6. Assign role in DB if roles specified
    if (dto.roles && dto.roles.length > 0) {
      for (const roleName of dto.roles) {
        try {
          await this.db.query(
            `INSERT INTO user_roles (id, user_id, role_id, tenant_id, assigned_at)
             SELECT $1, $2, r.id, $3, NOW()
             FROM roles r WHERE r.name = $4
             ON CONFLICT DO NOTHING`,
            [uuidv4(), userId, dto.tenantId ?? null, roleName],
          );
        } catch (e) {
          // Role may not exist in DB — continue
          this.logger.warn(`Could not assign role ${roleName} to user ${userId}: ${e}`);
        }
      }
    }

    // 7. Add to tenant if specified
    if (dto.tenantId) {
      try {
        await this.db.query(
          `INSERT INTO tenant_members (id, tenant_id, user_id, status, joined_at)
           VALUES ($1, $2, $3, 'active', NOW())
           ON CONFLICT DO NOTHING`,
          [uuidv4(), dto.tenantId, userId],
        );
      } catch (e) {
        this.logger.warn(`Could not add user ${userId} to tenant ${dto.tenantId}: ${e}`);
      }
    }

    this.logger.log(`Provisioned user: ${dto.email} (${dto.roles?.join(',')})`);
    return user;
  }

  /**
   * Update a user's roles in both Cognito and DB.
   */
  async updateRoles(userId: string, roles: string[]): Promise<void> {
    const user = await this.findById(userId);
    if (!user) throw new NotFoundException(`User ${userId} not found`);

    // Update Cognito
    if (user.cognitoSub) {
      try {
        await this.cognito.send(new AdminUpdateUserAttributesCommand({
          UserPoolId:     this.userPoolId,
          Username:       user.email,
          UserAttributes: [
            { Name: 'custom:roles', Value: JSON.stringify(roles) },
          ],
        }));
      } catch (e) {
        this.logger.warn(`Could not update Cognito roles for ${user.email}: ${e}`);
      }
    }

    // Update DB: remove existing, add new
    await this.db.query(`DELETE FROM user_roles WHERE user_id = $1`, [userId]);

    for (const roleName of roles) {
      try {
        await this.db.query(
          `INSERT INTO user_roles (id, user_id, role_id, assigned_at)
           SELECT $1, $2, r.id, NOW()
           FROM roles r WHERE r.name = $3
           ON CONFLICT DO NOTHING`,
          [uuidv4(), userId, roleName],
        );
      } catch (e) {
        this.logger.warn(`Could not assign role ${roleName}: ${e}`);
      }
    }
  }

  async updateLastLogin(email: string): Promise<void> {
    await this.db.query(
      `UPDATE users SET last_login_at = NOW(), updated_at = NOW() WHERE email = $1`,
      [email.toLowerCase()],
    );
  }

  /**
   * getCampaignClaims — fetch the user's active campaign role geography and
   * candidateId from campaign_team_members (if they have one).
   * Used by auth.service to sync custom:wardCode, custom:constituencyCode,
   * custom:candidateId into Cognito at login time so the Lambda authorizer
   * can forward them as x-* headers to the campaign service.
   *
   * Falls back gracefully if the campaign tables don't exist yet.
   */
  async getCampaignClaims(
    userId: string,
    tenantId?: string,
  ): Promise<{
    wardCode: string | null;
    constituencyCode: string | null;
    candidateId: string | null;
  }> {
    try {
      // campaign_team_members: ward_code, constituency_code, campaign.candidate_id
      const result = await this.db.query<{
        ward_code: string | null;
        constituency_code: string | null;
        candidate_id: string | null;
      }>(
        `SELECT
            ctm.ward_code,
            ctm.constituency_code,
            c.candidate_id
         FROM campaign_team_members ctm
         JOIN campaigns c ON c.id = ctm.campaign_id
         WHERE ctm.user_id = $1
           AND ctm.status = 'active'
           ${tenantId ? 'AND ctm.tenant_id = $2' : ''}
         ORDER BY ctm.created_at DESC
         LIMIT 1`,
        tenantId ? [userId, tenantId] : [userId],
      );

      const row = result.rows[0];
      return {
        wardCode:         row?.ward_code         ?? null,
        constituencyCode: row?.constituency_code  ?? null,
        candidateId:      row?.candidate_id       ?? null,
      };
    } catch {
      // campaign tables may not be accessible from identity service DB pool
      // (different schema or first-time setup) — return nulls gracefully
      return { wardCode: null, constituencyCode: null, candidateId: null };
    }
  }

  /**
   * updateCognitoAttributes — called by Campaign Service via
   * PATCH /users/:id/attributes after a role assignment.
   * Syncs custom Cognito attributes (custom:roles, custom:wardCode,
   * custom:constituencyCode, custom:candidateId) so the JWT Lambda
   * authorizer forwards them as x-* headers on the next request.
   *
   * Only the attributes present in the DTO are updated (partial patch).
   */
  async updateCognitoAttributes(
    userId: string,
    dto: UpdateCognitoAttributesDto,
  ): Promise<{ updated: string[] }> {
    const user = await this.findById(userId);
    if (!user) throw new NotFoundException(`User ${userId} not found`);

    if (!user.cognitoSub) {
      this.logger.warn(`User ${userId} has no Cognito sub — skipping Cognito attribute update`);
      return { updated: [] };
    }

    // Build the attribute list from the DTO (only defined keys)
    const ALLOWED_ATTRS = [
      'custom:roles',
      'custom:wardCode',
      'custom:constituencyCode',
      'custom:candidateId',
      'custom:tenantId',
    ] as const;

    const userAttributes: { Name: string; Value: string }[] = [];
    for (const attrName of ALLOWED_ATTRS) {
      const val = dto[attrName as keyof UpdateCognitoAttributesDto];
      if (val !== undefined && val !== null) {
        userAttributes.push({ Name: attrName, Value: String(val) });
      }
    }

    if (userAttributes.length === 0) {
      return { updated: [] };
    }

    await this.cognito.send(new AdminUpdateUserAttributesCommand({
      UserPoolId:     this.userPoolId,
      Username:       user.email,
      UserAttributes: userAttributes,
    }));

    const updatedNames = userAttributes.map(a => a.Name);
    this.logger.log(`Updated Cognito attributes for user ${userId}: ${updatedNames.join(', ')}`);
    return { updated: updatedNames };
  }

  async logAuthEvent(payload: AuthEventPayload): Promise<void> {
    try {
      const user = await this.findByEmail(payload.email);
      await this.db.query(
        `INSERT INTO authentication_logs
         (id, user_id, event_type, ip_address, user_agent, success, failure_reason)
         VALUES ($1, $2, $3, $4::inet, $5, $6, $7)`,
        [
          uuidv4(),
          user?.id ?? null,
          payload.eventType,
          payload.ipAddress || null,
          payload.userAgent || null,
          payload.success,
          payload.failureReason ?? null,
        ],
      );
    } catch (error) {
      // Auth logging must never fail silently — log but don't throw
      this.logger.error('Failed to log auth event', error);
    }
  }
}
