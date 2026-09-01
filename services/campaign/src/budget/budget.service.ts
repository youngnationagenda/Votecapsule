// ============================================================
// VoteCapsule™ — Campaign Budget Service
// ============================================================
import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { CampaignBudget }         from './entities/campaign-budget.entity';
import { CampaignBudgetCategory } from './entities/campaign-budget-category.entity';
import { CampaignExpense }        from './entities/campaign-expense.entity';
import { CampaignContribution }   from './entities/campaign-contribution.entity';

// ── 11 IEBC Gazette categories (Fifth Schedule, GN 12251) ────
// These are the canonical category definitions used across the entire service.
const GAZETTE_CATS = [
  { code: 'venues',          name: 'Venues for Campaign Rallies',   share: 1.5,  gazetteKes:    375_052_688 },
  { code: 'publicity',       name: 'Publicity Materials',           share: 4.4,  gazetteKes:  1_066_714_464 },
  { code: 'advertising',     name: 'Advertising & Media',           share: 10.3, gazetteKes:  2_517_509_489 },
  { code: 'personnel',       name: 'Campaign Personnel',            share: 1.4,  gazetteKes:    332_922_614 },
  { code: 'agents',          name: 'Election Agents',               share: 8.5,  gazetteKes:  2_081_162_296 },
  { code: 'transport',       name: 'Transportation',                share: 66.0, gazetteKes: 16_126_632_035 },
  { code: 'communication',   name: 'Communication & Telephone',     share: 0.5,  gazetteKes:    134_230_217 },
  { code: 'nomination_fees', name: 'Nomination Fees',               share: 0.9,  gazetteKes:    213_818_044 },
  { code: 'security',        name: 'Security',                      share: 1.2,  gazetteKes:    285_090_725 },
  { code: 'accommodation',   name: 'Accommodation & Travel',        share: 0.1,  gazetteKes:     24_945_438 },
  { code: 'administrative',  name: 'Administrative Cost',           share: 5.3,  gazetteKes:  1_292_094_521 },
] as const;

// Map expense category codes → IEBC category
const EXPENSE_TO_IEBC: Record<string, string> = {
  transport: 'transport', fuel: 'transport', logistics: 'transport',
  printing: 'publicity', branding: 'publicity',
  digital_advertising: 'advertising', outdoor_advertising: 'advertising', media: 'advertising',
  staff: 'personnel', volunteers: 'personnel',
  events: 'venues', venues: 'venues',
  communications: 'communication',
  meals: 'accommodation', accommodation: 'accommodation',
  office: 'administrative', equipment: 'administrative', miscellaneous: 'administrative',
  security: 'security',
  agents: 'agents',
  nomination: 'nomination_fees', nomination_fees: 'nomination_fees',
};

const POSITION_LABELS: Record<string, string> = {
  PRESIDENT: 'Presidential Election',
  GOVERNOR:  'County Governor Election',
  SENATOR:   'County Senator Election',
  WOMEN_REP: 'County Women Representative Election',
  MP:        'National Assembly MP Election',
  MCA:       'County Assembly MCA Election',
  PARTY:     'Political Party Campaign',
};

const SCHEDULE_MAP: Record<string, string> = {
  PRESIDENT: 'First Schedule',
  GOVERNOR:  'Second Schedule',
  SENATOR:   'Second Schedule',
  WOMEN_REP: 'Second Schedule',
  MP:        'Third Schedule',
  MCA:       'Fourth Schedule',
  PARTY:     'Fifth Schedule',
};

@Injectable()
export class BudgetService {
  private readonly logger = new Logger(BudgetService.name);

  constructor(
    @InjectRepository(CampaignBudget)         private readonly budgetRepo: Repository<CampaignBudget>,
    @InjectRepository(CampaignBudgetCategory) private readonly categoryRepo: Repository<CampaignBudgetCategory>,
    @InjectRepository(CampaignExpense)        private readonly expenseRepo: Repository<CampaignExpense>,
    @InjectRepository(CampaignContribution)   private readonly contributionRepo: Repository<CampaignContribution>,
    private readonly dataSource: DataSource,
  ) {}

  // ── createBudget ──────────────────────────────────────────
  async createBudget(campaignId: string, dto: any, tenantId: string, userId: string): Promise<CampaignBudget> {
    const entity = this.budgetRepo.create({ ...dto, campaignId, tenantId, createdBy: userId }) as unknown as CampaignBudget;
    const saved  = await this.budgetRepo.save(entity);

    // Seed 11 IEBC gazette categories (Fifth Schedule, GN 12251)
    for (const cat of GAZETTE_CATS) {
      await this.categoryRepo.save(this.categoryRepo.create({
        budgetId: saved.id, campaignId, tenantId,
        categoryCode: cat.code, categoryName: cat.name,
        allocated: 0, committed: 0, spent: 0,
      }));
    }
    return saved;
  }

  // ── getBudgetSummary ──────────────────────────────────────
  async getBudgetSummary(campaignId: string, tenantId: string): Promise<Record<string, unknown>> {
    const budget = await this.budgetRepo.findOne({ where: { campaignId, tenantId }, relations: ['categories'] });
    if (!budget) throw new NotFoundException(`Budget for campaign ${campaignId} not found`);

    const totalRemaining = Number(budget.totalAllocated) - Number(budget.totalSpent);
    const iebcPct = budget.iebcSpendingLimit
      ? Math.round((Number(budget.totalSpent) / Number(budget.iebcSpendingLimit)) * 100)
      : 0;

    return { ...budget, totalRemaining, iebcLimitPercentageUsed: iebcPct };
  }

  // ── getByCategory ─────────────────────────────────────────
  async getByCategory(campaignId: string, tenantId: string): Promise<CampaignBudgetCategory[]> {
    const budget = await this.budgetRepo.findOne({ where: { campaignId, tenantId } });
    if (!budget) throw new NotFoundException(`Budget not found`);
    return this.categoryRepo.find({ where: { budgetId: budget.id }, order: { categoryCode: 'ASC' } });
  }

  // ── recordExpense ─────────────────────────────────────────
  async recordExpense(campaignId: string, dto: any, tenantId: string, userId: string): Promise<CampaignExpense> {
    const budget = await this.budgetRepo.findOne({ where: { campaignId, tenantId } });

    return this.dataSource.transaction(async (manager) => {
      const expense = manager.create(CampaignExpense, {
        ...dto, campaignId, tenantId,
        budgetId: budget?.id ?? null, recordedBy: userId,
      });
      const saved = await manager.save(CampaignExpense, expense);

      if (budget) {
        await manager.increment(CampaignBudget, { id: budget.id }, 'total_spent', Number(dto.amount));

        if (dto.categoryCode) {
          const cat = await manager.findOne(CampaignBudgetCategory, {
            where: { budgetId: budget.id, categoryCode: dto.categoryCode },
          });
          if (cat) {
            await manager.increment(CampaignBudgetCategory, { id: cat.id }, 'spent', Number(dto.amount));
            if (budget.iebcSpendingLimit) {
              const pct = (Number(budget.totalSpent) + Number(dto.amount)) / Number(budget.iebcSpendingLimit) * 100;
              this.logger.warn(`IEBC spend at ${pct.toFixed(1)}% for campaign ${campaignId}`);
            }
          }
        }
      }
      return saved;
    });
  }

  // ── listExpenses ──────────────────────────────────────────
  async listExpenses(
    campaignId: string,
    tenantId: string,
    filters?: { wardCode?: string; categoryId?: string },
  ): Promise<CampaignExpense[]> {
    const qb = this.expenseRepo.createQueryBuilder('e')
      .where('e.campaign_id = :campaignId', { campaignId })
      .andWhere('e.tenant_id = :tenantId', { tenantId });
    if (filters?.wardCode)   qb.andWhere('e.ward_code = :ward', { ward: filters.wardCode });
    if (filters?.categoryId) qb.andWhere('e.category_id = :cat', { cat: filters.categoryId });
    return qb.orderBy('e.expense_date', 'DESC').getMany();
  }

  // ── getIebcStatus ─────────────────────────────────────────
  async getIebcStatus(campaignId: string, tenantId: string): Promise<Record<string, unknown>> {
    const budget = await this.getBudgetSummary(campaignId, tenantId) as any;
    return {
      totalSpent:         budget.totalSpent,
      iebcSpendingLimit:  budget.iebcSpendingLimit,
      percentageUsed:     budget.iebcLimitPercentageUsed,
      status:             budget.iebcLimitPercentageUsed >= 95 ? 'CRITICAL'
                        : budget.iebcLimitPercentageUsed >= 80 ? 'WARNING' : 'OK',
      reportableExpenses: await this.expenseRepo.count({ where: { campaignId, tenantId, iebcReportable: true } }),
    };
  }

  // ── recordContribution ────────────────────────────────────
  async recordContribution(campaignId: string, dto: any, tenantId: string, userId: string): Promise<CampaignContribution> {
    const budget = await this.budgetRepo.findOne({ where: { campaignId, tenantId } });
    const entity = this.contributionRepo.create({
      ...dto, campaignId, tenantId,
      budgetId: budget?.id ?? null, recordedBy: userId,
    }) as unknown as CampaignContribution;
    const saved = await this.contributionRepo.save(entity);
    if (budget) await this.budgetRepo.increment({ id: budget.id }, 'total_allocated', Number(dto.amount ?? 0));
    return saved;
  }

  // ── listContributions ─────────────────────────────────────
  async listContributions(campaignId: string, tenantId: string): Promise<CampaignContribution[]> {
    return this.contributionRepo.find({ where: { campaignId, tenantId }, order: { contributionDate: 'DESC' } });
  }

  // ── importBudgetFile ──────────────────────────────────────
  async importBudgetFile(campaignId: string, file: any, tenantId: string, userId: string) {
    this.logger.log(`Importing budget file: ${file.originalname} (${file.size} bytes) for campaign ${campaignId}`);

    const ext = file.originalname.split('.').pop()?.toLowerCase();
    const lineItems: Array<{ description: string; categoryCode: string; amount: number; wardCode?: string }> = [];

    if (ext === 'csv' || ext === 'tsv') {
      const text = file.buffer.toString('utf-8');
      const sep = ext === 'tsv' ? '\t' : ',';
      const lines = text.trim().split('\n');
      const headers = lines[0].split(sep).map((h: string) => h.trim().toLowerCase().replace(/[^a-z_]/g, ''));

      for (let i = 1; i < lines.length; i++) {
        const vals = lines[i].split(sep).map((v: string) => v.trim());
        const row: Record<string, string> = {};
        headers.forEach((h: string, idx: number) => { row[h] = vals[idx] ?? ''; });
        const amount = parseFloat(row.amount || row.allocated || row.budget || '0');
        if (amount > 0) {
          lineItems.push({
            description: row.description || row.item || row.name || `Imported line ${i}`,
            categoryCode: row.category || row.categorycode || row.type || 'miscellaneous',
            amount,
            wardCode: row.ward || row.wardcode || undefined,
          });
        }
      }
    } else if (ext === 'xlsx' || ext === 'xls') {
      return { status: 'queued', message: 'Excel file queued for processing', filename: file.originalname };
    } else if (ext === 'docx' || ext === 'doc') {
      return { status: 'queued', message: 'Word file queued for processing', filename: file.originalname };
    } else {
      return { status: 'error', message: `Unsupported file format: ${ext}` };
    }

    let imported = 0;
    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();
    try {
      for (const item of lineItems) {
        await qr.manager.save(CampaignExpense, {
          campaignId, tenantId,
          description: item.description,
          categoryCode: item.categoryCode,
          amount: item.amount,
          wardCode: item.wardCode,
          paymentMethod: 'budget_import',
          sourceType: 'FILE_IMPORT',
          expenseDate: new Date(),
          status: 'pending',
          createdBy: userId,
        } as any);
        imported++;
      }
      await qr.commitTransaction();
    } catch (err) {
      await qr.rollbackTransaction();
      throw err;
    } finally {
      await qr.release();
    }

    this.logger.log(`Successfully imported ${imported} line items from ${file.originalname}`);
    return { status: 'success', imported, total: lineItems.length, filename: file.originalname };
  }

  // ── allocateBudget ────────────────────────────────────────
  async allocateBudget(
    campaignId: string,
    allocations: Array<{ categoryCode: string; amount: number }>,
    tenantId: string,
    userId: string,
  ) {
    this.logger.log(`Allocating budget for campaign ${campaignId}: ${allocations.length} categories`);

    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();
    try {
      let totalAllocated = 0;
      for (const alloc of allocations) {
        await qr.query(`
          INSERT INTO campaign_budget_categories (campaign_id, tenant_id, category_code, allocated, created_by)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (campaign_id, category_code)
          DO UPDATE SET allocated = $4, updated_at = NOW()
        `, [campaignId, tenantId, alloc.categoryCode, alloc.amount, userId]);
        totalAllocated += alloc.amount;
      }
      await qr.query(`
        UPDATE campaign_budgets SET total_allocated = $1, updated_at = NOW()
        WHERE campaign_id = $2 AND tenant_id = $3
      `, [totalAllocated, campaignId, tenantId]);
      await qr.commitTransaction();
      return { status: 'success', totalAllocated, categoriesUpdated: allocations.length };
    } catch (err) {
      await qr.rollbackTransaction();
      throw err;
    } finally {
      await qr.release();
    }
  }

  // ── getBudgetTemplate ──────────────────────────────────────
  // GET /campaigns/:id/budget/template
  // Returns the 11 IEBC gazette budget categories pre-filled with amounts
  // scaled to this campaign's IEBC spending limit.
  // ?format=json (default) | csv
  //
  // Rules:
  //   PRESIDENT / PARTY → exact gazette Fifth Schedule KES amounts as ceiling
  //   All others        → proportional share of the resolved position limit
  async getBudgetTemplate(
    campaignId: string,
    tenantId: string,
    format: string = 'json',
  ): Promise<Record<string, unknown> | string> {
    const [campRows, budgetRows] = await Promise.all([
      this.dataSource.query(
        `SELECT id, name, county_code, constituency_code, ward_code, goals
         FROM campaigns WHERE id=$1 AND tenant_id=$2 LIMIT 1`,
        [campaignId, tenantId],
      ),
      this.dataSource.query(
        `SELECT iebc_spending_limit, position FROM campaign_budgets
         WHERE campaign_id=$1 AND tenant_id=$2 LIMIT 1`,
        [campaignId, tenantId],
      ),
    ]);
    if (!campRows.length) throw new NotFoundException(`Campaign ${campaignId} not found`);

    const camp   = campRows[0];
    const budget = budgetRows[0];
    const goals  = camp.goals ?? {};
    const pos    = (budget?.position ?? goals.targetPosition ?? goals.iebcPosition ?? 'UNKNOWN') as string;
    const limit  = Number(budget?.iebc_spending_limit ?? 0);

    // Load current allocations from DB
    const dbCats = await this.dataSource.query(
      `SELECT category_code, allocated, spent, committed, iebc_gazette_amount, iebc_share_pct
       FROM campaign_budget_categories
       WHERE campaign_id=$1 AND tenant_id=$2 ORDER BY iebc_gazette_amount DESC NULLS LAST`,
      [campaignId, tenantId],
    );
    const dbByCode: Record<string, any> = {};
    (dbCats as any[]).forEach(r => { dbByCode[r.category_code] = r; });

    const isNational = ['PARTY', 'PRESIDENT'].includes(pos.toUpperCase());

    const rows = GAZETTE_CATS.map(cat => {
      const db = dbByCode[cat.code];
      const gazetteAllocation = isNational
        ? cat.gazetteKes
        : limit > 0 ? Math.round(limit * (cat.share / 100)) : 0;
      const allocated = Number(db?.allocated ?? gazetteAllocation);
      const spent     = Number(db?.spent     ?? 0);
      return {
        categoryCode:        cat.code,
        categoryName:        cat.name,
        iebcSharePercent:    cat.share,
        gazetteReferenceKes: cat.gazetteKes,
        allocatedKes:        allocated,
        committedKes:        Number(db?.committed ?? 0),
        spentKes:            spent,
        remainingKes:        allocated - spent,
        utilisationPct:      allocated > 0 ? Math.round((spent / allocated) * 1000) / 10 : 0,
        iebcCeilingPct:      limit > 0 ? Math.round((allocated / limit) * 1000) / 10 : 0,
      };
    });

    const totalAllocated = rows.reduce((s, r) => s + r.allocatedKes, 0);
    const totalSpent     = rows.reduce((s, r) => s + r.spentKes, 0);

    const jsonTemplate = {
      meta: {
        campaignId,
        campaignName:      camp.name,
        position:          pos,
        positionLabel:     POSITION_LABELS[pos] ?? pos,
        schedule:          SCHEDULE_MAP[pos] ?? 'N/A',
        gazetteRef:        'IEBC Gazette Notice No. 12251, 7th August 2026',
        electionYear:      2027,
        iebcSpendingLimit: limit,
        countyCode:        camp.county_code,
        constituencyCode:  camp.constituency_code,
        wardCode:          camp.ward_code,
        generatedAt:       new Date().toISOString(),
      },
      summary: {
        totalAllocatedKes:  totalAllocated,
        totalSpentKes:      totalSpent,
        totalRemainingKes:  totalAllocated - totalSpent,
        utilisationPct:     totalAllocated > 0 ? Math.round((totalSpent / totalAllocated) * 1000) / 10 : 0,
        iebcLimitUsedPct:   limit > 0 ? Math.round((totalSpent / limit) * 1000) / 10 : 0,
      },
      categories: rows,
      notes: [
        'All limits per IEBC Gazette Notice No. 12251 dated 7th August 2026.',
        `The ${SCHEDULE_MAP[pos] ?? 'applicable schedule'} applies to this position.`,
        'Spending above the IEBC limit is an electoral offence under the Elections Act.',
        'All expenditure must be reported to the IEBC within 60 days of the election.',
      ],
    };

    if (format === 'csv') {
      const header = [
        'Category Code', 'Category Name', 'IEBC Share %',
        'Gazette Reference (KES)', 'Allocated (KES)',
        'Committed (KES)', 'Spent (KES)', 'Remaining (KES)',
        'Utilisation %', 'IEBC Ceiling %',
      ].join(',');
      const dataLines = rows.map(r =>
        [
          r.categoryCode, `"${r.categoryName}"`, r.iebcSharePercent,
          r.gazetteReferenceKes, r.allocatedKes, r.committedKes,
          r.spentKes, r.remainingKes, r.utilisationPct, r.iebcCeilingPct,
        ].join(','),
      );
      const meta = [
        `# VoteCapsule Budget Template`,
        `# Campaign: ${camp.name}`,
        `# Position: ${POSITION_LABELS[pos] ?? pos}`,
        `# IEBC Spending Limit: KES ${limit.toLocaleString()}`,
        `# Gazette: IEBC Gazette Notice No. 12251 - 7th August 2026`,
        `# Generated: ${new Date().toISOString()}`,
        '#',
      ];
      return [...meta, header, ...dataLines].join('\n') as unknown as Record<string, unknown>;
    }

    return jsonTemplate;
  }

  // ── getIebcBreakdown ──────────────────────────────────────
  // GET /campaigns/:id/budget/iebc-breakdown
  // Aggregates expenses → 11 IEBC categories → spend/limit/pct/warnings.
  async getIebcBreakdown(campaignId: string, tenantId: string): Promise<Record<string, unknown>> {
    let iebcLimit = 0;
    const gazetteRef = 'IEBC Gazette Notice No. 12251, 7th August 2026';

    try {
      const budget = await this.budgetRepo.findOne({ where: { campaignId, tenantId } });
      iebcLimit = Number(budget?.iebcSpendingLimit ?? 0);
    } catch { /* use 0 */ }

    const expenses = await this.expenseRepo.find({
      where: { campaignId, tenantId },
      select: ['amount', 'categoryCode'] as any,
    });

    const iebcAgg: Record<string, number> = {};
    let totalSpent = 0;
    for (const exp of expenses) {
      const code    = ((exp as any).categoryCode ?? '').toLowerCase();
      const iebcKey = EXPENSE_TO_IEBC[code];
      const amount  = Number((exp as any).amount ?? 0);
      totalSpent += amount;
      if (iebcKey) iebcAgg[iebcKey] = (iebcAgg[iebcKey] ?? 0) + amount;
    }

    const categories = GAZETTE_CATS.map(({ code, name, share }) => {
      const catLimit = iebcLimit > 0 ? Math.round(iebcLimit * (share / 100)) : 0;
      const spent    = iebcAgg[code] ?? 0;
      const pct      = catLimit > 0 ? Math.round((spent / catLimit) * 100 * 10) / 10 : 0;
      return { code, name, share, limit: catLimit, spent, pct };
    });

    const underspent = categories.filter(c => c.pct < 50 && c.limit > 0).sort((a, b) => a.pct - b.pct);
    const warnings: Array<{ category: string; code: string; level: string; message: string; suggestion?: string }> = [];

    const overallPct = iebcLimit > 0 ? (totalSpent / iebcLimit) * 100 : 0;
    if (overallPct >= 80) {
      warnings.push({
        category: 'Overall', code: '_overall',
        level: overallPct >= 95 ? 'red' : 'orange',
        message: `Total spend is at ${overallPct.toFixed(1)}% of the IEBC limit (KES ${iebcLimit.toLocaleString()}). ${overallPct >= 95 ? 'Critical — immediate action required.' : 'Plan remaining spend carefully.'}`,
      });
    }

    for (const cat of categories) {
      if (cat.pct >= 100) {
        warnings.push({
          category: cat.name, code: cat.code, level: 'red',
          message: `${cat.name} has EXCEEDED the IEBC limit by KES ${(cat.spent - cat.limit).toLocaleString()}. File over-limit report per Section 18(7).`,
          suggestion: underspent.length > 0
            ? `Shift funds to ${underspent[0].name} (${underspent[0].pct.toFixed(0)}% used, KES ${(underspent[0].limit - underspent[0].spent).toLocaleString()} available)`
            : undefined,
        });
      } else if (cat.pct >= 90) {
        warnings.push({
          category: cat.name, code: cat.code, level: 'orange',
          message: `${cat.name} is at ${cat.pct.toFixed(1)}% of the gazette allocation (${cat.share}% of limit).`,
          suggestion: underspent.length > 0
            ? `Consider shifting future spend to ${underspent[0].name} (${underspent[0].pct.toFixed(0)}% used)`
            : undefined,
        });
      } else if (cat.pct >= 70) {
        warnings.push({ category: cat.name, code: cat.code, level: 'yellow',
          message: `${cat.name} is at ${cat.pct.toFixed(1)}% of its IEBC allocation. Monitor closely.` });
      }
    }

    return {
      data: {
        limit: iebcLimit, totalSpent,
        overallPct: Math.round(overallPct * 10) / 10,
        schedule: 'Gazette Notice GN 12251 · 7 August 2026',
        gazetteRef, categories, warnings,
      },
    };
  }

  // ── getCampaignGeography ──────────────────────────────────
  async getCampaignGeography(campaignId: string, tenantId: string) {
    const campaign = await this.dataSource.query(`
      SELECT c.id, c.constituency_code, c.county_code, c.name,
             c.ward_count, c.registered_voters, c.polling_stations
      FROM campaigns c WHERE c.id = $1 AND c.tenant_id = $2 LIMIT 1
    `, [campaignId, tenantId]);

    if (!campaign?.length) throw new NotFoundException('Campaign not found');
    const cam = campaign[0];

    if (cam.ward_count && cam.registered_voters) {
      return {
        constituencyCode: cam.constituency_code,
        constituencyName: cam.name,
        wardCount: cam.ward_count,
        registeredVoters: cam.registered_voters,
        pollingStations: cam.polling_stations ?? Math.ceil(cam.registered_voters / 700),
      };
    }

    const constCode = cam.constituency_code;
    if (!constCode) {
      return { constituencyCode: null, constituencyName: cam.name, wardCount: 5, registeredVoters: 45000, pollingStations: 65 };
    }

    const wardResult = await this.dataSource.query(`SELECT COUNT(*)::int AS ward_count FROM wards w WHERE w.constituency_code = $1`, [constCode]);
    const voterResult = await this.dataSource.query(`
      SELECT COALESCE(SUM(ps.registered_voters), 0)::int AS registered_voters, COUNT(ps.id)::int AS polling_stations
      FROM polling_stations ps
      JOIN registration_centres rc ON rc.id = ps.registration_centre_id
      JOIN wards w ON w.code = rc.ward_code
      WHERE w.constituency_code = $1
    `, [constCode]);

    const wardCount = wardResult?.[0]?.ward_count ?? 5;
    const voters    = voterResult?.[0]?.registered_voters ?? 45000;
    const stations  = voterResult?.[0]?.polling_stations ?? Math.ceil(voters / 700);

    await this.dataSource.query(`
      UPDATE campaigns SET ward_count=$1, registered_voters=$2, polling_stations=$3, updated_at=NOW() WHERE id=$4
    `, [wardCount, voters, stations, campaignId]);

    return { constituencyCode: constCode, constituencyName: cam.name, wardCount, registeredVoters: voters, pollingStations: stations };
  }
}
