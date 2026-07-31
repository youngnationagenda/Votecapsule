// ============================================================
// VoteCapsule — Trust Service NestJS Module (Hybrid Anchor)
// services/trust/src/trust.module.ts
// ============================================================
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { TrustController }       from './trust.controller';
import { TrustService }          from './trust.service';
import { HederaClientService }   from './hedera/hedera.client';
import { Rfc3161ClientService }  from './tsa/rfc3161.client';
import { TrustAnchorBatch }      from './entities/trust-anchor-batch.entity';
import { TrustAnchorLeaf }       from './entities/trust-anchor-leaf.entity';
import { TrustVerification }     from './entities/trust-verification.entity';

@Module({
  imports: [
    ConfigModule,
    HttpModule,   // For calling back Evidence Service
    TypeOrmModule.forFeature([TrustAnchorBatch, TrustAnchorLeaf, TrustVerification]),
  ],
  controllers: [TrustController],
  providers:   [TrustService, HederaClientService, Rfc3161ClientService],
  exports:     [TrustService],
})
export class TrustModule {}
