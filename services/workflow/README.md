# Vote Capsule™ Workflow Engine Service

**Service ID:** `@vote-capsule/workflow-service`
**Port:** `3007`
**Domain:** Workflow Orchestration

## Purpose

Manages the complete lifecycle of all Vote Capsule platform workflows using AWS Step Functions. Provides a queryable PostgreSQL operational index so the Admin Portal can monitor running workflows, SLA breaches, and escalations.

## Architecture

```
[Evidence Service]  ──→  POST /workflow/start (EVIDENCE_CAPSULE type)
         │
         ▼
[Step Functions State Machine]
         │
         ├── TriggerAIProcessing  ──→  AI Service :3006
         ├── CheckAIJobStatus     ──→  AI Service :3006
         ├── AssignToValidatorQueue  (waitForTaskToken — 4h SLA)
         ├── AnchorToQldb        ──→  Trust Service :3003
         └── PublishResults      ──→  Evidence Service :3005
         │
         ▼
[EventBridge]  ──→  WORKFLOW_STARTED, WORKFLOW_COMPLETED, ESCALATION_CREATED
         │
         ▼
[Notification Service]  (future)
```

## Workflow Types (7)

| Type | SLA |
|------|-----|
| `EVIDENCE_CAPSULE` | 6 hours |
| `TENANT_PROVISIONING` | 30 minutes |
| `USER_ONBOARDING` | 1 hour |
| `RESULTS_PUBLICATION` | 4 hours |
| `RECOVERY` | 2 hours |
| `ESCALATION` | 1 hour |
| `ASSIGNMENT` | No deadline |

## API Endpoints (10)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/workflow/start` | Start any workflow (returns 202 + executionId) |
| GET | `/api/v1/workflow/executions/:id` | Execution details + step history |
| GET | `/api/v1/workflow/executions/capsule/:capsuleId` | Lookup by capsule |
| GET | `/api/v1/workflow/executions/running` | All RUNNING workflows |
| GET | `/api/v1/workflow/stats` | Counts by type/status + overdue count |
| POST | `/api/v1/workflow/events/step` | EventBridge step callback |
| POST | `/api/v1/workflow/escalations` | Create escalation |
| PATCH | `/api/v1/workflow/escalations/:id/resolve` | Supervisor resolves escalation |
| POST | `/api/v1/workflow/sla-check` | SLA deadline scan (every 15 min) |
| POST | `/api/v1/workflow/sync/:executionId` | Force sync from Step Functions |

## Database Tables (3)

- `workflow_executions` — one row per Step Functions execution
- `workflow_step_events` — immutable step transition log
- `workflow_escalations` — SLA breaches + supervisor notifications

## State Machine

The Evidence Capsule state machine ASL definition is in:
`src/step-functions/evidence-capsule.statemachine.ts`

Deploy via CDK `VoteCapsuleComputeStack` — uses `CfnStateMachine` with `definitionSubstitutions`
for service URLs and queue ARNs.

## SLA Monitoring

EventBridge Scheduler triggers `POST /api/v1/workflow/sla-check` every 15 minutes.
Any workflow past its `deadline_at` gets a `DEADLINE_BREACH` escalation.

## Escalation Types (5)

`DEADLINE_BREACH`, `VALIDATION_OVERDUE`, `AI_FAILURE`, `TRUST_FAILURE`, `MANUAL_INTERVENTION_REQUIRED`

## Environment

See `.env.example` for all required environment variables.

## Running

```bash
pnpm dev        # Development with hot reload
pnpm build      # Production build
pnpm start      # Start production
pnpm typecheck  # TypeScript check
```

## Wired by Sonie — Phase 3 Task 8
**Original source:** CTO Agent — `D:\Votecapsule\workflow-service\`
