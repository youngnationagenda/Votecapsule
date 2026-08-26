# VoteCapsule™ — Platform Status Report
**Last Updated:** 2026-08-26  
**Updated by:** Sonie  

---

## ✅ PLATFORM STATUS — ALL SYSTEMS OPERATIONAL

### ECS Services (14/14 Healthy)
| Service | Running | Task Def | Status |
|---------|---------|----------|--------|
| `vc-identity` | 2/2 | `vc-identity:11` | ✅ HEALTHY |
| `vc-campaign` | 1/1 | `vc-campaign:5` | ✅ HEALTHY |
| `vc-candidate` | 1/1 | `vc-candidate:7` | ✅ HEALTHY (fixed stale digest) |
| `vc-election` | 2/2 | current | ✅ HEALTHY |
| `vc-evidence` | 2/2 | `vc-evidence:12` | ✅ HEALTHY (fixed stale digest) |
| `vc-geography` | 2/2 | `vc-geography:11` | ✅ HEALTHY (fixed stale digest) |
| `vc-trust` | 1/1 | `vc-trust:14` | ✅ HEALTHY (fixed stale digest) |
| `vc-notification` | 1/1 | current | ✅ HEALTHY |
| `vc-reporting` | 1/1 | `vc-reporting:7` | ✅ HEALTHY (fixed stale digest) |
| `vc-workflow` | 1/1 | current | ✅ HEALTHY |
| `vc-audit` | 1/1 | `vc-audit:7` | ✅ HEALTHY (fixed stale digest) |
| `vc-billing` | 1/1 | current | ✅ HEALTHY |
| `vc-ai` | 1/1 | current | ✅ HEALTHY |
| `vc-tenant` | 1/1 | current | ✅ HEALTHY |

### CloudFront Portals (6/6 Live)
| Portal | URL | CloudFront ID | Status |
|--------|-----|---------------|--------|
| Admin | `admin.votecapsule.yna.co.ke` | `E2J8YA2BP1UC1H` | ✅ LIVE |
| Party | `party.votecapsule.yna.co.ke` | `E2K6MDXEZZ7UYS` | ✅ LIVE |
| Candidate | `candidate.votecapsule.yna.co.ke` | `E1O4XZRM79VCJ1` | ✅ LIVE (deployed 2026-08-26) |
| Authority | `authority.votecapsule.yna.co.ke` | `E1Z32G6YW54GHT` | ✅ LIVE |
| Observer | `observer.votecapsule.yna.co.ke` | `EZEXQ23EU9E55` | ✅ LIVE |
| Landing | `votecapsule.yna.co.ke` | `E1V2ZCAIR6N7D0` | ✅ LIVE |

### API Gateway
| Resource | Value |
|----------|-------|
| ID | `483uyy43nc` |
| Endpoint | `https://483uyy43nc.execute-api.us-east-1.amazonaws.com` |
| CORS Origins | 19 (includes localhost:5173/5174, candidate.votecapsule.co.ke) |
| CORS Headers | 13 (all x-* campaign role headers included) |
| Authorizer | `vc-jwt-authorizer` (Lambda) on all protected routes |

### ALB
| Resource | Value |
|----------|-------|
| DNS | `vote-capsule-services-alb-181601180.us-east-1.elb.amazonaws.com` |
| Routing rules | 15 path-pattern rules (P10–P125) + default health response |
| Campaign route | `P125: /api/v1/campaign/*` → `vc-campaign-tg` (port 3016) ✅ |

---

## ✅ SESSION WORK COMPLETED (2026-08-26)

### 1. Role Assignment + Cognito Sync (CTO Task)
- **Identity Service**: Added `PATCH /users/:id/attributes` endpoint → `UpdateCognitoAttributesDto`
- **Campaign Service**: `TeamsService.assignRole()` + `updateRole()` now call Identity Service after DB write to sync `custom:roles`, `custom:wardCode`, `custom:constituencyCode`, `custom:candidateId` into Cognito
- **Flow**: Candidate assigns role → DB write → HTTP PATCH to identity → `AdminUpdateUserAttributes` → next JWT carries correct role claim → `CampaignRoleGuard` grants access

### 2. Cognito User Roles Fixed (59 users)
All portal users updated with correct `custom:roles`:
- `superadmin@votecapsule.co.ke` → `["PLATFORM_SUPER_ADMIN"]` + `platformAdmin:true`
- `candidate@votecapsule.co.ke` → `["CANDIDATE"]`
- `ccm@votecapsule.co.ke` → `["CAMPAIGN_MANAGER"]`
- `authority@votecapsule.co.ke` → `["ELECTION_AUTHORITY_ADMIN"]`
- `observer@votecapsule.co.ke` → `["OBSERVER"]`
- All 45 party users → `["PARTY_ADMIN"]`

### 3. API Gateway CORS
All 13 role headers in `AllowHeaders`. 19 origins including:
- `http://localhost:5173`, `http://localhost:5174` (Vite dev)
- `https://candidate.votecapsule.co.ke`, `https://app.votecapsule.co.ke`

### 4. S3 Campaign Assets CORS
`votecapsule-campaign-assets` CORS configured for all portal origins.

### 5. Candidate Portal Deployed
- Build: 2649 modules, 36.66s, zero errors
- S3 upload: 32 files → `vote-capsule-candidate-portal-683541453923`
- CloudFront invalidation: `IE9KW2XCAI1R619FUZHMK62FAU` (all paths)
- Pages live: `/campaign/team` (My Team & Roles), `/campaign/printing` (Printing & Design)
- Smoke test: **7/7 critical checks passed**

### 6. Campaign Dockerfile Updated
- Switched `node:22-alpine` → `node:22-slim` (Debian)
- Added `libcairo2-dev`, `libpango1.0-dev`, `librsvg2-dev`, `libgif-dev` for canvas/sharp

### 7. ECS Stale Digest Fix
- **Root cause**: CodeBuild pushed new `:latest` ECR tags — ECS cached old manifests
- **Fixed**: Re-registered 6 task definitions to force digest re-resolution
- **Result**: 14/14 services healthy

### 8. DB Migrations 134–142
All confirmed applied on production Aurora:
- 33 campaign tables ✅
- 10 campaign roles seeded ✅
- 30 campaign permissions ✅
- 275 material types ✅

### 9. IAM Verified
`vote-capsule-cognito-admin-policy` includes `AdminUpdateUserAttributes` on `us-east-1_i3N2tg34A` ✅

---

## 📋 ASSIGNABLE CAMPAIGN ROLES

| Role Constant | Display Name | Guard Scope |
|---------------|-------------|-------------|
| `CANDIDATE` | Candidate | Own campaign, full |
| `CANDIDATE_CAMPAIGN_PRINCIPAL` | Campaign Principal | Own campaign, full |
| `CAMPAIGN_MANAGER` | Campaign Manager | Own campaign, full |
| `WARD_COORDINATOR` | Ward Representative | Ward-scoped |
| `CONSTITUENCY_COORDINATOR` | Constituency Coordinator | Constituency-scoped |
| `LOGISTICS_OFFICER` | Logistics Manager | vehicles, equipment, events, tasks |
| `FINANCE_OFFICER` | Finance Officer | budget, expenses, contributions |
| `COMMUNICATIONS_OFFICER` | Communications Manager | sms, incidents |
| `BRAND_MANAGER` | Branding Manager | materials, designs, orders, outdoor, media |
| `CAMPAIGN_VOLUNTEER` | Volunteer | tasks, events only |

---

## 🔧 OPS SCRIPTS

| Script | Purpose |
|--------|---------|
| `check-ecs-health.js` | Full ECS cluster health (14 services) |
| `full-platform-health.js` | 24-point end-to-end health (portals + APIs + ALB) |
| `fix-ecs-stale-digest.js` | Re-registers task defs to fix CannotPullContainerError |
| `smoke-candidate-portal.js` | Candidate portal CloudFront smoke test |
| `fix-cognito-roles.py` | Bulk-update Cognito custom:roles for all portal users |
| `verify-campaign-roles-db.js` | Confirm campaign roles/permissions in Aurora |

---

## ⚠️ PENDING / FUTURE

| Item | Priority | Notes |
|------|----------|-------|
| Africa's Talking SMS credentials | MEDIUM | Set `AT_API_KEY` + `AT_USERNAME` in ECS task def when AT account ready |
| Admin portal `x-platform-admin` header | LOW | Set in `apiClient.ts` when user has `PLATFORM_SUPER_ADMIN` role |
| E2E role assignment smoke test | LOW | Test full flow: assign role → Cognito sync → login → guard pass |
| Campaign `/health` route bypass in API GW | LOW | Currently hits JWT authorizer (returns 401) — add public route exception |

*Sonie — 2026-08-26*
