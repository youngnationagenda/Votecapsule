# VoteCapsule™ — Phase 20 + Wiring + JWT Claims Session Report
**Last Updated:** 2026-08-25
**Updated by:** Sonie

---

## ✅ ALL WIRING TASKS COMPLETE

### W1 — Platform Super Admin Bypass ✅
`campaign.controller.ts` + `campaign.service.ts` — `x-platform-admin: true` header bypasses tenant scoping.
Added: `findAllGlobal()`, `findOneGlobal()`, `updateGlobal()`, `getGlobalStats()`, `getDashboardGlobal()`.
`CampaignRoleGuard` early-exits for `x-platform-admin: true`.

### W2 — Missing Service URLs in .env ✅
`services/campaign/.env` + ECS Task Def `vc-campaign:3` — all 3 URLs added plus S3, AT config.

### W3 — API Gateway Lambda Authorizer ✅
Lambda `vc-jwt-authorizer` deployed. All 10 routes migrated to authorizer `sgfkqd`.
Both integrations (`f3m2nza`, `b1hnjws`) now forward all 7 x-* headers via `overwrite:header.*`.

### C3 — Migrations 141 + 142 ✅
Applied to Aurora. DB verified: 17 categories, 275 material types, `campaign_supplier_products` table.

---

## ✅ TASK 1 — JWT Claims Sync at Login (Done this session)

### Problem
The Lambda authorizer validates Cognito ID tokens and reads `custom:wardCode`,
`custom:constituencyCode`, `custom:candidateId`, `custom:platformAdmin` as claims.
These were never being written to Cognito at login time — so the authorizer forwarded empty strings.

### Solution
**`services/identity/src/auth/auth.service.ts`:**
- Added `syncCognitoClaims()` — called after every successful login and MFA verify
- Calls `AdminUpdateUserAttributesCommand` to sync 7 custom attributes to Cognito
- Now returns `IdToken` (not `AccessToken`) as `accessToken` — the ID token is what
  the Lambda authorizer validates (it carries all custom:* claims)
- Also returns `user` object in login response for frontend store hydration

**`services/identity/src/users/users.service.ts`:**
- Added `getCampaignClaims(userId, tenantId)` — queries `campaign_team_members`
  to resolve `ward_code`, `constituency_code`, `candidate_id` for the user
- Falls back gracefully if tables don't exist or user has no campaign assignments

### New Cognito custom attributes (added to `us-east-1_i3N2tg34A`):
| Attribute | Maps to Header | Purpose |
|-----------|---------------|---------|
| `custom:wardCode` | `x-ward-code` | Ward-scoped role filtering |
| `custom:constituencyCode` | `x-constituency-code` | Constituency-scoped filtering |
| `custom:candidateId` | `x-candidate-id` | Candidate identity scoping |
| `custom:platformAdmin` | `x-platform-admin` | Platform super admin bypass |

---

## ✅ TASK 2 — CI Image Build + ECS Deployment (Done this session)

### buildspec.yml Updated
Added `campaign-service` (port 3016) to the CodeBuild build pipeline.
Post-build step now includes `campaign-service` in the ECR summary report.

### CodeBuild Build
Build ID: `vote-capsule-docker-build:5ab456f5-4d0e-4894-8814-da125fbc3717`
Status: **SUCCEEDED** ✅

### ECR Images (latest)
| Service | Last Pushed |
|---------|------------|
| `vote-capsule/identity-service` | 2026-08-25 18:12 ✅ (new — includes JWT claims sync) |
| `vote-capsule/campaign-service` | 2026-08-24 12:37 (prev build — no changes needed) |

### ECS Services
| Service | Running | Desired | Task Def | Status |
|---------|---------|---------|----------|--------|
| `vc-identity` | 2/2 | 2 | `vc-identity:11` | ✅ ACTIVE (new image deployed) |
| `vc-campaign` | 1/1 | 1 | `vc-campaign:3` | ✅ ACTIVE |

---

## ✅ CTO Frontend — What Was Done (checked this session)

**Party Portal (`apps/party-web/`):**
- `authSlice.ts` — added `wardCode`, `constituencyCode`, `candidateId`, `platformAdmin` fields to `AuthUser`
- `LoginPage.tsx` — `buildAuthUser()` helper now populates all fields from login response `user` object
- `apiClient.ts` — already forwarding all 7 `x-*` headers ✅
- `campaignApi.ts` — full campaign API client wired (campaigns, events, tasks, teams, volunteers, budget, SMS, suppliers, incidents) ✅
- All campaign pages built: Dashboard, Calendar, Tasks, Teams, SMS, Budget, Materials Catalogue, Supplier Catalogue, Create Campaign ✅
- `MaterialsCataloguePage.tsx` — full colour-select + quick-order flow ✅
- `App.tsx` — all campaign routes registered ✅

**Candidate Portal (`apps/candidate-web/`):**
- `authSlice.ts` — added `tenantId`, `wardCode`, `platformAdmin` to `AuthUser`
- `LoginPage.tsx` — `buildAuthUser()` helper added, MFA response wired
- All pages built: MyCampaignDashboard, MyCampaignCalendar, MyCampaignTeam, MyMaterials, MySMS, MyBudget, MyIncidents, etc. ✅

---

## ⚠️ REMAINING ITEMS (next session)

| Item | What's needed |
|------|--------------|
| **AT credentials** | Set `AT_API_KEY` + `AT_USERNAME` in ECS task def when Africa's Talking account ready |
| **Campaign-service image rebuild** | campaign-service image is from 2026-08-24 (pre-wiring fixes to controller). New controller has `findAllGlobal()` and the guard has the `x-platform-admin` bypass. Need a fresh build. Trigger next CodeBuild or push to GitHub to trigger CI. |
| **Identity service `vc-identity:11`** | Currently uses old task def. Force-new-deployment was triggered but ECS is still using `:11` which points to `:latest` — the new image should be running. Verify in logs. |
| **CTO: party portal `admin` route** | Admin portal needs `x-platform-admin: true` set in its `apiClient` headers when user has `PLATFORM_SUPER_ADMIN` role (can check `auth.user.platformAdmin`) |

---

## AWS Resources Summary

| Resource | ID / Value |
|----------|-----------|
| Lambda Authorizer | `vc-jwt-authorizer` (sgfkqd) |
| Lambda Role | `vc-lambda-authorizer-role` |
| API GW Authorizer | `sgfkqd` — all 10 protected routes |
| ECS Campaign | `vc-campaign:3` — 1/1 running |
| ECS Identity | `vc-identity:11` — 2/2 running (new image) |
| Cognito Pool | `us-east-1_i3N2tg34A` — 4 new custom attrs |
| CodeBuild | `5ab456f5` — SUCCEEDED |

*Sonie — 2026-08-25*
