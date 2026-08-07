# VoteCapsule™ — Claude Code Context

> This file is the **single source of truth** for Claude Code sessions —
> both local (`claude` CLI) and the GitHub Actions claude-agent workflow.
> Do not duplicate this content in `claude-agent.yml` custom_instructions.

## Project Overview
Election Intelligence Cloud Platform targeting Kenya's 2027 General Election.
Multi-tenant SaaS: Election Authorities, Political Parties, Candidates, Observers.

## Tech Stack
- **Backend:** 13 NestJS microservices (TypeScript, TypeORM, Aurora PostgreSQL 16.8)
- **Frontend:** 6 React+Vite portals, 2 React Native/Expo mobile apps
- **Infrastructure:** AWS (ECS Fargate, ALB, API Gateway HTTP v2, CloudFront, S3, Redis, OpenSearch, Step Functions)
- **Auth:** AWS Cognito (InitiateAuth — NOT hosted UI)
- **Trust:** Hedera Consensus Service (testnet) + RFC 3161 TSA (FreeTSA.org)
- **AI:** AWS Bedrock — Claude Sonnet 4.5 (`us.anthropic.claude-sonnet-4-5-20250929-v1:0`)
- **Monorepo:** pnpm workspaces + turbo

## Services (ports 3001–3013)
| Port | Service      | Purpose                                                   |
|------|--------------|-----------------------------------------------------------|
| 3001 | identity     | Auth, users, roles, sessions (Redis)                      |
| 3002 | evidence     | Capsule upload, SHA-256 integrity, tally validation       |
| 3003 | trust        | Hedera + RFC 3161 dual anchoring, Merkle trees            |
| 3004 | geography    | NEC polling station data (46,030 stations)                |
| 3005 | candidate    | Registration, nomination, approval workflow               |
| 3006 | election     | Election lifecycle, positions, registered voters          |
| 3007 | notification | FCM Push, SES Email, SNS SMS, templates                   |
| 3008 | reporting    | Result snapshots, publication, CSV/PDF export             |
| 3009 | workflow     | Step Functions orchestration, SLA monitoring              |
| 3010 | ai           | Textract OCR, NEC validation, confidence scoring          |
| 3011 | tenant       | Multi-tenant management, settings                         |
| 3012 | audit        | Immutable audit trail for all operations                  |
| 3013 | billing      | Subscriptions, usage metering, invoicing                  |

## Commands
```bash
# Install dependencies
pnpm install

# Run a single service in dev mode
cd services/<name> && pnpm start:dev

# Run unit tests for a service
cd services/<name> && pnpm test

# Run integration tests
cd tests/integration && pnpm test

# Type-check entire monorepo
pnpm tsc --noEmit

# Lint entire monorepo
pnpm lint

# Build all
pnpm turbo build
```

## Critical Rules — NEVER violate
1. **SHA-256 formula is LOCKED:** `SHA-256(imageSHA256 + sortedMetadataJSON + captureTimestamp)` — must match the mobile app exactly
2. **UI language:** Say "Integrity Verified" — NEVER say "blockchain" anywhere in UI or docs
3. **NEC = Single Source of Truth** for geography — never duplicate polling station data
4. **Evidence is immutable** after dual-anchor confirmation (Hedera + RFC 3161)
5. **No smart contracts** anywhere in the platform
6. **DB credentials** live in AWS Secrets Manager only — never in code or env files
7. **`firebase-service-account.json`** — NEVER commit to git
8. **Migrations are immutable** — never edit `database/migrations/` files that have already been applied

## Database
- 128 SQL migrations in `packages/database/migrations/`
- NEC data: 47 counties, 290 constituencies, 1,450 wards, 46,030 polling stations
- 22M registered voters loaded from IEBC open data

## Key Patterns
- **Capsule lifecycle:** DRAFT → CAPTURED → QUEUED → UPLOADING → UPLOADED → APPROVED → ANCHORED → PUBLISHED
- **Form chain:** Form A (station) → Form B (constituency) → Form C (county/national)
- **Reconciliation:** SUM(Form As) == Form B, SUM(Form Bs) == Form C
- **AI routing:** AUTO_APPROVE (>0.85 confidence), HUMAN_REVIEW (0.6–0.85), ESCALATE (<0.6)
- **Session management:** Redis (ioredis) — fail-open on reads, token blacklisting, rate limiting

## File Structure
```
vote-capsule/
├── services/             # 13 NestJS microservices (3001–3013)
├── apps/
│   ├── admin-web/        # Super Admin portal
│   ├── authority-web/    # Election Authority portal
│   ├── party-web/        # Political Party portal
│   ├── candidate-web/    # Candidate portal
│   ├── observer-web/     # Observer portal
│   ├── public-web/       # Public Transparency portal
│   ├── agent-mobile/     # Field Agent app (Expo / React Native)
│   └── validator-mobile/ # Validator app (Expo / React Native)
├── packages/
│   ├── types/            # Shared TypeScript types
│   ├── design-tokens/    # Colors, typography, spacing
│   ├── database/         # Migrations + TypeORM base entities
│   └── test-utils/       # Shared mocks and fixtures
├── infrastructure/
│   ├── cdk/              # AWS CDK stacks
│   ├── step-functions/   # ASL state machine definitions
│   ├── scripts/          # CloudFormation + API Gateway JSON
│   └── security/         # WAF rules, security configs
├── tests/
│   └── integration/      # Cross-service integration tests
└── .github/
    └── workflows/        # 14 CI/CD workflows (see below)
```

## CI/CD Workflows (`.github/workflows/`)
| File                         | Trigger                        | Purpose                                      |
|------------------------------|--------------------------------|----------------------------------------------|
| `test.yml`                   | push/PR → main, master         | Unit tests (all 13 services) + integration   |
| `build-and-push-services.yml`| push → services/**, packages/**| Build Docker images → ECR                    |
| `deploy-portals.yml`         | push → apps/**                 | Build + deploy 6 web portals → S3+CloudFront |
| `deploy-cdk.yml`             | push → infrastructure/cdk/**   | CDK diff + deploy                            |
| `claude-agent.yml`           | @claude comment on PR/issue    | This AI agent (Bedrock)                      |
| `trigger-codebuild.yml`      | push → services/** or manual   | AWS CodeBuild docker build                   |
| `build-mobile-apps.yml`      | push → apps/agent|validator-** | EAS build for Android                        |
| `google-play-submit.yml`     | manual                         | EAS build + Google Play submit               |
| `aws_sustainability.yml`     | push → infrastructure/**       | CloudFormation sustainability scan           |
| `codeguru-reviewer.yml`      | push/PR → services/**          | CodeGuru security + quality review           |
| `rate-openapi.yml`           | push → services/**/*.ts        | OpenAPI spec quality lint (RMOA)             |
| `aws_credentials.yml`        | daily 06:00 UTC + manual       | OIDC health check                            |
| `aws_cli.yml`                | manual                         | Ad-hoc AWS CLI escape hatch                  |
| `aws_lambda_deploy_action.yml`| manual                        | Deploy Lambda functions (Image or Zip)       |
