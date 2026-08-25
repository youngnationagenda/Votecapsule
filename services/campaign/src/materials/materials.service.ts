// ============================================================
// VoteCapsule™ — Campaign Materials Service
// Handles categories, types, orders, inventory, distributions
// ============================================================
import {
  Injectable, NotFoundException, BadRequestException, Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, FindOptionsWhere } from 'typeorm';
import { CampaignMaterialCategory }    from './entities/campaign-material-category.entity';
import { CampaignMaterialType }        from './entities/campaign-material-type.entity';
import { CampaignMaterialOrder }       from './entities/campaign-material-order.entity';
import { CampaignMaterialInventory }   from './entities/campaign-material-inventory.entity';
import { CampaignMaterialDistribution } from './entities/campaign-material-distribution.entity';

@Injectable()
export class MaterialsService {
  private readonly logger = new Logger(MaterialsService.name);

  constructor(
    @InjectRepository(CampaignMaterialCategory)
    private readonly categoryRepo: Repository<CampaignMaterialCategory>,
    @InjectRepository(CampaignMaterialType)
    private readonly typeRepo: Repository<CampaignMaterialType>,
    @InjectRepository(CampaignMaterialOrder)
    private readonly orderRepo: Repository<CampaignMaterialOrder>,
    @InjectRepository(CampaignMaterialInventory)
    private readonly inventoryRepo: Repository<CampaignMaterialInventory>,
    @InjectRepository(CampaignMaterialDistribution)
    private readonly distributionRepo: Repository<CampaignMaterialDistribution>,
    private readonly dataSource: DataSource,
  ) {}

  // ── Categories ───────────────────────────────────────────────

  async listCategories(): Promise<CampaignMaterialCategory[]> {
    return this.categoryRepo.find({
      where:  { isActive: true },
      order:  { sortOrder: 'ASC' },
    });
  }

  // ── Types ────────────────────────────────────────────────────

  async listTypes(categoryCode?: string): Promise<CampaignMaterialType[]> {
    const qb = this.typeRepo.createQueryBuilder('t')
      .leftJoinAndSelect('t.category', 'c')
      .where('t.is_active = true');

    if (categoryCode) {
      qb.andWhere('c.code = :code', { code: categoryCode });
    }
    return qb.orderBy('t.name', 'ASC').getMany();
  }

  async getType(id: string): Promise<CampaignMaterialType> {
    const t = await this.typeRepo.findOne({
      where:    { id, isActive: true },
      relations: ['category'],
    });
    if (!t) throw new NotFoundException(`Material type ${id} not found`);
    return t;
  }

  async createType(dto: any): Promise<CampaignMaterialType> {
    const entity = this.typeRepo.create(dto);
    const saved  = await this.typeRepo.save(entity) as unknown as CampaignMaterialType;
    this.logger.log(`Material type created: ${saved.code}`);
    return saved;
  }

  async updateType(id: string, dto: any): Promise<CampaignMaterialType> {
    const t = await this.typeRepo.findOne({ where: { id } });
    if (!t) throw new NotFoundException(`Material type ${id} not found`);
    Object.assign(t, dto);
    return this.typeRepo.save(t) as unknown as Promise<CampaignMaterialType>;
  }

  // ── Orders ───────────────────────────────────────────────────

  private async nextOrderNumber(): Promise<string> {
    const year  = new Date().getFullYear();
    const count = await this.orderRepo.count();
    return `CM-${year}-${String(count + 1).padStart(4, '0')}`;
  }

  async createOrder(
    campaignId: string,
    dto: any,
    tenantId: string,
    userId: string,
  ): Promise<CampaignMaterialOrder> {
    const orderNumber = await this.nextOrderNumber();
    const entity = this.orderRepo.create({
      ...dto,
      campaignId,
      tenantId,
      orderNumber,
      requestedBy: userId,
      productionStatus: 'draft',
    });
    const saved = await this.orderRepo.save(entity) as unknown as CampaignMaterialOrder;
    this.logger.log(`Material order created: ${saved.orderNumber} for campaign ${campaignId}`);
    return saved;
  }

  async listOrders(
    campaignId: string,
    tenantId: string,
    status?: string,
  ): Promise<CampaignMaterialOrder[]> {
    const where: FindOptionsWhere<CampaignMaterialOrder> = { campaignId, tenantId };
    if (status) where.productionStatus = status;
    return this.orderRepo.find({
      where,
      relations: ['materialType', 'supplier'],
      order: { createdAt: 'DESC' },
    });
  }

  async getOrder(
    id: string,
    campaignId: string,
    tenantId: string,
  ): Promise<CampaignMaterialOrder> {
    const o = await this.orderRepo.findOne({
      where:    { id, campaignId, tenantId },
      relations: ['materialType', 'supplier'],
    });
    if (!o) throw new NotFoundException(`Order ${id} not found`);
    return o;
  }

  async updateOrder(
    id: string,
    campaignId: string,
    dto: any,
    tenantId: string,
  ): Promise<CampaignMaterialOrder> {
    const o = await this.getOrder(id, campaignId, tenantId);
    Object.assign(o, dto);
    return this.orderRepo.save(o);
  }

  async approveOrder(
    id: string,
    campaignId: string,
    tenantId: string,
    userId: string,
    approved: boolean,
    notes?: string,
  ): Promise<CampaignMaterialOrder> {
    const o = await this.getOrder(id, campaignId, tenantId);
    if (o.productionStatus !== 'draft') {
      throw new BadRequestException(`Order ${id} is not in draft status`);
    }
    o.productionStatus = approved ? 'approved' : 'cancelled';
    o.approvedBy       = userId;
    o.approvedAt       = new Date();
    o.approvalNotes    = notes ?? null;
    return this.orderRepo.save(o);
  }

  // ── Inventory ────────────────────────────────────────────────

  async getInventory(
    campaignId: string,
    tenantId: string,
    wardCode?: string,
  ): Promise<CampaignMaterialInventory[]> {
    const where: FindOptionsWhere<CampaignMaterialInventory> = { campaignId, tenantId };
    if (wardCode) where.wardCode = wardCode;
    return this.inventoryRepo.find({ where, order: { createdAt: 'DESC' } });
  }

  // ── Distributions ────────────────────────────────────────────

  async recordDistribution(
    campaignId: string,
    dto: any,
    tenantId: string,
    userId: string,
  ): Promise<CampaignMaterialDistribution> {
    // Decrement source inventory in same transaction
    return this.dataSource.transaction(async (manager) => {
      const dist = manager.create(CampaignMaterialDistribution, {
        ...dto,
        campaignId,
        tenantId,
        distributedBy: userId,
      });
      const saved = await manager.save(CampaignMaterialDistribution, dist);

      // Decrement from_ward inventory if inventoryId is provided
      if (dto.inventoryId) {
        const inv = await manager.findOne(CampaignMaterialInventory, {
          where: { id: dto.inventoryId, campaignId, tenantId },
        });
        if (!inv) throw new NotFoundException(`Inventory record ${dto.inventoryId} not found`);
        if (inv.quantityReceived - inv.quantityDistributed - inv.quantityDamaged < dto.quantity) {
          throw new BadRequestException('Insufficient inventory for this distribution');
        }
        await manager.increment(
          CampaignMaterialInventory,
          { id: inv.id },
          'quantity_distributed',
          dto.quantity,
        );
      }

      this.logger.log(`Distribution recorded: ${saved.id} for campaign ${campaignId}`);
      return saved;
    });
  }

  async listDistributions(
    campaignId: string,
    tenantId: string,
    wardCode?: string,
  ): Promise<CampaignMaterialDistribution[]> {
    const where: FindOptionsWhere<CampaignMaterialDistribution> = { campaignId, tenantId };
    if (wardCode) where.toWardCode = wardCode;
    return this.distributionRepo.find({ where, order: { createdAt: 'DESC' } });
  }
}
