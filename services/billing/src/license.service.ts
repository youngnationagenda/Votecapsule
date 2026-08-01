// ============================================================
// VoteCapsule — LicenseService
// Manages per-election and per-feature license keys
// ============================================================
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomBytes } from 'crypto';
import { License } from './entities';
import { CreateLicenseDto } from './dto';

@Injectable()
export class LicenseService {
  constructor(
    @InjectRepository(License)
    private readonly licenseRepo: Repository<License>,
  ) {}

  /** Create a new license with an auto-generated key */
  async create(dto: CreateLicenseDto): Promise<License> {
    const licenseKey = this.generateLicenseKey();

    const license = this.licenseRepo.create({
      tenantId: dto.tenantId,
      subscriptionId: dto.subscriptionId ?? null,
      licenseKey,
      licenseType: dto.licenseType,
      electionId: dto.electionId ?? null,
      featureCode: dto.featureCode ?? null,
      validFrom: new Date(dto.validFrom),
      validUntil: dto.validUntil ? new Date(dto.validUntil) : null,
      isActive: true,
      currentUsage: 0,
    });

    return this.licenseRepo.save(license);
  }

  /** Find all licenses for a tenant */
  async findByTenant(tenantId: string): Promise<License[]> {
    return this.licenseRepo.find({
      where: { tenantId },
      order: { createdAt: 'DESC' },
    });
  }

  /** Find a license by its unique key */
  async findByKey(licenseKey: string): Promise<License> {
    const license = await this.licenseRepo.findOne({ where: { licenseKey } });
    if (!license) throw new NotFoundException(`License key not found`);
    return license;
  }

  /** Validate a license key — checks active, within validity, under usage limit */
  async validate(licenseKey: string): Promise<{ valid: boolean; reason?: string; license?: License }> {
    const license = await this.licenseRepo.findOne({ where: { licenseKey } });

    if (!license) {
      return { valid: false, reason: 'License key not found' };
    }

    if (!license.isActive) {
      return { valid: false, reason: 'License is deactivated', license };
    }

    const now = new Date();
    if (now < license.validFrom) {
      return { valid: false, reason: 'License not yet valid', license };
    }

    if (license.validUntil && now > license.validUntil) {
      return { valid: false, reason: 'License has expired', license };
    }

    if (license.maxUsage !== null && license.currentUsage >= license.maxUsage) {
      return { valid: false, reason: 'Usage limit exceeded', license };
    }

    return { valid: true, license };
  }

  /** Increment usage counter for a license */
  async incrementUsage(id: string): Promise<License> {
    const license = await this.findById(id);

    if (license.maxUsage !== null && license.currentUsage >= license.maxUsage) {
      throw new BadRequestException('License usage limit reached');
    }

    license.currentUsage += 1;
    return this.licenseRepo.save(license);
  }

  /** Deactivate a license */
  async deactivate(id: string): Promise<License> {
    const license = await this.findById(id);
    license.isActive = false;
    return this.licenseRepo.save(license);
  }

  /** Generate a 32-character hex license key */
  generateLicenseKey(): string {
    return randomBytes(16).toString('hex');
  }

  // ----- Private helpers -----

  private async findById(id: string): Promise<License> {
    const license = await this.licenseRepo.findOne({ where: { id } });
    if (!license) throw new NotFoundException(`License ${id} not found`);
    return license;
  }
}
