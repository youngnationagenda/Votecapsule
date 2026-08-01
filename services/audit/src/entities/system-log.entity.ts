import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, Index,
} from 'typeorm';

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  FATAL = 'fatal',
}

@Entity('system_logs')
@Index(['serviceName', 'logLevel', 'createdAt'])
export class SystemLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'service_name', type: 'varchar', length: 50 })
  serviceName: string;

  @Column({
    name: 'log_level',
    type: 'varchar',
    length: 10,
    default: LogLevel.INFO,
  })
  logLevel: LogLevel;

  @Column({ name: 'message', type: 'text' })
  message: string;

  @Column({ name: 'stack_trace', type: 'text', nullable: true })
  stackTrace: string | null;

  // -- Context
  @Column({ name: 'correlation_id', type: 'uuid', nullable: true })
  correlationId: string | null;

  @Column({ name: 'metadata', type: 'jsonb', default: '{}' })
  metadata: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
