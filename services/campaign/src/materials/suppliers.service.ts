// ============================================================
// VoteCapsule™ — Campaign Suppliers Service
// ============================================================
import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CampaignSupplier }        from './entities/campaign-supplier.entity';
import { CampaignSupplierProduct } from './entities/campaign-supplier-product.entity';

@Injectable()
export class SuppliersService {
  private readonly logger = new Logger(SuppliersService.name);

  constructor(
    @InjectRepository(CampaignSupplier)
    private readonly repo: Repository<CampaignSupplier>,
    @InjectRepository(CampaignSupplierProduct)
    private readonly productRepo: Repository<CampaignSupplierProduct>,
  ) {}

  async list(tenantId: string): Promise<CampaignSupplier[]> {
    return this.repo.find({
      where: { tenantId, isActive: true },
      order: { companyName: 'ASC' },
    });
  }

  async listAll(): Promise<CampaignSupplier[]> {
    return this.repo.find({ order: { companyName: 'ASC' } });
  }

  async create(dto: any, tenantId: string, userId: string): Promise<CampaignSupplier> {
    const entity = this.repo.create({ ...dto, tenantId, createdBy: userId });
    const saved  = await this.repo.save(entity) as unknown as CampaignSupplier;
    this.logger.log(`Supplier created: ${saved.id} for tenant ${tenantId}`);
    return saved;
  }

  async update(id: string, tenantId: string, dto: any): Promise<CampaignSupplier> {
    const s = await this.repo.findOne({ where: { id, tenantId } });
    if (!s) throw new NotFoundException(`Supplier ${id} not found`);
    Object.assign(s, dto);
    return this.repo.save(s);
  }

  async deactivate(id: string, tenantId: string): Promise<void> {
    const s = await this.repo.findOne({ where: { id, tenantId } });
    if (!s) throw new NotFoundException(`Supplier ${id} not found`);
    s.isActive = false;
    await this.repo.save(s);
  }

  // ── Supplier Products ─────────────────────────────────────────

  async listProducts(
    supplierId: string,
    page = 1,
    limit = 50,
  ): Promise<{ data: CampaignSupplierProduct[]; total: number }> {
    const [data, total] = await this.productRepo.findAndCount({
      where:  { supplierId, isAvailable: true },
      order:  { supplierProductName: 'ASC' },
      skip:   (page - 1) * limit,
      take:   limit,
    });
    return { data, total };
  }

  async getProduct(id: string, supplierId: string): Promise<CampaignSupplierProduct> {
    const p = await this.productRepo.findOne({ where: { id, supplierId } });
    if (!p) throw new NotFoundException(`Product ${id} not found`);
    return p;
  }

  async searchProducts(
    q: string,
    page = 1,
    limit = 20,
  ): Promise<{ data: CampaignSupplierProduct[]; total: number }> {
    const qb = this.productRepo.createQueryBuilder('p')
      .where('p.is_available = true')
      .andWhere(
        "p.supplier_product_name ILIKE :q OR p.description ILIKE :q",
        { q: `%${q}%` },
      )
      .orderBy('p.supplier_product_name', 'ASC')
      .skip((page - 1) * limit)
      .take(limit);
    const [data, total] = await qb.getManyAndCount();
    return { data, total };
  }

  async compareByMaterialType(
    materialTypeId: string,
  ): Promise<CampaignSupplierProduct[]> {
    return this.productRepo.find({
      where:    { materialTypeId, isAvailable: true },
      relations: ['supplier'],
      order:    { unitPrice: 'ASC' },
    });
  }

  // ── Admin: list all products across all suppliers ─────────────

  async listAllProducts(
    page = 1,
    limit = 100,
  ): Promise<{ data: CampaignSupplierProduct[]; total: number }> {
    const [data, total] = await this.productRepo.findAndCount({
      relations: ['supplier'],
      order:     { supplierProductName: 'ASC' },
      skip:      (page - 1) * limit,
      take:      limit,
    });
    return { data, total };
  }

  async createProduct(dto: any): Promise<CampaignSupplierProduct> {
    const entity = this.productRepo.create(dto);
    const saved  = await this.productRepo.save(entity) as unknown as CampaignSupplierProduct;
    this.logger.log(`Supplier product created: ${saved.id}`);
    return saved;
  }

  async updateProduct(id: string, dto: any): Promise<CampaignSupplierProduct> {
    const p = await this.productRepo.findOne({ where: { id } });
    if (!p) throw new NotFoundException(`Product ${id} not found`);
    Object.assign(p, dto);
    return this.productRepo.save(p) as unknown as Promise<CampaignSupplierProduct>;
  }

  async deleteProduct(id: string): Promise<void> {
    const p = await this.productRepo.findOne({ where: { id } });
    if (!p) throw new NotFoundException(`Product ${id} not found`);
    await this.productRepo.delete(id);
    this.logger.log(`Supplier product deleted: ${id}`);
  }
}
