/**
 * Vote Capsule™ — Capsule Test Fixtures
 *
 * Factory functions for creating valid/invalid capsule and tally data
 * matching the evidence pipeline's validation requirements.
 */

import { createHash } from 'crypto';

export function createValidCapsule(overrides: Partial<any> = {}) {
  const imageSHA256 = 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2';
  const metadata = { electionYear: 2027, formType: 'FORM_34A', stationCode: '001001001001001' };
  const captureTimestamp = '2027-08-09T06:30:00.000Z';
  const sortedMetadata = JSON.stringify(metadata, Object.keys(metadata).sort());
  const compositeHash = createHash('sha256')
    .update(imageSHA256 + sortedMetadata + captureTimestamp)
    .digest('hex');

  return {
    id: 'capsule-test-001',
    tenantId: 'tenant-001',
    iebcStationCode: '001001001001001',
    positionCode: 'PRESIDENT',
    electionYear: 2027,
    imageSHA256,
    compositeHash,
    captureTimestamp,
    metadata,
    status: 'UPLOADED',
    createdAt: new Date(),
    ...overrides,
  };
}

export function createValidTallyData(overrides: Partial<any> = {}) {
  return {
    formType: 'FORM_34A',
    registeredVoters: 500,
    ballotsIssued: 420,
    spoiltBallots: 5,
    rejectedBallots: 15,
    validVotes: 400,
    candidates: [
      { ballotNumber: 1, candidateName: 'Candidate A', partyAbbreviation: 'PRT', votes: 220 },
      { ballotNumber: 2, candidateName: 'Candidate B', partyAbbreviation: 'OPP', votes: 180 },
    ],
    presidingOfficerName: 'Test Officer',
    ...overrides,
  };
}

export function createInvalidTallyData(type: 'TURNOUT' | 'MISMATCH' | 'SUM') {
  const base = createValidTallyData();
  switch (type) {
    case 'TURNOUT':
      return { ...base, validVotes: 600 }; // > registeredVoters (500)
    case 'MISMATCH':
      return { ...base, ballotsIssued: 999 }; // != valid + rejected + spoilt
    case 'SUM':
      return { ...base, candidates: [
        { ballotNumber: 1, candidateName: 'A', partyAbbreviation: 'X', votes: 100 },
        { ballotNumber: 2, candidateName: 'B', partyAbbreviation: 'Y', votes: 100 },
      ]}; // sum=200 != validVotes=400
  }
}
