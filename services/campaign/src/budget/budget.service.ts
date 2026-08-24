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
    const defaultCategories = [
      { code: 'transport',       name: 'Transport & Fuel' },
      { code: 'fuel',            name: 'Fuel' },
      { code: 'printing',        name: 'Printing & Materials' },
      { code: 'branding',        name: 'Branding & Outdoor' },
      { code: 'events',          name: 'Events & Rallies' },
      { code: 'communications',  name: 'Communications & SMS' },
      { code: 'personnel',       name: 'Personnel & Allowances' },
      { code: 'other',           name: 'Other' },
    ];
    for (const cat of defaultCategories) {
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
}
