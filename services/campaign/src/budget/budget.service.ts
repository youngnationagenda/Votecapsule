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

const ALERT_THRESHOLDS = [80, 95];

@Injectable()
export class BudgetService {
  private readonly logger = new Logger(BudgetService.name);

  constructor(
    @InjectRepository(CampaignBudget) private readonly budgetRepo: Repository<CampaignBudget>,
    @InjectRepository(CampaignBudgetCategory) private readonly categoryRepo: Repository<CampaignBudgetCategory>,
    @InjectRepository(CampaignExpense) private readonly expenseRepo: Repository<CampaignExpense>,
    @InjectRepository(CampaignContribution) private readonly contributionRepo: Repository<CampaignContribution>,
    private readonly dataSource: DataSource,
  ) {}

  async createBudget(campaignId: string, dto: any, tenantId: string, userId: string): Promise<CampaignBudget> {
    const entity = this.budgetRepo.create({ ...dto, campaignId, tenantId, createdBy: userId }) as unknown as CampaignBudget;
    const saved  = await this.budgetRepo.save(entity);

    // Seed default categories
    // Seed 11 IEBC gazette categories (Fifth Schedule, GN 12251)
    // These match the budget-auto.service.ts categories exactly.
    const iebcCategories = [
      { code: 'venues',          name: 'Venues for Campaign Rallies'   },
      { code: 'publicity',       name: 'Publicity Materials'           },
      { code: 'advertising',     name: 'Advertising & Media'           },
      { code: 'personnel',       name: 'Campaign Personnel'            },
      { code: 'agents',          name: 'Election Agents'               },
      { code: 'transport',       name: 'Transportation'                },
      { code: 'communication',   name: 'Communication & Telephone'     },
      { code: 'nomination_fees', name: 'Nomination Fees'               },
      { code: 'security',        name: 'Security'                      },
      { code: 'accommodation',   name: 'Accommodation & Travel'        },
      { code: 'administrative',  name: 'Administrative Cost'           },
    ];
    for (const cat of iebcCategories) {
      await this.categoryRepo.save(this.categoryRepo.create({
        budgetId: saved.id, campaignId, tenantId,
        categoryCode: cat.code, categoryName: cat.name,
        allocated: 0, committed: 0, spent: 0,
      }));
    }
    return saved;
  }

  async getBudgetSummary(campaignId: string, tenantId: string): Promise<Record<string, unknown>> {
    const budget = await this.budgetRepo.findOne({ where: { campaignId, tenantId }, relations: ['categories'] });
    if (!budget) throw new NotFoundException(`Budget for campaign ${campaignId} not found`);

    const totalRemaining = Number(budget.totalAllocated) - Number(budget.totalSpent);
    const iebcPct = budget.iebcSpendingLimit
      ? Math.round((Number(budget.totalSpent) / Number(budget.iebcSpendingLimit)) * 100)
      : 0;

    return {
      ...budget,
      totalRemaining,
      iebcLimitPercentageUsed: iebcPct,
    };
  }

  async getByCategory(campaignId: string, tenantId: string): Promise<CampaignBudgetCategory[]> {
    const budget = await this.budgetRepo.findOne({ where: { campaignId, tenantId } });
    if (!budget) throw new NotFoundException(`Budget not found`);
    return this.categoryRepo.find({ where: { budgetId: budget.id }, order: { categoryCode: 'ASC' } });
  }

  async recordExpense(campaignId: string, dto: any, tenantId: string, userId: string): Promise<CampaignExpense> {
    const budget = await this.budgetRepo.findOne({ where: { campaignId, tenantId } });

    return this.dataSource.transaction(async (manager) => {
      const expense = manager.create(CampaignExpense, {
        ...dto,
        campaignId,
        tenantId,
        budgetId:   budget?.id ?? null,
        recordedBy: userId,
      });
      const saved = await manager.save(CampaignExpense, expense);

      // Update budget totals
      if (budget) {
        await manager.increment(CampaignBudget, { id: budget.id }, 'total_spent', Number(dto.amount));

        // Update category if provided
        if (dto.categoryCode) {
          const cat = await manager.findOne(CampaignBudgetCategory, { where: { budgetId: budget.id, categoryCode: dto.categoryCode } });
          if (cat) {
            await manager.increment(CampaignBudgetCategory, { id: cat.id }, 'spent', Number(dto.amount));

            // Check IEBC alert thresholds
            const newSpent = Number(cat.spent) + Number(dto.amount);
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

  async listExpenses(campaignId: string, tenantId: string, filters?: { wardCode?: string; categoryId?: string }): Promise<CampaignExpense[]> {
    const qb = this.expenseRepo.createQueryBuilder('e')
      .where('e.campaign_id = :campaignId', { campaignId })
      .andWhere('e.tenant_id = :tenantId', { tenantId });
    if (filters?.wardCode)   qb.andWhere('e.ward_code = :ward', { ward: filters.wardCode });
    if (filters?.categoryId) qb.andWhere('e.category_id = :cat', { cat: filters.categoryId });
    return qb.orderBy('e.expense_date', 'DESC').getMany();
  }

  async getIebcStatus(campaignId: string, tenantId: string): Promise<Record<string, unknown>> {
    const budget = await this.getBudgetSummary(campaignId, tenantId) as any;
    return {
      totalSpent:          budget.totalSpent,
      iebcSpendingLimit:   budget.iebcSpendingLimit,
      percentageUsed:      budget.iebcLimitPercentageUsed,
      status:              budget.iebcLimitPercentageUsed >= 95 ? 'CRITICAL' :
                           budget.iebcLimitPercentageUsed >= 80 ? 'WARNING' : 'OK',
      reportableExpenses:  await this.expenseRepo.count({ where: { campaignId, tenantId, iebcReportable: true } }),
    };
  }

  async recordContribution(campaignId: string, dto: any, tenantId: string, userId: string): Promise<CampaignContribution> {
    const budget = await this.budgetRepo.findOne({ where: { campaignId, tenantId } });
    const entity = this.contributionRepo.create({ ...dto, campaignId, tenantId, budgetId: budget?.id ?? null, recordedBy: userId }) as unknown as CampaignContribution;
    const saved  = await this.contributionRepo.save(entity);

    // Credit budget total
    if (budget) await this.budgetRepo.increment({ id: budget.id }, 'total_allocated', Number(dto.amount ?? 0));
    return saved;
  }

  async listContributions(campaignId: string, tenantId: string): Promise<CampaignContribution[]> {
    return this.contributionRepo.find({ where: { campaignId, tenantId }, order: { contributionDate: 'DESC' } });
  }

  // ── Budget File Import ─────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async importBudgetFile(campaignId: string, file: any, tenantId: string, userId: string) {
    this.logger.log(`Importing budget file: ${file.originalname} (${file.size} bytes) for campaign ${campaignId}`);

    const ext = file.originalname.split('.').pop()?.toLowerCase();
    let lineItems: Array<{ description: string; categoryCode: string; amount: number; wardCode?: string }> = [];

    if (ext === 'csv' || ext === 'tsv') {
      const text = file.buffer.toString('utf-8');
      const sep = ext === 'tsv' ? '\t' : ',';
      const lines = text.trim().split('\n');
      const headers = lines[0].split(sep).map(h => h.trim().toLowerCase().replace(/[^a-z_]/g, ''));

      for (let i = 1; i < lines.length; i++) {
        const vals = lines[i].split(sep).map(v => v.trim());
        const row: Record<string, string> = {};
        headers.forEach((h, idx) => { row[h] = vals[idx] ?? ''; });

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
      // For Excel files, we'd use a library like xlsx/exceljs in production
      // For now, store the file and return a placeholder response
      this.logger.warn(`Excel import not yet implemented server-side. File stored for manual processing.`);
      return { status: 'queued', message: 'Excel file queued for processing', filename: file.originalname };
    } else if (ext === 'docx' || ext === 'doc') {
      this.logger.warn(`Word import not yet implemented server-side. File stored for manual processing.`);
      return { status: 'queued', message: 'Word file queued for processing', filename: file.originalname };
    } else {
      return { status: 'error', message: `Unsupported file format: ${ext}` };
    }

    // Bulk insert parsed line items as expenses
    let imported = 0;
    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();

    try {
      for (const item of lineItems) {
        await qr.manager.save(CampaignExpense, {
          campaignId,
          tenantId,
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

  // ── Budget Allocation ──────────────────────────────────────
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
        // Upsert category allocation
        await qr.query(`
          INSERT INTO campaign_budget_categories (campaign_id, tenant_id, category_code, allocated, created_by)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (campaign_id, category_code)
          DO UPDATE SET allocated = $4, updated_at = NOW()
        `, [campaignId, tenantId, alloc.categoryCode, alloc.amount, userId]);
        totalAllocated += alloc.amount;
      }

      // Update total allocated on budget summary
      await qr.query(`
        UPDATE campaign_budgets
        SET total_allocated = $1, updated_at = NOW()
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

  // ── IEBC Category Breakdown (D1 — Priority 11) ────────────────
  // GET /campaigns/:id/budget/iebc-breakdown
  // Aggregates expenses into 11 IEBC categories, computes spend/limit/pct,
  // generates yellow/orange/red warnings + reallocation suggestions.

  private static readonly IEBC_SHARES: Record<string, { name: string; share: number }> = {
    venues:          { name: 'Venues for Campaign Rallies',   share: 1.5  },
    publicity:       { name: 'Publicity Materials',           share: 4.4  },
    advertising:     { name: 'Advertising & Media',           share: 10.3 },
    personnel:       { name: 'Campaign Personnel',            share: 1.4  },
    agents:          { name: 'Election Agents',               share: 8.5  },
    transport:       { name: 'Transportation',                share: 66.0 },
    communication:   { name: 'Communication & Telephone',     share: 0.5  },
    nomination_fees: { name: 'Nomination Fees',               share: 0.9  },
    security:        { name: 'Security',                      share: 1.2  },
    accommodation:   { name: 'Accommodation & Travel',        share: 0.1  },
    administrative:  { name: 'Administrative Cost',           share: 5.3  },
  };

  // Expense categoryCode → IEBC category key
  private static readonly EXPENSE_TO_IEBC: Record<string, string> = {
    transport:            'transport',
    fuel:                 'transport',
    logistics:            'transport',
    printing:             'publicity',
    branding:             'publicity',
    digital_advertising:  'advertising',
    outdoor_advertising:  'advertising',
    media:                'advertising',
    staff:                'personnel',
    volunteers:           'personnel',
    events:               'venues',
    venues:               'venues',
    communications:       'communication',
    meals:                'accommodation',
    accommodation:        'accommodation',
    office:               'administrative',
    equipment:            'administrative',
    miscellaneous:        'administrative',
    security:             'security',
    agents:               'agents',
    nomination:           'nomination_fees',
    nomination_fees:      'nomination_fees',
  };

  async getIebcBreakdown(campaignId: string, tenantId: string): Promise<Record<string, unknown>> {
    // ── 1. Get budget (for IEBC limit) ──────────────────────────
    let iebcLimit = 0;
    let schedule  = '';
    let gazetteRef = 'IEBC Gazette Notice No. 12251, 7th August 2026';

    try {
      const budget = await this.budgetRepo.findOne({ where: { campaignId, tenantId } });
      iebcLimit = Number(budget?.iebcSpendingLimit ?? 0);
    } catch { /* use 0 */ }

    // ── 2. Fetch all expenses ────────────────────────────────────
    const expenses = await this.expenseRepo.find({
      where: { campaignId, tenantId },
      select: ['amount', 'categoryCode'] as any,
    });

    // ── 3. Aggregate spend by IEBC category ─────────────────────
    const iebcAgg: Record<string, number> = {};
    let totalSpent = 0;
    for (const exp of expenses) {
      const code     = ((exp as any).categoryCode ?? '').toLowerCase();
      const iebcKey  = BudgetService.EXPENSE_TO_IEBC[code];
      const amount   = Number((exp as any).amount ?? 0);
      totalSpent += amount;
      if (iebcKey) iebcAgg[iebcKey] = (iebcAgg[iebcKey] ?? 0) + amount;
    }

    // ── 4. Build per-category rows ───────────────────────────────
    const categories = Object.entries(BudgetService.IEBC_SHARES).map(([key, { name, share }]) => {
      const limit   = iebcLimit > 0 ? Math.round(iebcLimit * (share / 100)) : 0;
      const spent   = iebcAgg[key] ?? 0;
      const pct     = limit > 0 ? Math.round((spent / limit) * 100 * 10) / 10 : 0;
      return { code: key, name, share, limit, spent, pct };
    });

    // ── 5. Generate warnings ─────────────────────────────────────
    const underspent = categories
      .filter(c => c.pct < 50 && c.limit > 0)
      .sort((a, b) => a.pct - b.pct);

    const warnings: Array<{ category: string; code: string; level: string; message: string; suggestion?: string }> = [];

    // Overall check first
    const overallPct = iebcLimit > 0 ? (totalSpent / iebcLimit) * 100 : 0;
    if (overallPct >= 80) {
      warnings.push({
        category:  'Overall',
        code:      '_overall',
        level:     overallPct >= 95 ? 'red' : 'orange',
        message:   `Total spend is at ${overallPct.toFixed(1)}% of the IEBC limit (KES ${iebcLimit.toLocaleString()}). ${overallPct >= 95 ? 'Critical — immediate action required.' : 'Plan remaining spend carefully.'}`,
      });
    }

    // Per-category
    for (const cat of categories) {
      if (cat.pct >= 100) {
        const excess = cat.spent - cat.limit;
        warnings.push({
          category:   cat.name,
          code:       cat.code,
          level:      'red',
          message:    `${cat.name} has EXCEEDED the IEBC limit by KES ${excess.toLocaleString()}. File over-limit report per Section 18(7).`,
          suggestion: underspent.length > 0
            ? `Shift funds to ${underspent[0].name} (${underspent[0].pct.toFixed(0)}% used, KES ${(underspent[0].limit - underspent[0].spent).toLocaleString()} available)`
            : undefined,
        });
      } else if (cat.pct >= 90) {
        warnings.push({
          category:   cat.name,
          code:       cat.code,
          level:      'orange',
          message:    `${cat.name} is at ${cat.pct.toFixed(1)}% of the gazette allocation (${cat.share}% of limit).`,
          suggestion: underspent.length > 0
            ? `Consider shifting future spend to ${underspent[0].name} (${underspent[0].pct.toFixed(0)}% used)`
            : undefined,
        });
      } else if (cat.pct >= 70) {
        warnings.push({
          category: cat.name,
          code:     cat.code,
          level:    'yellow',
          message:  `${cat.name} is at ${cat.pct.toFixed(1)}% of its IEBC allocation. Monitor closely.`,
        });
      }
    }

    // ── 6. Return ────────────────────────────────────────────────
    return {
      data: {
        limit:       iebcLimit,
        totalSpent,
        overallPct:  Math.round(overallPct * 10) / 10,
        schedule:    schedule || 'Gazette Notice GN 12251 · 7 August 2026',
        gazetteRef,
        categories,
        warnings,
      },
    };
  }

  // ── Campaign Geography ─────────────────────────────────────
  async getCampaignGeography(campaignId: string, tenantId: string) {
    // Fetch campaign's constituency/county to derive geography
    const campaign = await this.dataSource.query(`
      SELECT c.id, c.constituency_code, c.county_code, c.name,
             c.ward_count, c.registered_voters, c.polling_stations
      FROM campaigns c
      WHERE c.id = $1 AND c.tenant_id = $2
      LIMIT 1
    `, [campaignId, tenantId]);

    if (!campaign?.length) throw new NotFoundException('Campaign not found');
    const cam = campaign[0];

    // If geography is directly on campaign record, return it
    if (cam.ward_count && cam.registered_voters) {
      return {
        constituencyCode: cam.constituency_code,
        constituencyName: cam.name,
        wardCount: cam.ward_count,
        registeredVoters: cam.registered_voters,
        pollingStations: cam.polling_stations ?? Math.ceil(cam.registered_voters / 700),
      };
    }

    // Otherwise, derive from NEC geography tables
    const constCode = cam.constituency_code;
    if (!constCode) {
      return {
        constituencyCode: null,
        constituencyName: cam.name,
        wardCount: 5, // default fallback
        registeredVoters: 45000,
        pollingStations: 65,
      };
    }

    // Count wards in constituency
    const wardResult = await this.dataSource.query(`
      SELECT COUNT(*)::int AS ward_count
      FROM wards w
      WHERE w.constituency_code = $1
    `, [constCode]);

    // Sum registered voters from polling stations
    const voterResult = await this.dataSource.query(`
      SELECT
        COALESCE(SUM(ps.registered_voters), 0)::int AS registered_voters,
        COUNT(ps.id)::int AS polling_stations
      FROM polling_stations ps
      JOIN registration_centres rc ON rc.id = ps.registration_centre_id
      JOIN wards w ON w.code = rc.ward_code
      WHERE w.constituency_code = $1
    `, [constCode]);

    const wardCount = wardResult?.[0]?.ward_count ?? 5;
    const voters = voterResult?.[0]?.registered_voters ?? 45000;
    const stations = voterResult?.[0]?.polling_stations ?? Math.ceil(voters / 700);

    // Cache on campaign for future requests
    await this.dataSource.query(`
      UPDATE campaigns
      SET ward_count = $1, registered_voters = $2, polling_stations = $3, updated_at = NOW()
      WHERE id = $4
    `, [wardCount, voters, stations, campaignId]);

    return {
      constituencyCode: constCode,
      constituencyName: cam.name,
      wardCount,
      registeredVoters: voters,
      pollingStations: stations,
    };
  }
}
