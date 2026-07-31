// ============================================================
// VoteCapsule™ — Create Ballot Reference DTO
// candidate-service/src/dto/create-ballot-ref.dto.ts
//
// Stores how a candidate appears on the physical IEBC ballot form.
// Used by AI Verification Service for OCR cross-validation.
// ============================================================
import {
  IsString, IsNotEmpty, IsOptional, IsInt, IsUUID, Min, Max,
} from 'class-validator';

export class CreateBallotRefDto {
  @IsUUID()
  candidateId: string;

  @IsUUID()
  positionId: string;

  /** Omit for all stations in scope; set for a specific station override */
  @IsString()
  @IsOptional()
  iebcStationCode?: string;

  /** EXACTLY as printed on the physical ballot */
  @IsString()
  @IsNotEmpty()
  ballotName: string;

  @IsString()
  @IsOptional()
  ballotSymbol?: string;

  @IsInt()
  @Min(1)
  @Max(100)
  ballotNumber: number;

  /** e.g. "Form 35A", "Form 35B", "Form 37" */
  @IsString()
  @IsOptional()
  formNumber?: string;
}
