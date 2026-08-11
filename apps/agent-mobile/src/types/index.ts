// ============================================================
// VoteCapsule™ — Agent Mobile App Types
// apps/agent-mobile/src/types/index.ts
// ============================================================

// ── Evidence / Capsule ──────────────────────────────────────

export type PositionCode =
  | 'PRESIDENT'
  | 'GOVERNOR'
  | 'SENATOR'
  | 'WOMEN_REP'
  | 'MP'
  | 'MCA';

export type CapsuleStatus =
  | 'DRAFT'
  | 'CAPTURED'
  | 'QUEUED'
  | 'UPLOADING'
  | 'UPLOADED'
  | 'FAILED';

export interface GpsCoords {
  latitude: number;
  longitude: number;
  altitude: number | null;
  accuracyMeters: number | null;
  capturedAt: string; // ISO 8601
}

/**
 * A single captured page/image within a capsule.
 */
export interface CapsulePage {
  /** Page number — 1-indexed */
  pageNumber: number;
  /** Local file:// URI */
  imageUri: string;
  /** SHA-256 of raw image bytes for this page */
  imageSha256: string;
  /** File size in bytes */
  imageSizeBytes: number;
  /** ISO 8601 UTC — when this page was captured */
  capturedAt: string;
}

/**
 * A locally stored evidence capsule — lives in AsyncStorage until
 * successfully uploaded to the server.
 *
 * Multi-image support: a capsule can have 1–N pages (images).
 * The primary/first image is still exposed as `imageUri` / `imageSha256`
 * for backwards compatibility. Additional pages are in `pages[]`.
 */
export interface LocalCapsule {
  /** UUID generated on device at capture time */
  localId: string;
  /** Returned by server after successful upload */
  serverId: string | null;

  tenantId: string;
  iebcStationCode: string;    // 15-digit IEBC code
  positionCode: PositionCode;
  electionYear: number;

  /** SHA-256(imageSHA256 + sortedMetadataJSON + captureTimestamp) — LOCKED formula (first page) */
  sha256Hash: string;
  /** SHA-256 of the raw image bytes (first page — backwards compat) */
  imageSha256: string;

  /** ISO 8601 UTC — when the first page was captured */
  capturedAt: string;

  /** Local file:// URI of the FIRST captured image (backwards compat) */
  imageUri: string;
  /** MIME type — always image/jpeg */
  imageMimeType: string;
  /** File size in bytes (first page) */
  imageSizeBytes: number;

  /**
   * All captured pages — always has at least 1 entry.
   * Additional pages (page 2, 3…) are added via "Add Page" in CaptureScreen.
   */
  pages: CapsulePage[];

  partyOrg: string | null;
  gps: GpsCoords | null;
  tallyData?: FormTallyData;

  status: CapsuleStatus;
  syncAttempts: number;
  lastSyncError: string | null;
  createdAt: string;
  updatedAt: string;
}

// ── Station / Geography (NEC SSoT) ──────────────────────────

export interface PollingStation {
  iebcCode: string;           // 15-digit
  streamName: string;
  registeredVoters: number;
  countyCode: string;
  countyName: string;
  constituencyCode: string;
  constituencyName: string;
  wardCode: string;
  wardName: string;
  centreName: string;
  centreCode: string;
  latitude: number | null;
  longitude: number | null;
}

// ── Auth ─────────────────────────────────────────────────────

export interface AuthTokens {
  accessToken: string;
  idToken: string;
  refreshToken: string;
  expiresAt: number; // unix ms
}

export interface AgentUser {
  cognitoSub: string;
  userId: string;        // UUID from our DB
  email: string;
  fullName: string;
  tenantId: string;
  deviceId: string;      // UUID registered for this device
  roles: string[];
}

// ── IEBC Form types ──────────────────────────────────────────
//
// Complete IEBC form system (Kenya Elections Act 2011 + 2022 Regulations)
// Every position has 4 forms: A (polling station), B (constituency/ward tally),
// C (county/national declaration), D (winner's certificate)
//
// Form A = captured by VoteCapsule Agent App (this app)
// Form B = entered by Returning Officers at Constituency Tallying Centres
// Form C = generated at County/National Tallying Centre
// Form D = certificate issued to winner (output only)

export type FormTypeA =
  | 'FORM_34A'   // Presidential — Polling Station (has running mate + Deputy President)
  | 'FORM_35A'   // MP / National Assembly — Polling Station
  | 'FORM_36A'   // MCA / County Assembly — Polling Station
  | 'FORM_37A'   // Governor — Polling Station (has Deputy Governor)
  | 'FORM_38A'   // Senator — Polling Station
  | 'FORM_39A';  // Women Representative (County) — Polling Station

export type FormTypeB =
  | 'FORM_34B'   // Presidential — Constituency Tally (collates all 34As in constituency)
  | 'FORM_35B'   // MP — Constituency Declaration (final, MPs declare here)
  | 'FORM_36B'   // MCA — Ward/Constituency Tally (final, MCAs declare here)
  | 'FORM_37B'   // Governor — Constituency Tally (collates all 37As)
  | 'FORM_38B'   // Senator — Constituency Tally (collates all 38As)
  | 'FORM_39B';  // Women Rep — Constituency Tally (collates all 39As)

export type FormTypeC =
  | 'FORM_34C'   // Presidential — National Declaration (NTC aggregates all 34Bs)
  | 'FORM_37C'   // Governor — County Declaration (County TC aggregates all 37Bs)
  | 'FORM_38C'   // Senator — County Declaration
  | 'FORM_39C';  // Women Rep — County Declaration

export type FormTypeD =
  | 'FORM_34D'   // Presidential Certificate
  | 'FORM_35D'   // MP Certificate
  | 'FORM_36D'   // MCA Certificate
  | 'FORM_37D'   // Governor Certificate
  | 'FORM_38D'   // Senator Certificate
  | 'FORM_39D';  // Women Rep Certificate

export type IebcFormType = FormTypeA | FormTypeB | FormTypeC | FormTypeD;

// ── Form A metadata (position-specific fields) ──────────────

export interface FormAMeta {
  // Presidential only (34A)
  runningMateName?: string;         // Deputy President candidate
  runningMateNationalId?: string;
  // Governor only (37A)
  deputyGovernorName?: string;      // Deputy Governor candidate
  // Senator (38A) — no extra fields but different header
  // Women Rep (39A) — county-wide position header
}

// ── Candidate tally entry ────────────────────────────────────

export interface CandidateTally {
  ballotNumber: number;             // Ballot order (1, 2, 3…)
  candidateName: string;            // Full name as printed on ballot paper
  runningMateName?: string;         // Presidential running mate (34A only)
  deputyName?: string;              // Deputy Governor (37A only)
  nationalId?: string;              // Optional — for verification
  partyAbbreviation: string;        // e.g. "UDA", "ODM", "IND"
  partyName?: string;               // Full party name
  votes: number;                    // Total votes received
}

// ── Form A tally data (captured at polling station) ──────────

export interface FormTallyData {
  formType: FormTypeA;

  // ── Station totals (must satisfy: ballotsIssued = validVotes + rejectedBallots + spoiltBallots)
  registeredVoters: number;         // From NEC register for this stream
  ballotsIssued: number;            // Total ballot papers issued
  spoiltBallots: number;            // Spoilt / defaced papers
  rejectedBallots: number;          // Rejected at counting (not properly marked)
  validVotes: number;               // Valid votes counted
                                    // MUST equal: ballotsIssued - spoiltBallots - rejectedBallots
                                    // MUST equal: sum(candidates[].votes)

  // ── Candidate results
  candidates: CandidateTally[];     // SUM(candidates[].votes) MUST == validVotes

  // ── Position-specific extra fields
  formMeta?: FormAMeta;

  // ── Declaration
  presidingOfficerName: string;     // Name of Presiding Officer signing the form
  presidingOfficerSignedAt?: string; // ISO 8601 — when the form was signed
  agentSignedAt?: string;           // ISO 8601 — agent acknowledgment
  declaredAt: string;               // ISO 8601 — official declaration time

  // ── Mathematical invariants (validated before submission)
  // 1. ballotsIssued = validVotes + rejectedBallots + spoiltBallots
  // 2. validVotes = sum(candidates[i].votes)
  // 3. validVotes <= registeredVoters  (turnout cannot exceed register)
  // 4. All vote counts >= 0
}

// ── Form label lookup ────────────────────────────────────────

export const FORM_LABELS: Record<FormTypeA, string> = {
  FORM_34A: 'Form 34A — Presidential Results',
  FORM_35A: 'Form 35A — National Assembly (MP) Results',
  FORM_36A: 'Form 36A — County Assembly (MCA) Results',
  FORM_37A: 'Form 37A — Governor Results',
  FORM_38A: 'Form 38A — Senator Results',
  FORM_39A: 'Form 39A — County Woman Representative Results',
};

// ── Position → Form A mapping ────────────────────────────────
// Based on IEBC Election Forms (Elections Act 2011, Elections
// (General) Regulations 2012 as amended 2017 & 2022)

export function getFormType(positionCode: PositionCode): FormTypeA {
  switch (positionCode) {
    case 'PRESIDENT':  return 'FORM_34A';  // Running mate field required
    case 'MP':         return 'FORM_35A';  // Constituency-level final
    case 'MCA':        return 'FORM_36A';  // Ward-level final
    case 'GOVERNOR':   return 'FORM_37A';  // Deputy Governor field
    case 'SENATOR':    return 'FORM_38A';  // County-wide position
    case 'WOMEN_REP':  return 'FORM_39A';  // County Women Representative
  }
}

// ── Position → Form B (collation) mapping ───────────────────

export function getFormTypeB(positionCode: PositionCode): FormTypeB {
  switch (positionCode) {
    case 'PRESIDENT':  return 'FORM_34B';
    case 'MP':         return 'FORM_35B';
    case 'MCA':        return 'FORM_36B';
    case 'GOVERNOR':   return 'FORM_37B';
    case 'SENATOR':    return 'FORM_38B';
    case 'WOMEN_REP':  return 'FORM_39B';
  }
}

// ── Mathematical validation helpers ─────────────────────────

export interface TallyValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateFormATally(tally: FormTallyData): TallyValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Rule 1: No negative numbers
  if (tally.registeredVoters < 0) errors.push('Registered voters cannot be negative');
  if (tally.ballotsIssued < 0)    errors.push('Ballots issued cannot be negative');
  if (tally.spoiltBallots < 0)    errors.push('Spoilt ballots cannot be negative');
  if (tally.rejectedBallots < 0)  errors.push('Rejected ballots cannot be negative');
  if (tally.validVotes < 0)       errors.push('Valid votes cannot be negative');
  tally.candidates.forEach((c, i) => {
    if (c.votes < 0) errors.push(`Candidate ${i + 1} votes cannot be negative`);
  });

  // Rule 2: Candidate votes sum must equal valid votes
  const candidateSum = tally.candidates.reduce((s, c) => s + c.votes, 0);
  if (candidateSum !== tally.validVotes) {
    errors.push(
      `Candidate votes total (${candidateSum}) does not equal valid votes (${tally.validVotes}). ` +
      `Difference: ${Math.abs(candidateSum - tally.validVotes)}`
    );
  }

  // Rule 3: Ballots issued = valid + rejected + spoilt
  const expectedIssued = tally.validVotes + tally.rejectedBallots + tally.spoiltBallots;
  if (tally.ballotsIssued !== expectedIssued) {
    errors.push(
      `Ballots issued (${tally.ballotsIssued}) must equal ` +
      `valid votes + rejected + spoilt (${expectedIssued}). ` +
      `Difference: ${Math.abs(tally.ballotsIssued - expectedIssued)}`
    );
  }

  // Rule 4: Turnout cannot exceed registered voters
  if (tally.ballotsIssued > tally.registeredVoters) {
    errors.push(
      `Ballots issued (${tally.ballotsIssued}) exceeds registered voters (${tally.registeredVoters}). ` +
      `This is impossible — please recheck the numbers.`
    );
  }

  // Rule 5: Warn if zero candidates
  if (tally.candidates.length === 0) {
    warnings.push('No candidates entered. At least one candidate expected.');
  }

  // Rule 6: Warn if presiding officer name missing
  if (!tally.presidingOfficerName.trim()) {
    warnings.push('Presiding officer name is required for official record');
  }

  // Rule 7: Presidential must have running mate on at least one candidate
  if (tally.formType === 'FORM_34A') {
    const hasRunningMate = tally.candidates.some(c => c.runningMateName?.trim());
    if (!hasRunningMate && tally.candidates.length > 0) {
      warnings.push('Form 34A (Presidential): Running mate names recommended for all candidates');
    }
  }

  // Rule 8: Governor must have deputy governor on at least one candidate
  if (tally.formType === 'FORM_37A') {
    const hasDeputy = tally.candidates.some(c => c.deputyName?.trim());
    if (!hasDeputy && tally.candidates.length > 0) {
      warnings.push('Form 37A (Governor): Deputy Governor names recommended for all candidates');
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

// ── Navigation ───────────────────────────────────────────────

export type RootStackParamList = {
  Login: undefined;
  Home: undefined;
  Capture: { stationCode?: string };
  Review: { localId: string };
  TallyEntry: { localId: string };
  Queue: undefined;
  StationSearch: undefined;
  Settings: undefined;
};
