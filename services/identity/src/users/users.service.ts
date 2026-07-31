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
} from '@nestjs/common';
import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { DATABASE_POOL } from '../database/database.module';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
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

    const result = await this.db.query<User>(
      `SELECT id, email, email_verified as "emailVerified", cognito_sub as "cognitoSub",
              status, last_login_at as "lastLoginAt", created_at as "createdAt",
              updated_at as "updatedAt", deleted_at as "deletedAt"
       FROM users WHERE deleted_at IS NULL
       ORDER BY ${sortBy} ${sortOrder}
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

  async findById(id: string): Promise<User | null> {
    const result = await this.db.query<User>(
      `SELECT id, email, email_verified as "emailVerified", cognito_sub as "cognitoSub",
              status, last_login_at as "lastLoginAt", created_at as "createdAt",
              updated_at as "updatedAt", deleted_at as "deletedAt"
       FROM users WHERE id = $1 AND deleted_at IS NULL`,
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

    return result.rows[0]!;
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

  async updateLastLogin(email: string): Promise<void> {
    await this.db.query(
      `UPDATE users SET last_login_at = NOW(), updated_at = NOW() WHERE email = $1`,
      [email.toLowerCase()],
    );
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
