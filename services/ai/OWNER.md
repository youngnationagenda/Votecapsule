# AI Verification Service

**Status:** ✅ WIRED — fully implemented and wired into monorepo
**Original Source:** CTO Agent — `D:\Votecapsule\ai-service\`
**Wired by:** Sonie (Platform Foundation Workstream)
**Port:** 3006

## What Is Here

### From CTO Agent (full implementation)
- `src/main.ts` — NestJS bootstrap port 3006
- `src/app.module.ts` — TypeORM Aurora config for `ai_*` tables
- `src/ai.module.ts` — Wires all 3 processors + HttpModule
- `src/ai.service.ts` — Full 5-stage pipeline: Textract → NEC → Confidence → Persist → Callback
- `src/ai.controller.ts` — 6 REST endpoints
- `src/entities/ai-verification-job.entity.ts` — One record per evidence capsule
- `src/entities/ai-anomaly-event.entity.ts` — One per anomaly detected
- `src/dto/trigger-ai-job.dto.ts` — Evidence Service calls this
- `src/dto/review-anomaly.dto.ts` — Human supervisor closes anomaly
- `src/processors/textract.processor.ts` — Amazon Textract OCR (FORMS + TABLES)
- `src/processors/nec-validator.processor.ts` — Geography Service cross-validation
- `src/processors/confidence.processor.ts` — 6-dim weighted confidence score

### Migration
`packages/database/migrations/013_ai_schema.sql`

## Critical Principle

**AI ASSISTS, HUMANS DECIDE.**
This service NEVER makes a final election decision.
All `routingDecision` values are advisory — they queue capsules for human validators.

## Confidence Thresholds (IMMUTABLE — from V6 Ch8)

| Score | Routing |
|-------|---------|
| ≥ 0.80 | `APPROVE_FOR_REVIEW` — validator queue |
| 0.60–0.79 | `MANUAL_REVIEW` — closer look required |
| < 0.60 | `ESCALATE` — senior supervisor |
| Any CRITICAL anomaly | `ESCALATE` — overrides score |

## Score Weights

`OCR(20%) + FormRecognition(15%) + StationCode(25%) + Position(15%) + Arithmetic(15%) + VoterLimit(10%)`

## Environment Variables

```env
PORT=3006
DB_HOST=your-aurora-endpoint
DB_PORT=5432
DB_NAME=votecapsule
DB_USER=vcadmin
DB_PASS=<from Secrets Manager>
DB_SSL=true
AWS_REGION=af-south-1
GEOGRAPHY_SERVICE_URL=http://localhost:3004
EVIDENCE_SERVICE_URL=http://localhost:3005
```

## Bug Fixed During Wiring

3 cross-service bugs fixed by CTO Agent before delivery:
1. `EVIDENCE_SERVICE_URL` default corrected to `:3005` (was `:3002`)
2. NEC validator URL corrected to `/geography/polling-stations/:code/validate`
3. Evidence Service handler `PATCH /evidence/capsules/:id/ai-result` added
