// ============================================================
// VoteCapsule — Anchor Request DTO
// Posted by Evidence Service (or Workflow Engine) to
// trigger QLDB anchoring of an approved capsule.
// ============================================================
import {
  IsString, IsNotEmpty, IsUUID, IsInt, Min, Max,
  IsOptional, Length,
} from 'class-validator';

export class AnchorRequestDto {
  @IsUUID()
  capsuleId: string;

  /** SHA-256 composite hash computed at capture time */
  @IsString()
  @Length(64, 64)
  sha256Hash: string;

  /** PRESIDENT | GOVERNOR | SENATOR | WOMEN_REP | MP | MCA */
  @IsString()
  @IsNotEmpty()
  positionCode: string;

  @IsString()
  @Length(15, 15)
  iebcStationCode: string;

  @IsInt()
  @Min(2017)
  @Max(2050)
  electionYear: number;

  @IsString()
  @Length(3, 3)
  countyCode: string;

  @IsString()
  @IsNotEmpty()
  countyName: string;

  /** Which service is requesting the anchor (for audit trail) */
  @IsOptional()
  @IsString()
  requestedByService?: string;

  /** UUID of the human validator who approved the capsule */
  @IsOptional()
  @IsUUID()
  validatorUserId?: string;
}
