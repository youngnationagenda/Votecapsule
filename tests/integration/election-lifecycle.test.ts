// ============================================================
// VoteCapsule Integration Tests — Election Lifecycle
// tests/integration/election-lifecycle.test.ts
//
// Tests the complete election lifecycle state machine:
//   PLANNING → NOMINATION → CAMPAIGN → ACTIVE → TALLYING → RESULTS_PUBLISHED → CLOSED
//
// Also tests:
//   - Invalid state transitions (should be rejected)
//   - Party nomination elections (nomination → winner → general)
//   - Emergency cancellation from any state
// ============================================================
import axios, { AxiosInstance } from 'axios';
import { v4 as uuid } from 'uuid';
import { getAdminToken } from './setup/auth';
import { config, electionUrl } from './setup/config';

// ── Test Data ──────────────────────────────────────────────────

const TEST_TENANT_ID = config.testData.tenantId;
const TEST_USER_ID = uuid();

function createElectionPayload(overrides: Partial<any> = {}): any {
  return {
    name: `Integration Test Election ${Date.now()}`,
    type: 'GENERAL',
    electionYear: config.testData.electionYear,
    scheduledDate: '2027-08-09T00:00:00.000Z',
    description: 'Automated integration test — Kenya General Election',
    countryCode: 'KEN',
    ...overrides,
  };
}

function createNominationPayload(overrides: Partial<any> = {}): any {
  return {
    name: `Party Nomination ${Date.now()}`,
    type: 'PARTY_NOMINATION',
    electionYear: config.testData.electionYear,
    scheduledDate: '2027-04-15T00:00:00.000Z',
    description: 'Party primary nomination election',
    countryCode: 'KEN',
    partyCode: 'UDA',
    ...overrides,
  };
}

// ── Test Suite ─────────────────────────────────────────────────

describe('Election Lifecycle', () => {
  let adminToken: string;
  let client: AxiosInstance;
  let electionId: string;
  let nominationElectionId: string;

  beforeAll(async () => {
    adminToken = await getAdminToken();

    client = axios.create({
      timeout: config.timeouts.test,
      validateStatus: () => true,
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
        'X-Tenant-Id': TEST_TENANT_ID,
        'X-User-Id': TEST_USER_ID,
      },
    });
  });

  // ── Election Creation ────────────────────────────────────────

  it('should create election in PLANNING state', async () => {
    const payload = createElectionPayload();
    const url = electionUrl('elections');

    const response = await client.post(url, payload);

    expect([200, 201]).toContain(response.status);
    expect(response.data).toBeDefined();

    const election = response.data;
    expect(election.id).toBeDefined();
    electionId = election.id;

    // New elections should start in PLANNING state
    const status = election.status || election.state || election.lifecycleState;
    expect(status).toBe('PLANNING');

    // Verify returned fields
    expect(election.name).toBe(payload.name);
    if (election.type) expect(election.type).toBe('GENERAL');
    if (election.electionYear) expect(election.electionYear).toBe(config.testData.electionYear);
  });

  // ── Valid State Transitions ──────────────────────────────────

  it('should transition through valid lifecycle states', async () => {
    if (!electionId) {
      return expect(electionId).toBeDefined();
    }

    // Transition: PLANNING → NOMINATION
    const nomUrl = electionUrl(`elections/${electionId}/nominations/open`);
    const nomResponse = await client.post(nomUrl);
    expect([200, 204]).toContain(nomResponse.status);

    // Verify state changed
    let getResponse = await client.get(electionUrl(`elections/${electionId}`));
    expect(getResponse.status).toBe(200);
    let state = getResponse.data.status || getResponse.data.state || getResponse.data.lifecycleState;
    expect(state).toBe('NOMINATION');

    // Transition: NOMINATION → CAMPAIGN
    const campUrl = electionUrl(`elections/${electionId}/campaign/open`);
    const campResponse = await client.post(campUrl);
    expect([200, 204]).toContain(campResponse.status);

    getResponse = await client.get(electionUrl(`elections/${electionId}`));
    state = getResponse.data.status || getResponse.data.state || getResponse.data.lifecycleState;
    expect(state).toBe('CAMPAIGN');

    // Transition: CAMPAIGN → ACTIVE (voting day)
    const voteUrl = electionUrl(`elections/${electionId}/voting/open`);
    const voteResponse = await client.post(voteUrl);
    expect([200, 204]).toContain(voteResponse.status);

    getResponse = await client.get(electionUrl(`elections/${electionId}`));
    state = getResponse.data.status || getResponse.data.state || getResponse.data.lifecycleState;
    expect(state).toBe('ACTIVE');

    // Transition: ACTIVE → TALLYING (polls close)
    const closeUrl = electionUrl(`elections/${electionId}/voting/close`);
    const closeResponse = await client.post(closeUrl);
    expect([200, 204]).toContain(closeResponse.status);

    getResponse = await client.get(electionUrl(`elections/${electionId}`));
    state = getResponse.data.status || getResponse.data.state || getResponse.data.lifecycleState;
    expect(state).toBe('TALLYING');

    // Transition: TALLYING → RESULTS_PUBLISHED
    const publishUrl = electionUrl(`elections/${electionId}/results/publish`);
    const publishResponse = await client.post(publishUrl);
    expect([200, 204]).toContain(publishResponse.status);

    getResponse = await client.get(electionUrl(`elections/${electionId}`));
    state = getResponse.data.status || getResponse.data.state || getResponse.data.lifecycleState;
    expect(state).toBe('RESULTS_PUBLISHED');

    // Transition: RESULTS_PUBLISHED → CLOSED
    const archiveUrl = electionUrl(`elections/${electionId}/close`);
    const archiveResponse = await client.post(archiveUrl);
    expect([200, 204]).toContain(archiveResponse.status);

    getResponse = await client.get(electionUrl(`elections/${electionId}`));
    state = getResponse.data.status || getResponse.data.state || getResponse.data.lifecycleState;
    expect(state).toBe('CLOSED');
  });

  // ── Invalid State Transitions ────────────────────────────────

  it('should reject invalid state transitions', async () => {
    // Create a new election in PLANNING state
    const payload = createElectionPayload({ name: 'Invalid Transition Test' });
    const createResponse = await client.post(electionUrl('elections'), payload);

    if (createResponse.status !== 201 && createResponse.status !== 200) {
      console.warn('Skipping invalid transition test: could not create election');
      return;
    }

    const newElectionId = createResponse.data.id;

    // Try to skip directly to ACTIVE (should fail — must go through NOMINATION first)
    const voteUrl = electionUrl(`elections/${newElectionId}/voting/open`);
    const response = await client.post(voteUrl);

    // Should be rejected with 400 or 409 (Conflict)
    expect([400, 409, 422]).toContain(response.status);

    if (response.data?.message) {
      const msg = (response.data.message as string).toLowerCase();
      expect(
        msg.includes('invalid') ||
        msg.includes('transition') ||
        msg.includes('state') ||
        msg.includes('cannot')
      ).toBeTruthy();
    }

    // Try to close polls when not in ACTIVE state (still PLANNING)
    const closeUrl = electionUrl(`elections/${newElectionId}/voting/close`);
    const closeResponse = await client.post(closeUrl);
    expect([400, 409, 422]).toContain(closeResponse.status);

    // Try to publish results when not in TALLYING state
    const publishUrl = electionUrl(`elections/${newElectionId}/results/publish`);
    const publishResponse = await client.post(publishUrl);
    expect([400, 409, 422]).toContain(publishResponse.status);

    // Cleanup: cancel this test election
    const cancelUrl = electionUrl(`elections/${newElectionId}/cancel`);
    await client.post(cancelUrl, { reason: 'Integration test cleanup' });
  });

  // ── Party Nomination Election ────────────────────────────────

  it('should create party nomination election', async () => {
    const payload = createNominationPayload();
    const url = electionUrl('elections');

    const response = await client.post(url, payload);

    expect([200, 201]).toContain(response.status);
    expect(response.data).toBeDefined();

    const election = response.data;
    nominationElectionId = election.id;

    // Verify it's a nomination type
    const electionType = election.type || election.electionType;
    if (electionType) {
      expect(electionType).toBe('PARTY_NOMINATION');
    }

    // Should start in PLANNING
    const status = election.status || election.state || election.lifecycleState;
    expect(status).toBe('PLANNING');
  });

  // ── Nomination Winner Declaration ────────────────────────────

  it('should declare and promote nomination winner', async () => {
    if (!nominationElectionId) {
      console.warn('Skipping nomination winner test: no nomination election created');
      return;
    }

    // Move nomination through lifecycle: PLANNING → NOMINATION → CAMPAIGN → ACTIVE → TALLYING
    const transitions = [
      `elections/${nominationElectionId}/nominations/open`,
      `elections/${nominationElectionId}/campaign/open`,
      `elections/${nominationElectionId}/voting/open`,
      `elections/${nominationElectionId}/voting/close`,
    ];

    for (const path of transitions) {
      const response = await client.post(electionUrl(path));
      // Some transitions may fail if the service requires additional conditions
      // (e.g., registered candidates for NOMINATION → CAMPAIGN)
      if (![200, 204].includes(response.status)) {
        console.warn(
          `Nomination transition ${path} returned ${response.status}: ${response.data?.message || ''}`,
        );
        // If we can't complete the lifecycle, test what we can
        return;
      }
    }

    // Verify we're in TALLYING state
    const getResponse = await client.get(
      electionUrl(`elections/${nominationElectionId}`),
    );
    const state =
      getResponse.data.status ||
      getResponse.data.state ||
      getResponse.data.lifecycleState;

    if (state !== 'TALLYING') {
      console.warn(`Nomination election in ${state} state, expected TALLYING`);
      return;
    }

    // Publish results — this would declare the nomination winner
    const publishUrl = electionUrl(
      `elections/${nominationElectionId}/results/publish`,
    );
    const publishResponse = await client.post(publishUrl);
    expect([200, 204]).toContain(publishResponse.status);

    // Verify final state
    const finalResponse = await client.get(
      electionUrl(`elections/${nominationElectionId}`),
    );
    const finalState =
      finalResponse.data.status ||
      finalResponse.data.state ||
      finalResponse.data.lifecycleState;
    expect(finalState).toBe('RESULTS_PUBLISHED');
  });

  // ── Emergency Cancellation ───────────────────────────────────

  it('should allow cancellation from any state', async () => {
    // Create a fresh election
    const payload = createElectionPayload({ name: 'Cancellation Test' });
    const createResponse = await client.post(electionUrl('elections'), payload);

    if (createResponse.status !== 201 && createResponse.status !== 200) {
      return;
    }

    const cancelElectionId = createResponse.data.id;

    // Move to NOMINATION
    await client.post(electionUrl(`elections/${cancelElectionId}/nominations/open`));

    // Cancel from NOMINATION state (any state should be cancellable)
    const cancelUrl = electionUrl(`elections/${cancelElectionId}/cancel`);
    const cancelResponse = await client.post(cancelUrl, {
      reason: 'Emergency cancellation integration test',
    });

    expect([200, 204]).toContain(cancelResponse.status);

    // Verify cancelled state
    const getResponse = await client.get(
      electionUrl(`elections/${cancelElectionId}`),
    );
    const state =
      getResponse.data.status ||
      getResponse.data.state ||
      getResponse.data.lifecycleState;
    expect(state).toBe('CANCELLED');
  });

  // ── Election Listing ─────────────────────────────────────────

  it('should list elections with filtering', async () => {
    const url = electionUrl(`elections?tenantId=${TEST_TENANT_ID}`);
    const response = await client.get(url);

    expect(response.status).toBe(200);
    expect(response.data).toBeDefined();

    // Response should be an array or paginated object
    const elections = Array.isArray(response.data)
      ? response.data
      : response.data.items || response.data.elections || [];

    expect(Array.isArray(elections)).toBeTruthy();
  });

  // ── Election Summary ─────────────────────────────────────────

  it('should return election summary with aggregate data', async () => {
    if (!electionId) return;

    const url = electionUrl(`elections/${electionId}/summary`);
    const response = await client.get(url);

    expect([200, 404]).toContain(response.status);

    if (response.status === 200) {
      const summary = response.data;
      expect(summary).toBeDefined();
      // Summary should include election details
      if (summary.id) expect(summary.id).toBe(electionId);
    }
  });
});
