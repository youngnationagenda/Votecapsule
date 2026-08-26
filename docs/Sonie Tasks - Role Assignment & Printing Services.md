# Sonie Backend Tasks — Role Assignment & Printing Services

**Date:** 2026-08-26  
**Context:** CTO completed frontend implementation for:
1. **Campaign role assignment** — Candidates can now assign roles (Campaign Manager, Ward Rep, Logistics Manager, Finance Officer, Communications Officer, Brand Manager) from the Candidate Portal → Campaign Manager → My Team & Roles
2. **Printing & Design Services page** — Design requests, print orders, supplier browsing all accessible from `/campaign/printing`

The backend code (controllers, services, guards, entities) already exists. Below is what you need to do on the **infrastructure, permissions, and deployment** side to make this work end-to-end in production.

---

## 1. CORS — Add Missing Headers to API Gateway

**File:** `infrastructure/scripts/vote-capsule-apigateway.json`  
**Also update:** Live API Gateway config via AWS Console or CLI

The current CORS `AllowHeaders` only permits:
```
content-type, authorization, x-agent-user-id, x-device-id, x-validator-user-id, x-resolver-user-id, x-tenant-id, x-user-id
```

**Add these headers** (the campaign role guard reads them):
```
x-user-role, x-ward-code, x-constituency-code, x-candidate-id, x-platform-admin
```

**Command:**
```bash
aws apigatewayv2 update-api \
  --api-id 483uyy43nc \
  --cors-configuration AllowHeaders="content-type,authorization,x-agent-user-id,x-device-id,x-validator-user-id,x-resolver-user-id,x-tenant-id,x-user-id,x-user-role,x-ward-code,x-constituency-code,x-candidate-id,x-platform-admin"
```

Without this, browsers will preflight-reject requests that include role headers.

---

## 2. Cognito — Role Sync on Assignment

**Problem:** When a candidate assigns someone the `CAMPAIGN_MANAGER` role via the UI, it writes to `campaign_team_members.campaign_role` in the DB. But the JWT authorizer reads `custom:roles` from the Cognito token. If the user's Cognito `custom:roles` attribute isn't updated, the campaign role guard will reject their requests.

**Solution — choose one:**

### Option A: Update Cognito attribute when role is assigned (recommended)
Add a call in `TeamsService.assignRole()` to update the user's Cognito custom attribute:

```typescript
// In services/campaign/src/teams/teams.service.ts → assignRole()
// After saving to DB, call Identity Service to sync Cognito

await this.httpService.patch(
  `${this.identityServiceUrl}/users/${dto.userId}/attributes`,
  { 'custom:roles': dto.role },
  { headers: { 'x-tenant-id': tenantId, 'x-internal-service': 'campaign' } }
);
```

**Identity Service endpoint needed:**
```
PATCH /users/:userId/attributes
Body: { "custom:roles": "CAMPAIGN_MANAGER", "custom:wardCode": "0101" }
```

This calls `adminUpdateUserAttributes` on Cognito:
```javascript
const cognito = new CognitoIdentityProviderClient({ region: 'us-east-1' });
await cognito.send(new AdminUpdateUserAttributesCommand({
  UserPoolId: 'us-east-1_i3N2tg34A',
  Username: userId,
  UserAttributes: [
    { Name: 'custom:roles', Value: role },
    { Name: 'custom:wardCode', Value: wardCode },
    { Name: 'custom:constituencyCode', Value: constituencyCode },
  ]
}));
```

### Option B: Dual-check (DB fallback)
Modify the JWT Lambda Authorizer (`infrastructure/lambda/jwt-authorizer/index.js`) to also check the DB if `custom:roles` is empty. More complex, not recommended.

**Go with Option A.** Files to create/modify:
- `services/identity/src/users/users.controller.ts` — add `PATCH /users/:userId/attributes` endpoint
- `services/identity/src/users/users.service.ts` — add `updateCognitoAttributes()` method
- `services/campaign/src/teams/teams.service.ts` — call identity service after role assignment
- Add `IDENTITY_SERVICE_URL` to campaign service env (already exists in task def: `http://vote-capsule-services-alb-181601180.us-east-1.elb.amazonaws.com:3001`)

---

## 3. ALB Listener Rules — Verify Campaign Service Routing

Verify that the ALB has a rule routing `/api/v1/campaign/*` to the campaign service target group on port 3016.

**Check:**
```bash
aws elbv2 describe-rules \
  --listener-arn <ALB_LISTENER_ARN> \
  --query "Rules[?Conditions[?Values[?contains(@, '/api/v1/campaign')]]]"
```

If missing, add:
```bash
aws elbv2 create-rule \
  --listener-arn <ALB_LISTENER_ARN> \
  --priority 16 \
  --conditions Field=path-pattern,Values="/api/v1/campaign/*" \
  --actions Type=forward,TargetGroupArn=<CAMPAIGN_TG_ARN>
```

Also verify the design endpoints are reachable (they share the same `/api/v1/campaign/` prefix since DesignController is in the campaign service).

---

## 4. Run Migrations 134–142 on Production DB

Verify ALL campaign schema migrations have been applied:

```bash
psql $DATABASE_URL -c "SELECT filename FROM schema_migrations WHERE filename LIKE '13%' OR filename LIKE '14%' ORDER BY filename;"
```

**Required migrations (in order):**
| # | File | Purpose |
|---|------|---------|
| 134 | `134_campaign_schema_phase_14a.sql` | campaigns, events, tasks, **campaign_teams**, **campaign_team_members**, volunteers |
| 135 | `135_campaign_schema_phase_14b.sql` | materials, suppliers, orders, budgets, **design_requests**, outdoor, vehicles |
| 136 | `136_campaign_schema_phase_14c.sql` | SMS tables + incidents |
| 137 | `137_campaign_seed_material_categories.sql` | Material category seed data |
| 138 | `138_campaign_permissions_seed.sql` | Campaign permissions + demo budget categories |
| 139 | `139_seed_campaign_roles.sql` | **10 campaign roles + 21 permissions + role_permissions wiring** |
| 140 | `140_seed_campaign_material_types.sql` | 500+ material types (posters, flyers, etc.) |
| 141 | `141_campaign_mockup_templates_seed.sql` | Mockup templates for AI generation |
| 142 | `142_campaign_supplier_products.sql` | Supplier products table + seed |

**Critical:** Migration 139 seeds the campaign roles that the frontend now uses. Without it, `assignRole()` will work at the DB level but the role won't appear in the identity system's role list.

---

## 5. Deploy Updated Campaign Service

The campaign service image needs to be rebuilt and pushed:

```bash
# From repo root
docker build -t 683541453923.dkr.ecr.us-east-1.amazonaws.com/vote-capsule/campaign-service:latest \
  -f services/campaign/Dockerfile .

aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 683541453923.dkr.ecr.us-east-1.amazonaws.com

docker push 683541453923.dkr.ecr.us-east-1.amazonaws.com/vote-capsule/campaign-service:latest

aws ecs update-service \
  --cluster vote-capsule-services \
  --service vc-campaign \
  --force-new-deployment
```

Or trigger via GitHub Actions: push to `main` triggers `build-and-push-services.yml`.

---

## 6. Design Service Dependencies (Docker Image)

The mockup engine (`services/campaign/src/design/mockup-engine/mockup.service.ts`) requires:
- **sharp** — image processing (already in package.json)
- **canvas** (node-canvas) — text rendering on templates
- **@imgly/background-removal-node** (rembg equivalent) — background removal from candidate photos

**Verify the campaign Dockerfile installs system deps for canvas:**
```dockerfile
# Required for node-canvas
RUN apt-get update && apt-get install -y \
  build-essential \
  libcairo2-dev \
  libjpeg-dev \
  libpango1.0-dev \
  libgif-dev \
  librsvg2-dev
```

If these aren't in the Dockerfile, canvas will fail at runtime with missing `.so` errors.

---

## 7. S3 Bucket CORS — Design Previews

**Bucket:** `votecapsule-campaign-assets`

Design previews and print-ready files are served from S3. The candidate portal needs to display preview images, so ensure CORS allows the frontend origins:

```json
{
  "CORSRules": [{
    "AllowedOrigins": [
      "https://candidate.votecapsule.co.ke",
      "https://app.votecapsule.co.ke",
      "http://localhost:5173",
      "http://localhost:5174"
    ],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedHeaders": ["*"],
    "MaxAgeSeconds": 3600
  }]
}
```

```bash
aws s3api put-bucket-cors \
  --bucket votecapsule-campaign-assets \
  --cors-configuration file://cors-config.json
```

---

## 8. IAM Policy — Campaign Service Role Needs Cognito Access

If implementing Option A (recommended) where the campaign service updates Cognito attributes via the Identity Service, ensure the **Identity Service task role** has:

```json
{
  "Effect": "Allow",
  "Action": [
    "cognito-idp:AdminUpdateUserAttributes",
    "cognito-idp:AdminGetUser"
  ],
  "Resource": "arn:aws:cognito-idp:us-east-1:683541453923:userpool/us-east-1_i3N2tg34A"
}
```

The identity service likely already has this for user creation, but verify it includes `AdminUpdateUserAttributes`.

---

## 9. WAF — No Changes Needed

The existing WAF rules don't need modification. The new endpoints share the same `/api/v1/campaign/*` path pattern that's already permitted. Rate limiting (1000 req/5min per IP) and geo-filtering (KE, US, GB, etc.) apply automatically.

---

## 10. Frontend Deployment — Candidate Portal to S3

After the backend is ready, rebuild and deploy the candidate portal:

```bash
cd apps/candidate-web
pnpm build
aws s3 sync dist/ s3://votecapsule-candidate-portal/ --delete
aws cloudfront create-invalidation --distribution-id <DIST_ID> --paths "/*"
```

---

## Summary Checklist

| # | Task | Priority | Blocking? |
|---|------|----------|-----------|
| 1 | Add CORS headers to API Gateway | HIGH | Yes — browsers will reject |
| 2 | Identity Service: `PATCH /users/:id/attributes` endpoint | HIGH | Yes — roles won't propagate to JWT |
| 3 | Campaign service: call identity after assignRole | HIGH | Yes — roles won't propagate |
| 4 | Verify ALB routing for campaign service | MED | Probably already done |
| 5 | Run migrations 134-142 on production | HIGH | Yes — tables must exist |
| 6 | Deploy campaign service image | HIGH | Yes — latest code must be live |
| 7 | Verify canvas/sharp deps in Dockerfile | MED | Design mockups will fail without |
| 8 | S3 CORS for campaign assets bucket | MED | Preview images won't load |
| 9 | IAM: verify AdminUpdateUserAttributes | MED | Role sync will 403 |
| 10 | Deploy candidate portal frontend | LOW | Do last after backend is confirmed |

**Order of operations:** 5 → 1 → 2 → 3 → 6 → 7 → 4 → 8 → 9 → 10

---

## Questions for Sonie

1. Have migrations 134-142 already been run on prod? (I know 131 for agent scoping was pending)
2. Is the campaign service currently deployed and healthy? (`curl https://api.votecapsule.co.ke/api/v1/campaign/health`)
3. Does the identity service already have an endpoint to update Cognito custom attributes, or do we need to build it fresh?
