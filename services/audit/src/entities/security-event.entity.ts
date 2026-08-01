import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, Index,
} from 'typeorm';

export enum SecuritySeverity {
  INFO = 'info',
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum SecurityCategory {
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  DATA_ACCESS = 'data_access',
  CONFIGURATION = 'configuration',
  ANOMALY = 'anomaly',
}

@Entity('security_events')
@Index(['tenantId', 'createdAt'])
@Index(['userId', 'createdAt'])
@Index(['eventType', 'createdAt'])
export class SecurityEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid', nullable: true })
  tenantId: string | null;

  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId: string | null;

  // -- Event classification
  @Column({ name: 'event_type', type: 'varchar', length: 80 })
  eventType: string;

  @Column({
    name: 'severity',
    type: 'varchar',
    length: 20,
    default: SecuritySeverity.INFO,
  })
  severity: SecuritySeverity;

  @Column({ name: 'category', type: 'varchar', length: 50 })
  category: SecurityCategory;

  // -- Details
  @Column({ name: 'description', type: 'text' })
  description: string;

  @Column({ name: 'ip_address', type: 'inet', nullable: true })
  ipAddress: string | null;

  @Column({ name: 'user_agent', type: 'text', nullable: true })
  userAgent: string | null;

  @Column({ name: 'device_id', type: 'uuid', nullable: true })
  deviceId: string | null;

  @Column({ name: 'geo_location', type: 'jsonb', nullable: true })
  geoLocation: Record<string, unknown> | null;

  // -- For login events
  @Column({ name: 'auth_method', type: 'varchar', length: 30, nullable: true })
  authMethod: string | null;

  @Column({ name: 'login_attempt_count', type: 'integer', nullable: true })
  loginAttemptCount: number | null;

  // -- Resolution
  @Column({ name: 'resolved', type: 'boolean', default: false })
  resolved: boolean;

  @Column({ name: 'resolved_at', type: 'timestamptz', nullable: true })
  resolvedAt: Date | null;

  @Column({ name: 'resolved_by', type: 'uuid', nullable: true })
  resolvedBy: string | null;

  @Column({ name: 'resolution_notes', type: 'text', nullable: true })
  resolutionNotes: string | null;

  // -- Context
  @Column({ name: 'metadata', type: 'jsonb', default: '{}' })
  metadata: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
