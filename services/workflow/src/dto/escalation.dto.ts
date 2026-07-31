// ============================================================
// VoteCapsule — Escalation DTO
// services/workflow/src/dto/escalation.dto.ts
// ============================================================
import { IsEnum, IsUUID, IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EscalationType, EscalationSeverity } from '../entities/workflow-escalation.entity';

export class EscalationDto {
  @ApiProperty({ description: 'Workflow execution UUID being escalated' })
  @IsUUID()
  executionId!: string;

  @ApiProperty({ enum: EscalationType })
  @IsEnum(EscalationType)
  escalationType!: EscalationType;

  @ApiPropertyOptional({ enum: EscalationSeverity, default: EscalationSeverity.HIGH })
  @IsOptional()
  @IsEnum(EscalationSeverity)
  severity?: EscalationSeverity;

  @ApiProperty({ description: 'Human-readable escalation message' })
  @IsString()
  message!: string;

  @ApiPropertyOptional({ description: 'UUID of the supervisor to escalate to' })
  @IsOptional()
  @IsUUID()
  escalatedTo?: string;
}

export class ResolveEscalationDto {
  @ApiProperty({ description: 'Resolution notes from the supervisor' })
  @IsString()
  notes!: string;
}
