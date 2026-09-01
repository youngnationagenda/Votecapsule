# Sonie — Master Backend Task List
**Date:** 2026-09-01  
**Last Updated:** 2026-09-01 — full live audit by Sonie  
**Status:** Every item verified against codebase + AWS live state.

---

## ✅ PRIORITY 1 — CI Fixed

### CI Fix 1 — `campaign.service.spec.ts` ✅ DONE
- `DataSource` mock added (`mockDataSource = { query: vi.fn() }`)
- Injected as second arg: `new CampaignService(mockRepo, mockDataSource)`
- 22/22 tests pass — **verified locally**

### CI Fix 2 — `auth.service.spec.ts` ✅ DONE
- Login expectation: `accessToken: 'cognito-id-token'` + `user: { id, email, roles, tenantId }`
- verifyMfa expectation: `accessToken: 'mfa-access-token'` + same `user` shape
- Stale `jwtService.sign` assertion removed
- 36/36 identity service tests pass — **verified locally**

### PR Quality Gate ✅ DONE
- `campaign` added as 14th service in `pr-quality-gate.yml` matrix
- Was previously missing — failures only caught on push to master, not on PRs

---

## ✅ PRIORITY 2 — Wiring Fixes

### W1 — Platform Admin cross-tenant bypass ✅ DONE
`campaign.controller.ts` — all endpoints check `x-platform-admin: true` header:
- `GET /campaigns` → `findAllGlobal()`
- `GET /campaigns/:id` → `findOneGlobal()`
- `PUT /campaigns/:id` → `updateGlobal()`
- `GET /campaigns/:id/dashboard` → `getDashboardGlobal()`
- `GET /campaigns/stats` → `getGlobalStats()`

### W2 — Missing service URLs in campaign env ✅ DONE
All confirmed in `vc-campaign:9` (current running task definition):
- `GEOGRAPHY_SERVICE_URL` ✅
- `CANDIDATE_SERVICE_URL` ✅
- `TENANT_SERVICE_URL` ✅
- `CAMPAIGN_MEDIA_BUCKET=votecapsule-campaign-assets` ✅
- `S3_SIGNED_URL_EXPIRY=3600` ✅
- `PUBLIC_ASSETS_BUCKET=votecapsule-public-assets` ✅
- `PUBLIC_ASSETS_BASE_URL=https://assets.votecapsule.yna.co.ke` ✅
- `CAMPAIGN_ASSETS_BASE_URL=https://d1campaign.votecapsule.yna.co.ke` ✅

### W3 — API Gateway role header forwarding ✅ DONE
Integration forwards all headers from JWT claims:
`x-user-id`, `x-tenant-id`, `x-user-role`, `x-ward-code`,
`x-constituency-code`, `x-candidate-id`, `x-platform-admin`

---

## ✅ PRIORITY 3 — Campaign Roles & Guard

### Task A — Campaign Roles seeded ✅ DONE (migration 139)
10 roles confirmed in DB:
`PARTY_CAMPAIGN_DIRECTOR`, `CANDIDATE_CAMPAIGN_PRINCIPAL`, `CAMPAIGN_MANAGER`,
`CONSTITUENCY_COORDINATOR`, `WARD_COORDINATOR`, `LOGISTICS_OFFICER`,
`FINANCE_OFFICER`, `COMMUNICATIONS_OFFICER`, `BRAND_MANAGER`, `CAMPAIGN_VOLUNTEER`

### Task B — CampaignRoleGuard ✅ DONE
- File: `services/campaign/src/common/campaign-role.guard.ts`
- Full role → module access mapping implemented
- Registered as global `APP_GUARD` in `app.module.ts`

### Task C — getDashboard() real COUNT queries ✅ DONE
8 parallel `DataSource.query()` calls:
`eventsCount`, `teamCount`, `tasksActive`, `volunteersCount`,
`budgetUsed`, `iebcStatus`, `smsSent`, `incidentsOpen`, `wardCoverage`

### Task D — Role Assignment Endpoints ✅ DONE
`POST/GET/PATCH/DELETE /campaigns/:id/roles` in `teams.controller.ts`
`syncRoleToIdentity()` called on assign + update

---

## ✅ PRIORITY 4 — Phase 14B Backend Modules

### B1 — Materials Module ✅ DONE
`services/campaign/src/materials/`
- `GET /materials/categories` — 17 live
- `GET /materials/types` — 275 live, category join working
- `GET/POST/PATCH /materials/types/:id`
- `POST/GET/PATCH /campaigns/:id/materials/orders`
- `PATCH /campaigns/:id/materials/orders/:oid/approve`
- `GET /campaigns/:id/materials/inventory`
- `POST /campaigns/:id/materials/distributions`
- `GET/POST/PUT /suppliers` + `/suppliers/:id/products`

### B2 — Outdoor Advertising Module ✅ DONE
`services/campaign/src/outdoor/`
- CRUD for placements + condition reporting
- GPS auto-resolve (ward/constituency/county from Geography Service)

### B3 — Media / S3 Module ✅ DONE
`services/campaign/src/media/`
- `POST /campaigns/:id/media/upload-url` — presigned PUT, `{ data: { upload_url, media_id, expires_in: 900 } }`
- `GET /campaigns/:id/media` — list with `media_type` filter, `{ data: [...] }`
- `GET /campaigns/:id/media/:mid/url` — signed GET URL, `{ data: { url, expires_in: 3600 } }`
- `GET /campaigns/:id/media/:mid/thumbnail`
- `GET /campaigns/:id/media/:mid/preview`
- `DELETE /campaigns/:id/media/:mid` — deletes DB record + S3 object
- `PATCH /campaigns/:id/media/:mid` — updates description/tags
- `POST /campaigns/:id/media/:mid/publish` — copies to `votecapsule-public-assets`, `{ data: { publicUrl, publicKey } }`

### B4 — Logistics Module ✅ DONE
`services/campaign/src/logistics/`
- Vehicles: CRUD + GPS update + status + trip recording
- Equipment: CRUD + status log (always written in transaction)

### B5 — Design / AI Mockup Engine ✅ DONE
`services/campaign/src/design/`
- Sharp + node-canvas compositing mockup engine
- `BedrockImageService` — 14 Stability AI inference profiles
- `GET /ai-images/models`
- `POST /campaigns/:id/ai-images/generate`
- `GET /campaigns/:id/ai-images`
- `POST /campaigns/:id/ai-images/upscale`
- `POST /campaigns/:id/ai-images/remove-background`

---

## ✅ PRIORITY 5 — Seed Data

### Migration 138 — 275 Material Types ✅ DONE
275 types seeded across 17 categories. Confirmed live via `verify-all-campaign.js`

### Migration 164 — Thumbnail URLs ✅ DONE
`thumbnail_url` seeded for all categories + types.
URLs: `https://d1campaign.votecapsule.yna.co.ke/catalogue/...`
Coverage: **275/275 (100%)**

### Migration 165 — campaign_media enhancements ✅ DONE
Added: `media_type`, `scan_status` (default `pending`), `exif_data` (JSONB),
`preview_key`, `public_key`, `idx_cm_media_type` index.
Applied: `2026-08-31T22:04:16Z`

---

## ✅ PRIORITY 6 — Communications (Phase 14C)

### C1 — Africa's Talking SMS ✅ FRAMEWORK COMPLETE
`services/campaign/src/communications/providers/africas-talking.provider.ts`

**What's built:**
- Full `AfricasTalkingProvider` with chunk-of-100 dispatch
- DB audience resolution: `all_volunteers`, `all_team`, `all`, `ward`, `role`, `custom`
- Consent/opt-out check via `campaign_sms_consents` table
- Per-recipient template variable rendering (`{{firstName}}`, `{{ward}}`, etc.)
- `POST /campaigns/:id/sms/send` → dispatches, writes per-message records, updates batch stats
- Auto-creates expense record after batch: `successCount × KES 0.80`
- `POST /webhooks/at/delivery` — updates message status, increments delivered_count on batch

**⚠️ BLOCKED on credentials — running in mock mode:**
- `AT_API_KEY` = empty → logs only, no real sends
- `AT_USERNAME` = `sandbox` → needs production username
- **Action required:** Provide AT production credentials → update ECS task def env vars

---

## ✅ PRIORITY 7 — AI Images (Bedrock)

### IAM Permissions ✅ DONE
Inline policy `bedrock-stability-ai` on `vote-capsule-ecs-task-execution-role`:
`bedrock:InvokeModel`, `bedrock:InvokeModelWithResponseStream`,
`bedrock:ListFoundationModels`, `bedrock:GetFoundationModel`, `bedrock:ListInferenceProfiles`
Resources: `foundation-model/stability.*` + `inference-profile/us.stability.*`

### Models ✅ ACTIVE
All 14 Stability AI inference profiles confirmed ACTIVE in Bedrock us-east-1.

### ⚠️ Payment Method Required
Add payment method at:
`https://console.aws.amazon.com/bedrock/home?region=us-east-1#/model-access`
Frontend already shows "Payment Method Required" banner when blocked.

---

## ✅ PRIORITY 8 — Module Registration ✅ DONE

`app.module.ts` registers all modules:
`CampaignModule`, `EventsModule`, `TasksModule`, `TeamsModule`, `BudgetModule`,
`CommunicationsModule`, `MaterialsModule`, `OutdoorModule`, `MediaModule`,
`DesignModule`, `LogisticsModule`

---

## ✅ IMAGE DISPLAY BUG — FIXED (2026-09-01)

**Root cause:** CloudFront `E149XY0JAVY7G` (`d1campaign.votecapsule.yna.co.ke`) had no
`ResponseHeadersPolicyId` — browsers blocked all image loads due to missing CORS headers.

**Fix:**
- `Managed-CORS-With-Preflight` policy (`5cc3b908-...`) attached
- `AllowedMethods` expanded to include `OPTIONS`
- `ForwardedValues.Headers: [Origin]`

**Verified:** `Access-Control-Allow-Origin: https://party.votecapsule.yna.co.ke` ✅
Distribution: **Deployed**

---

## ✅ BRAND ASSETS CDN — DONE (2026-09-01)

**`https://assets.votecapsule.yna.co.ke` fully provisioned:**

| Resource | Detail | Status |
|---|---|---|
| CloudFront `E1YNDOIGJNPTWJ` | `d1qtfhl1lgkmur.cloudfront.net` | ✅ Deployed |
| Origin | `votecapsule-public-assets` S3 | ✅ |
| ACM cert | `*.votecapsule.yna.co.ke` (wildcard, already ISSUED) | ✅ |
| CORS policy | `Managed-CORS-With-Preflight` | ✅ |
| Route 53 CNAME | `assets.votecapsule.yna.co.ke → d1qtfhl1lgkmur.cloudfront.net` | ✅ INSYNC |
| S3 CORS | GET + HEAD from all portal origins | ✅ |
| ECS `vc-campaign:9` | `PUBLIC_ASSETS_BASE_URL=https://assets.votecapsule.yna.co.ke` | ✅ Running 1/1 |

**Verified:** `200 OK` + `Access-Control-Allow-Origin: https://candidate.votecapsule.yna.co.ke` ✅

**Serves:**
- `parties/{partyCode}/logo.{ext}` — `POST /media/:id/publish` with `party_logo`
- `candidates/{id}/portrait.{ext}` — `candidate_portrait`
- `candidates/{id}/symbol.{ext}` — `candidate_symbol`
- `brand/{tenantId}/{mediaId}.{ext}` — all other published assets

---

## AWS Infrastructure — Current State

| Resource | Revision/ID | Status |
|---|---|---|
| ECS `vc-campaign` | `:9` | ✅ Running 1/1 ACTIVE |
| CloudFront campaign CDN | `E149XY0JAVY7G` | ✅ Deployed + CORS |
| CloudFront public assets CDN | `E1YNDOIGJNPTWJ` | ✅ Deployed + CORS |
| Lambda `campaign-media-processor` | nodejs20.x | ✅ Active, S3 trigger on PutObject |
| S3 `votecapsule-campaign-assets` | — | ✅ Public `/catalogue/*` + `/suppliers/*` |
| S3 `votecapsule-public-assets` | — | ✅ Public-read + CORS |
| Route 53 `assets.votecapsule.yna.co.ke` | — | ✅ CNAME INSYNC |
| Migration 165 | — | ✅ Applied 2026-08-31 |

---

## ⚠️ Remaining Items — External Action Only

| Item | Status | Action Needed |
|---|---|---|
| `AT_API_KEY` | Empty — mock mode | Provide Africa's Talking production API key |
| `AT_USERNAME` | `sandbox` | Change to production AT username |
| Bedrock payment method | Not enabled | Add at AWS console → Bedrock model access |

**No backend code work remains. All modules, migrations, infrastructure, and CI are done.**

---

## Final Checklist

### ✅ CI
- [x] campaign.service.spec.ts — DataSource mock
- [x] auth.service.spec.ts — Cognito IdToken + user shape
- [x] campaign in PR quality gate matrix

### ✅ Wiring
- [x] x-platform-admin bypass on all campaign endpoints
- [x] All service URLs + public asset URLs in vc-campaign:9
- [x] API Gateway forwards all role headers

### ✅ Roles & Guard
- [x] 10 campaign roles seeded in DB
- [x] CampaignRoleGuard as APP_GUARD
- [x] getDashboard() 8 real COUNT queries
- [x] Role assignment CRUD endpoints

### ✅ Phase 14B (all 5 modules)
- [x] Materials — 17 categories, 275 types, orders, inventory, distributions, suppliers
- [x] Outdoor — placements, conditions, GPS auto-resolve
- [x] Media — upload-url, list, signed GET, thumbnail, preview, DELETE, publish
- [x] Logistics — vehicles, trips, equipment, logs
- [x] Design — mockup engine, Bedrock AI, 14 Stability AI models

### ✅ Phase 14C
- [x] AT provider (mock fallback when no API key)
- [x] DB audience resolution (volunteers + team + geo + opt-out)
- [x] Per-recipient template rendering
- [x] Auto-expense KES 0.80/msg after send
- [x] Delivery webhook `POST /webhooks/at/delivery`
- [ ] AT production credentials *(external)*

### ✅ Database
- [x] Migrations 134–142 applied
- [x] Migration 164: 275/275 thumbnails
- [x] Migration 165: media_type, scan_status, exif_data, preview_key, public_key

### ✅ Bedrock / AI
- [x] IAM permissions on ECS task role
- [x] 14 Stability AI models ACTIVE
- [ ] Payment method *(external)*

### ✅ Image Display
- [x] d1campaign CloudFront CORS fixed
- [x] assets.votecapsule.yna.co.ke CloudFront created + DNS live
- [x] vc-campaign:9 with correct env vars
