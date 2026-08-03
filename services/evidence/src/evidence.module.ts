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
import { OpenSearchClientService }   from './search/opensearch.client';
import { EvidenceSearchService }     from './search/evidence-search.service';
import { ReconciliationService }     from './reconciliation/reconciliation.service';
import { ReconciliationController }  from './reconciliation/reconciliation.controller';

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
  controllers: [EvidenceController, ReconciliationController],
  providers:   [EvidenceService, OpenSearchClientService, EvidenceSearchService, ReconciliationService],
  exports:     [EvidenceService, ReconciliationService],
})
export class EvidenceModule {}
