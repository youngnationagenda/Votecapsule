# Evidence Capsule Service

**Status:** ✅ WIRED — fully implemented and wired into monorepo
**Original Source:** CTO Agent — `D:\Votecapsule\evidence-service\`
**Wired by:** Sonie (Platform Foundation Workstream)
**Port:** 3005

## What Changed During Wiring

1. `evidence.module.ts` — Added `HttpModule` import for Geography Service HTTP calls
2. `evidence.service.ts` — Replaced `validateStation()` stub with real HTTP call to Geography Service
   - URL: `GET ${GEOGRAPHY_SERVICE_URL}/api/v1/geography/polling-stations/:code/validate`
   - 404 from Geography Service → NotFoundException → submission rejected
3. `package.json` — Updated to monorepo conventions with pnpm + vitest
4. `tsconfig.json` — Extends monorepo base tsconfig

## Environment Variables

```env
PORT=3005
DB_HOST=your-aurora-endpoint
DB_PORT=5432
DB_NAME=votecapsule
DB_USER=vcadmin
DB_PASSWORD=<from Secrets Manager>
DB_SSL=true
AWS_REGION=af-south-1
S3_EVIDENCE_BUCKET=vote-capsule-evidence-vault-683541453923
GEOGRAPHY_SERVICE_URL=http://localhost:3004  # Update to ECS service URL in production
ALLOWED_ORIGINS=http://localhost:3000,https://votecapsule.yna.co.ke
```

## Remaining Stubs (intentional — waiting on CTO Agent)

- `applyS3ObjectLock()` — S3 Object Lock after dual-anchor confirmation (CDK bucket config required)
- `// await this.sqsService.enqueueForAI(capsule.id)` — SQS enqueue for AI Service (Phase 4)

These stubs are intentional. Do not implement until CTO Agent delivers the AI Service and CDK Object Lock configuration.
