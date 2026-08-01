// ============================================================
// VoteCapsule — Audit Feature Module
// services/audit/src/audit.module.ts
// ============================================================
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLog } from './entities/audit-log.entity';
import { SecurityEvent } from './entities/security-event.entity';
import { AccessLog } from './entities/access-log.entity';
import { ComplianceReport } from './entities/compliance-report.entity';
import { SystemLog } from './entities/system-log.entity';
import { AuditService } from './audit.service';
import { SecurityEventService } from './security-event.service';
import { AuditController } from './audit.controller';
import { SecurityEventController } from './security-event.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AuditLog,
      SecurityEvent,
      AccessLog,
      ComplianceReport,
      SystemLog,
    ]),
  ],
  controllers: [AuditController, SecurityEventController],
  providers: [AuditService, SecurityEventService],
  exports: [AuditService, SecurityEventService],
})
export class AuditModule {}
