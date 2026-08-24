// ============================================================
// VoteCapsule™ — Campaign Logistics Service
// Vehicles, trips, equipment, equipment logs
// ============================================================
import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, FindOptionsWhere, Between } from 'typeorm';
import { CampaignVehicle }      from './entities/campaign-vehicle.entity';
import { CampaignVehicleTrip }  from './entities/campaign-vehicle-trip.entity';
import { CampaignEquipment }    from './entities/campaign-equipment.entity';
import { CampaignEquipmentLog } from './entities/campaign-equipment-log.entity';

@Injectable()
export class LogisticsService {
  private readonly logger = new Logger(LogisticsService.name);

  constructor(
    @InjectRepository(CampaignVehicle)     private readonly vehicleRepo:   Repository<CampaignVehicle>,
    @InjectRepository(CampaignVehicleTrip) private readonly tripRepo:      Repository<CampaignVehicleTrip>,
    @InjectRepository(CampaignEquipment)   private readonly equipRepo:     Repository<CampaignEquipment>,
    @InjectRepository(CampaignEquipmentLog) private readonly equipLogRepo: Repository<CampaignEquipmentLog>,
    private readonly dataSource: DataSource,
  ) {}

  // ── Vehicles ──────────────────────────────────────────────────

  async addVehicle(
    campaignId: string,
    dto: any,
    tenantId: string,
    userId: string,
  ): Promise<CampaignVehicle> {
    const entity = this.vehicleRepo.create({ ...dto, campaignId, tenantId, createdBy: userId });
    const saved  = await this.vehicleRepo.save(entity) as unknown as CampaignVehicle;
    this.logger.log(`Vehicle added: ${saved.registration} to campaign ${campaignId}`);
    return saved;
  }

  async listVehicles(
    campaignId: string,
    tenantId: string,
    status?: string,
  ): Promise<CampaignVehicle[]> {
    const where: FindOptionsWhere<CampaignVehicle> = { campaignId, tenantId };
    if (status) where.status = status;
    return this.vehicleRepo.find({ where, order: { createdAt: 'DESC' } });
  }

  async findVehicle(id: string, campaignId: string, tenantId: string): Promise<CampaignVehicle> {
    const v = await this.vehicleRepo.findOne({ where: { id, campaignId, tenantId } });
    if (!v) throw new NotFoundException(`Vehicle ${id} not found`);
    return v;
  }

  async updateVehicleStatus(
    id: string,
    campaignId: string,
    dto: { status: string; lat?: number; lng?: number },
    tenantId: string,
  ): Promise<CampaignVehicle> {
    const v = await this.findVehicle(id, campaignId, tenantId);
    v.status = dto.status;
    if (dto.lat !== undefined) {
      v.currentLat        = dto.lat;
      v.currentLng        = dto.lng ?? null;
      v.lastLocationUpdate = new Date();
    }
    return this.vehicleRepo.save(v);
  }

  // ── Trips ─────────────────────────────────────────────────────

  async recordTrip(
    vehicleId: string,
    campaignId: string,
    dto: any,
    tenantId: string,
    userId: string,
  ): Promise<CampaignVehicleTrip> {
    const vehicle = await this.findVehicle(vehicleId, campaignId, tenantId);
    const trip = this.tripRepo.create({
      ...dto,
      vehicleId: vehicle.id,
      campaignId,
      tenantId,
      createdBy: userId,
    });
    return this.tripRepo.save(trip) as unknown as Promise<CampaignVehicleTrip>;
  }

  async listTrips(vehicleId: string, campaignId: string, tenantId: string): Promise<CampaignVehicleTrip[]> {
    return this.tripRepo.find({
      where: { vehicleId, campaignId, tenantId },
      order: { createdAt: 'DESC' },
    });
  }

  // ── Equipment ─────────────────────────────────────────────────

  async addEquipment(
    campaignId: string,
    dto: any,
    tenantId: string,
    userId: string,
  ): Promise<CampaignEquipment> {
    const entity = this.equipRepo.create({ ...dto, campaignId, tenantId, createdBy: userId });
    const saved  = await this.equipRepo.save(entity) as unknown as CampaignEquipment;
    this.logger.log(`Equipment added: ${saved.name} to campaign ${campaignId}`);
    return saved;
  }

  async listEquipment(
    campaignId: string,
    tenantId: string,
    filters?: { status?: string; type?: string },
  ): Promise<CampaignEquipment[]> {
    const qb = this.equipRepo.createQueryBuilder('e')
      .where('e.campaign_id = :campaignId', { campaignId })
      .andWhere('e.tenant_id = :tenantId', { tenantId });
    if (filters?.status) qb.andWhere('e.status = :status', { status: filters.status });
    if (filters?.type)   qb.andWhere('e.equipment_type = :type', { type: filters.type });
    return qb.orderBy('e.name', 'ASC').getMany();
  }

  async findEquipment(id: string, campaignId: string, tenantId: string): Promise<CampaignEquipment> {
    const e = await this.equipRepo.findOne({ where: { id, campaignId, tenantId } });
    if (!e) throw new NotFoundException(`Equipment ${id} not found`);
    return e;
  }

  async updateEquipmentStatus(
    id: string,
    campaignId: string,
    dto: { status: string; notes?: string; eventId?: string; evidenceMediaId?: string },
    tenantId: string,
    userId: string,
  ): Promise<CampaignEquipment> {
    // Always write log in same transaction
    return this.dataSource.transaction(async (manager) => {
      const equip = await manager.findOne(CampaignEquipment, { where: { id, campaignId, tenantId } });
      if (!equip) throw new NotFoundException(`Equipment ${id} not found`);

      const log = manager.create(CampaignEquipmentLog, {
        equipmentId:     equip.id,
        campaignId,
        tenantId,
        previousStatus:  equip.status,
        newStatus:       dto.status,
        changedBy:       userId,
        eventId:         dto.eventId         ?? null,
        evidenceMediaId: dto.evidenceMediaId  ?? null,
        notes:           dto.notes           ?? null,
      });
      await manager.save(CampaignEquipmentLog, log);

      equip.status = dto.status;
      if (dto.eventId) equip.assignedEventId = dto.eventId;
      return manager.save(CampaignEquipment, equip);
    });
  }

  /**
   * Returns equipment available for a given date window
   * Equipment must be status='available' and not have any trip/event reservations in range
   */
  async getAvailableEquipment(
    campaignId: string,
    tenantId: string,
    startDate: string,
    endDate: string,
  ): Promise<CampaignEquipment[]> {
    // Simplified: return all equipment with status='available'
    // Full reservation overlap check would require a reservations table
    return this.equipRepo.find({
      where: { campaignId, tenantId, status: 'available' },
      order: { name: 'ASC' },
    });
  }
}
