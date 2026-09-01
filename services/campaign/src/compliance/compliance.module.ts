// ============================================================
// VoteCapsule™ — Compliance Module
// ============================================================
import { Module }        from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CampaignAuthorizedPerson }     from './entities/campaign-authorized-person.entity';
import { CampaignBankAccount }          from './entities/campaign-bank-account.entity';
import { CampaignSupportingOrg }        from './entities/campaign-supporting-org.entity';
import { CampaignComplianceReport }     from './entities/campaign-compliance-report.entity';
import { CampaignComplianceCertificate } from './entities/campaign-compliance-certificate.entity';
import { ComplianceService }            from './compliance.service';
import { ComplianceController }         from './compliance.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CampaignAuthorizedPerson,
      CampaignBankAccount,
      CampaignSupportingOrg,
      CampaignComplianceReport,
      CampaignComplianceCertificate,
    ]),
  ],
  controllers: [ComplianceController],
  providers:   [ComplianceService],
  exports:     [ComplianceService],
})
export class ComplianceModule {}
