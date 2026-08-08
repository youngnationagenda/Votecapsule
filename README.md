# VoteCapsule™ — Election Intelligence Cloud Platform

**Enterprise-grade multi-tenant SaaS built for Kenya's 2027 General Election**

> Transparent, tamper-evident election evidence capture, AI-assisted verification, and dual-anchor integrity (Hedera Consensus Service + RFC 3161). No blockchain. No smart contracts. Just verified truth.

**Platform Status: LIVE — All 13 services running on AWS ECS Fargate · All 6 portals on CloudFront · 22M voter NEC database seeded**

---

## Platform Overview

VoteCapsule™ enables IEBC field agents to capture, submit, and verify polling station result forms (Form 34A/35A) with cryptographic integrity. Evidence capsules are AI-verified, human-validated, and anchored to Hedera's consensus layer + an RFC 3161 timestamp — producing an immutable audit trail before results are published.

### Key Numbers

| Metric | Value |
|--------|-------|
| Microservices | 13 (all live) |
| Web portals | 6 (all live on CloudFront) |
| Mobile apps | 2 (React Native / Expo) |
| DB migrations | 152 executed |
| NEC polling stations | 45,805 |
| NEC registered voters | 22,102,532 |
| Unit tests | ~299 across 13 services |
| Integration tests | 4 suites (27 tests) |
| System roles | 16 |
| Hedera topic | `0.0.9871113` (testnet) |

---

## Monorepo Structure

```
vote-capsule/
├── services/                   # 13 NestJS microservices (ports 3001–3013)
│   ├── identity/               ✅ LIVE :3001 — Cognito auth, RBAC, Redis sessions
│   ├── tenant/                 ✅ LIVE :3002 — Multi-tenant management
│   ├── trust/                  ✅ LIVE :3003 — Hybrid Anchor (Hedera + RFC 3161)
│   ├── geography/              ✅ LIVE :3004 — NEC database SSoT (46k stations)
│   ├── evidence/               ✅ LIVE :3005 — Capsule lifecycle + SHA-256 integrity
│   ├── ai/                     ✅ LIVE :3006 — Bedrock (Claude Sonnet 4.5) verification
│   ├── workflow/               ✅ LIVE :3007 — Step Functions orchestration + SLA
│   ├── notification/           ✅ LIVE :3008 — FCM push + SES email + SNS SMS
│   ├── candidate/              ✅ LIVE :3009 — Nomination, approval, election lifecycle
│   ├── reporting/              ✅ LIVE :3010 — Snapshots, public results, CSV export
│   ├── election/               ✅ LIVE :3011 — Election state machine + positions
│   ├── audit/                  ✅ LIVE :3012 — Immutable audit log + compliance reports
│   └── billing/                ✅ LIVE :3013 — Subscriptions, usage, invoicing
│
├── apps/
│   ├── admin-web/              ✅ LIVE — Super Admin Portal (React 18 + Tailwind, 16 pages)
│   ├── authority-web/          ✅ LIVE — Election Authority Portal (10 pages, Form B/C entry)
│   ├── party-web/              ✅ LIVE — Political Party Portal (10 pages)
│   ├── candidate-web/          ✅ LIVE — Candidate Portal (10 pages)
│   ├── observer-web/           ✅ LIVE — Observer Portal (10 pages)
│   ├── public-web/             ✅ LIVE — Public Transparency Portal (9 pages)
│   ├── agent-mobile/           ✅ BUILT — Agent Mobile (React Native, camera+GPS+offline+SHA-256)
│   └── validator-mobile/       ✅ BUILT — Validator Mobile (React Native)
│
├── packages/
│   ├── design-tokens/          ✅ — Shared design system (colors, typography, Tailwind preset)
│   ├── types/                  ✅ — Shared TypeScript types (dual CJS+ESM)
│   ├── database/               ✅ — 152 migrations + base entities
│   └── test-utils/             ✅ — Shared Jest mocks and fixtures
│
├── infrastructure/
│   ├── cdk/                    ✅ — 16 CloudFormation stacks (all CREATE_COMPLETE)
│   ├── step-functions/         ✅ — 5 ASL state machines (evidence-pipeline, election-lifecycle, ...)
│   ├── load-tests/             ✅ — k6 load test scripts (4 scenarios)
│   └── security/               ✅ — OWASP Top 10 scan results
│
└── tests/
    └── integration/            ✅ — 4 end-to-end test suites (Jest + axios)
```

---

## Quick Start

### Prerequisites

- Node.js >= 22 (see `.nvmrc`)
- pnpm >= 9.14.4 (declared in `package.json` `packageManager` field)
- AWS CLI configured for account `683541453923` / `us-east-1`

```bash
# Use the correct Node version
nvm use   # reads .nvmrc → 22

# Install all workspace dependencies
pnpm install

# Build shared packages first
pnpm --filter @vote-capsule/types build
pnpm --filter @vote-capsule/design-tokens build
```

### Run a Service Locally

```bash
# Example: Geography service (public — no auth needed)
pnpm --filter @vote-capsule/geography-service dev
# → http://localhost:3004/health

# Example: Admin portal
pnpm --filter @vote-capsule/admin-web dev
# → http://localhost:3000
```

### Run All Services (dev)

```bash
pnpm dev
```

### Run Tests

```bash
# Unit tests for a single service
pnpm --filter @vote-capsule/evidence-service test

# All services (CI matrix)
pnpm test

# Integration tests (requires live API_BASE_URL + COGNITO_CLIENT_ID env vars)
cd tests/integration && pnpm test -- --runInBand
```

---

## Architecture

### Technology Stack

| Layer | Technology |
|-------|-----------|
| Language | TypeScript 5.7 (strict mode) |
| Backend | NestJS 10 |
| Frontend | React 18 + Vite + Tailwind CSS |
| Mobile | React Native / Expo (agent + validator) |
| Database | Aurora PostgreSQL 16.8 Serverless v2 (TypeORM) |
| Cache | ElastiCache Redis 7.1 (ioredis) |
| Auth | Amazon Cognito User Pool + JWT (InitiateAuth) |
| AI | AWS Bedrock — Claude Sonnet 4.5 (us-east-1 inference profile) |
| Trust | Hedera Consensus Service (testnet) + RFC 3161 (FreeTSA.org) |
| Search | OpenSearch 2.11 |
| Orchestration | AWS Step Functions (5 state machines) |
| Events | EventBridge + SQS |
| CDN | CloudFront (6 distributions) |
| IaC | AWS CDK (TypeScript) |
| CI/CD | GitHub Actions + AWS CodeBuild + OIDC (no static keys) |
| Monorepo | Turborepo + pnpm workspaces |
| Container | Docker → ECR → ECS Fargate |

### Capsule Lifecycle

```
DRAFT → CAPTURED → QUEUED → UPLOADING → UPLOADED
  → AI_PROCESSING → AI_VERIFIED → PENDING_VALIDATION
  → APPROVED → ANCHORED → PUBLISHED
```

### Form Chain (IEBC)

```
Form 34A / 35A (polling station)
  → Form 34B / 35B (constituency collation)
  → Form 34C / 35C (county / national)

Invariant: SUM(Form As) == Form B == Form C
```

### AI Routing Thresholds

| Score | Action |
|-------|--------|
| > 0.85 | AUTO_APPROVE (human review optional) |
| 0.60 – 0.85 | HUMAN_REVIEW (validator queue) |
| < 0.60 | ESCALATE (senior review required) |

---

## Live Infrastructure

**AWS Account:** `683541453923` | **Region:** `us-east-1`

### Endpoints

| Resource | URL |
|----------|-----|
| API Gateway | `https://483uyy43nc.execute-api.us-east-1.amazonaws.com` |
| Admin Portal | `https://votecapsule.yna.co.ke` |
| Public Transparency | `https://transparency.votecapsule.yna.co.ke` |
| Authority Portal | `https://authority.votecapsule.yna.co.ke` |
| Party Portal | `https://party.votecapsule.yna.co.ke` |
| Candidate Portal | `https://candidate.votecapsule.yna.co.ke` |
| Observer Portal | `https://observer.votecapsule.yna.co.ke` |

### CloudFormation Stacks (all CREATE_COMPLETE)

`VoteCapsuleFoundationStack` · `VoteCapsuleStorageStack` · `VoteCapsuleEventsStack` ·
`VoteCapsuleSecretsStack` · `VoteCapsuleDatabaseStack` · `VoteCapsuleComputeStack` ·
`VoteCapsuleAPIGatewayStack` · `VoteCapsuleCacheStack` · `VoteCapsuleHostingStack` ·
`VoteCapsuleWAFStack` · `VoteCapsuleDynamoDBStack` · `VoteCapsuleMonitoringStack` ·
`VoteCapsuleSearchStack` · `VoteCapsuleECSPhase7Stack` · `VoteCapsuleECSPhase8Stack` ·
`VoteCapsuleECSPhase9Stack`

### ECS Services (all running)

All 13 services deployed on ECS Fargate behind ALB path-based routing. Critical services (identity, evidence, geography, election) run at 2 replicas for election-day capacity.

---

## CI/CD

All workflows use OIDC role assumption — zero static AWS credentials in GitHub secrets.

| Workflow | Trigger | What it does |
|----------|---------|-------------|
| `build-and-push-services.yml` | Push to `main`/`master` on `services/**` | Builds 13 Docker images → pushes to ECR |
| `deploy-portals.yml` | Push to `main`/`master` on `apps/**` | Builds 6 portals → syncs to S3 → invalidates CloudFront |
| `test.yml` | Push + PR | Unit tests across 13 services (matrix) + integration tests |
| `deploy-cdk.yml` | Push on `infrastructure/cdk/**` | CDK diff + deploy |
| `build-mobile-apps.yml` | Push on `apps/agent-mobile/**` or `apps/validator-mobile/**` | EAS build (Expo) |
| `claude-agent.yml` | Comment `@claude` on any PR/issue | AI-assisted code review and fixes (AWS Bedrock) |
| `codeguru-reviewer.yml` | Push + PR | CodeGuru security and quality analysis |

**pnpm version** is read from `package.json` `"packageManager": "pnpm@9.14.4"` — do not set `version:` in `pnpm/action-setup` steps.

### CI/CD Standards — Node & pnpm Versions

| Layer | Version | Source of truth |
|-------|---------|----------------|
| Node.js (CI) | 22 | `setup-node: node-version: 22` in all workflows |
| Node.js (Docker) | `node:22-alpine` | All 13 service Dockerfiles + `apps/admin-web/Dockerfile` |
| Node.js (local) | 22 | `.nvmrc` at repo root — run `nvm use` |
| pnpm (CI) | 9.14.4 | `package.json` `"packageManager"` field — read automatically by `pnpm/action-setup@v4` |
| pnpm (Docker) | 9.14.4 | `corepack enable && corepack prepare pnpm@9.14.4 --activate` |
| Node engines | `>=22.0.0` | `package.json` `"engines"` field |

#### Rules — do not break these

- Never add `version:` to a `pnpm/action-setup@v4` step. The action reads from `package.json` `"packageManager"`. Specifying both causes `ERR_PNPM_BAD_PM_VERSION` and the job fails immediately.
- Never use `npm install -g pnpm` in Dockerfiles. Use `corepack enable && corepack prepare pnpm@9.14.4 --activate` instead (corepack is bundled with Node 22 Alpine).
- Never downgrade Node to 20 in any workflow or Dockerfile. Node 20 is deprecated on GitHub Actions runners as of September 2025.

#### Fixes applied (2026-08-08)

The following issues were discovered and fixed in CI — recorded here so they are not reintroduced:

**1. pnpm double-version conflict** — `pnpm/action-setup@v4` started throwing `Multiple versions of pnpm specified` because `version: 9` was set in 7 workflow files while `package.json` already declared `"packageManager": "pnpm@9.14.4"`. Fix: removed `version:` from all `pnpm/action-setup` steps across `test.yml`, `deploy-portals.yml`, `deploy-cdk.yml`, `build-mobile-apps.yml`, `rate-openapi.yml`, `google-play-submit.yml`.

**2. Node 20 deprecation** — GitHub Actions runners print a deprecation warning for Node 20 workflows and will eventually refuse to run them. Fix: all 14 Dockerfiles (`services/*/Dockerfile` + `apps/admin-web/Dockerfile`) upgraded from `node:20-alpine` → `node:22-alpine`. All `setup-node` steps already targeted Node 22.

**3. Frozen lockfile mismatch** — `packages/test-utils` was added to the workspace without running `pnpm install` to regenerate `pnpm-lock.yaml`. CI's `pnpm install --frozen-lockfile` then fails with `ERR_PNPM_OUTDATED_LOCKFILE`. Additionally `@nestjs/testing` and `jest` were listed as `peerDependencies` in `test-utils/package.json` while the lockfile recorded them as `dependencies`. Fix: moved both to `dependencies` in `packages/test-utils/package.json`. **Action required: run `pnpm install` locally and commit the updated `pnpm-lock.yaml`** (see Pending section below).

---

## Security Contracts (Locked — Never Change)

| Contract | Value |
|----------|-------|
| SHA-256 formula | `SHA-256(imageSHA256 + sortedMetadataJSON + captureTimestamp)` |
| User-facing trust language | **"Integrity Verified"** — never "blockchain" |
| NEC geography | Single Source of Truth — never duplicate station data |
| Evidence immutability | Immutable after dual-anchor confirmation (Hedera + RFC 3161) |
| DB credentials | AWS Secrets Manager only — never in code or `.env` files committed to git |
| Smart contracts | None — platform has zero on-chain logic |
| Firebase key | `firebase-service-account.json` — never commit to git |

---

## System Roles

| Role | Scope |
|------|-------|
| `PLATFORM_SUPER_ADMIN` | Full platform access |
| `TENANT_ADMIN` | Tenant management |
| `ELECTION_COMMISSIONER` | Election lifecycle management |
| `RETURNING_OFFICER` | Constituency-level oversight |
| `PRESIDING_OFFICER` | Polling station management |
| `CAPSULE_AGENT` | Evidence submission (mobile) |
| `VALIDATOR` | Evidence validation queue |
| `PARTY_ADMIN` / `PARTY_AGENT` | Party portal access |
| `CANDIDATE` | Candidate portal access |
| `OBSERVER_ADMIN` / `OBSERVER_AGENT` | Observer portal access |
| `MEDIA_ADMIN` / `MEDIA_REPORTER` | Media access |
| `PUBLIC` | Public transparency portal |
| `SUPPORT_ADMIN` | Platform support |

---

## Development Notes

- **NEC is the Single Source of Truth for geography.** Never create county/constituency/ward/station records outside the `nec_*` tables managed by the Geography service.
- **Never modify applied migrations.** Create a new migration file instead.
- **Agent mobile SHA-256** must use the exact formula above — the formula is validated server-side on every capsule submission.
- `packages/test-utils` provides shared Jest mocks (TypeORM repository, Redis, Cognito) for all service unit tests.
- Redis keys follow the pattern: `vc:session:*`, `vc:blacklist:*`, `vc:login_attempts:*`

### Useful Commands

```bash
# Type-check all packages
pnpm typecheck

# Lint all packages
pnpm lint

# Type-check a single service
cd services/evidence && pnpm tsc --noEmit

# Run a specific service's tests with coverage
pnpm --filter @vote-capsule/trust-service test -- --coverage

# Generate a new migration
cd database && pnpm migration:generate src/migrations/MyMigrationName
```

---

## Pending (Sonie — Production Hardening)

### 1. Regenerate pnpm-lock.yaml — BLOCKER for CI tests

`packages/test-utils` was added to the workspace and its `package.json` was updated, but `pnpm-lock.yaml` has not been regenerated to match. Until this is done, `pnpm install --frozen-lockfile` fails in every CI job with:

```
ERR_PNPM_OUTDATED_LOCKFILE  Cannot install with "frozen-lockfile" because
pnpm-lock.yaml is not up to date with packages/test-utils/package.json
```

**Fix — run locally and commit:**

```bash
cd D:\Votecapsule\vote-capsule

# Regenerate the lockfile (updates pnpm-lock.yaml to match all package.json files)
pnpm install

# Commit everything changed by this session + the fresh lockfile
git add pnpm-lock.yaml
git add packages/test-utils/package.json
git add .github/workflows/
git add services/*/Dockerfile
git add apps/admin-web/Dockerfile
git add package.json
git add .nvmrc
git add README.md

git commit -m "fix(ci): resolve pnpm lockfile mismatch, Node 22, version standardisation

- Regenerate pnpm-lock.yaml (test-utils peerDeps → deps)
- Remove explicit version: 9 from all pnpm/action-setup steps
- Upgrade all Dockerfiles: node:20-alpine → node:22-alpine
- Replace npm install -g pnpm with corepack (pinned pnpm@9.14.4)
- Update engines field: node >=22.0.0
- Add .nvmrc (22) for local dev
- Fix admin-web TypeScript: getCapsulesByCounty, electionType, ledgerDigest.at
- Update README with current platform state and CI/CD standards"

git push
```

After this push, the **Build & Push**, **Test Suite**, and **Deploy Portals** workflows should all pass.

### 2. Exit Amazon SES Sandbox

Email notifications are currently blocked to unverified addresses. SES is in sandbox mode.

**Fix — manual in AWS Console:**
1. Go to AWS SES Console → Account dashboard → `Request production access`
2. Fill in use case: transactional election notifications (~50k recipients)
3. Approval takes 24–48 hours

Domain is already verified, DKIM tokens are active, DMARC/SPF/MX records are set.

### 3. Hedera Mainnet Migration

The platform currently uses Hedera **testnet** (account `0.0.4426239`, topic `0.0.9871113`). For production elections, switch to mainnet.

**Fix — after purchasing HBAR:**
```bash
# Register mainnet account at portal.hedera.com, then:
node infrastructure/scripts/hedera-mainnet-migration.js
node infrastructure/scripts/pin-hedera-topic.js
# Updates Secrets Manager with mainnet credentials
```

### 4. Google Play Internal Testing

The Agent Mobile app is built and EAS-configured but not yet uploaded to the Play Console.

**Fix — manual:**
1. Create app in [Google Play Console](https://play.google.com/console)
2. Retrieve Google Play service account JSON from AWS Secrets Manager (`vote-capsule/google-play/service-account`)
3. Trigger the `google-play-submit.yml` workflow via `workflow_dispatch`

---

*Last updated: 2026-08-08 — Phase 12 complete. All 13 services live. 299 unit tests. 6 portals deployed.*
*Built by: CTO Agent + Sonie (Platform Infrastructure Engineer)*
