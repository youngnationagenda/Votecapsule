# Vote Capsule™ Election Intelligence Cloud Platform

**Enterprise-grade multi-tenant SaaS for Kenya's 2027 General Election**

---

## 🏗️ Monorepo Structure

```
vote-capsule/
├── apps/
│   ├── admin-web/          ✅ BUILT — Super Admin Portal (React 18 + Tailwind)
│   ├── authority-web/      📋 Scaffold only
│   ├── party-web/          📋 Scaffold only
│   ├── candidate-web/      📋 Scaffold only
│   ├── observer-web/       📋 Scaffold only
│   ├── public-web/         📋 Scaffold only
│   ├── agent-mobile/       📋 Scaffold only
│   └── validator-mobile/   📋 Scaffold only
│
├── services/
│   ├── identity/           ✅ BUILT — Full NestJS implementation
│   ├── tenant/             ✅ BUILT — Full NestJS implementation
│   ├── geography/          📋 Scaffold (NEC Agent workstream)
│   ├── election/           📋 Scaffold (NEC Agent workstream)
│   ├── candidate/          📋 Scaffold only
│   ├── evidence/           📋 Scaffold only
│   ├── ai/                 📋 Scaffold only
│   ├── trust/              🔨 Migrating to Hybrid Anchor (Hedera + RFC 3161)
│   ├── workflow/           📋 Scaffold only
│   ├── reporting/          📋 Scaffold only
│   ├── billing/            📋 Scaffold only
│   ├── notification/       📋 Scaffold only
│   └── audit/              📋 Scaffold only
│
├── packages/
│   ├── design-tokens/      ✅ BUILT — Full token library
│   ├── types/              ✅ BUILT — Shared TypeScript types
│   ├── database/           ✅ BUILT — Migrations + base entities
│   ├── config/             📋 Scaffold
│   └── ui/                 📋 Scaffold
│
├── infrastructure/
│   ├── cdk/                ✅ All 8 stacks defined (Auth, VPC, DB, etc. — QLDB stack deprecated)
│   └── scripts/
│       └── vote-capsule-foundation.json  ✅ DEPLOYED to AWS
│
└── documentation/
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js >= 20
- pnpm >= 9
- AWS CLI configured

### Install
```bash
pnpm install
```

### Development
```bash
# Start Identity Service (port 3001)
pnpm --filter @vote-capsule/identity-service dev

# Start Tenant Service (port 3002)
pnpm --filter @vote-capsule/tenant-service dev

# Start Admin Portal (port 3000)
pnpm --filter @vote-capsule/admin-web dev
```

### Database Setup
```bash
# Run all migrations
pnpm --filter @vote-capsule/database db:migrate

# Seed system roles and permissions
pnpm --filter @vote-capsule/database db:seed
```

---

## ☁️ AWS Infrastructure (Deployed)

**Account:** `683541453923` | **Region:** `us-east-1`

### Live Resources

| Resource | Status | ARN/Name |
|----------|--------|----------|
| Foundation Stack | ✅ Deployed | `VoteCapsuleFoundationStack` |
| Trust Service Role | ✅ Live | `vote-capsule-trust-service-role` |
| Identity Service Role | ✅ Live | `vote-capsule-identity-service-role` |
| Tenant Service Role | ✅ Live | `vote-capsule-tenant-service-role` |
| Trust Log Group | ✅ Live | `/vote-capsule/services/trust` |
| Identity Log Group | ✅ Live | `/vote-capsule/services/identity` |
| Tenant Log Group | ✅ Live | `/vote-capsule/services/tenant` |

### CDK Stacks (Defined, Deploy When Ready)

```bash
cd infrastructure/cdk
pnpm install
pnpm cdk deploy --all     # Deploy all stacks
# VoteCapsuleQldbStack — DEPRECATED (replaced by Hedera + RFC 3161)
pnpm cdk deploy VoteCapsuleAuthStack     # Cognito User Pool
pnpm cdk deploy VoteCapsuleNetworkStack  # VPC
pnpm cdk deploy VoteCapsuleDatabaseStack # Aurora PostgreSQL
```

---

## 🔐 Trust Layer

Vote Capsule uses a **Hybrid Anchor (Hedera Consensus Service + RFC 3161 TSA) + SHA-256** for evidence integrity.

**NOT Ethereum. NOT Hyperledger. NOT smart contracts.** Hedera is used as a public consensus timestamp service. RFC 3161 provides legal-weight proof.

- Hedera Network: Testnet (switch to Mainnet for production)
- RFC 3161 TSA: FreeTSA.org (dev/MVP — configurable for DigiCert/Sectigo in production)
- Hash algorithm: SHA-256 (Merkle tree batched every 60 seconds)
- Anchored: After human validator approves evidence capsule
- Public API: `GET /trust/verify/{capsuleId}`
- Public Explorer: HashScan link provided for citizen verification

User-facing language: **"Integrity Verified"** — never "blockchain verified"

---

## 🏛️ System Roles (16 seeded)

`PLATFORM_SUPER_ADMIN`, `TENANT_ADMIN`, `ELECTION_COMMISSIONER`, `RETURNING_OFFICER`,
`PRESIDING_OFFICER`, `CAPSULE_AGENT`, `VALIDATOR`, `PARTY_ADMIN`, `PARTY_AGENT`,
`CANDIDATE`, `OBSERVER_ADMIN`, `OBSERVER_AGENT`, `MEDIA_ADMIN`, `MEDIA_REPORTER`,
`PUBLIC`, `SUPPORT_ADMIN`

---

## 🔗 Coordination Points (NEC Agent)

| Location | Integration |
|----------|-------------|
| `apps/admin-web` Dashboard | `GET /api/geography/polling-stations/count` |
| `apps/admin-web` Dashboard | `GET /api/geography/registered-voters/total` |
| `apps/admin-web` Tenant Form | `GET /api/geography/counties` |
| `services/trust` | Evidence capsule anchor count |

---

## 📚 Tech Stack

| Layer | Technology |
|-------|-----------|
| Language | TypeScript 5.7 (strict) |
| Backend | NestJS 10 |
| Frontend | React 18 + Tailwind CSS |
| Mobile | React Native (scaffold) |
| Database | Amazon Aurora PostgreSQL |
| Cache | Redis (ElastiCache) |
| Auth | Amazon Cognito |
| Trust | Hedera Consensus Service + RFC 3161 TSA + SHA-256 |
| IaC | AWS CDK (TypeScript) |
| Monorepo | Turborepo |
| Package Manager | pnpm 9 |

---

**Built by Sonie — Vote Capsule Platform Foundation Workstream**
