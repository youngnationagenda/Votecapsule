# Vote Capsule™ Geography Service — National Election Core (NEC)

**Service ID:** `@vote-capsule/geography-service`
**Port:** `3004`
**Domain:** Election Geography — National Election Core

## Purpose

The Geography Service is the **single source of truth** for all Kenya election geography.
Every other service must call this API — no other service may maintain its own copy of
counties, constituencies, wards, polling stations, or registered voter data.

## Data Coverage (2022 IEBC Data)

| Entity | Count |
|--------|-------|
| Counties | 47 |
| Constituencies | 290 |
| Wards | 1,447 |
| Registration Centres | 27,363 |
| Standard Polling Stations | 45,897 |
| Prison Stations *(inactive)* | 106 |
| Diaspora Stations *(inactive)* | 27 |
| **Total Registered Voters** | **22,102,532** |

> **GPS Coordinates:** All NULL — Phase 2+ enrichment via Google Maps API pending.
>
> **0.82% voter gap** between county-level sum (22,102,532 authoritative) and station-level sum
> (21,920,868 operational) is expected — IEBC separate-PDF rounding, not a data bug.
> Use county-level voter counts as the authoritative figure.

## API Endpoints (18)

### Statistics
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/geography/stats` | Platform-wide counts + total voters |

### Counties
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/geography/counties` | List all 47 counties |
| GET | `/api/v1/geography/counties/:code` | Get county by IEBC code (e.g. `001`) |
| GET | `/api/v1/geography/counties/:code/constituencies` | List constituencies in county |

### Constituencies
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/geography/constituencies` | List all 290 constituencies |
| GET | `/api/v1/geography/constituencies/:code` | Get by IEBC code (e.g. `001`) |
| GET | `/api/v1/geography/constituencies/:code/wards` | List wards in constituency |

### Wards
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/geography/wards` | List all 1,447 wards |
| GET | `/api/v1/geography/wards/:code` | Get by IEBC code (e.g. `0001`) |
| GET | `/api/v1/geography/wards/:code/centres` | List registration centres in ward |

### Registration Centres
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/geography/centres` | List registration centres |
| GET | `/api/v1/geography/centres/:code` | Get by 13-digit IEBC code |

### Polling Stations
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/geography/polling-stations` | List with filters (county/constituency/ward/centre) |
| GET | `/api/v1/geography/polling-stations/search?q=` | Search by name |
| **GET** | **`/api/v1/geography/polling-stations/:code/validate`** | **✅ CRITICAL — Evidence Service integration** |
| GET | `/api/v1/geography/polling-stations/:code` | Get by 15-digit IEBC code |

### Registered Voters
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/geography/registered-voters` | Total registered voters |
| GET | `/api/v1/geography/registered-voters/by-county` | Voters grouped by county |

## Critical Integration: `validate` Endpoint

```
GET /api/v1/geography/polling-stations/{15digitCode}/validate
```

**Used by:** Evidence Capsule Service — called on every evidence submission to verify the station exists.

**Returns:**
```json
{
  "id": 1,
  "iebcStationCode": "001001000100101",
  "streamNumber": 1,
  "name": "BOMU PRIMARY SCHOOL Stream 1",
  "registeredVoters": 695,
  "centreName": "BOMU PRIMARY SCHOOL",
  "wardName": "MVITA",
  "wardCode": "0001",
  "constituencyName": "MVITA",
  "constituencyCode": "001",
  "countyName": "MOMBASA",
  "countyCode": "001",
  "latitude": null,
  "longitude": null,
  "stationType": "STANDARD",
  "active": true,
  "electionYear": 2022
}
```

**If station code is invalid → 404 → Evidence submission rejected**

## Running Migrations

The 128 NEC SQL migration files are in `packages/database/migrations/nec/` and
must be run **after** the 10 foundation migrations (001–010).

```bash
# Run all migrations (foundation + NEC in sort order)
pnpm --filter @vote-capsule/database db:migrate
```

Migration order:
1. Foundation: `001_create_users.sql` → `010_create_subscriptions.sql`
2. Evidence: `011_evidence_schema.sql`
3. Trust: `012_trust_schema.sql`
4. NEC: `001_nec_schema.sql` → `009_nec_finalize.sql` (128 files via `nec/` subdirectory)

## Environment Variables

```env
PORT=3004
DB_HOST=your-aurora-endpoint
DB_PORT=5432
DB_NAME=votecapsule
DB_USER=vcadmin
DB_PASSWORD=<from AWS Secrets Manager>
DB_SSL=true
DB_POOL_MAX=10
ALLOWED_ORIGINS=http://localhost:3000,https://votecapsule.yna.co.ke
```

## Running

```bash
pnpm dev        # Development with hot reload
pnpm build      # Production build
pnpm start      # Start production
pnpm test       # Run tests
```

## API Documentation

When running: `http://localhost:3004/api/docs`

## Owned By

Wired by Sonie (Platform Foundation Workstream)
Original source: CTO Agent NEC build — `D:\Votecapsule\NEC database\geography-service\`
