import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, Index,
} from 'typeorm';

@Entity('access_logs')
@Index(['tenantId', 'createdAt'])
@Index(['userId', 'createdAt'])
@Index(['endpoint', 'createdAt'])
export class AccessLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid', nullable: true })
  tenantId: string | null;

  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId: string | null;

  @Column({ name: 'service_name', type: 'varchar', length: 50 })
  serviceName: string;

  @Column({ name: 'endpoint', type: 'varchar', length: 255 })
  endpoint: string;

  @Column({ name: 'method', type: 'varchar', length: 10 })
  method: string;

  // -- Response
  @Column({ name: 'status_code', type: 'integer' })
  statusCode: number;

  @Column({ name: 'response_time_ms', type: 'integer', nullable: true })
  responseTimeMs: number | null;

  // -- Client
  @Column({ name: 'ip_address', type: 'inet', nullable: true })
  ipAddress: string | null;

  @Column({ name: 'device_id', type: 'uuid', nullable: true })
  deviceId: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
