// ============================================================
// VoteCapsule — EventBridge Event DTOs
// These match the event shapes published by the Workflow Engine.
// source: 'votecapsule.workflow'
// ============================================================
import { IsString, IsOptional, IsUUID, IsEnum, IsObject } from 'class-validator';

export enum WorkflowEventDetailType {
  ESCALATION_CREATED  = 'ESCALATION_CREATED',
  WORKFLOW_STARTED    = 'WORKFLOW_STARTED',
  WORKFLOW_COMPLETED  = 'WORKFLOW_COMPLETED',
}

/** Wrapper envelope EventBridge sends to the HTTP endpoint */
export class EventBridgeEnvelopeDto {
  @IsString()
  source: string;

  @IsString()
  'detail-type': string;

  @IsObject()
  detail: Record<string, unknown>;
}

/** Detail payload for ESCALATION_CREATED events */
export interface EscalationCreatedDetail {
  escalationId:    string;
  executionId:     string;
  capsuleId?:      string;
  tenantId?:       string;
  escalationType:  string;
  severity:        string;
  description:     string;
}

/** Detail payload for WORKFLOW_COMPLETED events */
export interface WorkflowCompletedDetail {
  executionId:  string;
  workflowType: string;
  finalStatus:  string;   // SUCCEEDED | FAILED | TIMED_OUT | ABORTED
  capsuleId?:   string;
  tenantId?:    string;
}
