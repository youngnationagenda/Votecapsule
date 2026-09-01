// ============================================================
// VoteCapsule™ — Campaign Suppliers Service
// ============================================================
import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CampaignSupplier }        from './entities/campaign-supplier.entity';
import { CampaignSupplierProduct } from './entities/campaign-supplier-product.entity';

// ── URL normaliser ────────────────────────────────────────────
// Rewrites any old S3 direct URLs to the CloudFront CDN so images
// always load with CORS headers regardless of how they were stored.
const CF_CDN = 'https://d1campaign.votecapsule.yna.co.ke';
const S3_OLD_PATTERNS = [
  'https://s3.amazonaws.com/votecapsule-campaign-assets/',
  'https://votecapsule-campaign-assets.s3.amazonaws.com/',
  'https://votecapsule-campaign-assets.s3.us-east-1.amazonaws.com/',
];
function normaliseCdnUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  for (const pattern of S3_OLD_PATTERNS) {
    if (url.startsWith(pattern)) {
      return CF_CDN + '/' + url.slice(pattern.length);
    }
  }
  return url;
}
function normaliseProduct(p: CampaignSupplierProduct): CampaignSupplierProduct {
  (p as any).imageUrl = normaliseCdnUrl(p.imageUrl);
  return p;
}

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
    // Return tenant-specific suppliers first, then fall back to global (platform) suppliers.
    // Global suppliers are seeded with the YNA demo tenant ID (c3d4e5f6-a7b8-9012-cdef-123456789012)
    // and are visible to ALL tenants since Me Advertising is the platform-wide catalogue.
    const PLATFORM_TENANT_ID = 'c3d4e5f6-a7b8-9012-cdef-123456789012';
    const tenantIds = [tenantId];
    if (tenantId !== PLATFORM_TENANT_ID) {
      tenantIds.push(PLATFORM_TENANT_ID); // always include global suppliers
    }
    return this.repo
      .createQueryBuilder('s')
      .where('s.tenant_id = ANY(:ids)', { ids: tenantIds })
      .andWhere('s.is_active = true')
      .orderBy('s.company_name', 'ASC')
      .getMany();
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
    return { data: data.map(normaliseProduct), total };
  }

  async getProduct(id: string, supplierId: string): Promise<CampaignSupplierProduct> {
    const p = await this.productRepo.findOne({ where: { id, supplierId } });
    if (!p) throw new NotFoundException(`Product ${id} not found`);
    return normaliseProduct(p);
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
    return { data: data.map(normaliseProduct), total };
  }

  async compareByMaterialType(
    materialTypeId: string,
  ): Promise<CampaignSupplierProduct[]> {
    const products = await this.productRepo.find({
      where:    { materialTypeId, isAvailable: true },
      relations: ['supplier'],
      order:    { unitPrice: 'ASC' },
    });
    return products.map(normaliseProduct);
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
    return { data: data.map(normaliseProduct), total };
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
