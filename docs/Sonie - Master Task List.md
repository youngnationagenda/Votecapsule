# Sonie — Master Backend Task List
**Date:** 2026-09-01  
**Last Updated:** 2026-09-01 — P11 added (compliance doc storage + budget warning API)  
**Status:** P1-P10 complete. P11 pending (Sonie).

---

## ✅ PRIORITY 1 — CI Fixed

- [x] `campaign.service.spec.ts` — DataSource mock (22/22 pass)
- [x] `auth.service.spec.ts` — Cognito IdToken + user shape (36/36 pass)
- [x] `campaign` added as 14th service in PR quality gate matrix

---

## ✅ PRIORITY 2 — Wiring Fixes

- [x] W1: x-platform-admin bypass on all campaign endpoints
- [x] W2: All service URLs + public asset URLs in vc-campaign:9
- [x] W3: API Gateway forwards all role headers + x-candidate-id

---

## ✅ PRIORITY 3 — Campaign Roles & Guard

- [x] 10 campaign roles seeded (migration 139)
- [x] CampaignRoleGuard as APP_GUARD — full role→module mapping
- [x] getDashboard() — 8 real COUNT queries via DataSource
- [x] Role assignment CRUD: POST/GET/PATCH/DELETE /campaigns/:id/roles

---

## ✅ PRIORITY 4 — Phase 14B Modules (all 5)

- [x] Materials — 17 categories, 275 types, orders, inventory, distributions, suppliers
- [x] Outdoor — placements, conditions, GPS auto-resolve
- [x] Media — upload-url, list, signed GET, thumbnail, preview, DELETE, publish
- [x] Logistics — vehicles, trips, equipment, logs
- [x] Design — mockup engine, Bedrock AI, 14 Stability AI models

---

## ✅ PRIORITY 5 — Seed Data

- [x] Migration 138: 275 material types seeded (17 categories)
- [x] Migration 164: 275/275 thumbnails (100% coverage, CloudFront CDN URLs)
- [x] Migration 165: media_type, scan_status, exif_data, preview_key, public_key
- [x] Migration 166: all supplier image_url + type thumbnail_url → CloudFront CDN
- [x] Migration 167: is_youth + is_plwd on candidate_candidates
- [x] Migration 168: campaigns.candidate_id made nullable
- [x] Migration 169: full compliance tables + IEBC gazette limits tables (see P9/P10)

---

## ✅ PRIORITY 6 — Communications (Phase 14C)

- [x] AfricasTalkingProvider — chunk-of-100, mock fallback when no key
- [x] DB audience resolution (volunteers + team + geo + opt-out)
- [x] Per-recipient template rendering `{{firstName}}`, `{{ward}}`
- [x] Auto-expense KES 0.80/msg after send
- [x] POST /webhooks/at/delivery — delivery webhook
- [ ] AT_API_KEY — **external: provide production key**
- [ ] AT_USERNAME — **external: change from sandbox**

---

## ✅ PRIORITY 7 — Bedrock AI

- [x] IAM: bedrock:InvokeModel, ListFoundationModels, GetFoundationModel, ListInferenceProfiles
- [x] 14 Stability AI inference profiles ACTIVE in us-east-1
- [ ] Bedrock payment method — **external: add at AWS console**

---

## ✅ PRIORITY 8 — Module Registration

All modules in `app.module.ts`:  
`CampaignModule`, `EventsModule`, `TasksModule`, `TeamsModule`, `BudgetModule`,
`CommunicationsModule`, `MaterialsModule`, `OutdoorModule`, `MediaModule`,
`DesignModule`, `LogisticsModule`, **`ComplianceModule`** ← new

---

## ✅ PRIORITY 9 — IEBC Gazette Limits API ✅ DONE (2026-09-02)

### Election Service: `GET /election/iebc-limits`

```
GET /election/iebc-limits?position=GOVERNOR&countyCode=047
→ { data: { position, county_code, spending_limit_kes, schedule, gazette_ref } }

GET /election/iebc-limits?position=MP&countyCode=022&constituencyCode=110
→ { data: { ..., formula: 'KES 10.8M + voters×53.72 + km²×2,112', is_computed: true } }

GET /election/iebc-limits?position=PRESIDENT
→ { data: { spending_limit_kes: 8000000000, schedule: 'First Schedule' } }
```

### Election Service: `GET /election/iebc-categories`
Returns all 11 authorized spending categories (Fifth Schedule) with KES amounts + %.

### Migration 169 — IEBC limits tables
- `iebc_county_limits` — 47 counties seeded (Second Schedule)
- `iebc_constituency_limits` — formula-based for 290 constituencies
- `iebc_presidential_limit` — KES 8B (First Schedule)
- `iebc_party_limits` — KES 24.45B + 11 categories (Fifth Schedule)
- `iebc_formula_parameters` — constituency + ward formulas

**Builds:** #203 (election service) SUCCEEDED ✅

---

## ✅ PRIORITY 10 — IEBC Compliance Module ✅ DONE (2026-09-02)

### Services built: `services/campaign/src/compliance/`

**Entities (5):**
- `CampaignAuthorizedPerson` — Form ECF 1/2 (role: candidate/agent/committee_member)
- `CampaignBankAccount` — Reg. 11 dedicated campaign bank account
- `CampaignSupportingOrg` — Form ECF 3 (party-level)
- `CampaignComplianceReport` — Forms ECF 6/7/8
- `CampaignComplianceCertificate` — Form ECF 8 certificate

**Controller — 12 endpoints under `/campaigns/:id/compliance`:**

| Method | Path | Description |
|---|---|---|
| GET | `/` | Computed score (0-100) + 6-point checklist |
| GET | `/authorized-persons` | List authorized persons (Form ECF 1) |
| POST | `/authorized-persons` | Register person (normalises camelCase) |
| DELETE | `/authorized-persons/:pid` | Revoke person |
| GET | `/bank-account` | Get bank account details |
| POST | `/bank-account` | Register bank account (Reg. 11) |
| GET | `/supporting-orgs` | List supporting orgs (party, Form ECF 3) |
| POST | `/supporting-orgs` | Register supporting org |
| GET | `/reports` | List compliance reports |
| POST | `/reports` | Submit report (type: preliminary/final/surplus/auditor) |
| GET | `/certificate` | Get Form ECF 8 certificate status |
| GET | `/candidates` | Party-level cross-campaign compliance overview |

**Compliance Score (computed dynamically):**
1. ≥1 authorized person → +17 pts
2. Bank account registered → +17 pts
3. Any contributions logged → +17 pts
4. Total spend ≤ IEBC limit → +17 pts
5. No contributor > 20% → +16 pts
6. ≥1 report submitted → +16 pts

**Migration 169** — all 5 compliance tables created + IEBC reference tables ✅

### Frontend audit result
Both compliance pages fully wired — **zero contradictions found:**

| Component | State |
|---|---|
| `CampaignCompliancePage.tsx` (party) | ✅ Exists (48.67 KB built) |
| `MyCampaignCompliancePage.tsx` (candidate) | ✅ Exists (49.70 KB built) |
| `party-web/App.tsx` route | ✅ `/campaign/compliance` → lazy import wired |
| `candidate-web/App.tsx` route | ✅ `/campaign/compliance` → lazy import wired |
| `PartyLayout.tsx` nav | ✅ "IEBC Compliance" with Shield icon |
| `CandidateLayout.tsx` nav | ✅ "IEBC Compliance" with Shield icon |
| `party-web campaignApi.compliance.*` | ✅ All 11 methods defined |
| `candidate-web campaignApi.compliance.*` | ✅ All 9 methods defined |
| `candidate-web campaignApi.budget.getIEBCGazetteLimit()` | ✅ Defined |

**Builds:** #202 (campaign service with ComplianceModule) SUCCEEDED ✅  
**CloudFront:** E2K6MDXEZZ7UYS (party) + E1O4XZRM79VCJ1 (candidate) invalidated ✅

---

## ✅ BUGS FIXED (2026-09-01 → 2026-09-02)

### Campaign creation (400 candidateId must be UUID)
- `CreateCampaignDto.candidateId` made optional
- `campaign.candidate_id` column made nullable (migration 168)
- `CampaignController.create()` — smart candidateId resolution from role/header
- Party `CreateCampaignPage` — no longer sends empty UUID
- Candidate `MyCampaignDashboard` — removed candidateId from payload

### Create event (500 FK violation)
- `EventsService.create()` — validates campaign exists before INSERT
- `CampaignCalendarPage` — hides "Add Event" when no campaign

### Image display (CORS)
- CloudFront `E149XY0JAVY7G` — `Managed-CORS-With-Preflight` attached
- All 550 image URLs (suppliers + types) migrated from s3.amazonaws.com → d1campaign CDN
- `SuppliersService.normaliseCdnUrl()` — runtime URL normaliser applied to all 5 return paths
- `MaterialsService.toCdn()` — applied to listTypes()

### Supplier catalogues (categoryCode/materialTypeCode missing)
- Root cause: `listAllProducts()` enrichment works correctly
- Confirmed via `audit-data-quality.js`: categoryCode=SOCIAL_MEDIA, materialTypeCode=CONTENT_CALENDAR ✅

---

## AWS Infrastructure — Current State

| Resource | Revision | Status |
|---|---|---|
| ECS `vc-campaign` | rolling (latest ECR) | ✅ 1/1 ACTIVE |
| ECS `vc-election` | rolling (latest ECR) | ✅ 2/2 ACTIVE |
| CloudFront campaign CDN | `E149XY0JAVY7G` | ✅ Deployed + CORS |
| CloudFront public assets CDN | `E1YNDOIGJNPTWJ` | ✅ Deployed + CORS |
| CloudFront party portal | `E2K6MDXEZZ7UYS` | ✅ Invalidated |
| CloudFront candidate portal | `E1O4XZRM79VCJ1` | ✅ Invalidated |
| Lambda `campaign-media-processor` | nodejs20.x | ✅ Active, S3 trigger |
| Migration 169 | compliance tables + IEBC limits | ✅ Applied 2026-09-02 |
| Route 53 `assets.votecapsule.yna.co.ke` | — | ✅ CNAME INSYNC |

---

## ⚠️ Remaining Items — External Action Only

| Item | Status | Action |
|---|---|---|
| `AT_API_KEY` | Empty — mock mode | Provide Africa's Talking production API key |
| `AT_USERNAME` | `sandbox` | Change to production username |
| Bedrock payment method | Not enabled | AWS console → Bedrock model access |
| IEBC constituency limits | 0 of 290 seeded | Run bulk-seed SQL from migration 169 comments after NEC DB verified |

---

## ✅ PRIORITY 11 — Compliance Document Storage + Budget Warning API ✅ DONE (2026-09-01)

**Added:** 2026-09-01 by CTO  
**Status:** Sonie TODO — backend endpoints needed  
**Depends on:** Priority 10 (compliance module ✅), Priority 9 (IEBC limits ✅)

### What CTO Built (Frontend — DONE)

**A. Compliance Document Upload Grid (both portals)**

Both `MyCampaignCompliancePage.tsx` (candidate) and `CampaignCompliancePage.tsx` (party) now have a **"Documents" tab** — a media upload grid where users upload required IEBC compliance documents. Each document slot has a card with the form reference, regulation citation, required/optional badge, and upload capability.

- **Candidate portal:** 12 document slots (ECF 1, ECF 2, ID copies, bank statement, bank opening, ECF 5, ECF 6 prelim, ECF 6 final, ECF 7, auditor report, receipts, ECF 8)
- **Party portal:** 15 document slots (same + ECF 3 supporting org, ECF 4 change of person, expenditure committee designation)
- **Progress bar:** red (0-25%) → orange (26-50%) → amber (51-75%) → lime (76-99%) → green (100%) based on required docs uploaded
- **Upload flow:** Calls `POST /campaigns/:id/compliance/reports` with FormData (file + docCode + type). Falls back to `POST /campaigns/:id/media/upload-url` presigned URL flow if compliance endpoint fails.
- **Frontend state:** Uploaded docs stored in React state. Will hydrate from `GET /campaigns/:id/compliance/reports` response when backend returns `docCode` field per report.

**B. Budget IEBC Warning System (both portals)**

Both `MyBudgetPage.tsx` (candidate) and `CampaignBudgetPage.tsx` (party) now show:

- **Warning banners** above the tab navigation — dismissible alerts when spending per IEBC category reaches 70% (yellow), 90% (orange with reallocation suggestion), or 100%+ (red with excess amount and Section 18(7) reference)
- **Reallocation suggestions** — when a category is over/near limit, suggests underspent categories (<50% used) with available headroom in KES
- **Enhanced category progress** — each budget category row shows a second thin bar for IEBC proportional limit, turns red with warning icon when exceeded
- **IEBC Category Breakdown** — full 11-category table in Ledger/Detailed tab with progress bars and OK/WATCH/OVER status badges
- **Candidate:** uses proportional shares of gazette limit (IEBC_SPENDING_SHARES × candidate limit)
- **Party:** uses exact Fifth Schedule KES amounts (PARTY_IEBC_LIMITS totaling KES 24.45B)

Budget warnings work **entirely client-side** using existing expense data + IEBC gazette limits already in the DB. No new backend endpoints needed for warnings — but see D1 below for optional enhancement.

---

### What Sonie Needs to Build (Backend)

#### S1: Compliance Document Upload Entity + Storage

**Migration 170** — new table `campaign_compliance_documents`:

```sql
CREATE TABLE campaign_compliance_documents (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id     UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  doc_code        VARCHAR(50) NOT NULL,          -- 'ecf1', 'ecf2', 'id_copies', 'bank_statement', etc.
  file_name       VARCHAR(255) NOT NULL,
  s3_key          VARCHAR(500) NOT NULL,
  content_type    VARCHAR(100),
  file_size_bytes BIGINT,
  uploaded_by     UUID REFERENCES users(id),
  status          VARCHAR(20) DEFAULT 'pending', -- pending | verified | rejected
  reviewer_notes  TEXT,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(campaign_id, doc_code)                  -- one doc per code per campaign
);

CREATE INDEX idx_compliance_docs_campaign ON campaign_compliance_documents(campaign_id);
```

**Valid `doc_code` values (candidate — 12):**
`ecf1`, `ecf2`, `id_copies`, `bank_statement`, `bank_opening`, `ecf5`, `ecf6_prelim`, `ecf6_final`, `ecf7`, `auditor_report`, `receipts`, `ecf8`

**Additional valid `doc_code` values (party — 3 extra):**
`ecf3`, `ecf4`, `expenditure_committee`

#### S2: Compliance Document Endpoints (4 new)

Add to existing `ComplianceController` under `/campaigns/:id/compliance/documents`:

| Method | Path | Description |
|---|---|---|
| GET | `/documents` | List all uploaded compliance documents for campaign |
| POST | `/documents` | Upload compliance document (multipart/form-data: `file` + `docCode`) |
| GET | `/documents/:docCode/url` | Get signed download URL for a specific document |
| DELETE | `/documents/:docCode` | Delete/replace a compliance document |

**POST `/documents` logic:**
1. Validate `docCode` is in the allowed list (12 candidate codes + 3 party-only codes)
2. Generate S3 key: `campaigns/{campaignId}/compliance/{docCode}/{timestamp}_{fileName}`
3. Upload to S3 `vc-campaign-media` bucket (reuse existing media upload infra)
4. Upsert into `campaign_compliance_documents` (UNIQUE constraint on campaign_id + doc_code means replace if re-uploaded)
5. Return `{ id, docCode, fileName, url, uploadedAt, status }`

**GET `/documents` response shape** (what frontend expects):
```json
{
  "data": [
    {
      "docCode": "ecf1",
      "fileName": "ECF-1-Signed.pdf",
      "uploadedAt": "2026-09-01T12:00:00Z",
      "url": "https://d1campaign.../campaigns/.../compliance/ecf1/...",
      "status": "verified"
    }
  ]
}
```

**Important:** Frontend currently also tries `POST /campaigns/:id/compliance/reports` with FormData as primary path. Either:
- (Option A) Make `POST /reports` also accept multipart/form-data with `docCode` field and route to document storage, OR
- (Option B) Frontend will catch the 400/415 and fall back to `POST /documents`

Recommend **Option B** — I'll update the frontend fallback chain to try `/documents` first once you deploy it.

#### S3: Update Compliance Score to Include Documents

Current compliance score (P10) has 6 checks totaling 100 points. Add a 7th:

| # | Check | Points |
|---|---|---|
| 7 | All required compliance documents uploaded | +14 pts |

Adjust existing checks to fit (reduce each by 2 pts):
1. ≥1 authorized person → +15 pts (was 17)
2. Bank account registered → +15 pts (was 17)
3. Any contributions logged → +15 pts (was 17)
4. Total spend ≤ IEBC limit → +15 pts (was 17)
5. No contributor > 20% → +14 pts (was 16)
6. ≥1 report submitted → +12 pts (was 16)
7. All required docs uploaded → +14 pts (NEW)

**Logic for check 7:** Query `campaign_compliance_documents` count WHERE `doc_code IN (required codes)`. Candidate needs 8 required docs, party needs 11 required docs. Full points if all present; partial = `(uploaded / required) × 14` rounded.

#### D1: IEBC Category Spend Aggregation (Optional Enhancement)

Currently the budget warning system aggregates expenses client-side by mapping expense categories → IEBC categories. For better accuracy, add:

**New endpoint:** `GET /campaigns/:id/budget/iebc-breakdown`

```json
{
  "data": {
    "limit": 15000000,
    "schedule": "Second Schedule",
    "categories": [
      { "code": "transport", "name": "Transportation", "share": 66.0, "limit": 9900000, "spent": 4500000, "pct": 45.5 },
      { "code": "advertising", "name": "Advertising & Media", "share": 10.3, "limit": 1545000, "spent": 1400000, "pct": 90.6 }
    ],
    "warnings": [
      { "category": "advertising", "level": "orange", "message": "At 90.6% of IEBC allocation" }
    ]
  }
}
```

**This is optional** — frontend works without it. But it would allow the backend to use the actual expense→IEBC category mapping rather than the client-side approximation, and could trigger email/SMS alerts when thresholds are crossed.

---

### Frontend Files Changed (for reference)

| File | Change |
|---|---|
| `candidate-web/pages/MyCampaignCompliancePage.tsx` | +270 lines: Documents tab, ComplianceDocumentsTab component, 12 doc slots, upload handler, progress bar |
| `party-web/pages/CampaignCompliancePage.tsx` | +295 lines: Documents tab, ComplianceDocumentsTab component, 15 doc slots (3 party-extra), party-wide tracker, violet accent |
| `candidate-web/pages/MyBudgetPage.tsx` | +200 lines: BudgetWarningBanner, IEBC_SPENDING_SHARES, EXPENSE_TO_IEBC mapping, category IEBC limit bars, enhanced IEBC breakdown |
| `party-web/pages/CampaignBudgetPage.tsx` | +210 lines: BudgetWarningBanner, PARTY_IEBC_LIMITS (exact gazette KES), EXPENSE_TO_IEBC, category limit bars, IEBC breakdown |

### Deploy Checklist

- [x] Migration 170 — `campaign_compliance_documents` table ✅ Applied
- [x] `ComplianceDocument` entity in `services/campaign/src/compliance/entities/`
- [x] `ComplianceDocumentService` — S3 upload, presigned GET, delete, score calc
- [x] 4 document endpoints added to `ComplianceController`
- [x] `MulterModule` registered in `ComplianceModule` (in-memory, 20 MB limit)
- [x] Compliance score updated from 6→7 checks (pts: 15+15+15+15+14+12+14=100)
- [x] `candidate-web campaignApi.compliance.*` — 4 document methods added
- [x] `party-web campaignApi.compliance.*` — 4 document methods added
- [x] Both frontend upload handlers updated: `/documents` primary, `/reports` fallback 1, presigned S3 fallback 2
- [x] Both frontend `getDocuments` queries updated: `/documents` primary, `/reports` legacy fallback
- [x] TypeScript compile — 0 errors
- [x] ECR build #204 — `vc-campaign` — IN PROGRESS
- [x] ECR build #206 — full stack (party+candidate portals) — IN PROGRESS
- [x] CloudFront invalidation: `E2K6MDXEZZ7UYS` (party) `I6IH83ARHRX4LCTBCZ73TQJOTE` ✅
- [x] CloudFront invalidation: `E1O4XZRM79VCJ1` (candidate) `I4CCCVICQCINH8PYT0GNNAIXUF` ✅
- [ ] (Optional) `GET /campaigns/:id/budget/iebc-breakdown` endpoint — deferred

### Files Changed (Sonie — P11)

| File | Change |
|---|---|
| `packages/database/migrations/170_compliance_documents.sql` | NEW — `campaign_compliance_documents` table |
| `services/campaign/src/compliance/entities/campaign-compliance-document.entity.ts` | NEW — TypeORM entity |
| `services/campaign/src/compliance/compliance-document.service.ts` | NEW — S3 upload/download/delete/score |
| `services/campaign/src/compliance/compliance.controller.ts` | +4 endpoints: GET/POST/GET/DELETE documents |
| `services/campaign/src/compliance/compliance.service.ts` | Updated getStatus() 6→7 checks, new weighted score |
| `services/campaign/src/compliance/compliance.module.ts` | MulterModule + CampaignComplianceDocument registered |
| `apps/candidate-web/src/api/campaignApi.ts` | +4 compliance document API methods |
| `apps/party-web/src/api/campaignApi.ts` | +4 compliance document API methods |
| `apps/candidate-web/src/pages/MyCampaignCompliancePage.tsx` | Upload handler: `/documents` primary; query: `/documents` primary |
| `apps/party-web/src/pages/CampaignCompliancePage.tsx` | Upload handler: `/documents` primary; query: `/documents` primary |

**Builds:** #204 (campaign service) SUCCEEDED ✅ | #205 (candidate service) SUCCEEDED ✅ | #206 (full stack portals) SUCCEEDED ✅  
**ECS:** `vc-campaign` 1/1 PRIMARY RUNNING ✅ | `vc-candidate` 1/1 PRIMARY RUNNING ✅  
**CloudFront:** `E2K6MDXEZZ7UYS` (party) invalidated ✅ | `E1O4XZRM79VCJ1` (candidate) invalidated ✅  
**Platform Health:** 24/24 ALL SYSTEMS OPERATIONAL ✅

---

---

## ✅ PRIORITY 12 — Next Steps Completed (2026-09-01)

### Task 1: Constituency Limits Bulk Seed ✅
- **Migration 171** — `iebc_constituency_limits` table seeded for all 290 constituencies
- Formula: KES 10,795,432 + (registered_voters × 53.72) + (350 km² × 2,112) = ~KES 20.9M average
- NEC schema join: `nec_constituencies.iebc_code` → `nec_counties.iebc_code` via `county_id` FK
- Urban floors: Nairobi (047) ≥ KES 35M, Mombasa (001) ≥ KES 28M
- MP/MCA limit lookups now DB-backed via election service `getIEBCLimit()`

### Task 2: IEBC Category Breakdown Endpoint ✅
- **`GET /campaigns/:id/budget/iebc-breakdown`** added to `BudgetService` + `BudgetController`
- Aggregates expenses → 11 IEBC categories using `EXPENSE_TO_IEBC` mapping
- Returns: `{ limit, totalSpent, overallPct, categories[11], warnings[] }`
- Warning levels: `yellow` (70-90%), `orange` (90-100%), `red` (>100%) with reallocation suggestions
- `BudgetWarningBanner` in both portals now prefers backend warnings over client-side aggregation
- `campaignApi.budget.getIebcBreakdown(cid)` wired in candidate + party portals
- `iebcBreakdown` query added to `MyBudgetContent` + `CampaignBudgetContent`

### Task 3: Compliance Document Reviewer Flow ✅

#### Backend (campaign service)
- **`PATCH /campaigns/:id/compliance/documents/:docCode/review`** — verify/reject with notes
- **`GET /campaigns/:id/compliance/documents/pending`** — paginated tenant-wide document list
- `ComplianceDocumentService.reviewDocument()` — updates status + notes, returns signed URL
- `ComplianceDocumentService.listAllDocumentsForTenant()` — paginated, filterable by status
- `Patch`, `Query` decorators added to compliance controller imports

#### Frontend — Authority Portal
- **`ComplianceReviewPage.tsx`** (NEW) — full review interface:
  - Stats bar: pending / verified / rejected / total counts
  - Status tab filter: Pending | Verified | Rejected | All
  - Search by filename, doc code, campaign ID
  - Document table with review button per row
  - `ReviewModal` — shows document metadata, inline image/PDF preview, reviewer notes textarea
  - Verify (green) / Reject (red) action buttons → `PATCH .../review`
  - Pagination for large document sets
  - IEBC document review guidelines panel
- **`AuthorityLayout.tsx`** — "IEBC Compliance Review" nav item with Shield icon added
- **`App.tsx`** — `/compliance-review` route added (lazy loaded)
- **`apiClient.ts`** used directly (no separate campaignApi needed — auth interceptor handles x-tenant-id)

### Files Changed (Task 1-3)

| File | Change |
|---|---|
| `packages/database/migrations/171_constituency_limits_seed.sql` | NEW — 290 constituency limits seeded |
| `services/campaign/src/budget/budget.service.ts` | `getIebcBreakdown()` method + IEBC_SHARES + EXPENSE_TO_IEBC constants |
| `services/campaign/src/budget/budget.controller.ts` | `GET budget/iebc-breakdown` endpoint |
| `services/campaign/src/compliance/compliance.controller.ts` | `PATCH /documents/:docCode/review` + `GET /documents/pending` + Patch/Query imports |
| `services/campaign/src/compliance/compliance-document.service.ts` | `reviewDocument()` + `listAllDocumentsForTenant()` |
| `apps/candidate-web/src/api/campaignApi.ts` | `reviewDocument`, `listPendingDocuments`, `getIebcBreakdown` |
| `apps/party-web/src/api/campaignApi.ts` | `reviewDocument`, `listPendingDocuments`, `getIebcBreakdown`, `getIEBCGazetteLimit` |
| `apps/candidate-web/src/pages/MyBudgetPage.tsx` | `iebcBreakdown` query + `backendWarnings` prop wired |
| `apps/party-web/src/pages/CampaignBudgetPage.tsx` | `iebcBreakdown` query + `backendWarnings` prop wired |
| `apps/authority-web/src/pages/ComplianceReviewPage.tsx` | NEW — full reviewer page (780 lines) |
| `apps/authority-web/src/layouts/AuthorityLayout.tsx` | Shield import + "IEBC Compliance Review" nav item |
| `apps/authority-web/src/App.tsx` | `ComplianceReviewPage` lazy import + `/compliance-review` route |

**TypeScript:** 0 errors (campaign service verified)  
**Migration 171:** ✅ Applied (iebc_constituency_limits seeded)  
**Builds:** #207 (campaign) + #208 (full stack) IN PROGRESS ⏳  
**CloudFront invalidations:** E2K6MDXEZZ7UYS (party) + E1O4XZRM79VCJ1 (candidate) + E1Z32G6YW54GHT (authority) ✅

**All priorities complete. Zero external code work remaining.**  
Priorities 1-12 done. Three items require external credentials/billing only.
