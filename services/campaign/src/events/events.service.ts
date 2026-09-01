// ============================================================
// VoteCapsule™ — Campaign Events Service
// ============================================================
import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, FindOptionsWhere } from 'typeorm';
import { CampaignEvent, EventStatus } from './entities/campaign-event.entity';
import { CampaignEventCapsule }       from './entities/campaign-event-capsule.entity';
import { CreateEventDto }             from './dto/create-event.dto';
import { SubmitCapsuleDto }           from './dto/submit-capsule.dto';

const GPS_FLAG_METRES = 500;

/** Haversine distance in metres between two lat/lng points */
function haversineMetres(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6_371_000;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);

  constructor(
    @InjectRepository(CampaignEvent)
    private readonly eventRepo: Repository<CampaignEvent>,
    @InjectRepository(CampaignEventCapsule)
    private readonly capsuleRepo: Repository<CampaignEventCapsule>,
  ) {}

  async create(campaignId: string, dto: CreateEventDto, tenantId: string, userId: string): Promise<CampaignEvent> {
    // Validate that the campaign exists before attempting insert —
    // prevents FK violation 500 error when campaignId is invalid
    const exists = await this.eventRepo.manager.findOne(
      require('../campaign/entities/campaign.entity').Campaign,
      { where: { id: campaignId, tenantId } },
    ).catch(() => null);
    if (!exists) {
      throw new NotFoundException(`Campaign ${campaignId} not found — cannot create event`);
    }

    const entity = this.eventRepo.create({
      ...dto,
      campaignId,
      tenantId,
      createdBy: userId,
      startTime: new Date(dto.startTime),
      endTime:   new Date(dto.endTime),
    });
    const saved = await this.eventRepo.save(entity);
    this.logger.log(`Event created: ${saved.id} for campaign ${campaignId}`);
    return saved;
  }

  async findAll(
    campaignId: string,
    tenantId: string,
    filters?: { wardCode?: string; eventType?: string; start?: string; end?: string },
    scope?: { wardCode?: string; constituencyCode?: string; candidateId?: string },
  ): Promise<CampaignEvent[]> {
    const qb = this.eventRepo.createQueryBuilder('e')
      .where('e.campaign_id = :campaignId', { campaignId })
      .andWhere('e.tenant_id = :tenantId', { tenantId });

    // Apply geography scope (WARD_COORDINATOR, CONSTITUENCY_COORDINATOR)
    if (scope?.wardCode)         qb.andWhere('e.ward_code = :scopeWard',   { scopeWard: scope.wardCode });
    if (scope?.constituencyCode) qb.andWhere('e.constituency_code = :scopeCons', { scopeCons: scope.constituencyCode });

    // Apply query filters
    if (filters?.wardCode)  qb.andWhere('e.ward_code = :ward',    { ward: filters.wardCode });
    if (filters?.eventType) qb.andWhere('e.event_type = :type',   { type: filters.eventType });
    if (filters?.start)     qb.andWhere('e.start_time >= :start', { start: new Date(filters.start) });
    if (filters?.end)       qb.andWhere('e.start_time <= :end',   { end: new Date(filters.end) });

    return qb.orderBy('e.start_time', 'ASC').getMany();
  }

  async findOne(id: string, campaignId: string, tenantId: string): Promise<CampaignEvent> {
    const ev = await this.eventRepo.findOne({ where: { id, campaignId, tenantId }, relations: ['capsules'] });
    if (!ev) throw new NotFoundException(`Event ${id} not found`);
    return ev;
  }

  async update(id: string, campaignId: string, dto: Partial<CreateEventDto>, tenantId: string): Promise<CampaignEvent> {
    const ev = await this.findOne(id, campaignId, tenantId);
    Object.assign(ev, dto);
    if (dto.startTime) ev.startTime = new Date(dto.startTime);
    if (dto.endTime)   ev.endTime   = new Date(dto.endTime);
    return this.eventRepo.save(ev);
  }

  async cancel(id: string, campaignId: string, tenantId: string): Promise<CampaignEvent> {
    const ev = await this.findOne(id, campaignId, tenantId);
    ev.status = EventStatus.CANCELLED;
    return this.eventRepo.save(ev);
  }

  async getCalendarView(
    campaignId: string,
    tenantId: string,
    start: string,
    end: string,
    wardCode?: string,
  ): Promise<Record<string, CampaignEvent[]>> {
    const events = await this.findAll(campaignId, tenantId, { start, end, wardCode });
    // Group by date (YYYY-MM-DD)
    const grouped: Record<string, CampaignEvent[]> = {};
    for (const ev of events) {
      const key = ev.startTime.toISOString().slice(0, 10);
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(ev);
    }
    return grouped;
  }

  async detectConflicts(
    campaignId: string,
    tenantId: string,
    startTime: string,
    endTime: string,
    excludeEventId?: string,
  ): Promise<CampaignEvent[]> {
    const qb = this.eventRepo.createQueryBuilder('e')
      .where('e.campaign_id = :campaignId', { campaignId })
      .andWhere('e.tenant_id = :tenantId', { tenantId })
      .andWhere('e.status NOT IN (:...statuses)', { statuses: [EventStatus.CANCELLED] })
      .andWhere('e.start_time < :endTime', { endTime: new Date(endTime) })
      .andWhere('e.end_time > :startTime', { startTime: new Date(startTime) });

    if (excludeEventId) qb.andWhere('e.id != :excludeId', { excludeId: excludeEventId });
    return qb.getMany();
  }

  async submitCapsule(
    eventId: string,
    campaignId: string,
    dto: SubmitCapsuleDto,
    tenantId: string,
    userId: string,
  ): Promise<CampaignEventCapsule> {
    const ev = await this.findOne(eventId, campaignId, tenantId);

    let gpsDistanceMetres: number | null = null;
    let gpsVerified = false;
    let gpsFlag = false;

    if (dto.submissionLat && dto.submissionLng && ev.lat && ev.lng) {
      gpsDistanceMetres = Math.round(haversineMetres(dto.submissionLat, dto.submissionLng, Number(ev.lat), Number(ev.lng)));
      gpsVerified = gpsDistanceMetres <= GPS_FLAG_METRES;
      gpsFlag     = gpsDistanceMetres > GPS_FLAG_METRES;
    }

    const capsule = this.capsuleRepo.create({
      eventId,
      campaignId,
      tenantId,
      submittedBy:         userId,
      submissionLat:       dto.submissionLat ?? null,
      submissionLng:       dto.submissionLng ?? null,
      gpsDistanceMetres,
      gpsVerified,
      gpsFlag,
      attendanceCount:      dto.attendanceCount ?? 0,
      attendanceNotes:      dto.attendanceNotes ?? null,
      expenditureBreakdown: dto.expenditureBreakdown ?? {},
      totalExpenditure:     dto.totalExpenditure ?? 0,
      materialsUsed:        dto.materialsUsed ?? [],
      photoMediaIds:        dto.photoMediaIds ?? [],
      videoMediaIds:        dto.videoMediaIds ?? [],
    });

    const saved = await this.capsuleRepo.save(capsule);

    // Mark event as completed
    ev.status = EventStatus.COMPLETED;
    if (dto.attendanceCount) ev.actualAttendance = dto.attendanceCount;
    await this.eventRepo.save(ev);

    return saved;
  }
}
