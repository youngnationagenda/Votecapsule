// ============================================================
// VoteCapsule — Workflow Engine Controller
// services/workflow/src/workflow.controller.ts
//
// BASE: /api/v1/workflow
//
// POST   /workflow/start                         — start any workflow
// GET    /workflow/executions/:id                — execution details
// GET    /workflow/executions/capsule/:capsuleId — by capsule ID
// GET    /workflow/executions/running            — all running workflows
// GET    /workflow/stats                         — aggregate counts
// POST   /workflow/events/step                   — step callback (EventBridge)
// POST   /workflow/escalations                   — create escalation
// PATCH  /workflow/escalations/:id/resolve       — resolve escalation
// POST   /workflow/sla-check                     — trigger SLA deadline scan
// POST   /workflow/sync/:executionId             — sync from Step Functions
// ============================================================
import {
  Controller, Post, Get, Patch,
  Param, Body, Query, Headers,
  ParseUUIDPipe, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { WorkflowService }       from './workflow.service';
import { StartWorkflowDto }      from './dto/start-workflow.dto';
import { StepCallbackDto }       from './dto/step-callback.dto';
import { EscalationDto, ResolveEscalationDto } from './dto/escalation.dto';
import { WorkflowType }          from './entities/workflow-execution.entity';

@ApiTags('workflow')
@Controller()
export class WorkflowController {
  constructor(private readonly workflowService: WorkflowService) {}

  /**
   * POST /workflow/start
   * Start any workflow type. Idempotent for EVIDENCE_CAPSULE.
   */
  @Post('start')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Start a new workflow execution' })
  @ApiResponse({ status: 202, description: 'Workflow started (returns executionId + status)' })
  async startWorkflow(@Body() dto: StartWorkflowDto) {
    const execution = await this.workflowService.startWorkflow(dto);
    return {
      executionId:  execution.id,
      status:       execution.status,
      workflowType: execution.workflowType,
      executionArn: execution.executionArn,
      deadlineAt:   execution.deadlineAt,
    };
  }

  /**
   * GET /workflow/executions/:id
   * Full execution details with steps and escalations.
   */
  @Get('executions/:id')
  @ApiOperation({ summary: 'Get workflow execution details with step history' })
  async getExecution(@Param('id', ParseUUIDPipe) id: string) {
    return this.workflowService.getExecution(id);
  }

  /**
   * GET /workflow/executions/capsule/:capsuleId
   * Evidence Capsule workflow by capsule ID.
   */
  @Get('executions/capsule/:capsuleId')
  @ApiOperation({ summary: 'Get workflow execution for an Evidence Capsule' })
  async getExecutionByCapsule(
    @Param('capsuleId', ParseUUIDPipe) capsuleId: string,
  ) {
    return this.workflowService.getExecutionByCapsule(capsuleId);
  }

  /**
   * GET /workflow/executions/running
   * All currently RUNNING workflows. Optional: ?workflowType=EVIDENCE_CAPSULE
   */
  @Get('executions/running')
  @ApiOperation({ summary: 'List all running workflow executions' })
  async listRunning(@Query('workflowType') workflowType?: WorkflowType) {
    return this.workflowService.listRunning(workflowType);
  }

  /**
   * GET /workflow/stats
   * Aggregate counts by type + status + overdue count.
   * Used by Admin Portal Dashboard.
   */
  @Get('stats')
  @ApiOperation({ summary: 'Aggregate workflow counts by type and status' })
  async getStats() {
    return this.workflowService.getStats();
  }

  /**
   * POST /workflow/events/step
   * Step Functions → EventBridge → this endpoint.
   * Records a state transition event.
   */
  @Post('events/step')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Record a Step Functions state transition (EventBridge callback)' })
  async recordStepEvent(@Body() dto: StepCallbackDto): Promise<void> {
    await this.workflowService.recordStepEvent(dto);
  }

  /**
   * POST /workflow/escalations
   * Create an escalation (also called by Step Functions error states via EventBridge).
   */
  @Post('escalations')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a workflow escalation' })
  async createEscalation(@Body() dto: EscalationDto) {
    return this.workflowService.createEscalation(dto);
  }

  /**
   * PATCH /workflow/escalations/:id/resolve
   * Supervisor resolves an escalation.
   * Requires X-Resolver-User-Id header.
   */
  @Patch('escalations/:id/resolve')
  @ApiOperation({ summary: 'Resolve an escalation (supervisor action)' })
  async resolveEscalation(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('x-resolver-user-id') resolverId: string,
    @Body() dto: ResolveEscalationDto,
  ) {
    return this.workflowService.resolveEscalation(id, resolverId, dto.notes);
  }

  /**
   * POST /workflow/sla-check
   * Called by EventBridge Scheduler every 15 minutes.
   * Scans for overdue workflows and creates escalations.
   */
  @Post('sla-check')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Run SLA deadline check (EventBridge Scheduler, every 15 min)' })
  async slaCheck() {
    const escalated = await this.workflowService.checkSlaDeadlines();
    return { escalated, checkedAt: new Date().toISOString() };
  }

  /**
   * POST /workflow/sync/:executionId
   * Polls Step Functions for current execution status.
   * Use for debugging — normal flow uses EventBridge callbacks.
   */
  @Post('sync/:executionId')
  @ApiOperation({ summary: 'Sync execution status from Step Functions (debug use)' })
  async syncExecution(@Param('executionId', ParseUUIDPipe) executionId: string) {
    return this.workflowService.syncFromStepFunctions(executionId);
  }
}
