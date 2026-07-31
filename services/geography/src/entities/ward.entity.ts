import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Constituency }       from './constituency.entity';
import { RegistrationCentre } from './registration-centre.entity';

@Entity('nec_wards')
export class Ward {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'constituency_id' })
  constituencyId: number;

  @Column({ name: 'iebc_code', type: 'char', length: 4, unique: true })
  iebcCode: string;

  @Column({ length: 150 })
  name: string;

  @Column({ name: 'registered_voters', default: 0 })
  registeredVoters: number;

  @Column({ name: 'is_special', default: false })
  isSpecial: boolean;

  @Column({ default: true })
  active: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => Constituency, (c) => c.wards)
  @JoinColumn({ name: 'constituency_id' })
  constituency: Constituency;

  @OneToMany(() => RegistrationCentre, (r) => r.ward)
  registrationCentres: RegistrationCentre[];
}
