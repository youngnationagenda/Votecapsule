// ============================================================
// VoteCapsule™ — Compliance Module (Priority 11 updated)
// ============================================================
import { Module }        from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule }  from '@nestjs/config';
import { MulterModule }  from '@nestjs/platform-express';
import { CampaignAuthorizedPerson }      from './entities/campaign-authorized-person.entity';
import { CampaignBankAccount }           from './entities/campaign-bank-account.entity';
import { CampaignSupportingOrg }         from './entities/campaign-supporting-org.entity';
import { CampaignComplianceReport }      from './entities/campaign-compliance-report.entity';
import { CampaignComplianceCertificate } from './entities/campaign-compliance-certificate.entity';
import { CampaignComplianceDocument }    from './entities/campaign-compliance-document.entity';
import { ComplianceService }             from './compliance.service';
import { ComplianceDocumentService }     from './compliance-document.service';
import { ComplianceController }          from './compliance.controller';

@Module({
  imports: [
    ConfigModule,
    // Accept file uploads up to 20 MB in memory
    MulterModule.register({ limits: { fileSize: 20 * 1024 * 1024 } }),
    TypeOrmModule.forFeature([
      CampaignAuthorizedPerson,
      CampaignBankAccount,
      CampaignSupportingOrg,
      CampaignComplianceReport,
      CampaignComplianceCertificate,
      CampaignComplianceDocument,   // ← NEW (Migration 170)
    ]),
  ],
  controllers: [ComplianceController],
  providers:   [ComplianceService, ComplianceDocumentService],
  exports:     [ComplianceService, ComplianceDocumentService],
})
export class ComplianceModule {}
