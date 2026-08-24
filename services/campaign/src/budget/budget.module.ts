import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CampaignBudget } from './entities/campaign-budget.entity';
import { CampaignBudgetCategory } from './entities/campaign-budget-category.entity';
import { CampaignExpense } from './entities/campaign-expense.entity';
import { CampaignContribution } from './entities/campaign-contribution.entity';
import { BudgetController } from './budget.controller';
import { BudgetService } from './budget.service';

@Module({
  imports: [TypeOrmModule.forFeature([CampaignBudget, CampaignBudgetCategory, CampaignExpense, CampaignContribution])],
  controllers: [BudgetController],
  providers: [BudgetService],
  exports: [BudgetService],
})
export class BudgetModule {}
