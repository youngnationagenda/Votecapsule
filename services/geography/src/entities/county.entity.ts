import {
  Entity, PrimaryGeneratedColumn, Column, OneToMany,
  CreateDateColumn, UpdateDateColumn,
} from 'typeorm';
import { Constituency } from './constituency.entity';

@Entity('nec_counties')
export class County {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'country_id' })
  countryId: number;

  @Column({ name: 'iebc_code', type: 'char', length: 3, unique: true })
  iebcCode: string;

  @Column({ length: 150 })
  name: string;

  /** Sum of all constituency registered_voters — synced from wards bottom-up (migration 172) */
  @Column({ name: 'registered_voters', default: 0 })
  registeredVoters: number;

  /** Number of constituencies in this county (synced from migration 172) */
  @Column({ name: 'constituency_count', default: 0 })
  constituencyCount: number;

  /** Total wards in this county across all constituencies (synced from migration 172) */
  @Column({ name: 'ward_count', default: 0 })
  wardCount: number;

  /** Total active polling stations in this county (synced from migration 172) */
  @Column({ name: 'polling_station_count', default: 0 })
  pollingStationCount: number;

  @Column({ name: 'is_special', default: false })
  isSpecial: boolean;

  @Column({ default: true })
  active: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => Constituency, (c) => c.county)
  constituencies: Constituency[];
}
