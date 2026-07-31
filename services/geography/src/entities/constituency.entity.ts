import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
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

  @ManyToOne(() => County, (c) => c.constituencies)
  @JoinColumn({ name: 'county_id' })
  county: County;

  @OneToMany(() => Ward, (w) => w.constituency)
  wards: Ward[];
}
