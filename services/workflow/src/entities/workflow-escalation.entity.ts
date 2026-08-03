// ============================================================
// VoteCapsule — Workflow Escalation Entity
// services/workflow/src/entities/workflow-escalation.entity.ts
// ============================================================
import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne,
  JoinColumn, Index, CreateDateColumn,
} from 'typeorm';
import { WorkflowExecution } from './workflow-execution.entity';

export enum EscalationType {
  DEADLINE_BREACH               = 'DEADLINE_BREACH',
  VALIDATION_OVERDUE            = 'VALIDATION_OVERDUE',
  AI_FAILURE                    = 'AI_FAILURE',
  TRUST_FAILURE                 = 'TRUST_FAILURE',
  MANUAL_INTERVENTION_REQUIRED  = 'MANUAL_INTERVENTION_REQUIRED',
}

export enum EscalationSeverity {
  LOW      = 'LOW',
  MEDIUM   = 'MEDIUM',
  HIGH     = 'HIGH',
  CRITICAL = 'CRITICAL',
}

@Entity('workflow_escalations')
@Index(['executionId'])
@Index(['resolvedAt'])
export class WorkflowEscalation {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'execution_id', type: 'uuid' })
  executionId!: string;

  @Column({ name: 'escalation_type', type: 'varchar', length: 50, enum: EscalationType })
  escalationType!: EscalationType;

  @Column({ name: 'severity', type: 'varchar', length: 20, default: EscalationSeverity.HIGH, enum: EscalationSeverity })
  severity!: EscalationSeverity;

  @Column({ name: 'message', type: 'text' })
  message!: string;

  @Column({ name: 'escalated_to', type: 'uuid', nullable: true })
  escalatedTo!: string | null;

  @Column({ name: 'notified_at', type: 'timestamptz', nullable: true })
  notifiedAt!: Date | null;

  @Column({ name: 'resolved_at', type: 'timestamptz', nullable: true })
  resolvedAt!: Date | null;

  @Column({ name: 'resolved_by', type: 'uuid', nullable: true })
  resolvedBy!: string | null;

  @Column({ name: 'resolution_notes', type: 'text', nullable: true })
  resolutionNotes!: string | null;

  @Column({ name: 'detected_at', type: 'timestamptz', default: () => 'NOW()' })
  detectedAt!: Date;

  @ManyToOne(() => WorkflowExecution, (e) => e.escalations)
  @JoinColumn({ name: 'execution_id' })
  execution!: WorkflowExecution;
}
