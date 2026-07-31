// ============================================================
// VoteCapsule — AI Result DTO
// Posted by AI Service after completing the verification pipeline.
// PATCH /evidence/capsules/:id/ai-result
//
// AI ASSISTS, HUMANS DECIDE.
// This DTO only routes the capsule — it never approves or publishes.
// ============================================================
import { IsEnum } from 'class-validator';

export enum AiRoutingDecision {
  APPROVE_FOR_REVIEW = 'APPROVE_FOR_REVIEW',
  MANUAL_REVIEW      = 'MANUAL_REVIEW',
  ESCALATE           = 'ESCALATE',
}

export class AiResultDto {
  @IsEnum(AiRoutingDecision)
  routingDecision: AiRoutingDecision;
}
