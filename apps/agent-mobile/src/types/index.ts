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
 * A locally stored evidence capsule — lives in AsyncStorage until
 * successfully uploaded to the server.
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

  /** SHA-256(imageSHA256 + sortedMetadataJSON + captureTimestamp) — LOCKED formula */
  sha256Hash: string;
  /** SHA-256 of the raw image bytes */
  imageSha256: string;

  /** ISO 8601 UTC — when the shutter was pressed on device */
  capturedAt: string;

  /** Local file:// URI of the captured image */
  imageUri: string;
  /** MIME type — always image/jpeg for Form 35A scans */
  imageMimeType: string;
  /** File size in bytes */
  imageSizeBytes: number;

  partyOrg: string | null;
  gps: GpsCoords | null;

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

// ── Navigation ───────────────────────────────────────────────

export type RootStackParamList = {
  Login: undefined;
  Home: undefined;
  Capture: { stationCode?: string };
  Review: { localId: string };
  Queue: undefined;
  StationSearch: undefined;
  Settings: undefined;
};
