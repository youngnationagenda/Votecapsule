// ============================================================
// VoteCapsule™ — Campaign Vehicle Trip Entity
// ============================================================
import {
  Entity, Column, PrimaryGeneratedColumn, CreateDateColumn,
  ManyToOne, JoinColumn, Index,
} from 'typeorm';
import { CampaignVehicle } from './campaign-vehicle.entity';

@Entity('campaign_vehicle_trips')
export class CampaignVehicleTrip {
  @PrimaryGeneratedColumn('uuid') id: string;

  @Index('idx_cvt_vehicle')
  @Column({ type: 'uuid', name: 'vehicle_id' }) vehicleId: string;

  @Index('idx_cvt_campaign')
  @Column({ type: 'uuid', name: 'campaign_id' }) campaignId: string;

  @Column({ type: 'uuid', name: 'tenant_id' }) tenantId: string;

  @Index('idx_cvt_event')
  @Column({ type: 'uuid', name: 'event_id', nullable: true }) eventId: string | null;

  @Column({ type: 'varchar', length: 300, nullable: true }) purpose: string | null;
  @Column({ type: 'decimal', precision: 10, scale: 7, name: 'origin_lat', nullable: true }) originLat: number | null;
  @Column({ type: 'decimal', precision: 10, scale: 7, name: 'origin_lng', nullable: true }) originLng: number | null;
  @Column({ type: 'varchar', length: 200, name: 'origin_name', nullable: true }) originName: string | null;
  @Column({ type: 'decimal', precision: 10, scale: 7, name: 'destination_lat', nullable: true }) destinationLat: number | null;
  @Column({ type: 'decimal', precision: 10, scale: 7, name: 'destination_lng', nullable: true }) destinationLng: number | null;
  @Column({ type: 'varchar', length: 200, name: 'destination_name', nullable: true }) destinationName: string | null;
  @Column({ type: 'timestamptz', name: 'departure_time', nullable: true }) departureTime: Date | null;
  @Column({ type: 'timestamptz', name: 'arrival_time', nullable: true }) arrivalTime: Date | null;
  @Column({ type: 'decimal', precision: 8, scale: 2, name: 'distance_km', nullable: true }) distanceKm: number | null;
  @Column({ type: 'decimal', precision: 12, scale: 2, name: 'fuel_cost', nullable: true }) fuelCost: number | null;
  @Column({ type: 'uuid', name: 'driver_id', nullable: true }) driverId: string | null;
  @Column({ type: 'int', default: 0 }) passengers: number;
  @Column({ type: 'text', nullable: true }) notes: string | null;
  @Column({ type: 'uuid', name: 'created_by', nullable: true }) createdBy: string | null;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;

  @ManyToOne(() => CampaignVehicle, (v) => v.trips)
  @JoinColumn({ name: 'vehicle_id' })
  vehicle: CampaignVehicle;
}
