/**
 * Vote Capsule™ Identity Service — Devices Service
 *
 * Manages user device registrations and trust.
 * Critical for the mobile field agent SHA-256 trust chain.
 *
 * Only trusted devices can submit evidence capsules.
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
import { RegisterDeviceDto } from './dto/register-device.dto';

export interface Device {
  id: string;
  userId: string;
  deviceName: string | null;
  deviceFingerprint: string;
  deviceType: string | null;
  osVersion: string | null;
  appVersion: string | null;
  trusted: boolean;
  trustGrantedAt: Date | null;
  lastSeenAt: Date | null;
  createdAt: Date;
}

@Injectable()
export class DevicesService {
  private readonly logger = new Logger(DevicesService.name);

  constructor(@Inject(DATABASE_POOL) private readonly db: Pool) {}

  async findByUser(userId: string): Promise<Device[]> {
    const result = await this.db.query<Device>(
      `SELECT id, user_id as "userId", device_name as "deviceName",
              device_fingerprint as "deviceFingerprint", device_type as "deviceType",
              os_version as "osVersion", app_version as "appVersion",
              trusted, trust_granted_at as "trustGrantedAt",
              last_seen_at as "lastSeenAt", created_at as "createdAt"
       FROM user_devices WHERE user_id = $1 ORDER BY created_at DESC`,
      [userId],
    );
    return result.rows;
  }

  async register(userId: string, dto: RegisterDeviceDto): Promise<Device> {
    const existing = await this.db.query(
      'SELECT id FROM user_devices WHERE device_fingerprint = $1',
      [dto.deviceFingerprint],
    );

    if ((existing.rowCount ?? 0) > 0) {
      throw new ConflictException('Device already registered');
    }

    const id = uuidv4();
    const result = await this.db.query<Device>(
      `INSERT INTO user_devices
         (id, user_id, device_name, device_fingerprint, device_type, os_version, app_version)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, user_id as "userId", device_name as "deviceName",
                 device_fingerprint as "deviceFingerprint", device_type as "deviceType",
                 os_version as "osVersion", app_version as "appVersion",
                 trusted, trust_granted_at as "trustGrantedAt",
                 last_seen_at as "lastSeenAt", created_at as "createdAt"`,
      [id, userId, dto.deviceName ?? null, dto.deviceFingerprint, dto.deviceType ?? null,
       dto.osVersion ?? null, dto.appVersion ?? null],
    );

    this.logger.log(`Device registered for user ${userId}: ${dto.deviceFingerprint}`);
    return result.rows[0]!;
  }

  async trustDevice(deviceId: string, grantedBy: string): Promise<void> {
    const result = await this.db.query(
      `UPDATE user_devices SET trusted = TRUE, trust_granted_at = NOW()
       WHERE id = $1`,
      [deviceId],
    );
    if (result.rowCount === 0) {
      throw new NotFoundException(`Device ${deviceId} not found`);
    }
    this.logger.log(`Device ${deviceId} trusted by admin ${grantedBy}`);
  }

  async removeDevice(userId: string, deviceId: string): Promise<void> {
    const result = await this.db.query(
      `DELETE FROM user_devices WHERE id = $1 AND user_id = $2`,
      [deviceId, userId],
    );
    if (result.rowCount === 0) {
      throw new NotFoundException('Device not found');
    }
    this.logger.log(`Device ${deviceId} removed for user ${userId}`);
  }

  async updateLastSeen(deviceFingerprint: string): Promise<void> {
    await this.db.query(
      `UPDATE user_devices SET last_seen_at = NOW() WHERE device_fingerprint = $1`,
      [deviceFingerprint],
    );
  }
}
