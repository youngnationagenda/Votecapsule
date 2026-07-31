# Vote Capsule™ AI Verification Service

**Service ID:** `@vote-capsule/ai-service`
**Port:** `3006`
**Domain:** AI Verification

## Purpose

Provides AI-assisted evidence capsule analysis using Amazon Textract OCR and NEC cross-validation.

> **AI ASSISTS, HUMANS DECIDE.** This service never makes a final election decision.

## Pipeline

```
Evidence Service (APPROVED capsule)
        │
        ▼
POST /api/v1/ai/verify
        │ (async pipeline)
        ▼
1. TextractProcessor — AnalyzeDocument (FORMS + TABLES)
2. NecValidatorProcessor — GET /geography/polling-stations/:code/validate
3. ConfidenceProcessor — weighted score (6 dimensions)
4. Persist → ai_verification_jobs + ai_anomaly_events
5. PATCH /evidence/capsules/:id/ai-result (callback)
```

## Confidence Thresholds

| Score | Decision |
|-------|----------|
| ≥ 0.80 | `APPROVE_FOR_REVIEW` |
| 0.60–0.79 | `MANUAL_REVIEW` |
| < 0.60 | `ESCALATE` |
| Any CRITICAL anomaly | `ESCALATE` (overrides) |

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/ai/verify` | Trigger pipeline |
| GET | `/api/v1/ai/jobs/:jobId` | Job details + anomalies |
| GET | `/api/v1/ai/jobs/capsule/:capsuleId` | Job by capsule |
| GET | `/api/v1/ai/jobs/flagged` | Flagged jobs |
| GET | `/api/v1/ai/stats` | Aggregate counts |
| PATCH | `/api/v1/ai/anomalies/:id/review` | Human reviews anomaly |

## Wired by Sonie — Phase 3
