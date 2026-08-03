// ============================================================
// VoteCapsule — Workflow Step Event Entity
// services/workflow/src/entities/workflow-step-event.entity.ts
// ============================================================
import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne,
  JoinColumn, Index, CreateDateColumn,
} from 'typeorm';
import { WorkflowExecution } from './workflow-execution.entity';

export enum StepEventType {
  ENTERED          = 'ENTERED',
  EXITED           = 'EXITED',
  TASK_SUBMITTED   = 'TASK_SUBMITTED',
  TASK_SUCCEEDED   = 'TASK_SUCCEEDED',
  TASK_FAILED      = 'TASK_FAILED',
  RETRY            = 'RETRY',
  HEARTBEAT        = 'HEARTBEAT',
  TIMEOUT          = 'TIMEOUT',
  CATCH            = 'CATCH',
}

@Entity('workflow_step_events')
@Index(['executionId'])
@Index(['eventType'])
export class WorkflowStepEvent {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'execution_id', type: 'uuid' })
  executionId!: string;

  @Column({ name: 'step_name', length: 100 })
  stepName!: string;

  @Column({ name: 'event_type', type: 'varchar', length: 50, enum: StepEventType })
  eventType!: StepEventType;

  @Column({ name: 'previous_step', type: 'varchar', length: 100, nullable: true })
  previousStep!: string | null;

  @Column({ name: 'next_step', type: 'varchar', length: 100, nullable: true })
  nextStep!: string | null;

  @Column({ name: 'task_resource', type: 'varchar', length: 500, nullable: true })
  taskResource!: string | null;

  @Column({ name: 'input_data', type: 'jsonb', nullable: true })
  inputData!: Record<string, unknown> | null;

  @Column({ name: 'output_data', type: 'jsonb', nullable: true })
  outputData!: Record<string, unknown> | null;

  @Column({ name: 'error_code', type: 'varchar', length: 100, nullable: true })
  errorCode!: string | null;

  @Column({ name: 'error_cause', type: 'text', nullable: true })
  errorCause!: string | null;

  @Column({ name: 'occurred_at', type: 'timestamptz', default: () => 'NOW()' })
  occurredAt!: Date;

  @ManyToOne(() => WorkflowExecution, (e) => e.steps)
  @JoinColumn({ name: 'execution_id' })
  execution!: WorkflowExecution;
}
