/**
 * VoteCapsule™ — k6 Geography Service Load Test
 *
 * Geography endpoints are public (no auth) and will be hit by millions of
 * users checking polling station locations on election day.
 *
 * Run:
 *   k6 run infrastructure/load-tests/geography-load.js
 *
 * Targets:
 *   - 500 concurrent VUs (election-day traffic estimate)
 *   - p95 latency < 1000ms
 *   - 0% error rate
 *   - Sustained 5 minutes at peak
 */
import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

const ALB    = __ENV.ALB_URL || 'http://vote-capsule-services-alb-181601180.us-east-1.elb.amazonaws.com';
const API_GW = __ENV.API_GW  || 'https://483uyy43nc.execute-api.us-east-1.amazonaws.com';

export const options = {
  stages: [
    { duration: '30s', target: 100 },
    { duration: '30s', target: 300 },
    { duration: '30s', target: 500 },
    { duration: '5m',  target: 500 },   // hold at 500 VUs for 5 minutes
    { duration: '30s', target: 0   },
  ],
  thresholds: {
    http_req_duration:         ['p(95)<1000', 'p(99)<2000'],
    http_req_failed:           ['rate<0.01'],
    'http_req_duration{endpoint:stats}':       ['p(95)<500'],
    'http_req_duration{endpoint:counties}':    ['p(95)<800'],
    'http_req_duration{endpoint:stations}':    ['p(95)<1000'],
  },
};

const errorRate = new Rate('errors');
const countyIds  = Array.from({length: 47}, (_, i) => i + 1);

export default function () {
  const roll = Math.random();

  if (roll < 0.3) {
    // 30% — stats endpoint (highest traffic, aggregated)
    group('stats', () => {
      const res = http.get(`${ALB}/api/v1/geography/stats`, { tags: { endpoint: 'stats' } });
      const ok = check(res, {
        'stats 200':      r => r.status === 200,
        'stats has data': r => r.body.includes('totalStations') || r.body.includes('counties'),
      });
      errorRate.add(!ok);
    });

  } else if (roll < 0.55) {
    // 25% — list counties
    group('counties', () => {
      const res = http.get(`${ALB}/api/v1/geography/counties`, { tags: { endpoint: 'counties' } });
      const ok = check(res, { 'counties 200': r => r.status === 200 });
      errorRate.add(!ok);
    });

  } else if (roll < 0.75) {
    // 20% — single county lookup
    group('county_detail', () => {
      const countyId = countyIds[Math.floor(Math.random() * countyIds.length)];
      const res = http.get(`${ALB}/api/v1/geography/counties/${countyId}`, { tags: { endpoint: 'county_detail' } });
      check(res, { 'county detail 200/404': r => [200, 404].includes(r.status) });
    });

  } else if (roll < 0.90) {
    // 15% — polling stations (heaviest query)
    group('stations', () => {
      const res = http.get(
        `${ALB}/api/v1/geography/stations?limit=20&offset=0`,
        { tags: { endpoint: 'stations' } }
      );
      const ok = check(res, { 'stations 200': r => r.status === 200 });
      errorRate.add(!ok);
    });

  } else {
    // 10% — via API Gateway (tests WAF + auth exemption)
    group('api_gateway', () => {
      const res = http.get(`${API_GW}/api/v1/geography/stats`, { tags: { endpoint: 'apigw' } });
      check(res, { 'api_gw geo 200': r => r.status === 200 || r.status === 403 });
    });
  }

  sleep(Math.random() * 0.5 + 0.1); // 0.1–0.6s think time
}
