/**
 * VoteCapsule™ — k6 Auth Helper
 * Gets a JWT token from Identity Service for use in load tests.
 */
import http from 'k6/http';
import { check } from 'k6';

export const BASE_URL = __ENV.API_URL || 'http://vote-capsule-services-alb-181601180.us-east-1.elb.amazonaws.com';
export const API_GW   = __ENV.API_GW  || 'https://483uyy43nc.execute-api.us-east-1.amazonaws.com';

export function getAuthToken() {
  const res = http.post(
    `${BASE_URL}/api/v1/identity/auth/login`,
    JSON.stringify({
      email:    __ENV.ADMIN_EMAIL    || 'admin@votecapsule.co.ke',
      password: __ENV.ADMIN_PASSWORD || 'VoteC@psule2027!',
    }),
    { headers: { 'Content-Type': 'application/json' } }
  );

  check(res, { 'login 200': r => r.status === 200 });

  const body = JSON.parse(res.body);
  return body.accessToken || body.data?.accessToken || '';
}

export function authHeaders(token) {
  return {
    'Content-Type':  'application/json',
    'Authorization': `Bearer ${token}`,
  };
}
