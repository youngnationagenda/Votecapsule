// ============================================================
// VoteCapsule — QLDB Anchor DTO
// Posted by the Trust Service after successfully anchoring
// a capsule to the QLDB ledger (vote-capsule-trust).
// ============================================================
import { IsString, IsNotEmpty, Length } from 'class-validator';

export class QldbAnchorDto {
  /** The QLDB document ID returned by the ledger */
  @IsString()
  @IsNotEmpty()
  qldbDocumentId: string;

  /** QLDB sequence number for this document revision */
  @IsString()
  @IsNotEmpty()
  qldbSequenceNo: string;
}
