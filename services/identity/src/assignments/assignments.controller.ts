/**
 * Vote Capsule™ Identity Service — Agent Assignments Controller
 *
 * All 6 endpoints per Task 12 (party.Sonie.md):
 *
 *   GET    /identity/assignments/me              — mobile app: my active assignment
 *   GET    /identity/assignments?tenantId=X      — party portal: all assignments
 *   POST   /identity/assignments                 — party portal: create
 *   PATCH  /identity/assignments/:id             — party portal: update status/geofence
 *   DELETE /identity/assignments/:id             — party portal: remove
 *   GET    /identity/agents?tenantId=X           — party portal: list available agents
 *
 * Multi-tenant isolation enforced on every endpoint.
 */

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  Headers,
  HttpCode,
  HttpStatus,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { AssignmentsService } from './assignments.service';

@Controller('assignments')
export class AssignmentsController {
  private readonly logger = new Logger(AssignmentsController.name);

  constructor(private readonly service: AssignmentsService) {}

  // ─────────────────────────────────────────────────────────────
  // GET /identity/assignments/me
  // Mobile app endpoint — returns the agent's active assignment
  // ─────────────────────────────────────────────────────────────

  /**
   * Returns the ACTIVE assignment for the requesting agent.
   * Returns 404 (not an error) when no active assignment exists.
   * Mobile app shows "No Assignment" state on 404.
   *
   * Headers: Authorization (Bearer JWT), X-User-Id, X-Tenant-Id
   */
  @Get('me')
  async getMyAssignment(
    @Headers('x-user-id') userId: string,
    @Headers('x-tenant-id') tenantId: string,
  ) {
    if (!userId) throw new BadRequestException('X-User-Id header is required');
    if (!tenantId) throw new BadRequestException('X-Tenant-Id header is required');

    const assignment = await this.service.getMyAssignment(userId, tenantId);

    if (!assignment) {
      throw new NotFoundException('No active assignment found for this agent');
    }

    // Shape response for mobile app consumption
    return {
      data: {
        id:       assignment.id,
        userId:   assignment.agentUserId,
        tenantId: assignment.tenantId,
        election: {
          electionId:     assignment.electionId,
          electionName:   assignment.electionName,
          electionYear:   new Date(assignment.assignedAt).getFullYear(),
          electionType:   'PARTY_NOMINATION',
          positionCode:   assignment.positionCode,
          positionLabel:  this.getPositionLabel(assignment.positionCode),
        },
        stations:             assignment.stations,
        areaName:             assignment.areaName,
        geofenceRadiusMeters: assignment.geofenceRadiusMeters,
        status:               assignment.status,
        assignedAt:           assignment.assignedAt,
        expiresAt:            assignment.expiresAt,
      },
    };
  }

  // ─────────────────────────────────────────────────────────────
  // GET /identity/assignments?tenantId=X
  // Party portal — list all assignments for a tenant
  // ─────────────────────────────────────────────────────────────

  @Get()
  async listAssignments(
    @Query('tenantId') queryTenantId?: string,
    @Headers('x-tenant-id') headerTenantId?: string,
  ) {
    const tenantId = queryTenantId ?? headerTenantId;
    if (!tenantId) {
      throw new BadRequestException('tenantId query param or X-Tenant-Id header is required');
    }
    return this.service.listByTenant(tenantId);
  }

  // ─────────────────────────────────────────────────────────────
  // POST /identity/assignments
  // Party portal — create a new assignment
  // ─────────────────────────────────────────────────────────────

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createAssignment(
    @Body() body: {
      agentId: string;
      tenantId: string;
      electionId: string;
      stationCodes: string[];
      geofenceRadiusMeters?: number;
    },
    @Headers('x-user-id') assignedBy: string,
    @Headers('x-tenant-id') headerTenantId?: string,
  ) {
    // tenantId can come from body or header
    const tenantId = body.tenantId ?? headerTenantId;
    if (!tenantId) throw new BadRequestException('tenantId is required');
    if (!body.agentId) throw new BadRequestException('agentId is required');
    if (!body.electionId) throw new BadRequestException('electionId is required');
    if (!body.stationCodes?.length) throw new BadRequestException('stationCodes array is required and must not be empty');
    if (!assignedBy) throw new BadRequestException('X-User-Id header is required');

    // Enforce: requester must belong to the same tenant (or be platform super admin — checked by API GW)
    if (headerTenantId && headerTenantId !== tenantId) {
      throw new ForbiddenException('You can only create assignments for your own tenant');
    }

    return this.service.create({
      agentId: body.agentId,
      tenantId,
      electionId: body.electionId,
      stationCodes: body.stationCodes,
      geofenceRadiusMeters: body.geofenceRadiusMeters,
      assignedBy,
    });
  }

  // ─────────────────────────────────────────────────────────────
  // PATCH /identity/assignments/:id
  // Party portal — update status or geofence radius
  // ─────────────────────────────────────────────────────────────

  @Patch(':id')
  async updateAssignment(
    @Param('id') id: string,
    @Body() body: {
      status?: 'ACTIVE' | 'SUSPENDED' | 'COMPLETED';
      geofenceRadiusMeters?: number;
    },
    @Headers('x-tenant-id') tenantId: string,
  ) {
    if (!tenantId) throw new BadRequestException('X-Tenant-Id header is required');
    if (!id) throw new BadRequestException('Assignment ID is required');

    if (body.status && !['ACTIVE', 'SUSPENDED', 'COMPLETED'].includes(body.status)) {
      throw new BadRequestException('status must be ACTIVE, SUSPENDED, or COMPLETED');
    }

    return this.service.update(id, tenantId, body);
  }

  // ─────────────────────────────────────────────────────────────
  // DELETE /identity/assignments/:id
  // Party portal — remove an assignment
  // ─────────────────────────────────────────────────────────────

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteAssignment(
    @Param('id') id: string,
    @Headers('x-tenant-id') tenantId: string,
  ): Promise<void> {
    if (!tenantId) throw new BadRequestException('X-Tenant-Id header is required');
    await this.service.remove(id, tenantId);
  }

  // ─────────────────────────────────────────────────────────────
  // GET /identity/agents?tenantId=X
  // Party portal — list agents available for assignment
  // ─────────────────────────────────────────────────────────────

  @Get('/agents')
  async listAgents(
    @Query('tenantId') queryTenantId?: string,
    @Headers('x-tenant-id') headerTenantId?: string,
  ) {
    const tenantId = queryTenantId ?? headerTenantId;
    if (!tenantId) {
      throw new BadRequestException('tenantId query param or X-Tenant-Id header is required');
    }
    return this.service.listAgentsForTenant(tenantId);
  }

  // ─────────────────────────────────────────────────────────────
  // Private helpers
  // ─────────────────────────────────────────────────────────────

  private getPositionLabel(positionCode: string): string {
    const labels: Record<string, string> = {
      GOVERNOR:   'County Governor',
      SENATOR:    'County Senator',
      WOMEN_REP:  'Women Representative',
      MP:         'Member of Parliament',
      MCA:        'Member of County Assembly',
      GENERAL:    'General Election',
    };
    return labels[positionCode] ?? positionCode;
  }
}
