// ============================================================
// VoteCapsule — Workflow Execution Entity
// services/workflow/src/entities/workflow-execution.entity.ts
// ============================================================
import {
  Entity, PrimaryGeneratedColumn, Column, Index,
  CreateDateColumn, UpdateDateColumn, OneToMany,
} from 'typeorm';
import { WorkflowStepEvent }  from './workflow-step-event.entity';
import { WorkflowEscalation } from './workflow-escalation.entity';

export enum WorkflowType {
  EVIDENCE_CAPSULE       = 'EVIDENCE_CAPSULE',
  TENANT_PROVISIONING    = 'TENANT_PROVISIONING',
  USER_ONBOARDING        = 'USER_ONBOARDING',
  RESULTS_PUBLICATION    = 'RESULTS_PUBLICATION',
  RECOVERY               = 'RECOVERY',
  ESCALATION             = 'ESCALATION',
  ASSIGNMENT             = 'ASSIGNMENT',
}

export enum WorkflowStatus {
  RUNNING    = 'RUNNING',
  SUCCEEDED  = 'SUCCEEDED',
  FAILED     = 'FAILED',
  TIMED_OUT  = 'TIMED_OUT',
  ABORTED    = 'ABORTED',
}

@Entity('workflow_executions')
@Index(['capsuleId'])
@Index(['tenantId'])
@Index(['status'])
@Index(['workflowType'])
export class WorkflowExecution {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'execution_arn', length: 2048, unique: true, nullable: true })
  executionArn!: string | null;

  @Column({ name: 'state_machine_arn', length: 2048, nullable: true })
  stateMachineArn!: string | null;

  @Column({ name: 'workflow_type', type: 'varchar', length: 50, enum: WorkflowType })
  workflowType!: WorkflowType;

  @Column({ name: 'tenant_id', type: 'uuid', nullable: true })
  tenantId!: string | null;

  @Column({ name: 'capsule_id', type: 'uuid', nullable: true })
  capsuleId!: string | null;

  @Column({ name: 'election_id', type: 'uuid', nullable: true })
  electionId!: string | null;

  @Column({ name: 'initiator_user_id', type: 'uuid', nullable: true })
  initiatorUserId!: string | null;

  @Column({ name: 'initiator_service', length: 100, nullable: true })
  initiatorService!: string | null;

  @Column({ name: 'status', type: 'varchar', length: 30, default: WorkflowStatus.RUNNING, enum: WorkflowStatus })
  status!: WorkflowStatus;

  @Column({ name: 'current_step', length: 100, nullable: true })
  currentStep!: string | null;

  @Column({ name: 'started_at', type: 'timestamptz', default: () => 'NOW()' })
  startedAt!: Date;

  @Column({ name: 'deadline_at', type: 'timestamptz', nullable: true })
  deadlineAt!: Date | null;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt!: Date | null;

  @Column({ name: 'duration_ms', nullable: true })
  durationMs!: number | null;

  @Column({ name: 'attempt_count', type: 'smallint', default: 1 })
  attemptCount!: number;

  @Column({ name: 'last_error', type: 'text', nullable: true })
  lastError!: string | null;

  @Column({ name: 'input_payload', type: 'jsonb', nullable: true })
  inputPayload!: Record<string, unknown> | null;

  @Column({ name: 'output_payload', type: 'jsonb', nullable: true })
  outputPayload!: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @OneToMany(() => WorkflowStepEvent, (s) => s.execution)
  steps!: WorkflowStepEvent[];

  @OneToMany(() => WorkflowEscalation, (e) => e.execution)
  escalations!: WorkflowEscalation[];
}
