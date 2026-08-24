// ============================================================
// VoteCapsule™ — Campaign Vehicle Entity
// ============================================================
import {
  Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn,
  OneToMany, Index,
} from 'typeorm';
import { CampaignVehicleTrip } from './campaign-vehicle-trip.entity';

@Entity('campaign_vehicles')
export class CampaignVehicle {
  @PrimaryGeneratedColumn('uuid') id: string;

  @Index('idx_cveh_campaign')
  @Column({ type: 'uuid', name: 'campaign_id' }) campaignId: string;

  @Index('idx_cveh_tenant')
  @Column({ type: 'uuid', name: 'tenant_id' }) tenantId: string;

  @Column({ type: 'varchar', length: 50, name: 'vehicle_type', default: 'CAR' }) vehicleType: string;
  @Column({ type: 'varchar', length: 100, nullable: true }) make: string | null;
  @Column({ type: 'varchar', length: 100, nullable: true }) model: string | null;
  @Column({ type: 'varchar', length: 30 }) registration: string;
  @Column({ type: 'varchar', length: 50, nullable: true }) colour: string | null;
  @Column({ type: 'smallint', default: 5 }) capacity: number;
  @Column({ type: 'uuid', name: 'assigned_driver_id', nullable: true }) assignedDriverId: string | null;
  @Column({ type: 'varchar', length: 200, name: 'assigned_driver_name', nullable: true }) assignedDriverName: string | null;
  @Column({ type: 'uuid', name: 'assigned_coordinator_id', nullable: true }) assignedCoordinatorId: string | null;
  @Column({ type: 'decimal', precision: 10, scale: 7, name: 'current_lat', nullable: true }) currentLat: number | null;
  @Column({ type: 'decimal', precision: 10, scale: 7, name: 'current_lng', nullable: true }) currentLng: number | null;
  @Column({ type: 'timestamptz', name: 'last_location_update', nullable: true }) lastLocationUpdate: Date | null;

  @Index('idx_cveh_status')
  @Column({ type: 'varchar', length: 30, default: 'available' }) status: string;

  @Column({ type: 'varchar', length: 20, name: 'fuel_type', default: 'petrol' }) fuelType: string;
  @Column({ type: 'varchar', length: 20, name: 'branding_status', default: 'unbranded' }) brandingStatus: string;
  @Column({ type: 'varchar', length: 20, name: 'ownership_type', default: 'rented' }) ownershipType: string;
  @Column({ type: 'decimal', precision: 12, scale: 2, name: 'monthly_rental_cost', nullable: true }) monthlyRentalCost: number | null;
  @Column({ type: 'text', nullable: true }) notes: string | null;
  @Column({ type: 'uuid', name: 'created_by', nullable: true }) createdBy: string | null;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;

  @OneToMany(() => CampaignVehicleTrip, (t) => t.vehicle)
  trips: CampaignVehicleTrip[];
}
