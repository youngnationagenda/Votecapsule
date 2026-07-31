// ============================================================
// VoteCapsule — Evidence Capsule State Machine Definition
// services/workflow/src/step-functions/evidence-capsule.statemachine.ts
//
// AWS Step Functions state machine for the complete Evidence
// Capsule lifecycle (V8 Chapter 4).
//
// Flow:
//   TriggerAIProcessing → WaitForAI → CheckAIJobStatus
//   → EvaluateAIStatus → RouteByAIDecision
//   → AssignToValidatorQueue (waitForTaskToken — 4h SLA)
//   → EvaluateValidationDecision
//   → AnchorToQldb → PublishResults → WorkflowSucceeded
//
// Error paths → EscalateToSupervisor or WorkflowFailed at any step.
//
// This class generates the Amazon States Language (ASL) JSON —
// deployed to Step Functions via CDK CfnStateMachine.
//
// Replace ${...} with CDK definitionSubstitutions at deploy time.
// ============================================================

export interface EvidenceCapsuleWorkflowInput {
  capsuleId:       string;
  tenantId:        string;
  iebcStationCode: string;
  positionCode:    string;
  electionYear:    number;
  countyCode:      string;
  countyName:      string;
  s3Bucket:        string;
  s3Key:           string;
  sha256Hash:      string;
  agentUserId:     string;
}

/** SLA timeouts in seconds */
const SLA = {
  AI_PROCESSING_TIMEOUT_S:    3600,    // 1 hour
  HUMAN_VALIDATION_TIMEOUT_S: 14400,   // 4 hours (configurable)
  ANCHORING_TIMEOUT_S:        1800,    // 30 minutes
  PUBLICATION_TIMEOUT_S:      3600,    // 1 hour
} as const;

/**
 * Returns the full Amazon States Language (ASL) definition for the
 * Evidence Capsule workflow state machine.
 *
 * CDK definitionSubstitutions required:
 *   AIServiceUrl       — e.g. https://api.votecapsule.yna.co.ke/api/v1
 *   TrustServiceUrl    — e.g. https://api.votecapsule.yna.co.ke/api/v1
 *   EvidenceServiceUrl — e.g. https://api.votecapsule.yna.co.ke/api/v1
 *   EventBusName       — votecapsule-events
 *   ValidationQueueUrl — SQS queue URL for human validators
 */
export function getEvidenceCapsuleStateMachineDefinition(): Record<string, unknown> {
  return {
    Comment: 'VoteCapsule™ Evidence Capsule lifecycle — V8 Chapter 4',
    StartAt: 'TriggerAIProcessing',
    States: {

      // ── Stage 1: Trigger AI processing ──────────────────────
      TriggerAIProcessing: {
        Type: 'Task',
        Resource: 'arn:aws:states:::http:invoke',
        Parameters: {
          ApiEndpoint: '${AIServiceUrl}/ai/verify',
          Method: 'POST',
          RequestBody: {
            'capsuleId.$':       '$.capsuleId',
            'iebcStationCode.$': '$.iebcStationCode',
            'positionCode.$':    '$.positionCode',
            'electionYear.$':    '$.electionYear',
            'countyCode.$':      '$.countyCode',
            's3Bucket.$':        '$.s3Bucket',
            's3Key.$':           '$.s3Key',
          },
        },
        ResultPath: '$.aiTrigger',
        TimeoutSeconds: 30,
        Retry: [
          {
            ErrorEquals:     ['States.TaskFailed', 'States.Timeout'],
            IntervalSeconds: 5,
            MaxAttempts:     3,
            BackoffRate:     2.0,
          },
        ],
        Catch: [
          {
            ErrorEquals: ['States.ALL'],
            ResultPath:  '$.error',
            Next:        'AIProcessingFailed',
          },
        ],
        Next: 'WaitForAIProcessing',
      },

      WaitForAIProcessing: {
        Type: 'Wait',
        Seconds: 60,
        Next: 'CheckAIJobStatus',
      },

      CheckAIJobStatus: {
        Type: 'Task',
        Resource: 'arn:aws:states:::http:invoke',
        Parameters: {
          ApiEndpoint: '${AIServiceUrl}/ai/jobs/capsule/${$.capsuleId}',
          Method: 'GET',
        },
        ResultPath: '$.aiJob',
        TimeoutSeconds: 10,
        Retry: [
          {
            ErrorEquals:     ['States.TaskFailed'],
            IntervalSeconds: 10,
            MaxAttempts:     5,
            BackoffRate:     1.5,
          },
        ],
        Next: 'EvaluateAIStatus',
      },

      EvaluateAIStatus: {
        Type: 'Choice',
        Choices: [
          {
            Variable:     '$.aiJob.status',
            StringEquals: 'COMPLETED',
            Next:         'RouteByAIDecision',
          },
          {
            Variable:     '$.aiJob.status',
            StringEquals: 'FAILED',
            Next:         'AIProcessingFailed',
          },
          {
            Variable:     '$.aiJob.status',
            StringEquals: 'ESCALATED',
            Next:         'EscalateToSupervisor',
          },
        ],
        Default: 'WaitForAIProcessing',
      },

      RouteByAIDecision: {
        Type: 'Choice',
        Choices: [
          {
            Variable:     '$.aiJob.routingDecision',
            StringEquals: 'ESCALATE',
            Next:         'EscalateToSupervisor',
          },
          {
            Variable:     '$.aiJob.routingDecision',
            StringEquals: 'APPROVE_FOR_REVIEW',
            Next:         'AssignToValidatorQueue',
          },
        ],
        Default: 'AssignToValidatorQueue',
      },

      // ── Stage 2: Human validation (waitForTaskToken) ─────────
      // AI ASSISTS, HUMANS DECIDE — no automated approval here.
      AssignToValidatorQueue: {
        Type: 'Task',
        Resource: 'arn:aws:states:::sqs:sendMessage.waitForTaskToken',
        Parameters: {
          QueueUrl:    '${ValidationQueueUrl}',
          MessageBody: {
            'capsuleId.$':       '$.capsuleId',
            'routingDecision.$': '$.aiJob.routingDecision',
            'confidence.$':      '$.aiJob.overallConfidence',
            'isFlagged.$':       '$.aiJob.isFlagged',
            'taskToken.$':       '$$.Task.Token',
          },
        },
        TimeoutSeconds:    SLA.HUMAN_VALIDATION_TIMEOUT_S,
        HeartbeatSeconds:  600,
        ResultPath: '$.validationResult',
        Catch: [
          {
            ErrorEquals: ['States.HeartbeatTimeout', 'States.Timeout'],
            ResultPath:  '$.error',
            Next:        'ValidationTimedOut',
          },
          {
            ErrorEquals: ['States.TaskFailed'],
            ResultPath:  '$.error',
            Next:        'ValidationRejected',
          },
        ],
        Next: 'EvaluateValidationDecision',
      },

      EvaluateValidationDecision: {
        Type: 'Choice',
        Choices: [
          {
            Variable:     '$.validationResult.decision',
            StringEquals: 'APPROVED',
            Next:         'AnchorToQldb',
          },
          {
            Variable:     '$.validationResult.decision',
            StringEquals: 'REJECTED',
            Next:         'ValidationRejected',
          },
          {
            Variable:     '$.validationResult.decision',
            StringEquals: 'ESCALATED',
            Next:         'EscalateToSupervisor',
          },
        ],
        Default: 'ValidationRejected',
      },

      // ── Stage 3: Trust anchoring (QLDB) ──────────────────────
      AnchorToQldb: {
        Type: 'Task',
        Resource: 'arn:aws:states:::http:invoke',
        Parameters: {
          ApiEndpoint: '${TrustServiceUrl}/trust/anchor',
          Method: 'POST',
          RequestBody: {
            'capsuleId.$':        '$.capsuleId',
            'sha256Hash.$':       '$.sha256Hash',
            'iebcStationCode.$':  '$.iebcStationCode',
            'positionCode.$':     '$.positionCode',
            'electionYear.$':     '$.electionYear',
            'countyCode.$':       '$.countyCode',
            'countyName.$':       '$.countyName',
            'validatorUserId.$':  '$.validationResult.validatorId',
            requestedByService:   'workflow-engine',
          },
        },
        ResultPath: '$.anchorResult',
        TimeoutSeconds: SLA.ANCHORING_TIMEOUT_S,
        Retry: [
          {
            ErrorEquals:     ['States.TaskFailed', 'States.Timeout'],
            IntervalSeconds: 10,
            MaxAttempts:     5,
            BackoffRate:     2.0,
          },
        ],
        Catch: [
          {
            ErrorEquals: ['States.ALL'],
            ResultPath:  '$.error',
            Next:        'AnchoringFailed',
          },
        ],
        Next: 'PublishResults',
      },

      // ── Stage 4: Publication ──────────────────────────────────
      PublishResults: {
        Type: 'Task',
        Resource: 'arn:aws:states:::http:invoke',
        Parameters: {
          ApiEndpoint: '${EvidenceServiceUrl}/evidence/capsules/${$.capsuleId}/publish',
          Method: 'POST',
          RequestBody: {
            'qldbDocumentId.$': '$.anchorResult.qldbDocumentId',
          },
        },
        ResultPath: '$.publishResult',
        TimeoutSeconds: SLA.PUBLICATION_TIMEOUT_S,
        Retry: [
          {
            ErrorEquals:     ['States.TaskFailed'],
            IntervalSeconds: 15,
            MaxAttempts:     3,
            BackoffRate:     2.0,
          },
        ],
        Next: 'WorkflowSucceeded',
      },

      // ── Terminal states ───────────────────────────────────────
      WorkflowSucceeded: {
        Type: 'Succeed',
        Comment: 'Evidence Capsule anchored to QLDB and published',
      },

      ValidationRejected: {
        Type: 'Task',
        Resource: 'arn:aws:states:::http:invoke',
        Parameters: {
          ApiEndpoint: '${EvidenceServiceUrl}/evidence/capsules/${$.capsuleId}/validate',
          Method: 'PATCH',
          RequestBody: {
            decision:  'REJECTED',
            'notes.$': '$.validationResult.notes',
          },
          Headers: {
            'X-Validator-User-Id.$': '$.validationResult.validatorId',
          },
        },
        ResultPath: null,
        Next: 'WorkflowFailed',
      },

      AIProcessingFailed: {
        Type: 'Task',
        Resource: 'arn:aws:states:::events:putEvents',
        Parameters: {
          Entries: [
            {
              EventBusName: '${EventBusName}',
              Source:       'votecapsule.workflow',
              DetailType:   'AI_PROCESSING_FAILED',
              Detail: {
                'capsuleId.$': '$.capsuleId',
                'error.$':     '$.error',
              },
            },
          ],
        },
        ResultPath: null,
        Next: 'WorkflowFailed',
      },

      AnchoringFailed: {
        Type: 'Task',
        Resource: 'arn:aws:states:::events:putEvents',
        Parameters: {
          Entries: [
            {
              EventBusName: '${EventBusName}',
              Source:       'votecapsule.workflow',
              DetailType:   'QLDB_ANCHORING_FAILED',
              Detail: {
                'capsuleId.$': '$.capsuleId',
                'error.$':     '$.error',
              },
            },
          ],
        },
        ResultPath: null,
        Next: 'WorkflowFailed',
      },

      ValidationTimedOut: {
        Type: 'Task',
        Resource: 'arn:aws:states:::events:putEvents',
        Parameters: {
          Entries: [
            {
              EventBusName: '${EventBusName}',
              Source:       'votecapsule.workflow',
              DetailType:   'VALIDATION_TIMED_OUT',
              Detail: {
                'capsuleId.$': '$.capsuleId',
                'tenantId.$':  '$.tenantId',
              },
            },
          ],
        },
        ResultPath: null,
        Next: 'EscalateToSupervisor',
      },

      EscalateToSupervisor: {
        Type: 'Task',
        Resource: 'arn:aws:states:::events:putEvents',
        Parameters: {
          Entries: [
            {
              EventBusName: '${EventBusName}',
              Source:       'votecapsule.workflow',
              DetailType:   'ESCALATION_REQUIRED',
              Detail: {
                'capsuleId.$':       '$.capsuleId',
                'tenantId.$':        '$.tenantId',
                'iebcStationCode.$': '$.iebcStationCode',
              },
            },
          ],
        },
        ResultPath: null,
        Next: 'WorkflowFailed',
      },

      WorkflowFailed: {
        Type: 'Fail',
        Comment: 'Evidence Capsule workflow terminated with error or rejection',
      },
    },
  };
}
