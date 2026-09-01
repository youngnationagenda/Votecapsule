import { Module }        from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Campaign }          from './entities/campaign.entity';
import { CampaignController } from './campaign.controller';
import { CampaignService }    from './campaign.service';
import { BudgetModule }       from '../budget/budget.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Campaign]),
    BudgetModule,   // gives access to BudgetAutoService + IEBCLimitService
  ],
  controllers: [CampaignController],
  providers:   [CampaignService],
  exports:     [CampaignService],
})
export class CampaignModule {}
