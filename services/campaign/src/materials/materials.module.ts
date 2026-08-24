// ============================================================
// VoteCapsule™ — Materials Module
// ============================================================
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CampaignMaterialCategory }     from './entities/campaign-material-category.entity';
import { CampaignMaterialType }         from './entities/campaign-material-type.entity';
import { CampaignMaterialOrder }        from './entities/campaign-material-order.entity';
import { CampaignSupplier }             from './entities/campaign-supplier.entity';
import { CampaignSupplierProduct }      from './entities/campaign-supplier-product.entity';
import { CampaignMaterialInventory }    from './entities/campaign-material-inventory.entity';
import { CampaignMaterialDistribution } from './entities/campaign-material-distribution.entity';
import { MaterialsService }             from './materials.service';
import { SuppliersService }             from './suppliers.service';
import { MaterialsController }          from './materials.controller';
import { SuppliersController }          from './suppliers.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CampaignMaterialCategory,
      CampaignMaterialType,
      CampaignMaterialOrder,
      CampaignSupplier,
      CampaignSupplierProduct,
      CampaignMaterialInventory,
      CampaignMaterialDistribution,
    ]),
  ],
  controllers: [MaterialsController, SuppliersController],
  providers:   [MaterialsService, SuppliersService],
  exports:     [MaterialsService, SuppliersService],
})
export class MaterialsModule {}
