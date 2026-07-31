// ============================================================
// VoteCapsule — Start Workflow DTO
// services/workflow/src/dto/start-workflow.dto.ts
// ============================================================
import { IsEnum, IsUUID, IsOptional, IsString, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { WorkflowType } from '../entities/workflow-execution.entity';

export class StartWorkflowDto {
  @ApiProperty({ enum: WorkflowType, description: 'The type of workflow to start' })
  @IsEnum(WorkflowType)
  workflowType!: WorkflowType;

  @ApiPropertyOptional({ description: 'Tenant UUID context' })
  @IsOptional()
  @IsUUID()
  tenantId?: string;

  @ApiPropertyOptional({ description: 'Evidence Capsule UUID — required for EVIDENCE_CAPSULE workflow' })
  @IsOptional()
  @IsUUID()
  capsuleId?: string;

  @ApiPropertyOptional({ description: 'Election UUID context' })
  @IsOptional()
  @IsUUID()
  electionId?: string;

  @ApiPropertyOptional({ description: 'UUID of the user who initiated this workflow' })
  @IsOptional()
  @IsUUID()
  initiatorUserId?: string;

  @ApiPropertyOptional({ description: 'Service name that triggered this workflow' })
  @IsOptional()
  @IsString()
  initiatorService?: string;

  @ApiPropertyOptional({ description: 'Additional input data passed to the Step Functions execution' })
  @IsOptional()
  @IsObject()
  payload?: Record<string, unknown>;
}
