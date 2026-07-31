// ============================================================
// VoteCapsule — Anchor Callback DTO
// services/evidence/src/dto/anchor-callback.dto.ts
//
// Posted by the Trust Service after dual-anchoring a capsule's
// hash in a Merkle batch (Hedera + RFC 3161).
// ============================================================
import { IsString, IsNotEmpty, IsEnum, IsOptional } from 'class-validator';

export enum AnchorCallbackStatus {
  PENDING        = 'PENDING',
  HEDERA_ONLY    = 'HEDERA_ONLY',
  TSA_ONLY       = 'TSA_ONLY',
  DUAL_ANCHORED  = 'DUAL_ANCHORED',
  FAILED         = 'FAILED',
}

export class AnchorCallbackDto {
  /** The Merkle batch ID from trust_anchor_batches */
  @IsString()
  @IsNotEmpty()
  batchId: string;

  /** Anchor status from Trust Service */
  @IsEnum(AnchorCallbackStatus)
  anchorStatus: AnchorCallbackStatus;
}
