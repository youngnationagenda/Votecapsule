// ============================================================
// VoteCapsule — Submit Capsule DTO
// Sent from the React Native mobile app when a field agent
// submits captured evidence.
// ============================================================
import {
  IsString, IsNotEmpty, Length, IsEnum, IsInt, Min, Max,
  IsISO8601, IsOptional, IsNumber, IsUUID,
} from 'class-validator';
import { PositionCode } from '../entities/evidence-capsule.entity';

export class SubmitCapsuleDto {
  /** Multi-tenant isolation — supplied from JWT claim */
  @IsUUID()
  tenantId: string;

  /**
   * 15-digit IEBC station code.
   * Format: county(3) + constituency(3) + ward(4) + centre_seq(3) + stream(2)
   * Example: 001001000100101
   */
  @IsString()
  @Length(15, 15, { message: 'IEBC station code must be exactly 15 digits' })
  iebcStationCode: string;

  /** Kenya General Election position */
  @IsEnum(PositionCode)
  positionCode: PositionCode;

  /** Election year — e.g. 2027 */
  @IsInt()
  @Min(2017)
  @Max(2050)
  electionYear: number;

  /**
   * SHA-256 composite hash computed on the mobile device at capture time.
   * Formula: SHA-256(imageSHA256 + sortedMetadataJSON + captureTimestamp)
   * Server re-derives and must match — mismatch = rejection.
   */
  @IsString()
  @Length(64, 64, { message: 'SHA-256 hash must be 64 hex characters' })
  sha256Hash: string;

  /** ISO 8601 UTC — when the photo was taken on the device */
  @IsISO8601()
  capturedAt: string;

  /** Optional: which party or agent organisation is submitting */
  @IsOptional()
  @IsString()
  @Length(1, 200)
  partyOrg?: string;

  /** GPS — nullable, captured by mobile if available */
  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;

  @IsOptional()
  @IsNumber()
  altitude?: number;

  @IsOptional()
  @IsNumber()
  accuracyMeters?: number;
}
