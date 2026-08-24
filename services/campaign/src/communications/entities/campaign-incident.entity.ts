import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum IncidentSeverity { LOW = 'low', MEDIUM = 'medium', HIGH = 'high', CRITICAL = 'critical' }
export enum IncidentStatus   { OPEN = 'open', INVESTIGATING = 'investigating', ESCALATED = 'escalated', RESOLVED = 'resolved', CLOSED = 'closed' }

@Entity('campaign_incidents')
export class CampaignIncident {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid', name: 'campaign_id' }) campaignId: string;
  @Column({ type: 'uuid', name: 'tenant_id' }) tenantId: string;
  @Column({ type: 'uuid', name: 'event_id', nullable: true }) eventId: string | null;
  @Column({ type: 'varchar', length: 30, name: 'incident_number', nullable: true }) incidentNumber: string | null;
  @Column({ type: 'varchar', length: 50 }) category: string;
  @Column({ type: 'varchar', length: 100, name: 'incident_type' }) incidentType: string;
  @Column({ type: 'varchar', length: 20, default: IncidentSeverity.LOW }) severity: IncidentSeverity;
  @Column({ type: 'varchar', length: 300 }) title: string;
  @Column({ type: 'text' }) description: string;
  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true }) lat: number | null;
  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true }) lng: number | null;
  @Column({ type: 'varchar', length: 200, name: 'location_name', nullable: true }) locationName: string | null;
  @Column({ type: 'char', length: 3, name: 'county_code', nullable: true }) countyCode: string | null;
  @Column({ type: 'char', length: 3, name: 'constituency_code', nullable: true }) constituencyCode: string | null;
  @Column({ type: 'char', length: 4, name: 'ward_code', nullable: true }) wardCode: string | null;
  @Column({ type: 'uuid', name: 'reported_by' }) reportedBy: string;
  @Column({ type: 'varchar', length: 200, name: 'reporter_name', nullable: true }) reporterName: string | null;
  @Column({ type: 'uuid', name: 'assigned_to', nullable: true }) assignedTo: string | null;
  @Column({ type: 'boolean', default: false }) escalated: boolean;
  @Column({ type: 'uuid', name: 'escalated_to', nullable: true }) escalatedTo: string | null;
  @Column({ type: 'timestamptz', name: 'escalated_at', nullable: true }) escalatedAt: Date | null;
  @Column({ type: 'text', name: 'escalation_reason', nullable: true }) escalationReason: string | null;
  @Column({ type: 'varchar', length: 20, default: IncidentStatus.OPEN }) status: IncidentStatus;
  @Column({ type: 'text', nullable: true }) resolution: string | null;
  @Column({ type: 'uuid', name: 'resolved_by', nullable: true }) resolvedBy: string | null;
  @Column({ type: 'timestamptz', name: 'resolved_at', nullable: true }) resolvedAt: Date | null;
  @Column({ type: 'simple-array', name: 'media_ids', nullable: true }) mediaIds: string[];
  @Column({ type: 'timestamptz', name: 'incident_date', default: () => 'NOW()' }) incidentDate: Date;
  @Column({ type: 'text', nullable: true }) notes: string | null;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
}
