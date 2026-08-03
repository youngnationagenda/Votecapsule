// ============================================================
// VoteCapsule™ — Capture Store (Zustand)
// apps/agent-mobile/src/store/captureStore.ts
//
// Manages the in-progress capture session state.
// A "session" is: station selected + position selected →
// camera open → photo taken → hash computed → queued.
// ============================================================
import { create } from 'zustand';
import { PollingStation, PositionCode, LocalCapsule, GpsCoords, FormTallyData } from '../types';
import { saveCapsule } from '../utils/storage';
import { computeCapsuleHash, sha256Bytes } from '../utils/crypto';
import { enqueueAndSync } from '../services/syncEngine';
import * as FileSystem from 'expo-file-system';

interface CaptureSession {
  station:       PollingStation | null;
  positionCode:  PositionCode | null;
  electionYear:  number;
  imageUri:      string | null;
  imageSha256:   string | null;
  capturedAt:    string | null;
  gps:           GpsCoords | null;
  partyOrg:      string | null;
  tallyData:     FormTallyData | null;
}

interface CaptureState {
  session: CaptureSession;
  isProcessing: boolean;
  error: string | null;

  // Actions
  setStation:      (station: PollingStation) => void;
  setPosition:     (code: PositionCode) => void;
  setElectionYear: (year: number) => void;
  setGps:          (coords: GpsCoords | null) => void;
  setPartyOrg:     (org: string | null) => void;
  setTallyData:    (data: FormTallyData) => void;
  captureImage:    (imageUri: string, tenantId: string, userId: string) => Promise<string | null>;
  resetSession:    () => void;
  clearError:      () => void;
}

const defaultSession: CaptureSession = {
  station:      null,
  positionCode: null,
  electionYear: 2027,
  imageUri:     null,
  imageSha256:  null,
  capturedAt:   null,
  gps:          null,
  partyOrg:     null,
  tallyData:    null,
};

export const useCaptureStore = create<CaptureState>((set, get) => ({
  session:      defaultSession,
  isProcessing: false,
  error:        null,

  setStation:      (station)      => set((s) => ({ session: { ...s.session, station } })),
  setPosition:     (positionCode) => set((s) => ({ session: { ...s.session, positionCode } })),
  setElectionYear: (electionYear) => set((s) => ({ session: { ...s.session, electionYear } })),
  setGps:          (gps)          => set((s) => ({ session: { ...s.session, gps } })),
  setPartyOrg:     (partyOrg)     => set((s) => ({ session: { ...s.session, partyOrg } })),
  setTallyData:    (tallyData)    => set((s) => ({ session: { ...s.session, tallyData } })),
  clearError:      ()             => set({ error: null }),

  /**
   * Process a captured image:
   * 1. Read image bytes
   * 2. Compute SHA-256 of image bytes
   * 3. Compute composite capsule hash (LOCKED FORMULA)
   * 4. Persist LocalCapsule to AsyncStorage
   * 5. Enqueue for upload
   *
   * Returns localId on success, null on failure.
   */
  captureImage: async (imageUri: string, tenantId: string, userId: string): Promise<string | null> => {
    const { session } = get();
    if (!session.station || !session.positionCode) {
      set({ error: 'Station and position must be selected before capture' });
      return null;
    }

    set({ isProcessing: true, error: null });

    try {
      // 1. Read image file as base64, convert to bytes
      const base64 = await FileSystem.readAsStringAsync(imageUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const fileInfo = await FileSystem.getInfoAsync(imageUri, { size: true });
      const imageBytes = base64ToUint8Array(base64);

      // 2. SHA-256 of raw image bytes
      const imageSha256 = await sha256Bytes(imageBytes);

      // 3. Capture timestamp — NOW, ISO 8601 UTC
      const capturedAt = new Date().toISOString();

      // 4. Compute LOCKED composite hash
      const metadata = {
        iebcStationCode: session.station.iebcCode,
        positionCode:    session.positionCode,
        electionYear:    session.electionYear,
        tenantId,
      };
      const sha256Hash = await computeCapsuleHash(imageSha256, metadata, capturedAt);

      // 5. Create LocalCapsule
      const localId = generateUUID();
      const capsule: LocalCapsule = {
        localId,
        serverId:       null,
        tenantId,
        iebcStationCode: session.station.iebcCode,
        positionCode:    session.positionCode,
        electionYear:    session.electionYear,
        sha256Hash,
        imageSha256,
        capturedAt,
        imageUri,
        imageMimeType:   'image/jpeg',
        imageSizeBytes:  (fileInfo as any).size ?? 0,
        partyOrg:        session.partyOrg,
        gps:             session.gps,
        tallyData:       session.tallyData ?? undefined,
        status:          'CAPTURED',
        syncAttempts:    0,
        lastSyncError:   null,
        createdAt:       capturedAt,
        updatedAt:       capturedAt,
      };

      // 6. Persist + enqueue
      await saveCapsule(capsule);
      await enqueueAndSync(localId);

      set({ isProcessing: false });
      return localId;

    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Capture failed';
      set({ isProcessing: false, error: msg });
      return null;
    }
  },

  resetSession: () => set({ session: defaultSession, error: null, isProcessing: false }),
}));

// ── Helpers ───────────────────────────────────────────────────

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const len = binary.length;
  const arr = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    arr[i] = binary.charCodeAt(i);
  }
  return arr;
}
