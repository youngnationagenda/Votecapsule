// ============================================================
// VoteCapsule — Security Event Controller
// services/audit/src/security-event.controller.ts
//
// REST endpoints for security event management.
// ============================================================
import {
  Controller, Get, Post, Patch, Param, Body, Query,
  ParseUUIDPipe, HttpCode, HttpStatus, Logger,
} from '@nestjs/common';
import { SecurityEventService } from './security-event.service';
import { CreateSecurityEventDto } from './dto/create-security-event.dto';
import { QuerySecurityEventsDto } from './dto/query-security-events.dto';

@Controller('security')
export class SecurityEventController {
  private readonly logger = new Logger(SecurityEventController.name);

  constructor(private readonly securityEventService: SecurityEventService) {}

  // ── POST /security/events — Create security event ───────────

  @Post('events')
  @HttpCode(HttpStatus.CREATED)
  async createEvent(@Body() dto: CreateSecurityEventDto) {
    return this.securityEventService.createEvent(dto);
  }

  // ── GET /security/events — Query with filters ───────────────

  @Get('events')
  async findEvents(@Query() query: QuerySecurityEventsDto) {
    return this.securityEventService.findEvents(query);
  }

  // ── GET /security/events/unresolved/count — Unresolved count ─

  @Get('events/unresolved/count')
  async getUnresolvedCount(@Query('tenantId') tenantId?: string) {
    return this.securityEventService.getUnresolvedCount(tenantId);
  }

  // ── GET /security/events/:id — Get single event ─────────────

  @Get('events/:id')
  async getEventById(@Param('id', ParseUUIDPipe) id: string) {
    return this.securityEventService.getEventById(id);
  }

  // ── PATCH /security/events/:id/resolve — Mark resolved ──────

  @Patch('events/:id/resolve')
  async resolveEvent(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('resolvedBy', ParseUUIDPipe) resolvedBy: string,
    @Body('notes') notes?: string,
  ) {
    return this.securityEventService.resolveEvent(id, resolvedBy, notes);
  }

  // ── GET /health — Health check ──────────────────────────────

  @Get('/health')
  health() {
    return {
      status: 'ok',
      service: 'audit-security',
      timestamp: new Date().toISOString(),
    };
  }
}
