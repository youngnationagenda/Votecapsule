# Trust Service

**Status:** 🔨 MIGRATING — Hybrid Anchor (Hedera Testnet + RFC 3161)
**Original Source:** CTO Agent — `D:\Votecapsule\trust-service\`
**Wired by:** Sonie (Platform Foundation Workstream)
**Port:** 3003

## What Is Here

### From CTO Agent (full implementation — being rewritten)
- `src/hedera/hedera.client.ts` — Hedera Consensus Service SDK wrapper
- `src/hedera/hedera.config.ts` — Network config (Testnet/Mainnet switch)
- `src/tsa/rfc3161.client.ts` — RFC 3161 TSA HTTP client
- `src/tsa/tsa.config.ts` — TSA URL configuration
- `src/merkle/merkle-tree.util.ts` — Merkle tree construction + proof generation
- `src/trust.service.ts` — Full business logic with Merkle batching + dual anchor
- `src/trust.controller.ts` — 6 REST endpoints per V13 Ch9
- `src/trust.module.ts` — NestJS module with HttpModule for Evidence Service callback
- `src/app.module.ts` — Root module with TypeORM
- `src/main.ts` — Bootstrap on port 3003
- `src/entities/trust-anchor-batch.entity.ts` — Batch record (Merkle root + both anchors)
- `src/entities/trust-anchor-leaf.entity.ts` — Individual capsule → batch link + proof path
- `src/entities/trust-verification.entity.ts` — Verification audit log
- `src/dto/anchor-request.dto.ts` — Anchor request DTO
- `src/dto/verify-response.dto.ts` — Public verification response

### From Sonie Phase 1 (kept, not replaced)
- `src/hash/hash.utils.ts` — SHA-256 hash utilities (computeCapsuleHash, verifyCapsuleHash, computeSha256)
- `src/verification/verification.interface.ts` — Public verification API interfaces

## Hybrid Anchor Architecture

The Trust Service dual-anchors Merkle roots every 60 seconds to:
1. **Hedera Consensus Service (Testnet)** — public, decentralized verification
2. **RFC 3161 TSA (FreeTSA.org)** — legal-weight cryptographic timestamp

## Environment Variables

```env
PORT=3003
DB_HOST=your-aurora-endpoint
DB_PORT=5432
DB_NAME=votecapsule
DB_USER=vcadmin
DB_PASSWORD=<from Secrets Manager>
DB_SSL=true
AWS_REGION=us-east-1

# Hedera Consensus Service (Testnet)
HEDERA_NETWORK=testnet
HEDERA_OPERATOR_ID=0.0.XXXXX
HEDERA_OPERATOR_KEY=302e...
HEDERA_TOPIC_ID=0.0.XXXXX

# RFC 3161 TSA
TSA_URL=https://freetsa.org/tsr

# Batch Config
MERKLE_BATCH_INTERVAL_MS=60000

EVIDENCE_SERVICE_URL=http://localhost:3005
ALLOWED_ORIGINS=http://localhost:3000,https://votecapsule.yna.co.ke
```

## Trust Language Rule

User-facing labels: **"Integrity Verified"** — NEVER "blockchain verified"
This service uses Hedera as a public consensus service + RFC 3161 for legal timestamps.
No smart contracts. No Ethereum. No Hyperledger.
