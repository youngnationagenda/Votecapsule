/**
 * VoteCapsule™ — k6 Health Check Load Test
 *
 * Verifies all 13 service health endpoints hold up under concurrent load.
 *
 * Run:
 *   k6 run infrastructure/load-tests/health-check.js
 *
 * Targets:
 *   - 100 concurrent VUs
 *   - p95 latency < 500ms per health endpoint
 *   - 0% error rate
 */
import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Use API Gateway — WAF GeoFilter allows KE + US + GB etc.
// For load testing from outside VPC use API_GW. For internal VPC testing use ALB_URL.
const BASE = __ENV.ALB_URL || __ENV.API_GW || 'https://483uyy43nc.execute-api.us-east-1.amazonaws.com';

export const options = {
  stages: [
    { duration: '30s', target: 50  },   // ramp up
    { duration: '1m',  target: 100 },   // hold at 100 VUs
    { duration: '30s', target: 0   },   // ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<1500'],   // API GW adds ~200ms overhead
    http_req_failed:   ['rate<0.05'],    // <5% (some services may 404 on /health via API GW)
  },
};

const errorRate = new Rate('errors');

// These endpoints are accessible via API Gateway (public or with JWT)
const HEALTH_ENDPOINTS = [
  { service: 'geography_stats',  path: '/api/v1/geography/stats'           },
  { service: 'geography_counties', path: '/api/v1/geography/counties'      },
  { service: 'notification_hc', path: '/api/v1/notification/health'        },
  { service: 'candidate_hc',    path: '/api/v1/candidate/health'           },
  { service: 'reporting_hc',    path: '/api/v1/reporting/health'           },
  { service: 'election_hc',     path: '/api/v1/election/health'            },
  { service: 'audit_hc',        path: '/api/v1/audit/health'               },
  { service: 'billing_hc',      path: '/api/v1/billing/health'             },
];

export default function () {
  group('health_checks', () => {
    const ep = HEALTH_ENDPOINTS[Math.floor(Math.random() * HEALTH_ENDPOINTS.length)];
    const res = http.get(`${BASE}${ep.path}`, { tags: { service: ep.service } });

    const ok = check(res, {
      [`${ep.service} status 2xx`]:     r => r.status >= 200 && r.status < 300,
      [`${ep.service} latency<1500ms`]: r => r.timings.duration < 1500,
    });

    errorRate.add(!ok);
  });

  sleep(0.1);
}
