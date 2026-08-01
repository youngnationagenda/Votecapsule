import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, Index,
} from 'typeorm';

export enum AuditLogStatus {
  SUCCESS = 'success',
  FAILURE = 'failure',
  DENIED = 'denied',
  ERROR = 'error',
}

@Entity('audit_logs')
@Index(['tenantId', 'createdAt'])
@Index(['userId', 'createdAt'])
@Index(['resourceType', 'resourceId'])
@Index(['action', 'createdAt'])
@Index(['serviceName', 'createdAt'])
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid', nullable: true })
  tenantId: string | null;

  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId: string | null;

  @Column({ name: 'session_id', type: 'uuid', nullable: true })
  sessionId: string | null;

  // -- What happened
  @Column({ name: 'action', type: 'varchar', length: 100 })
  action: string;

  @Column({ name: 'resource_type', type: 'varchar', length: 80 })
  resourceType: string;

  @Column({ name: 'resource_id', type: 'uuid', nullable: true })
  resourceId: string | null;

  // -- Context
  @Column({ name: 'service_name', type: 'varchar', length: 50 })
  serviceName: string;

  @Column({ name: 'method', type: 'varchar', length: 10, nullable: true })
  method: string | null;

  @Column({ name: 'endpoint', type: 'varchar', length: 255, nullable: true })
  endpoint: string | null;

  @Column({ name: 'ip_address', type: 'inet', nullable: true })
  ipAddress: string | null;

  @Column({ name: 'user_agent', type: 'text', nullable: true })
  userAgent: string | null;

  @Column({ name: 'device_id', type: 'uuid', nullable: true })
  deviceId: string | null;

  // -- Change details
  @Column({ name: 'previous_state', type: 'jsonb', nullable: true })
  previousState: Record<string, unknown> | null;

  @Column({ name: 'new_state', type: 'jsonb', nullable: true })
  newState: Record<string, unknown> | null;

  @Column({ name: 'metadata', type: 'jsonb', default: '{}' })
  metadata: Record<string, unknown>;

  // -- Result
  @Column({
    name: 'status',
    type: 'varchar',
    length: 20,
    default: AuditLogStatus.SUCCESS,
  })
  status: AuditLogStatus;

  @Column({ name: 'error_code', type: 'varchar', length: 50, nullable: true })
  errorCode: string | null;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string | null;

  // -- Timing
  @Column({ name: 'duration_ms', type: 'integer', nullable: true })
  durationMs: number | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
