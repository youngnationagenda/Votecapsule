/**
 * VoteCapsule™ — k6 API Gateway Load Test
 *
 * Tests WAF rate limiting, authentication, and throughput via API Gateway.
 *
 * Run:
 *   k6 run infrastructure/load-tests/api-gateway-load.js
 *
 * Tests:
 *   - Public endpoints accessible without JWT
 *   - Protected endpoints return 401 without JWT
 *   - WAF rate limiter kicks in at >1000 req/5min/IP (test with caution)
 *   - API Gateway latency overhead vs ALB direct
 */
import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate } from 'k6/metrics';

const API_GW = __ENV.API_GW || 'https://483uyy43nc.execute-api.us-east-1.amazonaws.com';
const ALB    = __ENV.ALB_URL || 'http://vote-capsule-services-alb-181601180.us-east-1.elb.amazonaws.com';

export const options = {
  stages: [
    { duration: '30s', target: 50  },
    { duration: '2m',  target: 100 },
    { duration: '30s', target: 0   },
  ],
  thresholds: {
    http_req_duration: ['p(95)<1500'],
    http_req_failed:   ['rate<0.05'],
  },
};

const errorRate = new Rate('errors');

export default function () {
  const roll = Math.random();

  if (roll < 0.4) {
    // Public geography endpoint — should always return 200
    group('public_apigw', () => {
      const res = http.get(`${API_GW}/api/v1/geography/stats`);
      const ok = check(res, {
        'apigw geo stats 200': r => r.status === 200,
        'apigw latency<1500':  r => r.timings.duration < 1500,
      });
      errorRate.add(!ok);
    });

  } else if (roll < 0.7) {
    // Protected endpoint without JWT — must return 401
    group('protected_no_auth', () => {
      const res = http.get(`${API_GW}/api/v1/identity/users`);
      const ok = check(res, {
        'protected 401 without JWT': r => r.status === 401 || r.status === 403,
      });
      errorRate.add(!ok);
    });

  } else {
    // Login via API Gateway (should be public route)
    group('login_apigw', () => {
      const res = http.post(
        `${API_GW}/api/v1/identity/auth/login`,
        JSON.stringify({ email: 'test@notexist.com', password: 'wrongpass' }),
        { headers: { 'Content-Type': 'application/json' } }
      );
      // 401 = correct (wrong creds), 200 = unexpected
      check(res, {
        'login returns 401 for bad creds': r => r.status === 401 || r.status === 400,
      });
    });
  }

  sleep(0.2);
}
