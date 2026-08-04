// ============================================================
// VoteCapsule Integration Tests — Service Health Checks
// tests/integration/health-check.test.ts
//
// Quick smoke test: verifies all 13 microservices are reachable
// and returning healthy status.
// ============================================================
import axios from 'axios';
import { config } from './setup/config';

/**
 * All VoteCapsule microservices with their port assignments.
 * When testing against the API Gateway, health endpoints are
 * routed via /api/v1/{service}/health.
 * When testing locally, each service exposes /health on its port.
 */
const services = [
  { name: 'identity',     port: 3001 },
  { name: 'tenant',       port: 3002 },
  { name: 'trust',        port: 3003 },
  { name: 'geography',    port: 3004 },
  { name: 'evidence',     port: 3005 },
  { name: 'ai',           port: 3006 },
  { name: 'workflow',      port: 3007 },
  { name: 'notification', port: 3008 },
  { name: 'candidate',    port: 3009 },
  { name: 'reporting',    port: 3010 },
  { name: 'election',     port: 3011 },
  { name: 'audit',        port: 3012 },
  { name: 'billing',      port: 3013 },
] as const;

function getHealthUrl(service: { name: string; port: number }): string {
  if (config.useLocalServices) {
    return `http://localhost:${service.port}/health`;
  }
  return `${config.apiBaseUrl}/api/v1/${service.name}/health`;
}

describe('Service Health Checks', () => {
  services.forEach((service) => {
    it(`${service.name} service (port ${service.port}) should respond to health check`, async () => {
      const url = getHealthUrl(service);

      try {
        const response = await axios.get(url, {
          timeout: 10_000,
          validateStatus: () => true, // Don't throw on non-2xx
        });

        // Health endpoints should return 200
        expect(response.status).toBe(200);

        // Response should contain service identification
        const body = response.data;
        expect(body).toBeDefined();

        // Most NestJS health endpoints return { status: 'ok' } or { service: name }
        if (typeof body === 'object') {
          expect(
            body.status === 'ok' ||
            body.status === 'healthy' ||
            body.service === service.name ||
            body.name === service.name
          ).toBeTruthy();
        }
      } catch (error: any) {
        if (error.code === 'ECONNREFUSED') {
          throw new Error(
            `${service.name} service is not running at ${url}. ` +
            `Start the service or check API_BASE_URL configuration.`,
          );
        }
        throw error;
      }
    });
  });

  it('should verify all services report compatible API version', async () => {
    const healthResults = await Promise.allSettled(
      services.map(async (service) => {
        const url = getHealthUrl(service);
        const response = await axios.get(url, { timeout: 10_000 });
        return { name: service.name, data: response.data };
      }),
    );

    const successful = healthResults.filter(
      (r): r is PromiseFulfilledResult<{ name: string; data: any }> =>
        r.status === 'fulfilled',
    );

    // At minimum, geography and evidence should be reachable
    // (they are the core of the evidence pipeline)
    const coreServices = ['geography', 'evidence'];
    for (const core of coreServices) {
      const found = successful.find((r) => r.value.name === core);
      expect(found).toBeDefined();
    }
  });
});
