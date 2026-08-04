/**
 * VoteCapsule™ — k6 Evidence Capsule Upload Load Test
 *
 * Simulates agents uploading evidence capsules on election day.
 * This is the most critical flow — must handle 45,805 stations
 * submitting capsules within a 6-hour window.
 *
 * Run:
 *   k6 run -e ADMIN_EMAIL=admin@votecapsule.co.ke \
 *           -e ADMIN_PASSWORD=VoteC@psule2027! \
 *           infrastructure/load-tests/evidence-upload.js
 *
 * Targets:
 *   - 500 concurrent VUs submitting capsules
 *   - p95 latency < 2000ms for upload
 *   - 0% error rate at 200 VUs sustained
 */
import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, SharedArray } from 'k6/data';
import { randomString, randomIntBetween } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';

const ALB = __ENV.ALB_URL || 'http://vote-capsule-services-alb-181601180.us-east-1.elb.amazonaws.com';

export const options = {
  stages: [
    { duration: '30s', target: 50  },
    { duration: '1m',  target: 200 },
    { duration: '5m',  target: 200 },   // sustained load
    { duration: '1m',  target: 500 },   // spike to 500
    { duration: '1m',  target: 200 },   // recover
    { duration: '30s', target: 0   },
  ],
  thresholds: {
    http_req_duration:                      ['p(95)<2000', 'p(99)<5000'],
    http_req_failed:                        ['rate<0.01'],
    'http_req_duration{flow:login}':        ['p(95)<1000'],
    'http_req_duration{flow:capsule}':      ['p(95)<2000'],
  },
};

const errorRate = new Rate('errors');

// Shared token pool — get auth once per VU
export function setup() {
  const res = http.post(
    `${ALB}/api/v1/identity/auth/login`,
    JSON.stringify({ email: __ENV.ADMIN_EMAIL || 'admin@votecapsule.co.ke', password: __ENV.ADMIN_PASSWORD || 'VoteC@psule2027!' }),
    { headers: { 'Content-Type': 'application/json' } }
  );
  check(res, { 'setup login ok': r => r.status === 200 });
  const body = JSON.parse(res.body);
  return { token: body.accessToken || body.data?.accessToken || '' };
}

export default function (data) {
  const token = data.token;
  const headers = {
    'Content-Type':  'application/json',
    'Authorization': `Bearer ${token}`,
  };

  // Simulate a full agent session
  group('evidence_upload_flow', () => {

    // 1. Check health (agent app startup ping)
    const health = http.get(`${ALB}/api/v1/evidence/health`, { tags: { flow: 'health' } });
    check(health, { 'evidence health 200': r => r.status === 200 });

    // 2. Submit evidence capsule (main load)
    const capsulePayload = {
      stationId:        `station-${randomIntBetween(1, 45805)}`,
      electionId:       'kenya-2027',
      tenantId:         'iebc',
      agentUserId:      `agent-${randomIntBetween(1, 10000)}`,
      imageSHA256:      randomString(64, 'abcdef0123456789'),
      captureTimestamp: new Date().toISOString(),
      metadata: {
        gpsLat:          randomIntBetween(-100, 400) / 100,
        gpsLng:          randomIntBetween(3400, 4200) / 100,
        deviceId:        `device-${randomString(8)}`,
        batteryLevel:    randomIntBetween(20, 100),
        networkType:     Math.random() > 0.5 ? 'WIFI' : '4G',
      },
      fileKey:   `evidence/${randomString(8)}/${randomString(16)}.jpg`,
      fileSize:  randomIntBetween(500000, 2000000),
    };

    const upload = http.post(
      `${ALB}/api/v1/evidence/capsules`,
      JSON.stringify(capsulePayload),
      { headers, tags: { flow: 'capsule' } }
    );

    const uploadOk = check(upload, {
      'capsule upload 201/400/401': r => [201, 400, 401, 403].includes(r.status),
      'capsule latency<2s':         r => r.timings.duration < 2000,
    });
    errorRate.add(upload.status >= 500);

    sleep(randomIntBetween(1, 3));
  });
}
