// ============================================================
// VoteCapsule — Workflow Engine Service Unit Tests
// ============================================================
import { vi, describe, it, expect, beforeEach } from 'vitest';

const mockSfnSend = vi.fn();
const mockEventsSend = vi.fn();

vi.mock('@aws-sdk/client-sfn', () => ({
  SFNClient: vi.fn().mockImplementation(() => ({ send: mockSfnSend })),
  StartExecutionCommand: vi.fn().mockImplementation((input: any) => input),
  DescribeExecutionCommand: vi.fn().mockImplementation((input: any) => input),
  ExecutionStatus: {
    SUCCEEDED: 'SUCCEEDED',
    FAILED: 'FAILED',
    TIMED_OUT: 'TIMED_OUT',
    ABORTED: 'ABORTED',
    RUNNING: 'RUNNING',
  },
}));

vi.mock('@aws-sdk/client-eventbridge', () => ({
  EventBridgeClient: vi.fn().mockImplementation(() => ({ send: mockEventsSend })),
  PutEventsCommand: vi.fn().mockImplementation((input: any) => input),
}));

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { NotFoundException, ConflictException } from '@nestjs/common';

import { WorkflowService } from './workflow.service';
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

// ── Mocks ────────────────────────────────────────────────────

const createMockRepository = () => ({
  find: vi.fn().mockResolvedValue([]),
  findOne: vi.fn(),
  findOneOrFail: vi.fn(),
  save: vi.fn().mockImplementation((e: any) => Promise.resolve({ id: 'exec-1', ...e })),
  create: vi.fn().mockImplementation((e: any) => ({ id: 'exec-1', ...e })),
  update: vi.fn().mockResolvedValue({ affected: 1 }),
  count: vi.fn().mockResolvedValue(0),
  createQueryBuilder: vi.fn(() => mockQueryBuilder),
});

const mockQueryBuilder = {
  select: vi.fn().mockReturnThis(),
  addSelect: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  andWhere: vi.fn().mockReturnThis(),
  groupBy: vi.fn().mockReturnThis(),
  addGroupBy: vi.fn().mockReturnThis(),
  orderBy: vi.fn().mockReturnThis(),
  getRawMany: vi.fn().mockResolvedValue([]),
};

const mockDataSource = {};

const mockConfig = {
  get: vi.fn().mockImplementation((key: string, defaultVal?: string) => {
    const map: Record<string, string> = {
      AWS_REGION: 'us-east-1',
      EVENT_BUS_NAME: 'votecapsule-events',
      SFN_EVIDENCE_CAPSULE_ARN: 'arn:aws:states:us-east-1:123:stateMachine:evidence',
      SFN_TENANT_PROVISIONING_ARN: 'arn:aws:states:us-east-1:123:stateMachine:tenant',
    };
    return map[key] ?? defaultVal ?? undefined;
  }),
};

describe('WorkflowService', () => {
  let service: WorkflowService;
  let execRepo: ReturnType<typeof createMockRepository>;
  let stepRepo: ReturnType<typeof createMockRepository>;
  let escalRepo: ReturnType<typeof createMockRepository>;

  beforeEach(async () => {
    execRepo = createMockRepository();
    stepRepo = createMockRepository();
    escalRepo = createMockRepository();

    mockSfnSend.mockResolvedValue({ executionArn: 'arn:aws:states:us-east-1:123:execution:test' });
    mockEventsSend.mockResolvedValue({});

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkflowService,
        { provide: getRepositoryToken(WorkflowExecution), useValue: execRepo },
        { provide: getRepositoryToken(WorkflowStepEvent), useValue: stepRepo },
        { provide: getRepositoryToken(WorkflowEscalation), useValue: escalRepo },
        { provide: DataSource, useValue: mockDataSource },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    service = module.get<WorkflowService>(WorkflowService);
    vi.clearAllMocks();
    // Re-mock SFN after clearAllMocks
    mockSfnSend.mockResolvedValue({ executionArn: 'arn:aws:states:us-east-1:123:execution:test' });
    mockEventsSend.mockResolvedValue({});
  });

  // ── startWorkflow() ────────────────────────────────────────

  describe('startWorkflow()', () => {
    const baseDto = {
      workflowType: WorkflowType.EVIDENCE_CAPSULE,
      tenantId: 'tenant-1',
      capsuleId: 'capsule-1',
      initiatorService: 'evidence-service',
      payload: { s3Key: 'uploads/test.jpg' },
    };

    it('should create execution and start Step Functions', async () => {
      execRepo.findOne.mockResolvedValue(null);
      execRepo.save.mockResolvedValue({ id: 'exec-1', ...baseDto, status: WorkflowStatus.RUNNING });

      await service.startWorkflow(baseDto);

      expect(execRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          workflowType: WorkflowType.EVIDENCE_CAPSULE,
          status: WorkflowStatus.RUNNING,
        }),
      );
      expect(execRepo.save).toHaveBeenCalled();
      expect(mockSfnSend).toHaveBeenCalled();
      expect(mockEventsSend).toHaveBeenCalled();
    });

    it('should be idempotent for EVIDENCE_CAPSULE — return existing', async () => {
      const existing = { id: 'exec-existing', workflowType: WorkflowType.EVIDENCE_CAPSULE, status: WorkflowStatus.RUNNING };
      execRepo.findOne.mockResolvedValue(existing);

      const result = await service.startWorkflow(baseDto);

      expect(result).toEqual(existing);
      expect(execRepo.create).not.toHaveBeenCalled();
    });

    it('should not check idempotency for non-capsule workflows', async () => {
      execRepo.findOne.mockResolvedValue(null);
      execRepo.save.mockResolvedValue({ id: 'exec-2', status: WorkflowStatus.RUNNING });

      await service.startWorkflow({
        ...baseDto,
        workflowType: WorkflowType.TENANT_PROVISIONING,
        capsuleId: undefined,
      });

      expect(execRepo.create).toHaveBeenCalled();
    });

    it('should handle SFN failure gracefully — mark FAILED', async () => {
      execRepo.findOne.mockResolvedValue(null);
      execRepo.save.mockResolvedValue({ id: 'exec-1', status: WorkflowStatus.RUNNING });
      mockSfnSend.mockRejectedValue(new Error('SFN unavailable'));

      await service.startWorkflow(baseDto);

      expect(execRepo.update).toHaveBeenCalledWith(
        'exec-1',
        expect.objectContaining({
          status: WorkflowStatus.FAILED,
          lastError: 'SFN unavailable',
        }),
      );
    });

    it('should work without SFN ARN configured (dev mode)', async () => {
      execRepo.findOne.mockResolvedValue(null);
      execRepo.save.mockResolvedValue({ id: 'exec-1', status: WorkflowStatus.RUNNING });

      await service.startWorkflow({
        ...baseDto,
        workflowType: WorkflowType.ASSIGNMENT,
      });

      expect(mockSfnSend).not.toHaveBeenCalled();
    });

    it('should compute SLA deadline from workflow type', async () => {
      execRepo.findOne.mockResolvedValue(null);
      execRepo.save.mockResolvedValue({ id: 'exec-1', status: WorkflowStatus.RUNNING });

      await service.startWorkflow(baseDto);

      expect(execRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ deadlineAt: expect.any(Date) }),
      );
    });
  });

  // ── getExecution() ─────────────────────────────────────────

  describe('getExecution()', () => {
    it('should return execution with relations', async () => {
      const exec = { id: 'exec-1', workflowType: WorkflowType.EVIDENCE_CAPSULE, steps: [], escalations: [] };
      execRepo.findOne.mockResolvedValue(exec);

      const result = await service.getExecution('exec-1');

      expect(result).toEqual(exec);
      expect(execRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'exec-1' },
        relations: ['steps', 'escalations'],
      });
    });

    it('should throw NotFoundException if not found', async () => {
      execRepo.findOne.mockResolvedValue(null);

      await expect(service.getExecution('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  // ── getExecutionByCapsule() ────────────────────────────────

  describe('getExecutionByCapsule()', () => {
    it('should find execution by capsuleId', async () => {
      const exec = { id: 'exec-1', capsuleId: 'cap-1' };
      execRepo.findOne.mockResolvedValue(exec);

      const result = await service.getExecutionByCapsule('cap-1');

      expect(result).toEqual(exec);
    });

    it('should return null if not found', async () => {
      execRepo.findOne.mockResolvedValue(null);

      const result = await service.getExecutionByCapsule('cap-999');

      expect(result).toBeNull();
    });
  });

  // ── listRunning() ──────────────────────────────────────────

  describe('listRunning()', () => {
    it('should find all running executions', async () => {
      execRepo.find.mockResolvedValue([{ id: 'exec-1' }, { id: 'exec-2' }]);

      const result = await service.listRunning();

      expect(execRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { status: WorkflowStatus.RUNNING } }),
      );
      expect(result).toHaveLength(2);
    });

    it('should filter by workflow type', async () => {
      execRepo.find.mockResolvedValue([]);

      await service.listRunning(WorkflowType.EVIDENCE_CAPSULE);

      expect(execRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: WorkflowStatus.RUNNING,
            workflowType: WorkflowType.EVIDENCE_CAPSULE,
          }),
        }),
      );
    });
  });

  // ── recordStepEvent() ──────────────────────────────────────

  describe('recordStepEvent()', () => {
    it('should record step event and update currentStep', async () => {
      execRepo.findOne.mockResolvedValue({ id: 'exec-1', steps: [], escalations: [] });
      stepRepo.save.mockResolvedValue({ id: 'step-1' });

      await service.recordStepEvent({
        executionId: 'exec-1',
        stepName: 'ValidateIntegrity',
        eventType: StepEventType.TASK_SUCCEEDED,
        nextStep: 'StoreToS3',
      });

      expect(stepRepo.create).toHaveBeenCalled();
      expect(stepRepo.save).toHaveBeenCalled();
      expect(execRepo.update).toHaveBeenCalledWith('exec-1', { currentStep: 'StoreToS3' });
    });

    it('should mark workflow SUCCEEDED on terminal success', async () => {
      const exec = { id: 'exec-1', startedAt: new Date(Date.now() - 60000), steps: [], escalations: [] };
      execRepo.findOne
        .mockResolvedValueOnce(exec)
        .mockResolvedValueOnce(exec);
      stepRepo.save.mockResolvedValue({ id: 'step-1' });

      await service.recordStepEvent({
        executionId: 'exec-1',
        stepName: 'WorkflowSucceeded',
        eventType: StepEventType.TASK_SUCCEEDED,
        outputData: { result: 'ok' },
      });

      expect(execRepo.update).toHaveBeenCalledWith(
        'exec-1',
        expect.objectContaining({ status: WorkflowStatus.SUCCEEDED }),
      );
    });
  });

  // ── createEscalation() ─────────────────────────────────────

  describe('createEscalation()', () => {
    it('should persist escalation and publish EventBridge event', async () => {
      execRepo.findOne.mockResolvedValue({
        id: 'exec-1', workflowType: WorkflowType.EVIDENCE_CAPSULE,
        capsuleId: 'cap-1', tenantId: 'tenant-1', steps: [], escalations: [],
      });
      escalRepo.save.mockResolvedValue({ id: 'esc-1' });

      await service.createEscalation({
        executionId: 'exec-1',
        escalationType: EscalationType.DEADLINE_BREACH,
        severity: EscalationSeverity.HIGH,
        message: 'SLA breached',
      });

      expect(escalRepo.create).toHaveBeenCalled();
      expect(escalRepo.save).toHaveBeenCalled();
      expect(mockEventsSend).toHaveBeenCalled();
    });
  });

  // ── resolveEscalation() ────────────────────────────────────

  describe('resolveEscalation()', () => {
    it('should mark escalation resolved', async () => {
      escalRepo.findOne.mockResolvedValue({ id: 'esc-1', resolvedAt: null });
      escalRepo.findOneOrFail.mockResolvedValue({ id: 'esc-1', resolvedAt: new Date() });

      await service.resolveEscalation('esc-1', 'admin-1', 'Resolved manually');

      expect(escalRepo.update).toHaveBeenCalledWith(
        'esc-1',
        expect.objectContaining({ resolvedBy: 'admin-1', resolutionNotes: 'Resolved manually' }),
      );
    });

    it('should throw NotFoundException if escalation not found', async () => {
      escalRepo.findOne.mockResolvedValue(null);

      await expect(
        service.resolveEscalation('non-existent', 'admin-1', 'notes'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException if already resolved', async () => {
      escalRepo.findOne.mockResolvedValue({ id: 'esc-1', resolvedAt: new Date() });

      await expect(
        service.resolveEscalation('esc-1', 'admin-1', 'notes'),
      ).rejects.toThrow(ConflictException);
    });
  });

  // ── checkSlaDeadlines() ────────────────────────────────────

  describe('checkSlaDeadlines()', () => {
    it('should escalate overdue workflows', async () => {
      const overdue = [
        { id: 'exec-1', workflowType: WorkflowType.EVIDENCE_CAPSULE, capsuleId: 'cap-1', startedAt: new Date(), steps: [], escalations: [] },
      ];
      execRepo.find.mockResolvedValue(overdue);
      execRepo.findOne.mockResolvedValue({ ...overdue[0], steps: [], escalations: [] });
      escalRepo.findOne.mockResolvedValue(null);
      escalRepo.save.mockResolvedValue({ id: 'esc-new' });

      const count = await service.checkSlaDeadlines();

      expect(count).toBe(1);
      expect(escalRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          escalationType: EscalationType.DEADLINE_BREACH,
          severity: EscalationSeverity.HIGH,
        }),
      );
    });

    it('should skip if DEADLINE_BREACH already exists for execution', async () => {
      execRepo.find.mockResolvedValue([{ id: 'exec-1' }]);
      escalRepo.findOne.mockResolvedValue({ id: 'esc-existing' });

      const count = await service.checkSlaDeadlines();

      expect(count).toBe(0);
    });

    it('should return 0 when no overdue workflows', async () => {
      execRepo.find.mockResolvedValue([]);

      const count = await service.checkSlaDeadlines();

      expect(count).toBe(0);
    });
  });

  // ── syncFromStepFunctions() ────────────────────────────────

  describe('syncFromStepFunctions()', () => {
    it('should update status from SFN SUCCEEDED', async () => {
      const exec = {
        id: 'exec-1', executionArn: 'arn:test', status: WorkflowStatus.RUNNING,
        startedAt: new Date(Date.now() - 60000), steps: [], escalations: [],
      };
      execRepo.findOne
        .mockResolvedValueOnce(exec)
        .mockResolvedValueOnce(exec)
        .mockResolvedValueOnce({ ...exec, status: WorkflowStatus.SUCCEEDED });

      mockSfnSend.mockResolvedValue({
        status: 'SUCCEEDED',
        output: JSON.stringify({ result: 'done' }),
      });

      await service.syncFromStepFunctions('exec-1');

      expect(mockSfnSend).toHaveBeenCalled();
      expect(execRepo.update).toHaveBeenCalledWith(
        'exec-1',
        expect.objectContaining({ status: WorkflowStatus.SUCCEEDED }),
      );
    });

    it('should skip sync when no executionArn', async () => {
      const exec = { id: 'exec-1', executionArn: null, status: WorkflowStatus.RUNNING, steps: [], escalations: [] };
      execRepo.findOne.mockResolvedValue(exec);

      const result = await service.syncFromStepFunctions('exec-1');

      expect(mockSfnSend).not.toHaveBeenCalled();
      expect(result).toEqual(exec);
    });
  });
});
