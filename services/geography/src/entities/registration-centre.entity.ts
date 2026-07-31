import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Ward }           from './ward.entity';
import { PollingStation } from './polling-station.entity';

@Entity('nec_registration_centres')
export class RegistrationCentre {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'ward_id' })
  wardId: number;

  @Column({ name: 'iebc_code', type: 'char', length: 13, unique: true })
  iebcCode: string;

  @Column({ length: 250 })
  name: string;

  @Column({ name: 'registered_voters', default: 0 })
  registeredVoters: number;

  @Column({ name: 'polling_station_count', default: 0 })
  pollingStationCount: number;

  /** GPS — nullable until Phase 2+ Google Maps enrichment */
  @Column({ type: 'numeric', precision: 10, scale: 7, nullable: true })
  latitude: number | null;

  @Column({ type: 'numeric', precision: 10, scale: 7, nullable: true })
  longitude: number | null;

  @Column({ name: 'is_special', default: false })
  isSpecial: boolean;

  @Column({ default: true })
  active: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => Ward, (w) => w.registrationCentres)
  @JoinColumn({ name: 'ward_id' })
  ward: Ward;

  @OneToMany(() => PollingStation, (ps) => ps.registrationCentre)
  pollingStations: PollingStation[];
}
