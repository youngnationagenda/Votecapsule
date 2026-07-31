// ============================================================
// VoteCapsule — Step Callback DTO
// services/workflow/src/dto/step-callback.dto.ts
//
// Posted by EventBridge rule when a Step Functions state
// transition occurs. Also called directly by services.
// ============================================================
import {
  IsEnum, IsUUID, IsString, IsOptional, IsObject,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StepEventType } from '../entities/workflow-step-event.entity';

export class StepCallbackDto {
  @ApiProperty({ description: 'Workflow execution UUID' })
  @IsUUID()
  executionId!: string;

  @ApiProperty({ description: 'Name of the Step Functions state that generated this event' })
  @IsString()
  stepName!: string;

  @ApiProperty({ enum: StepEventType })
  @IsEnum(StepEventType)
  eventType!: StepEventType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  previousStep?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  nextStep?: string;

  @ApiPropertyOptional({ description: 'Lambda ARN or service integration URL' })
  @IsOptional()
  @IsString()
  taskResource?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  inputData?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  outputData?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  errorCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  errorCause?: string;
}
