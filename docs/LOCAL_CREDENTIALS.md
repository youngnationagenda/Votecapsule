# VoteCapsule™ — Portal Login Credentials (Local / Dev / Staging)

> **⚠️ INTERNAL USE ONLY** — Do not commit to public repositories.  
> Last verified: 2026-08-26 by Sonie  
> Cognito User Pool: `us-east-1_i3N2tg34A`  
> API Gateway: `483uyy43nc` → `https://483uyy43nc.execute-api.us-east-1.amazonaws.com`

---

## 1. Platform Admin Portal
**URL:** `https://admin.votecapsule.yna.co.ke`  
**Local:** `http://localhost:3000`

| Email | Password | Role | Status |
|-------|----------|------|--------|
| `superadmin@votecapsule.co.ke` | `VoteCapsule@2026!` | `PLATFORM_SUPER_ADMIN` | ✅ CONFIRMED |
| `admin@votecapsule.co.ke` | `VoteCapsule@2026!` | `TENANT_ADMIN` | ✅ CONFIRMED |

---

## 2. Candidate Portal
**URL:** `https://candidate.votecapsule.yna.co.ke`  
**Local:** `http://localhost:3102`  
**Features:** Campaign Manager → My Team & Roles (assign CAMPAIGN_MANAGER, WARD_REP, FINANCE_OFFICER, etc.)

| Email | Password | Role | Name | Status |
|-------|----------|------|------|--------|
| `candidate@votecapsule.co.ke` | `VoteCapsule@2026!` | `CANDIDATE` | YNA Candidate | ✅ CONFIRMED |
| `yna@votecapsule.co.ke` | `VoteCapsule@2026!` | `CANDIDATE` | YNA Demo | ✅ CONFIRMED |

### Campaign Team Role Accounts (pre-seeded, assignable from candidate portal)
| Email | Password | Assigned Role | Notes |
|-------|----------|---------------|-------|
| `ccm@votecapsule.co.ke` | `VoteCapsule@2026!` | `CAMPAIGN_MANAGER` | Can access `/campaign/*` |
| `mccp@votecapsule.co.ke` | `VoteCapsule@2026!` | `CAMPAIGN_MANAGER` | Candidate campaign coord |
| `ppd@votecapsule.co.ke` | `VoteCapsule@2026!` | `PARTY_CAMPAIGN_DIRECTOR` | Full tenant campaign access |

### Assignable Campaign Roles (set via Candidate Portal → Campaign Manager → My Team & Roles)
| Role Constant | Display Name | Access Scope |
|---------------|--------------|--------------|
| `CANDIDATE` | Candidate (Principal) | Own campaign, full access |
| `CANDIDATE_CAMPAIGN_PRINCIPAL` | Campaign Principal | Own campaign, full access |
| `CAMPAIGN_MANAGER` | Campaign Manager | Own campaign, full access |
| `WARD_REP` | Ward Representative | Ward-scoped tasks/events |
| `WARD_COORDINATOR` | Ward Coordinator | Ward-scoped, geography limited |
| `CONSTITUENCY_COORDINATOR` | Constituency Coordinator | Constituency-scoped |
| `LOGISTICS_OFFICER` | Logistics Manager | vehicles, equipment, events, tasks |
| `FINANCE_OFFICER` | Finance Officer | budget, expenses, contributions |
| `COMMUNICATIONS_OFFICER` | Communications Officer | sms, incidents |
| `BRAND_MANAGER` | Branding Manager | materials, designs, orders, outdoor, media |
| `CAMPAIGN_VOLUNTEER` | Campaign Volunteer | tasks, events only |

---

## 3. Party Portal
**URL:** `https://party.votecapsule.yna.co.ke`  
**Local:** `http://localhost:3103`

| Email | Password | Party | Role | Status |
|-------|----------|-------|------|--------|
| `mwaurasebastian@gmail.com` | `(user-set password)` | YNA | `PARTY_ADMIN` | ✅ CONFIRMED |
| `azimio@votecapsule.co.ke` | `VoteCapsule@2026!` | Azimio | `PARTY_ADMIN` | ✅ CONFIRMED |
| `kanu@votecapsule.co.ke` | `VoteCapsule@2026!` | KANU | `PARTY_ADMIN` | ✅ CONFIRMED |
| `ldp@votecapsule.co.ke` | `VoteCapsule@2026!` | LDP | `PARTY_ADMIN` | ✅ CONFIRMED |
| `ptp@votecapsule.co.ke` | `VoteCapsule@2026!` | PTP | `PARTY_ADMIN` | ✅ CONFIRMED |
| `tep@votecapsule.co.ke` | `VoteCapsule@2026!` | TEP | `PARTY_ADMIN` | ✅ CONFIRMED |
| `epp@votecapsule.co.ke` | `VoteCapsule@2026!` | EPP | `PARTY_ADMIN` | ✅ CONFIRMED |
| `pdu@votecapsule.co.ke` | `VoteCapsule@2026!` | PDU | `PARTY_ADMIN` | ✅ CONFIRMED |
| `ford-kenya@votecapsule.co.ke` | `VoteCapsule@2026!` | FORD-Kenya | `PARTY_ADMIN` | ✅ CONFIRMED |
| `jp@votecapsule.co.ke` | `VoteCapsule@2026!` | JP | `PARTY_ADMIN` | ✅ CONFIRMED |
| `safina@votecapsule.co.ke` | `VoteCapsule@2026!` | Safina | `PARTY_ADMIN` | ✅ CONFIRMED |
| `jibebe@votecapsule.co.ke` | `VoteCapsule@2026!` | Jibebe | `PARTY_ADMIN` | ✅ CONFIRMED |
| `kug@votecapsule.co.ke` | `VoteCapsule@2026!` | KUG | `PARTY_ADMIN` | ✅ CONFIRMED |
| `pm@votecapsule.co.ke` | `VoteCapsule@2026!` | PM | `PARTY_ADMIN` | ✅ CONFIRMED |
| `alp-k@votecapsule.co.ke` | `VoteCapsule@2026!` | ALP-K | `PARTY_ADMIN` | ✅ CONFIRMED |
| `dap-k@votecapsule.co.ke` | `VoteCapsule@2026!` | DAP-K | `PARTY_ADMIN` | ✅ CONFIRMED |
| `ksc@votecapsule.co.ke` | `VoteCapsule@2026!` | KSC | `PARTY_ADMIN` | ✅ CONFIRMED |
| `nvp@votecapsule.co.ke` | `VoteCapsule@2026!` | NVP | `PARTY_ADMIN` | ✅ CONFIRMED |
| `narc@votecapsule.co.ke` | `VoteCapsule@2026!` | NARC | `PARTY_ADMIN` | ✅ CONFIRMED |
| `kup@votecapsule.co.ke` | `VoteCapsule@2026!` | KUP | `PARTY_ADMIN` | ✅ CONFIRMED |
| `nap-k@votecapsule.co.ke` | `VoteCapsule@2026!` | NAP-K | `PARTY_ADMIN` | ✅ CONFIRMED |
| `afc@votecapsule.co.ke` | `VoteCapsule@2026!` | AFC | `PARTY_ADMIN` | ✅ CONFIRMED |
| `mp@votecapsule.co.ke` | `VoteCapsule@2026!` | MP | `PARTY_ADMIN` | ✅ CONFIRMED |
| `tdu@votecapsule.co.ke` | `VoteCapsule@2026!` | TDU | `PARTY_ADMIN` | ✅ CONFIRMED |
| `gtap@votecapsule.co.ke` | `VoteCapsule@2026!` | GTAP | `PARTY_ADMIN` | ✅ CONFIRMED |
| `ccu@votecapsule.co.ke` | `VoteCapsule@2026!` | CCU | `PARTY_ADMIN` | ✅ CONFIRMED |
| `kazi@votecapsule.co.ke` | `VoteCapsule@2026!` | Kazi | `PARTY_ADMIN` | ✅ CONFIRMED |
| `uup@votecapsule.co.ke` | `VoteCapsule@2026!` | UUP | `PARTY_ADMIN` | ✅ CONFIRMED |
| `spk@votecapsule.co.ke` | `VoteCapsule@2026!` | SPK | `PARTY_ADMIN` | ✅ CONFIRMED |
| `plp@votecapsule.co.ke` | `VoteCapsule@2026!` | PLP | `PARTY_ADMIN` | ✅ CONFIRMED |
| `dcp@votecapsule.co.ke` | `VoteCapsule@2026!` | DCP | `PARTY_ADMIN` | ✅ CONFIRMED |
| `udp@votecapsule.co.ke` | `VoteCapsule@2026!` | UDP | `PARTY_ADMIN` | ✅ CONFIRMED |
| `pick@votecapsule.co.ke` | `VoteCapsule@2026!` | PICK | `PARTY_ADMIN` | ✅ CONFIRMED |
| `dep@votecapsule.co.ke` | `VoteCapsule@2026!` | DEP | `PARTY_ADMIN` | ✅ CONFIRMED |
| `up@votecapsule.co.ke` | `VoteCapsule@2026!` | UP | `PARTY_ADMIN` | ✅ CONFIRMED |
| `knc@votecapsule.co.ke` | `VoteCapsule@2026!` | KNC | `PARTY_ADMIN` | ✅ CONFIRMED |
| `nra@votecapsule.co.ke` | `VoteCapsule@2026!` | NRA | `PARTY_ADMIN` | ✅ CONFIRMED |
| `pgp@votecapsule.co.ke` | `VoteCapsule@2026!` | PGP | `PARTY_ADMIN` | ✅ CONFIRMED |
| `pnu@votecapsule.co.ke` | `VoteCapsule@2026!` | PNU | `PARTY_ADMIN` | ✅ CONFIRMED |
| `kmm@votecapsule.co.ke` | `VoteCapsule@2026!` | KMM | `PARTY_ADMIN` | ✅ CONFIRMED |
| `fpk@votecapsule.co.ke` | `VoteCapsule@2026!` | FPK | `PARTY_ADMIN` | ✅ CONFIRMED |
| `nlp@votecapsule.co.ke` | `VoteCapsule@2026!` | NLP | `PARTY_ADMIN` | ✅ CONFIRMED |
| `j-mapk@votecapsule.co.ke` | `VoteCapsule@2026!` | J-MAPK | `PARTY_ADMIN` | ✅ CONFIRMED |
| `gddp@votecapsule.co.ke` | `VoteCapsule@2026!` | GDDP | `PARTY_ADMIN` | ✅ CONFIRMED |
| `tnd@votecapsule.co.ke` | `VoteCapsule@2026!` | TND | `PARTY_ADMIN` | ✅ CONFIRMED |
| `jfp@votecapsule.co.ke` | `VoteCapsule@2026!` | JFP | `PARTY_ADMIN` | ✅ CONFIRMED |

---

## 4. Authority Portal
**URL:** `https://authority.votecapsule.yna.co.ke`  
**Local:** `http://localhost:3101`

| Email | Password | Role | Status |
|-------|----------|------|--------|
| `authority@votecapsule.co.ke` | `VoteCapsule@2026!` | `ELECTION_AUTHORITY_ADMIN` | ✅ CONFIRMED |
| `dc@votecapsule.co.ke` | `VoteCapsule@2026!` | `ELECTION_AUTHORITY_ADMIN` | ✅ CONFIRMED |

---

## 5. Observer Portal
**URL:** `https://observer.votecapsule.yna.co.ke`  
**Local:** `http://localhost:3104`

| Email | Password | Role | Status |
|-------|----------|------|--------|
| `observer@votecapsule.co.ke` | `VoteCapsule@2026!` | `OBSERVER` | ✅ CONFIRMED |

---

## 6. Agent / Validator (Mobile)
| Email | Password | Role | Status |
|-------|----------|------|--------|
| `agent@votecapsule.co.ke` | `VoteCapsule@2026!` | `CAPSULE_AGENT` | ✅ CONFIRMED |
| `validator@votecapsule.co.ke` | `VoteCapsule@2026!` | `VALIDATOR` | ✅ CONFIRMED |

---

## AWS Infrastructure Reference

| Resource | Value |
|----------|-------|
| Cognito User Pool | `us-east-1_i3N2tg34A` |
| Cognito App Client (web) | `3hi86ci06546ki038k6msmik0s` |
| Cognito App Client (mobile) | `5qv2glumv6kd2652hqdrs6ufp` |
| API Gateway ID | `483uyy43nc` |
| API Endpoint | `https://483uyy43nc.execute-api.us-east-1.amazonaws.com` |
| ALB DNS | `vote-capsule-services-alb-181601180.us-east-1.elb.amazonaws.com` |
| ECS Cluster | `vote-capsule-services` |
| Campaign Service ECS | `vc-campaign` (port 3016) |
| Identity Service ECS | `vc-identity` (port 3001) |
| Campaign S3 Assets | `votecapsule-campaign-assets` |
| Identity Task Role | `vote-capsule-ecs-task-execution-role` |
| Cognito Admin Policy | `vote-capsule-cognito-admin-policy` (includes AdminUpdateUserAttributes) |

---

## Role Assignment Flow (End-to-End)

```
Candidate Portal UI
  └─► POST /api/v1/campaign/campaigns/:id/roles
        { userId, role, wardCode?, constituencyCode? }
        Headers: x-tenant-id, x-user-id, x-user-role: CANDIDATE
        │
        ├─► Campaign Service (port 3016)
        │     TeamsService.assignRole()
        │       1. Writes to campaign_team_members (DB)
        │       2. PATCH http://alb.../api/v1/identity/users/:userId/attributes
        │            { "custom:roles": "CAMPAIGN_MANAGER", "custom:wardCode": "..." }
        │            x-internal-service: campaign
        │
        └─► Identity Service (port 3001)
              UsersService.updateCognitoAttributes()
                └─► Cognito AdminUpdateUserAttributes
                      custom:roles = "CAMPAIGN_MANAGER"
                      custom:wardCode = "0101"
                      custom:constituencyCode = "001"
                      custom:candidateId = "uuid"

On user's next login / token refresh:
  └─► JWT Lambda Authorizer reads custom:roles
        └─► API GW injects x-user-role: CAMPAIGN_MANAGER header
              └─► CampaignRoleGuard grants/restricts access
```

---

## Verification Commands

```bash
# Verify a user's Cognito roles
aws cognito-idp admin-get-user \
  --user-pool-id us-east-1_i3N2tg34A \
  --username candidate@votecapsule.co.ke

# Check campaign service health
curl https://483uyy43nc.execute-api.us-east-1.amazonaws.com/api/v1/campaign/health

# Check identity service health
curl https://483uyy43nc.execute-api.us-east-1.amazonaws.com/api/v1/identity/health

# List ECS services
aws ecs list-services --cluster vote-capsule-services
```
