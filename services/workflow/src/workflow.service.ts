// ============================================================
// VoteCapsule — Workflow Engine Service
// services/workflow/src/workflow.service.ts
//
// Manages workflow execution lifecycle:
//   - Start Step Functions executions
//   - Record execution state in PostgreSQL (queryable index)
//   - Handle EventBridge callbacks (step events, failures)
//   - Escalation detection and notification dispatch
//   - SLA deadline monitoring (called by EventBridge Scheduler every 15 min)
// ============================================================
import {
  Injectable, Logger, NotFoundException, ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, LessThan } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import {
  SFNClient,
  StartExecutionCommand,
  DescribeExecutionCommand,
  ExecutionStatus,
} from '@aws-sdk/client-sfn';
import {
  EventBridgeClient,
  PutEventsCommand,
} from '@aws-sdk/client-eventbridge';

import {
  WorkflowExecution,
  WorkflowType,
  WorkflowStatus,
} from './entities/workflow-execution.entity';
import { WorkflowStepEvent, StepEventType } from './entities/workflow-step-event.entity';
import {
  WorkflowEscalation,
  EscalationType,
  EscalationSeverity,
} from './entities/workflow-escalation.entity';
import { StartWorkflowDto }  from './dto/start-workflow.dto';
import { StepCallbackDto }   from './dto/step-callback.dto';
import { EscalationDto }     from './dto/escalation.dto';

/** Default SLA deadlines per workflow type (milliseconds) */
const SLA_DEADLINES_MS: Record<WorkflowType, number | null> = {
  [WorkflowType.EVIDENCE_CAPSULE]:    6 * 60 * 60 * 1000,  // 6 hours
  [WorkflowType.TENANT_PROVISIONING]: 30 * 60 * 1000,       // 30 minutes
  [WorkflowType.USER_ONBOARDING]:     60 * 60 * 1000,       // 1 hour
  [WorkflowType.RESULTS_PUBLICATION]: 4 * 60 * 60 * 1000,  // 4 hours
  [WorkflowType.RECOVERY]:            2 * 60 * 60 * 1000,  // 2 hours
  [WorkflowType.ESCALATION]:          1 * 60 * 60 * 1000,  // 1 hour
  [WorkflowType.ASSIGNMENT]:          null,                  // no deadline
};

@Injectable()
export class WorkflowService {
  private readonly logger  = new Logger(WorkflowService.name);
  private readonly sfn:    SFNClient;
  private readonly events: EventBridgeClient;

  private readonly stateMachineArns: Record<WorkflowType, string | undefined>;
  private readonly eventBusName: string;

  constructor(
    @InjectRepository(WorkflowExecution)
    private readonly execRepo: Repository<WorkflowExecution>,

    @InjectRepository(WorkflowStepEvent)
    private readonly stepRepo: Repository<WorkflowStepEvent>,

    @InjectRepository(WorkflowEscalation)
    private readonly escalRepo: Repository<WorkflowEscalation>,

    private readonly dataSource: DataSource,
    private readonly config: ConfigService,
  ) {
    const region = config.get<string>('AWS_REGION', 'us-east-1');
    this.sfn     = new SFNClient({ region });
    this.events  = new EventBridgeClient({ region });

    this.eventBusName = config.get<string>('EVENT_BUS_NAME', 'votecapsule-events');

    // State machine ARNs — configured after CDK deploy
    this.stateMachineArns = {
      [WorkflowType.EVIDENCE_CAPSULE]:    config.get<string>('SFN_EVIDENCE_CAPSULE_ARN'),
      [WorkflowType.TENANT_PROVISIONING]: config.get<string>('SFN_TENANT_PROVISIONING_ARN'),
      [WorkflowType.USER_ONBOARDING]:     config.get<string>('SFN_USER_ONBOARDING_ARN'),
      [WorkflowType.RESULTS_PUBLICATION]: config.get<string>('SFN_RESULTS_PUBLICATION_ARN'),
      [WorkflowType.RECOVERY]:            config.get<string>('SFN_RECOVERY_ARN'),
      [WorkflowType.ESCALATION]:          config.get<string>('SFN_ESCALATION_ARN'),
      [WorkflowType.ASSIGNMENT]:          config.get<string>('SFN_ASSIGNMENT_ARN'),
    };
  }

  // ── Start ─────────────────────────────────────────────────

  /**
   * Starts a new workflow execution.
   * Idempotent for EVIDENCE_CAPSULE — one active workflow per capsule.
   */
  async startWorkflow(dto: StartWorkflowDto): Promise<WorkflowExecution> {
    // Idempotency check for evidence capsules
    if (dto.workflowType === WorkflowType.EVIDENCE_CAPSULE && dto.capsuleId) {
      const existing = await this.execRepo.findOne({
        where: {
          workflowType: WorkflowType.EVIDENCE_CAPSULE,
          capsuleId:    dto.capsuleId,
          status:       WorkflowStatus.RUNNING,
        },
      });
      if (existing) {
        this.logger.warn(`Workflow already running for capsule ${dto.capsuleId}: ${existing.id}`);
        return existing;
      }
    }

    const stateMachineArn = this.stateMachineArns[dto.workflowType];
    const deadlineMs = SLA_DEADLINES_MS[dto.workflowType];
    const now = new Date();

    // Create DB record first
    const execution = await this.execRepo.save(
      this.execRepo.create({
        workflowType:     dto.workflowType,
        tenantId:         dto.tenantId ?? null,
        capsuleId:        dto.capsuleId ?? null,
        electionId:       dto.electionId ?? null,
        initiatorUserId:  dto.initiatorUserId ?? null,
        initiatorService: dto.initiatorService ?? null,
        status:           WorkflowStatus.RUNNING,
        startedAt:        now,
        deadlineAt:       deadlineMs ? new Date(now.getTime() + deadlineMs) : null,
        inputPayload:     dto.payload ?? null,
        stateMachineArn:  stateMachineArn ?? null,
      }),
    );

    // Start Step Functions execution (if ARN is configured)
    if (stateMachineArn) {
      try {
        const result = await this.sfn.send(
          new StartExecutionCommand({
            stateMachineArn,
            name:  `vc-${execution.id}`,
            input: JSON.stringify({
              workflowExecutionId: execution.id,
              ...dto.payload,
            }),
          }),
        );

        await this.execRepo.update(execution.id, {
          executionArn: result.executionArn,
          currentStep:  'STARTED',
        });
        execution.executionArn = result.executionArn ?? null;

        this.logger.log(
          `Started ${dto.workflowType} workflow ${execution.id}: ${result.executionArn ?? 'no-arn'}`,
        );
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.error(`Failed to start Step Functions for workflow ${execution.id}: ${msg}`);
        await this.execRepo.update(execution.id, {
          status:      WorkflowStatus.FAILED,
          lastError:   msg,
          completedAt: new Date(),
        });
        execution.status = WorkflowStatus.FAILED;
      }
    } else {
      this.logger.warn(
        `No SFN ARN configured for ${dto.workflowType} — tracking locally only (dev mode)`,
      );
    }

    // Emit EventBridge event
    await this.publishEvent('WORKFLOW_STARTED', {
      workflowId:   execution.id,
      workflowType: dto.workflowType,
      capsuleId:    dto.capsuleId,
      tenantId:     dto.tenantId,
    });

    return execution;
  }

  // ── Queries ───────────────────────────────────────────────

  async getExecution(executionId: string): Promise<WorkflowExecution> {
    const exec = await this.execRepo.findOne({
      where:     { id: executionId },
      relations: ['steps', 'escalations'],
    });
    if (!exec) throw new NotFoundException(`Workflow execution ${executionId} not found`);
    return exec;
  }

  async getExecutionByCapsule(capsuleId: string): Promise<WorkflowExecution | null> {
    return this.execRepo.findOne({
      where:     { capsuleId, workflowType: WorkflowType.EVIDENCE_CAPSULE },
      relations: ['steps', 'escalations'],
      order:     { createdAt: 'DESC' },
    });
  }

  async listRunning(workflowType?: WorkflowType): Promise<WorkflowExecution[]> {
    return this.execRepo.find({
      where: {
        status: WorkflowStatus.RUNNING,
        ...(workflowType ? { workflowType } : {}),
      },
      order: { startedAt: 'ASC' },
      take:  200,
    });
  }

  async getStats(): Promise<Record<string, unknown>> {
    const breakdown = await this.execRepo
      .createQueryBuilder('w')
      .select('w.workflowType', 'workflowType')
      .addSelect('w.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('w.workflowType')
      .addGroupBy('w.status')
      .getRawMany();

    const overdue = await this.execRepo.count({
      where: {
        status:     WorkflowStatus.RUNNING,
        deadlineAt: LessThan(new Date()),
      },
    });

    return { breakdown, overdue };
  }

  // ── Step callback ─────────────────────────────────────────

  async recordStepEvent(dto: StepCallbackDto): Promise<WorkflowStepEvent> {
    const execution = await this.getExecution(dto.executionId);

    const event = await this.stepRepo.save(
      this.stepRepo.create({
        executionId:  dto.executionId,
        stepName:     dto.stepName,
        eventType:    dto.eventType,
        previousStep: dto.previousStep ?? null,
        nextStep:     dto.nextStep ?? null,
        taskResource: dto.taskResource ?? null,
        inputData:    dto.inputData ?? null,
        outputData:   dto.outputData ?? null,
        errorCode:    dto.errorCode ?? null,
        errorCause:   dto.errorCause ?? null,
        occurredAt:   new Date(),
      }),
    );

    if (dto.nextStep) {
      await this.execRepo.update(execution.id, { currentStep: dto.nextStep });
    }

    // Terminal events
    if (dto.eventType === StepEventType.TASK_SUCCEEDED && dto.stepName === 'WorkflowSucceeded') {
      await this.markCompleted(execution.id, WorkflowStatus.SUCCEEDED, dto.outputData ?? null);
    } else if (dto.eventType === StepEventType.TASK_FAILED && dto.stepName === 'WorkflowFailed') {
      await this.markCompleted(execution.id, WorkflowStatus.FAILED, null, dto.errorCause);
    }

    return event;
  }

  // ── Escalation ────────────────────────────────────────────

  async createEscalation(dto: EscalationDto): Promise<WorkflowEscalation> {
    const execution = await this.getExecution(dto.executionId);

    const esc = await this.escalRepo.save(
      this.escalRepo.create({
        executionId:    dto.executionId,
        escalationType: dto.escalationType,
        severity:       dto.severity ?? EscalationSeverity.HIGH,
        message:        dto.message,
        escalatedTo:    dto.escalatedTo ?? null,
        detectedAt:     new Date(),
      }),
    );

    // Publish to EventBridge for Notification Service
    await this.publishEvent('ESCALATION_CREATED', {
      escalationId:   esc.id,
      executionId:    dto.executionId,
      workflowType:   execution.workflowType,
      capsuleId:      execution.capsuleId,
      tenantId:       execution.tenantId,
      escalationType: dto.escalationType,
      severity:       dto.severity,
      message:        dto.message,
    });

    this.logger.warn(
      `Escalation ${esc.id} created for workflow ${dto.executionId}: ${dto.escalationType}`,
    );
    return esc;
  }

  async resolveEscalation(
    escalationId: string,
    resolverId:   string,
    notes:        string,
  ): Promise<WorkflowEscalation> {
    const esc = await this.escalRepo.findOne({ where: { id: escalationId } });
    if (!esc) throw new NotFoundException(`Escalation ${escalationId} not found`);
    if (esc.resolvedAt) throw new ConflictException('Escalation already resolved');

    await this.escalRepo.update(escalationId, {
      resolvedAt:      new Date(),
      resolvedBy:      resolverId,
      resolutionNotes: notes,
    });

    return this.escalRepo.findOneOrFail({ where: { id: escalationId } });
  }

  // ── SLA monitoring ────────────────────────────────────────

  /**
   * Called every 15 minutes by EventBridge Scheduler.
   * Finds all running workflows past their SLA deadline and creates escalations.
   */
  async checkSlaDeadlines(): Promise<number> {
    const overdue = await this.execRepo.find({
      where: {
        status:     WorkflowStatus.RUNNING,
        deadlineAt: LessThan(new Date()),
      },
      take: 50,
    });

    let escalated = 0;
    for (const exec of overdue) {
      const existing = await this.escalRepo.findOne({
        where: {
          executionId:    exec.id,
          escalationType: EscalationType.DEADLINE_BREACH,
        },
      });
      // Only create one DEADLINE_BREACH per execution
      if (existing) continue;

      await this.createEscalation({
        executionId:    exec.id,
        escalationType: EscalationType.DEADLINE_BREACH,
        severity:       EscalationSeverity.HIGH,
        message: `Workflow ${exec.workflowType} exceeded SLA deadline. ` +
                 `Capsule: ${exec.capsuleId ?? 'N/A'}. ` +
                 `Started: ${exec.startedAt.toISOString()}.`,
      });
      escalated++;
    }

    if (escalated > 0) {
      this.logger.warn(`SLA check: ${escalated} overdue workflows escalated`);
    }
    return escalated;
  }

  // ── Sync with Step Functions ──────────────────────────────

  async syncFromStepFunctions(executionId: string): Promise<WorkflowExecution> {
    const exec = await this.getExecution(executionId);
    if (!exec.executionArn) return exec;

    try {
      const result = await this.sfn.send(
        new DescribeExecutionCommand({ executionArn: exec.executionArn }),
      );

      let newStatus: WorkflowStatus = exec.status;
      const sfnStatus = result.status;

      if (sfnStatus === ExecutionStatus.SUCCEEDED)  newStatus = WorkflowStatus.SUCCEEDED;
      else if (sfnStatus === ExecutionStatus.FAILED)   newStatus = WorkflowStatus.FAILED;
      else if (sfnStatus === ExecutionStatus.TIMED_OUT) newStatus = WorkflowStatus.TIMED_OUT;
      else if (sfnStatus === ExecutionStatus.ABORTED)  newStatus = WorkflowStatus.ABORTED;

      if (newStatus !== exec.status) {
        const output = result.output ? (JSON.parse(result.output) as Record<string, unknown>) : null;
        await this.markCompleted(executionId, newStatus, output);
      }
    } catch (err: unknown) {
      this.logger.error(
        `Failed to sync SFN execution ${exec.executionArn}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    return this.getExecution(executionId);
  }

  // ── Private helpers ───────────────────────────────────────

  private async markCompleted(
    executionId: string,
    status:  WorkflowStatus,
    output:  Record<string, unknown> | null,
    error?:  string | null,
  ): Promise<void> {
    const exec = await this.execRepo.findOne({ where: { id: executionId } });
    if (!exec) return;

    const completedAt = new Date();
    const durationMs  = completedAt.getTime() - exec.startedAt.getTime();

    await this.execRepo.update(executionId, {
      status,
      completedAt,
      durationMs,
      ...(output ? { outputPayload: output } : {}),
      ...(error  ? { lastError:     error  } : {}),
    } as any);

    await this.publishEvent('WORKFLOW_COMPLETED', {
      workflowId:   executionId,
      workflowType: exec.workflowType,
      capsuleId:    exec.capsuleId,
      tenantId:     exec.tenantId,
      status,
      durationMs,
    });
  }

  private async publishEvent(
    detailType: string,
    detail:     Record<string, unknown>,
  ): Promise<void> {
    try {
      await this.events.send(
        new PutEventsCommand({
          Entries: [
            {
              EventBusName: this.eventBusName,
              Source:       'votecapsule.workflow',
              DetailType:   detailType,
              Detail:       JSON.stringify(detail),
            },
          ],
        }),
      );
    } catch (err: unknown) {
      // Non-fatal — log and continue
      this.logger.warn(
        `Failed to publish EventBridge event ${detailType}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}
