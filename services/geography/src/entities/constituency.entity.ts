import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany,
  JoinColumn, CreateDateColumn, UpdateDateColumn,
} from 'typeorm';
import { County } from './county.entity';
import { Ward }   from './ward.entity';

@Entity('nec_constituencies')
export class Constituency {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'county_id' })
  countyId: number;

  @Column({ name: 'iebc_code', type: 'char', length: 3, unique: true })
  iebcCode: string;

  @Column({ length: 150 })
  name: string;

  /** Sum of all ward registered_voters — synced bottom-up from polling stations (migration 172) */
  @Column({ name: 'registered_voters', default: 0 })
  registeredVoters: number;

  /** Number of wards in this constituency (synced from migration 172) */
  @Column({ name: 'ward_count', default: 0 })
  wardCount: number;

  /** Total active polling stations in this constituency (synced from migration 172) */
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

  @ManyToOne(() => County, (c) => c.constituencies)
  @JoinColumn({ name: 'county_id' })
  county: County;

  @OneToMany(() => Ward, (w) => w.constituency)
  wards: Ward[];
}
