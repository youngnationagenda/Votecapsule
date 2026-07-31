// ============================================================
// VoteCapsule — Evidence Capsule Module
// services/evidence/src/evidence.module.ts
// ============================================================
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { EvidenceController }        from './evidence.controller';
import { EvidenceService }           from './evidence.service';
import { EvidenceCapsule }           from './entities/evidence-capsule.entity';
import { EvidenceImage }             from './entities/evidence-image.entity';
import { EvidenceHash }              from './entities/evidence-hash.entity';
import { EvidenceChainOfCustody }    from './entities/evidence-chain-of-custody.entity';

@Module({
  imports: [
    ConfigModule,
    HttpModule, // For calling Geography Service to validate stations

    // Store uploaded images in memory — service transfers directly to S3
    MulterModule.register({ storage: memoryStorage() }),

    TypeOrmModule.forFeature([
      EvidenceCapsule,
      EvidenceImage,
      EvidenceHash,
      EvidenceChainOfCustody,
    ]),
  ],
  controllers: [EvidenceController],
  providers:   [EvidenceService],
  exports:     [EvidenceService],
})
export class EvidenceModule {}
