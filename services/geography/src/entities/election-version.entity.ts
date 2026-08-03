import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('nec_election_versions')
export class ElectionVersion {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'election_year', type: 'smallint', unique: true })
  electionYear: number;

  @Column({ length: 100 })
  label: string;

  @Column({ name: 'gazette_reference', type: 'varchar', length: 200, nullable: true })
  gazetteReference: string | null;

  @Column({ name: 'is_active', default: false })
  isActive: boolean;

  @Column({ name: 'total_stations', default: 0 })
  totalStations: number;

  @Column({ name: 'total_voters', default: 0 })
  totalVoters: number;

  @Column({ name: 'seeded_at', type: 'timestamptz', nullable: true })
  seededAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
