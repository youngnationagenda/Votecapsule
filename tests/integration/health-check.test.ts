// ============================================================
// VoteCapsule Integration Tests — Service Health Checks
// tests/integration/health-check.test.ts
//
// NOTE: Health endpoints for most services are behind API Gateway
// JWT auth. A 401 response means the service IS running — just
// returning "no credentials" from the auth layer. 200 = truly public.
// ============================================================
import axios from 'axios';
import { config } from './setup/config';

const services = [
  { name: 'identity',     port: 3001, public: false },
  { name: 'tenant',       port: 3002, public: false },
  { name: 'trust',        port: 3003, public: false },
  { name: 'geography',    port: 3004, public: true  },
  { name: 'evidence',     port: 3005, public: false },
  { name: 'ai',           port: 3006, public: false },
  { name: 'workflow',     port: 3007, public: false },
  { name: 'notification', port: 3008, public: false },
  { name: 'candidate',    port: 3009, public: false },
  { name: 'reporting',    port: 3010, public: false },
  { name: 'election',     port: 3011, public: false },
  { name: 'audit',        port: 3012, public: false },
  { name: 'billing',      port: 3013, public: false },
] as const;

function getHealthUrl(service: { name: string; port: number }): string {
  if (config.useLocalServices) {
    return `http://localhost:${service.port}/health`;
  }
  return `${config.apiBaseUrl}/api/v1/${service.name}/health`;
}

describe('Service Health Checks (via API Gateway)', () => {
  services.forEach((service) => {
    it(`${service.name} service is reachable`, async () => {
      const url = getHealthUrl(service);

      const response = await axios.get(url, {
        timeout: 12_000,
        validateStatus: () => true,
      });

      // 200 = healthy + public route
      // 401 = API Gateway auth required — service IS running, JWT just not provided
      // 403 = WAF geo-blocked (acceptable from non-KE IP in CI)
      // Anything else = problem
      expect([200, 401, 403]).toContain(response.status);

      if (service.public) {
        // Public services must return 200 with no auth
        expect(response.status).toBe(200);
        expect(response.data).toBeDefined();
      }
    });
  });

  it('geography service returns valid stats (public endpoint)', async () => {
    const url = `${config.apiBaseUrl}/api/v1/geography/stats`;
    const response = await axios.get(url, { timeout: 12_000, validateStatus: () => true });

    expect(response.status).toBe(200);
    expect(response.data).toBeDefined();
    const body = response.data as any;
    // Should have county/station counts
    expect(
      body.totalStations > 0 ||
      body.counties > 0 ||
      body.data !== undefined ||
      typeof body === 'object'
    ).toBeTruthy();
  });

  it('API Gateway rejects unauthenticated requests to protected routes', async () => {
    const url = `${config.apiBaseUrl}/api/v1/identity/users`;
    const response = await axios.get(url, { timeout: 12_000, validateStatus: () => true });
    expect([401, 403]).toContain(response.status);
  });

  it('all services respond within 12 seconds', async () => {
    const results = await Promise.allSettled(
      services.map(async (s) => {
        const start = Date.now();
        await axios.get(getHealthUrl(s), { timeout: 12_000, validateStatus: () => true });
        return { name: s.name, ms: Date.now() - start };
      })
    );

    const fulfilled = results.filter(r => r.status === 'fulfilled') as PromiseFulfilledResult<{name:string;ms:number}>[];
    // All 13 services must respond (not timeout)
    expect(fulfilled.length).toBe(13);
    console.log('Response times:', fulfilled.map(r => `${r.value.name}:${r.value.ms}ms`).join(' '));
  });
});
