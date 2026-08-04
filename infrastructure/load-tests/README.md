# VoteCapsule™ — Load Tests (k6)

## Prerequisites
```bash
# Windows
winget install k6

# macOS
brew install k6

# Linux
sudo gpg -k && sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update && sudo apt-get install k6
```

## Test Files

| File | Purpose | Target VUs | Duration |
|------|---------|-----------|---------|
| `health-check.js` | All 13 service health endpoints | 100 | ~2min |
| `geography-load.js` | Public geography (election-day traffic) | 500 | ~8min |
| `evidence-upload.js` | Agent capsule upload (peak load) | 500 | ~9min |
| `api-gateway-load.js` | API GW WAF + auth + throughput | 100 | ~3min |

## Quick Run

```bash
cd D:\Votecapsule\vote-capsule

# 1. Health check (fast, safe)
k6 run infrastructure/load-tests/health-check.js

# 2. Geography (public, no auth needed)
k6 run infrastructure/load-tests/geography-load.js

# 3. Evidence upload (requires admin credentials)
k6 run -e ADMIN_EMAIL=admin@votecapsule.co.ke \
        -e ADMIN_PASSWORD=VoteC@psule2027! \
        infrastructure/load-tests/evidence-upload.js

# 4. API Gateway
k6 run infrastructure/load-tests/api-gateway-load.js

# Save results to JSON
k6 run --out json=results/health-check-results.json \
    infrastructure/load-tests/health-check.js
```

## Production Targets (Kenya 2027 Election Day)

| Metric | Target |
|--------|--------|
| Concurrent capsule uploads | 500 VUs sustained |
| Geography lookups | 1,000 req/s |
| p95 latency (capsule upload) | < 2,000ms |
| p95 latency (geography) | < 1,000ms |
| Error rate | < 0.1% |
| API Gateway throughput | 1,000 req/s before throttle |

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `ALB_URL` | `http://vote-capsule-services-alb-181601180...` | ALB direct URL |
| `API_GW` | `https://483uyy43nc.execute-api.us-east-1.amazonaws.com` | API Gateway URL |
| `ADMIN_EMAIL` | `admin@votecapsule.co.ke` | Admin credentials for auth tests |
| `ADMIN_PASSWORD` | `VoteC@psule2027!` | Admin password |
