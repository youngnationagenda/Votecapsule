// ============================================================
// VoteCapsule — Audit Service — Security Event Logic
// services/audit/src/security-event.service.ts
// ============================================================
import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { SecurityEvent } from './entities/security-event.entity';
import { CreateSecurityEventDto } from './dto/create-security-event.dto';
import { QuerySecurityEventsDto } from './dto/query-security-events.dto';
import { PaginatedResponse } from './audit.service';

@Injectable()
export class SecurityEventService {
  private readonly logger = new Logger(SecurityEventService.name);

  constructor(
    @InjectRepository(SecurityEvent)
    private readonly securityEventRepo: Repository<SecurityEvent>,
  ) {}

  // ── Create Security Event ─────────────────────────────────────

  async createEvent(dto: CreateSecurityEventDto): Promise<SecurityEvent> {
    const event = this.securityEventRepo.create(dto);
    const saved = await this.securityEventRepo.save(event);
    this.logger.log(
      `Security event created: ${saved.id} [${saved.eventType}] severity=${saved.severity}`,
    );
    return saved;
  }

  // ── Query Security Events (paginated, filtered) ───────────────

  async findEvents(query: QuerySecurityEventsDto): Promise<PaginatedResponse<SecurityEvent>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const qb = this.securityEventRepo.createQueryBuilder('event');

    if (query.tenantId) {
      qb.andWhere('event.tenant_id = :tenantId', { tenantId: query.tenantId });
    }
    if (query.userId) {
      qb.andWhere('event.user_id = :userId', { userId: query.userId });
    }
    if (query.eventType) {
      qb.andWhere('event.event_type = :eventType', { eventType: query.eventType });
    }
    if (query.severity) {
      qb.andWhere('event.severity = :severity', { severity: query.severity });
    }
    if (query.category) {
      qb.andWhere('event.category = :category', { category: query.category });
    }
    if (query.resolved !== undefined) {
      qb.andWhere('event.resolved = :resolved', { resolved: query.resolved });
    }
    if (query.dateFrom) {
      qb.andWhere('event.created_at >= :dateFrom', { dateFrom: query.dateFrom });
    }
    if (query.dateTo) {
      qb.andWhere('event.created_at <= :dateTo', { dateTo: query.dateTo });
    }

    qb.orderBy('event.created_at', 'DESC')
      .skip(skip)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();

    return { data, total, page, limit };
  }

  // ── Get Single Event ──────────────────────────────────────────

  async getEventById(id: string): Promise<SecurityEvent> {
    const event = await this.securityEventRepo.findOne({ where: { id } });
    if (!event) {
      throw new NotFoundException(`Security event ${id} not found`);
    }
    return event;
  }

  // ── Resolve Event ─────────────────────────────────────────────

  async resolveEvent(
    id: string,
    resolvedBy: string,
    notes?: string,
  ): Promise<SecurityEvent> {
    const event = await this.getEventById(id);

    event.resolved = true;
    event.resolvedAt = new Date();
    event.resolvedBy = resolvedBy;
    if (notes) {
      event.resolutionNotes = notes;
    }

    const saved = await this.securityEventRepo.save(event);
    this.logger.log(`Security event resolved: ${saved.id} by ${resolvedBy}`);
    return saved;
  }

  // ── Get Unresolved Count ──────────────────────────────────────

  async getUnresolvedCount(tenantId?: string): Promise<{ count: number }> {
    const where: FindOptionsWhere<SecurityEvent> = { resolved: false };
    if (tenantId) where.tenantId = tenantId;

    const count = await this.securityEventRepo.count({ where });
    return { count };
  }

  // ── Get Events by Severity ────────────────────────────────────

  async getEventsBySeverity(
    severity: string,
    dateRange?: { dateFrom?: string; dateTo?: string },
  ): Promise<SecurityEvent[]> {
    const qb = this.securityEventRepo
      .createQueryBuilder('event')
      .where('event.severity = :severity', { severity })
      .orderBy('event.created_at', 'DESC');

    if (dateRange?.dateFrom) {
      qb.andWhere('event.created_at >= :dateFrom', { dateFrom: dateRange.dateFrom });
    }
    if (dateRange?.dateTo) {
      qb.andWhere('event.created_at <= :dateTo', { dateTo: dateRange.dateTo });
    }

    return qb.getMany();
  }
}
