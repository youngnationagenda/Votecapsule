/**
 * Vote Capsule™ Identity Service — Invitations Service
 *
 * Manages the user invitation workflow.
 * Every user is onboarded through a controlled invitation.
 */

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Inject,
  Logger,
} from '@nestjs/common';
import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { DATABASE_POOL } from '../database/database.module';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import { UsersService } from '../users/users.service';

export interface Invitation {
  id: string;
  email: string;
  tenantId: string | null;
  roleId: string | null;
  invitedBy: string | null;
  token: string;
  status: string;
  expiresAt: Date;
  acceptedAt: Date | null;
  createdAt: Date;
}

@Injectable()
export class InvitationsService {
  private readonly logger = new Logger(InvitationsService.name);
  // Invitations expire after 72 hours
  private readonly EXPIRY_HOURS = 72;

  private readonly notificationServiceUrl: string;

  constructor(
    @Inject(DATABASE_POOL) private readonly db: Pool,
    private readonly usersService: UsersService,
    private readonly httpService: HttpService,
    private readonly config: ConfigService,
  ) {
    this.notificationServiceUrl = this.config.get(
      'NOTIFICATION_SERVICE_URL',
      'http://localhost:3008/api/v1/notification',
    );
  }

  async findAll(tenantId?: string): Promise<Invitation[]> {
    const query = tenantId
      ? `SELECT id, email, tenant_id as "tenantId", role_id as "roleId",
                invited_by as "invitedBy", token, status,
                expires_at as "expiresAt", accepted_at as "acceptedAt", created_at as "createdAt"
         FROM invitations WHERE tenant_id = $1 ORDER BY created_at DESC`
      : `SELECT id, email, tenant_id as "tenantId", role_id as "roleId",
                invited_by as "invitedBy", token, status,
                expires_at as "expiresAt", accepted_at as "acceptedAt", created_at as "createdAt"
         FROM invitations ORDER BY created_at DESC`;

    const result = await this.db.query<Invitation>(query, tenantId ? [tenantId] : []);
    return result.rows;
  }

  async findByToken(token: string): Promise<Invitation | null> {
    const result = await this.db.query<Invitation>(
      `SELECT id, email, tenant_id as "tenantId", role_id as "roleId",
              invited_by as "invitedBy", token, status,
              expires_at as "expiresAt", accepted_at as "acceptedAt", created_at as "createdAt"
       FROM invitations WHERE token = $1`,
      [token],
    );
    return result.rows[0] ?? null;
  }

  async create(dto: CreateInvitationDto, invitedBy: string): Promise<Invitation> {
    // Check for existing pending invitation
    const existing = await this.db.query(
      `SELECT id FROM invitations WHERE email = $1 AND tenant_id = $2 AND status = 'pending'`,
      [dto.email.toLowerCase(), dto.tenantId ?? null],
    );

    if ((existing.rowCount ?? 0) > 0) {
      throw new ConflictException(`A pending invitation already exists for ${dto.email}`);
    }

    const id = uuidv4();
    // Use cryptographically secure random token
    const token = crypto.randomBytes(48).toString('hex');
    const expiresAt = new Date(Date.now() + this.EXPIRY_HOURS * 60 * 60 * 1000);

    const result = await this.db.query<Invitation>(
      `INSERT INTO invitations (id, email, tenant_id, role_id, invited_by, token, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, email, tenant_id as "tenantId", role_id as "roleId",
                 invited_by as "invitedBy", token, status,
                 expires_at as "expiresAt", accepted_at as "acceptedAt", created_at as "createdAt"`,
      [id, dto.email.toLowerCase(), dto.tenantId ?? null, dto.roleId ?? null, invitedBy, token, expiresAt],
    );

    this.logger.log(`Invitation created for ${dto.email}`);

    // Send invitation email via Notification Service (fire-and-forget — don't fail if it's down)
    const invitation = result.rows[0]!;
    this.sendInvitationEmail(invitation, dto).catch((err) =>
      this.logger.warn(`Failed to send invitation email for ${dto.email}: ${err?.message}`)
    );

    return invitation;
  }

  async accept(token: string, userId: string): Promise<void> {
    const invitation = await this.findByToken(token);

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    if (invitation.status !== 'pending') {
      throw new BadRequestException(`Invitation is ${invitation.status} and cannot be accepted`);
    }

    if (new Date() > invitation.expiresAt) {
      await this.db.query(
        `UPDATE invitations SET status = 'expired' WHERE id = $1`,
        [invitation.id],
      );
      throw new BadRequestException('Invitation has expired');
    }

    await this.db.query(
      `UPDATE invitations SET status = 'accepted', accepted_at = NOW() WHERE id = $1`,
      [invitation.id],
    );

    // If tenant + role specified, assign role to user within tenant
    if (invitation.tenantId && invitation.roleId) {
      await this.db.query(
        `INSERT INTO user_roles (id, user_id, role_id, tenant_id, assigned_at)
         VALUES ($1, $2, $3, $4, NOW()) ON CONFLICT DO NOTHING`,
        [uuidv4(), userId, invitation.roleId, invitation.tenantId],
      );
    }

    this.logger.log(`Invitation accepted by user ${userId} for ${invitation.email}`);
  }

  async revoke(id: string): Promise<void> {
    const result = await this.db.query(
      `UPDATE invitations SET status = 'revoked' WHERE id = $1 AND status = 'pending'`,
      [id],
    );

    if (result.rowCount === 0) {
      throw new NotFoundException('Pending invitation not found');
    }
  }

  // ── Internal: Notification integration ───────────────────

  /**
   * Sends invitation email via Notification Service.
   * Uses a direct email payload (not template-based) because the invitee
   * has no userId yet — they haven't registered.
   *
   * POST /api/v1/notification/email
   */
  private async sendInvitationEmail(
    invitation: Invitation,
    dto: CreateInvitationDto,
  ): Promise<void> {
    const acceptUrl = `https://votecapsule.yna.co.ke/accept-invite?token=${invitation.token}`;
    const expiryHours = this.EXPIRY_HOURS;

    await firstValueFrom(
      this.httpService.post(
        `${this.notificationServiceUrl}/email`,
        {
          to:      invitation.email,
          subject: 'You have been invited to VoteCapsule™',
          textBody: [
            `You have been invited to join the VoteCapsule™ election integrity platform.`,
            ``,
            `Click the link below to accept your invitation (expires in ${expiryHours} hours):`,
            `${acceptUrl}`,
            ``,
            `If you did not expect this invitation, you can safely ignore this email.`,
            ``,
            `— The VoteCapsule™ Team`,
          ].join('\n'),
        },
        {
          headers:  { 'x-internal-service': 'identity-service' },
          timeout:  5000,
        },
      )
    );

    this.logger.log(`Invitation email dispatched to ${invitation.email} (expires ${invitation.expiresAt.toISOString()})`);
  }
}
