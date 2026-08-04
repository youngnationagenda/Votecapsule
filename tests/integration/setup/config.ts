// ============================================================
// VoteCapsule Integration Tests — Configuration
// tests/integration/setup/config.ts
//
// Environment-based configuration. Override via env vars to
// target local services or the deployed API Gateway.
// ============================================================

export const config = {
  // ── API Target ──────────────────────────────────────────────
  // Set API_BASE_URL to point at local services or deployed gateway.
  // Local: http://localhost:3001 (identity), http://localhost:3004 (geography), etc.
  // Deployed: https://483uyy43nc.execute-api.us-east-1.amazonaws.com
  apiBaseUrl: process.env.API_BASE_URL
    || 'https://483uyy43nc.execute-api.us-east-1.amazonaws.com',

  // ── Service Ports (local mode) ──────────────────────────────
  // When API_BASE_URL is not set and USE_LOCAL_SERVICES=true,
  // tests hit individual service ports directly.
  useLocalServices: process.env.USE_LOCAL_SERVICES === 'true',
  services: {
    identity:     process.env.IDENTITY_URL     || 'http://localhost:3001',
    tenant:       process.env.TENANT_URL       || 'http://localhost:3002',
    trust:        process.env.TRUST_URL        || 'http://localhost:3003',
    geography:    process.env.GEOGRAPHY_URL    || 'http://localhost:3004',
    evidence:     process.env.EVIDENCE_URL     || 'http://localhost:3005',
    ai:           process.env.AI_URL           || 'http://localhost:3006',
    workflow:     process.env.WORKFLOW_URL      || 'http://localhost:3007',
    notification: process.env.NOTIFICATION_URL || 'http://localhost:3008',
    candidate:    process.env.CANDIDATE_URL    || 'http://localhost:3009',
    reporting:    process.env.REPORTING_URL    || 'http://localhost:3010',
    election:     process.env.ELECTION_URL     || 'http://localhost:3011',
    audit:        process.env.AUDIT_URL        || 'http://localhost:3012',
    billing:      process.env.BILLING_URL      || 'http://localhost:3013',
  },

  // ── Cognito ─────────────────────────────────────────────────
  cognito: {
    region:        process.env.COGNITO_REGION        || 'us-east-1',
    adminClientId: process.env.COGNITO_ADMIN_CLIENT_ID || '3hi86ci06546ki038k6msmik0s',
    mobileClientId: process.env.COGNITO_MOBILE_CLIENT_ID || '5qv2glumv6kd2652hqdrs6ufp',
    adminEmail:    process.env.COGNITO_ADMIN_EMAIL    || 'admin@votecapsule.co.ke',
    adminPassword: process.env.COGNITO_ADMIN_PASSWORD || 'VoteC@psule2027!',
  },

  // ── Test Data ───────────────────────────────────────────────
  testData: {
    // Known valid IEBC station code (Mombasa → Changamwe → Kipevu → stream 01)
    validStationCode: process.env.TEST_STATION_CODE || '001001000100101',
    // Tenant UUID for test isolation
    tenantId: process.env.TEST_TENANT_ID || '00000000-0000-0000-0000-000000000001',
    // Election year
    electionYear: 2027,
  },

  // ── Timeouts ────────────────────────────────────────────────
  timeouts: {
    // Per-test timeout (ms)
    test: parseInt(process.env.TEST_TIMEOUT || '60000', 10),
    // AI verification polling timeout (ms)
    aiVerification: parseInt(process.env.AI_TIMEOUT || '30000', 10),
    // AI verification poll interval (ms)
    aiPollInterval: parseInt(process.env.AI_POLL_INTERVAL || '2000', 10),
    // Trust anchoring timeout (ms)
    trustAnchoring: parseInt(process.env.TRUST_TIMEOUT || '45000', 10),
  },
} as const;

/**
 * Resolve the full URL for a service endpoint.
 * In local mode: hits the service port directly.
 * In gateway mode: prefixes with /api/v1/{service}
 */
export function resolveUrl(service: keyof typeof config.services, path: string): string {
  if (config.useLocalServices) {
    return `${config.services[service]}/${path.replace(/^\//, '')}`;
  }
  // API Gateway routes: /api/v1/{service}/{path}
  return `${config.apiBaseUrl}/api/v1/${service}/${path.replace(/^\//, '')}`;
}

/**
 * Resolve URL for evidence service routes which use /api/v1/evidence prefix.
 */
export function evidenceUrl(path: string): string {
  return resolveUrl('evidence', path);
}

/**
 * Resolve URL for election service routes.
 */
export function electionUrl(path: string): string {
  return resolveUrl('election', path);
}

/**
 * Resolve URL for geography service routes.
 */
export function geographyUrl(path: string): string {
  return resolveUrl('geography', path);
}
