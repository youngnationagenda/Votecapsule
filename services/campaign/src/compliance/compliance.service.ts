// ============================================================
// VoteCapsule™ — Campaign Compliance Service
// IEBC Campaign Financing Act, 2013 & Regulations 2020/2026
// IEBC Gazette Notice No. 12251, 7th August 2026
// ============================================================
import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { CampaignAuthorizedPerson }     from './entities/campaign-authorized-person.entity';
import { CampaignBankAccount }          from './entities/campaign-bank-account.entity';
import { CampaignSupportingOrg }        from './entities/campaign-supporting-org.entity';
import { CampaignComplianceReport }     from './entities/campaign-compliance-report.entity';
import { CampaignComplianceCertificate } from './entities/campaign-compliance-certificate.entity';

@Injectable()
export class ComplianceService {
  private readonly logger = new Logger(ComplianceService.name);

  constructor(
    @InjectRepository(CampaignAuthorizedPerson)
    private readonly personRepo: Repository<CampaignAuthorizedPerson>,

    @InjectRepository(CampaignBankAccount)
    private readonly bankRepo: Repository<CampaignBankAccount>,

    @InjectRepository(CampaignSupportingOrg)
    private readonly orgRepo: Repository<CampaignSupportingOrg>,

    @InjectRepository(CampaignComplianceReport)
    private readonly reportRepo: Repository<CampaignComplianceReport>,

    @InjectRepository(CampaignComplianceCertificate)
    private readonly certRepo: Repository<CampaignComplianceCertificate>,

    private readonly dataSource: DataSource,
  ) {}

  // ── Compliance Status (computed score) ───────────────────────

  async getStatus(campaignId: string, tenantId: string): Promise<{
    score: number;
    authorizedPersons: boolean;
    bankAccountOpened: boolean;
    contributionsUpdated: boolean;
    expenditureWithinLimits: boolean;
    singleSourceCompliant: boolean;
    reportsFiledOnTime: boolean;
    checklist: Array<{ key: string; label: string; description: string; status: 'complete' | 'pending' | 'overdue' }>;
  }> {
    // Parallel data fetch
    const [persons, bank, reports, contribRow, expenseRow] = await Promise.all([
      this.personRepo.count({ where: { campaignId, tenantId, status: 'active' } }),
      this.bankRepo.findOne({ where: { campaignId, tenantId } }),
      this.reportRepo.find({ where: { campaignId, tenantId } }),
      this.dataSource.query(
        `SELECT COUNT(*) AS count FROM campaign_contributions WHERE campaign_id=$1 AND tenant_id=$2`,
        [campaignId, tenantId],
      ).catch(() => [{ count: '0' }]),
      this.dataSource.query(
        `SELECT COALESCE(SUM(amount),0) AS total FROM campaign_expenses WHERE campaign_id=$1 AND tenant_id=$2`,
        [campaignId, tenantId],
      ).catch(() => [{ total: '0' }]),
    ]);

    const hasPersons    = persons > 0;
    const hasBank       = bank?.registered ?? false;
    const hasContribs   = parseInt(contribRow[0]?.count ?? '0') > 0;
    const totalSpent    = parseFloat(expenseRow[0]?.total ?? '0');

    // Get IEBC limit from budget table
    const budgetRow = await this.dataSource.query(
      `SELECT iebc_spending_limit FROM campaign_budgets WHERE campaign_id=$1 AND tenant_id=$2 LIMIT 1`,
      [campaignId, tenantId],
    ).catch(() => []);
    const iebcLimit = parseFloat(budgetRow[0]?.iebc_spending_limit ?? '0');
    const withinLimits = iebcLimit > 0 ? totalSpent <= iebcLimit : true;

    // Single-source cap: no contributor > 20% of total contributions
    const contribTotals = await this.dataSource.query(
      `SELECT contributor_name, SUM(amount) AS total FROM campaign_contributions WHERE campaign_id=$1 AND tenant_id=$2 GROUP BY contributor_name`,
      [campaignId, tenantId],
    ).catch(() => []);
    const totalContribs = contribTotals.reduce((s: number, r: any) => s + parseFloat(r.total ?? 0), 0);
    const maxSingle     = contribTotals.reduce((m: number, r: any) => Math.max(m, parseFloat(r.total ?? 0)), 0);
    const singleSourceOk = totalContribs === 0 || (maxSingle / totalContribs) <= 0.20;

    // Reports: at least one submitted
    const reportsOk = reports.some((r) => ['submitted', 'compliant', 'under_review'].includes(r.status));

    const checks   = [hasPersons, hasBank, hasContribs, withinLimits, singleSourceOk, reportsOk];
    const passed   = checks.filter(Boolean).length;
    const score    = Math.round((passed / checks.length) * 100);

    const checklist = [
      { key: 'authorized_persons', label: 'Authorized Person(s) Registered', description: 'At least one authorized person registered with IEBC (Form ECF 1)', status: (hasPersons ? 'complete' : 'pending') as 'complete' | 'pending' },
      { key: 'bank_account',       label: 'Campaign Financing Account Opened', description: 'Dedicated bank account registered per Regulation 11', status: (hasBank ? 'complete' : 'pending') as 'complete' | 'pending' },
      { key: 'contributions',      label: 'Contribution Records Updated', description: 'All contributions logged and receipted per Regulation 12', status: (hasContribs ? 'complete' : 'pending') as 'complete' | 'pending' },
      { key: 'spending_limit',     label: 'Expenditure Within IEBC Limit', description: `${totalSpent.toLocaleString()} KES spent of ${iebcLimit.toLocaleString()} KES limit`, status: (withinLimits ? 'complete' : 'overdue') as 'complete' | 'overdue' },
      { key: 'single_source',      label: 'Single-Source Cap Compliant (20%)', description: 'No single contributor exceeds 20% of total contributions (Section 12(2))', status: (singleSourceOk ? 'complete' : 'overdue') as 'complete' | 'overdue' },
      { key: 'reports',            label: 'Reports Filed on Time', description: 'Preliminary & Final reports submitted (Form ECF 6)', status: (reportsOk ? 'complete' : 'pending') as 'complete' | 'pending' },
    ];

    return { score, authorizedPersons: hasPersons, bankAccountOpened: hasBank, contributionsUpdated: hasContribs, expenditureWithinLimits: withinLimits, singleSourceCompliant: singleSourceOk, reportsFiledOnTime: reportsOk, checklist };
  }

  // ── Authorized Persons ────────────────────────────────────────

  async listPersons(campaignId: string, tenantId: string): Promise<CampaignAuthorizedPerson[]> {
    return this.personRepo.find({
      where: { campaignId, tenantId },
      order: { createdAt: 'ASC' },
    });
  }

  async registerPerson(campaignId: string, tenantId: string, userId: string, dto: any): Promise<CampaignAuthorizedPerson> {
    const entity = this.personRepo.create({
      ...dto,
      campaignId,
      tenantId,
      createdBy: userId,
      dateAppointed: dto.dateAppointed ? new Date(dto.dateAppointed) : new Date(),
      status: 'active',
    });
    const saved = await this.personRepo.save(entity) as unknown as CampaignAuthorizedPerson;
    this.logger.log(`Authorized person registered: ${saved.fullName} for campaign ${campaignId}`);
    return saved;
  }

  async removePerson(id: string, campaignId: string, tenantId: string): Promise<void> {
    const p = await this.personRepo.findOne({ where: { id, campaignId, tenantId } });
    if (!p) throw new NotFoundException(`Authorized person ${id} not found`);
    p.status = 'revoked';
    await this.personRepo.save(p);
    this.logger.log(`Authorized person revoked: ${p.fullName} from campaign ${campaignId}`);
  }

  // ── Bank Account ──────────────────────────────────────────────

  async getBankAccount(campaignId: string, tenantId: string): Promise<CampaignBankAccount | null> {
    return this.bankRepo.findOne({ where: { campaignId, tenantId } });
  }

  async registerBankAccount(campaignId: string, tenantId: string, userId: string, dto: any): Promise<CampaignBankAccount> {
    // Upsert — only one account per campaign
    const existing = await this.bankRepo.findOne({ where: { campaignId, tenantId } });
    if (existing) {
      Object.assign(existing, dto, { registered: true, registeredDate: new Date() });
      return this.bankRepo.save(existing);
    }
    const entity = this.bankRepo.create({
      ...dto,
      campaignId,
      tenantId,
      createdBy: userId,
      registered: true,
      registeredDate: new Date(),
    });
    const saved = await this.bankRepo.save(entity) as unknown as CampaignBankAccount;
    this.logger.log(`Bank account registered for campaign ${campaignId}: ${saved.bankName} ${saved.accountNumber}`);
    return saved;
  }

  // ── Supporting Organizations (party-level) ────────────────────

  async listSupportingOrgs(campaignId: string, tenantId: string): Promise<CampaignSupportingOrg[]> {
    return this.orgRepo.find({ where: { campaignId, tenantId }, order: { createdAt: 'ASC' } });
  }

  async registerSupportingOrg(campaignId: string, tenantId: string, userId: string, dto: any): Promise<CampaignSupportingOrg> {
    const entity = this.orgRepo.create({
      ...dto,
      campaignId,
      tenantId,
      createdBy: userId,
      consentStatus: 'granted',
      consentDate: new Date(),
    });
    const saved = await this.orgRepo.save(entity) as unknown as CampaignSupportingOrg;
    this.logger.log(`Supporting org registered: ${saved.orgName} for campaign ${campaignId}`);
    return saved;
  }

  // ── Reports ───────────────────────────────────────────────────

  async listReports(campaignId: string, tenantId: string): Promise<CampaignComplianceReport[]> {
    return this.reportRepo.find({ where: { campaignId, tenantId }, order: { createdAt: 'ASC' } });
  }

  async submitReport(campaignId: string, tenantId: string, userId: string, dto: any): Promise<CampaignComplianceReport> {
    // Upsert by type
    const existing = await this.reportRepo.findOne({ where: { campaignId, tenantId, reportType: dto.type } });
    if (existing) {
      existing.status        = 'submitted';
      existing.submittedDate = new Date(dto.submittedDate ?? new Date());
      existing.submittedBy   = userId;
      if (dto.notes) existing.notes = dto.notes;
      return this.reportRepo.save(existing);
    }
    const typeToForm: Record<string, string> = {
      preliminary: 'ECF 6', final: 'ECF 6', surplus: 'ECF 7', auditor: 'Auditor Report',
    };
    const entity = this.reportRepo.create({
      campaignId,
      tenantId,
      reportType:    dto.type,
      formNumber:    typeToForm[dto.type] ?? 'ECF 6',
      title:         dto.title ?? `${dto.type.charAt(0).toUpperCase() + dto.type.slice(1)} Report`,
      status:        'submitted',
      submittedDate: new Date(dto.submittedDate ?? new Date()),
      submittedBy:   userId,
      notes:         dto.notes ?? null,
    });
    const saved = await this.reportRepo.save(entity);
    this.logger.log(`Compliance report submitted: ${dto.type} for campaign ${campaignId}`);
    return saved;
  }

  // ── Certificate ───────────────────────────────────────────────

  async getCertificate(campaignId: string, tenantId: string): Promise<CampaignComplianceCertificate | null> {
    return this.certRepo.findOne({ where: { campaignId, tenantId } });
  }

  // ── Candidate Compliance (party-level cross-campaign view) ────
  // Returns compliance summary across all campaigns for this party tenant

  async getCandidateCompliance(campaignId: string, tenantId: string): Promise<any[]> {
    const rows = await this.dataSource.query(
      `SELECT
         c.id,
         c.name,
         COALESCE(c.goals->>'candidateName', c.name) AS candidate_name,
         COALESCE(c.goals->>'targetPosition', 'Unknown') AS position,
         c.county_code,
         c.constituency_code,
         b.iebc_spending_limit,
         b.total_spent,
         CASE WHEN b.iebc_spending_limit > 0 THEN ROUND((b.total_spent / b.iebc_spending_limit) * 100) ELSE 0 END AS pct_used
       FROM campaigns c
       LEFT JOIN campaign_budgets b ON b.campaign_id = c.id AND b.tenant_id = c.tenant_id
       WHERE c.tenant_id = $1
         AND c.status NOT IN ('closed', 'archived')
       ORDER BY pct_used DESC NULLS LAST
       LIMIT 100`,
      [tenantId],
    );

    return rows.map((r: any) => ({
      id:               r.id,
      name:             r.candidate_name || r.name,
      position:         r.position,
      county:           r.county_code,
      constituency:     r.constituency_code,
      iebcLimit:        parseFloat(r.iebc_spending_limit ?? '0'),
      spent:            parseFloat(r.total_spent ?? '0'),
      pctUsed:          parseFloat(r.pct_used ?? '0'),
      complianceStatus: parseFloat(r.pct_used ?? '0') >= 90 ? 'critical'
                       : parseFloat(r.pct_used ?? '0') >= 70 ? 'warning' : 'compliant',
    }));
  }
}
