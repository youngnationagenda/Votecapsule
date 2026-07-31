import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Index, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { RegistrationCentre } from './registration-centre.entity';
import { Ward }               from './ward.entity';
import { Constituency }       from './constituency.entity';
import { County }             from './county.entity';

export enum StationType {
  STANDARD = 'STANDARD',
  PRISON   = 'PRISON',
  DIASPORA = 'DIASPORA',
}

@Entity('nec_polling_stations')
@Index(['iebcStationCode'])
@Index(['county', 'constituency', 'ward'])
export class PollingStation {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'registration_centre_id' })
  registrationCentreId: number;

  @Column({ name: 'ward_id' })
  wardId: number;

  @Column({ name: 'constituency_id' })
  constituencyId: number;

  @Column({ name: 'county_id' })
  countyId: number;

  /**
   * 15-digit IEBC station code:
   * county(3) + constituency(3) + ward(4) + centre_seq(3) + stream(2)
   * Example: 001001000100101
   */
  @Column({ name: 'iebc_station_code', type: 'char', length: 15, unique: true })
  iebcStationCode: string;

  @Column({ name: 'stream_number', type: 'smallint' })
  streamNumber: number;

  @Column({ length: 250 })
  name: string;

  @Column({ name: 'registered_voters', default: 0 })
  registeredVoters: number;

  /** GPS — nullable until Phase 2+ Google Maps enrichment */
  @Column({ type: 'numeric', precision: 10, scale: 7, nullable: true })
  latitude: number | null;

  @Column({ type: 'numeric', precision: 10, scale: 7, nullable: true })
  longitude: number | null;

  @Column({
    name: 'station_type',
    type: 'varchar',
    length: 20,
    default: StationType.STANDARD,
    enum: StationType,
  })
  stationType: StationType;

  @Column({ name: 'is_special', default: false })
  isSpecial: boolean;

  /** Prison and Diaspora stations are seeded as inactive */
  @Column({ default: true })
  active: boolean;

  @Column({ name: 'election_year', type: 'smallint', default: 2022 })
  electionYear: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => RegistrationCentre, (rc) => rc.pollingStations)
  @JoinColumn({ name: 'registration_centre_id' })
  registrationCentre: RegistrationCentre;

  @ManyToOne(() => Ward)
  @JoinColumn({ name: 'ward_id' })
  ward: Ward;

  @ManyToOne(() => Constituency)
  @JoinColumn({ name: 'constituency_id' })
  constituency: Constituency;

  @ManyToOne(() => County)
  @JoinColumn({ name: 'county_id' })
  county: County;

  /** Convenience: extract county code from iebc_station_code */
  get countyCode(): string  { return this.iebcStationCode.slice(0, 3); }
  get constCode(): string   { return this.iebcStationCode.slice(3, 6); }
  get wardCode(): string    { return this.iebcStationCode.slice(6, 10); }
  get centreSeq(): string   { return this.iebcStationCode.slice(10, 13); }
  get streamPad(): string   { return this.iebcStationCode.slice(13, 15); }
}
