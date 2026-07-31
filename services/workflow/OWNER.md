# Workflow Engine Service

**Status:** ✅ WIRED — fully implemented and wired into monorepo
**Original Source:** CTO Agent — `D:\Votecapsule\workflow-service\`
**Wired by:** Sonie (Platform Foundation Workstream)
**Port:** 3007

## What Is Here

### From CTO Agent (full implementation)
- `src/main.ts` — NestJS bootstrap, port 3007
- `src/app.module.ts` — TypeORM Aurora config for `workflow_*` tables
- `src/workflow.module.ts` — NestJS module wiring
- `src/workflow.service.ts` — Full business logic (start, query, step events, escalation, SLA check, SFN sync)
- `src/workflow.controller.ts` — 10 REST endpoints
- `src/entities/workflow-execution.entity.ts` — Execution record
- `src/entities/workflow-step-event.entity.ts` — Step transition log
- `src/entities/workflow-escalation.entity.ts` — SLA escalations
- `src/dto/start-workflow.dto.ts` — Start workflow request
- `src/dto/step-callback.dto.ts` — EventBridge step event
- `src/dto/escalation.dto.ts` — Create/resolve escalation
- `src/step-functions/evidence-capsule.statemachine.ts` — ASL state machine definition

### Migration
`packages/database/migrations/014_workflow_schema.sql`

## Key Design Points

- Step Functions is the execution engine — PostgreSQL is the queryable index
- Idempotent: one EVIDENCE_CAPSULE workflow per capsule at a time
- EventBridge events published: `WORKFLOW_STARTED`, `WORKFLOW_COMPLETED`, `ESCALATION_CREATED`
- SLA check runs every 15 min via EventBridge Scheduler
- State machines deployed via CDK (Step Functions ARNs set via environment variables)

## Cross-Service Integration (via Step Functions HTTP tasks)

- AI Service → POST /ai/verify + GET /ai/jobs/capsule/:id
- Trust Service → POST /trust/anchor
- Evidence Service → POST /evidence/capsules/:id/publish

All service URLs injected via CDK `definitionSubstitutions` into the state machine ASL.
