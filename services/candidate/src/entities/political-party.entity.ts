// ============================================================
// VoteCapsule™ — Political Party Entity
// candidate-service/src/entities/political-party.entity.ts
//
// Registered political parties. Independent candidates are
// represented by is_independent=TRUE on the Candidate entity —
// they do NOT get a party row.
// ============================================================
import {
  Entity, Column, PrimaryGeneratedColumn, CreateDateColumn,
  UpdateDateColumn, OneToMany, Index,
} from 'typeorm';
import { Candidate } from './candidate.entity';

@Entity('candidate_political_parties')
@Index('idx_cpp_code',    ['partyCode'], { unique: true })
@Index('idx_cpp_active',  ['isActive'])
@Index('idx_cpp_country', ['countryCode'])
export class PoliticalParty {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** IEBC-registered party code — e.g. "ODM", "UDA", "ANC" */
  @Column({ type: 'varchar', length: 20, name: 'party_code', unique: true })
  partyCode: string;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ type: 'varchar', length: 20 })
  abbreviation: string;

  /** Hex colour for UI display — e.g. "#FF6600". No political preference implied. */
  @Column({ type: 'char', length: 7, name: 'party_color', nullable: true })
  partyColor: string | null;

  /** S3 assets bucket URL for logo image */
  @Column({ type: 'varchar', length: 500, name: 'logo_url', nullable: true })
  logoUrl: string | null;

  @Column({ type: 'varchar', length: 100, name: 'registration_number', nullable: true })
  registrationNumber: string | null;

  @Column({ type: 'date', name: 'registration_date', nullable: true })
  registrationDate: Date | null;

  @Column({ type: 'varchar', length: 200, name: 'chairperson_name', nullable: true })
  chairpersonName: string | null;

  @Column({ type: 'varchar', length: 300, nullable: true })
  headquarters: string | null;

  @Column({ type: 'varchar', length: 300, name: 'gazette_reference', nullable: true })
  gazetteReference: string | null;

  @Column({ type: 'boolean', name: 'is_active', default: true })
  isActive: boolean;

  @Column({ type: 'char', length: 3, name: 'country_code', default: 'KEN' })
  countryCode: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // ── Relations ─────────────────────────────────────────────
  @OneToMany(() => Candidate, (c) => c.party, { cascade: false })
  candidates: Candidate[];
}
