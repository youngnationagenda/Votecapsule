// ============================================================
// VoteCapsule™ — Capture Store (Zustand)
// apps/agent-mobile/src/store/captureStore.ts
//
// Manages the in-progress capture session state.
//
// MULTI-IMAGE FLOW:
//   1. Agent selects station + position
//   2. Opens camera → shoots page 1 → processs as first page
//   3. Review screen shows page 1 thumbnail + "Add Page 2" button
//   4. Agent shoots page 2 → appended to pages[]
//   5. Up to MAX_PAGES (5) images per capsule
//   6. All pages uploaded as image_1, image_2, … to the server
// ============================================================
import { create } from 'zustand';
import { PollingStation, PositionCode, LocalCapsule, GpsCoords, FormTallyData, CapsulePage } from '../types';
import { saveCapsule, updateCapsule, getCapsule } from '../utils/storage';
import { computeCapsuleHash, sha256Bytes } from '../utils/crypto';
import { enqueueAndSync } from '../services/syncEngine';
import * as FileSystem from 'expo-file-system';

export const MAX_PAGES = 5;

interface CaptureSession {
  station:       PollingStation | null;
  positionCode:  PositionCode | null;
  electionYear:  number;
  gps:           GpsCoords | null;
  partyOrg:      string | null;
  tallyData:     FormTallyData | null;

  // Current capsule being built (null until first page captured)
  activeCapsuleId: string | null;
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

  /**
   * Capture the FIRST page — creates the capsule record.
   * Returns localId on success, null on failure.
   */
  captureFirstPage: (imageUri: string, tenantId: string, userId: string) => Promise<string | null>;

  /**
   * Capture an ADDITIONAL page and append to existing capsule.
   * Returns true on success.
   */
  captureAdditionalPage: (localId: string, imageUri: string) => Promise<boolean>;

  resetSession:    () => void;
  clearError:      () => void;

  // Legacy alias — calls captureFirstPage
  captureImage:    (imageUri: string, tenantId: string, userId: string) => Promise<string | null>;
}

const defaultSession: CaptureSession = {
  station:         null,
  positionCode:    null,
  electionYear:    2027,
  gps:             null,
  partyOrg:        null,
  tallyData:       null,
  activeCapsuleId: null,
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

  captureFirstPage: async (imageUri: string, tenantId: string, userId: string): Promise<string | null> => {
    const { session } = get();
    if (!session.station || !session.positionCode) {
      set({ error: 'Station and position must be selected before capture' });
      return null;
    }

    set({ isProcessing: true, error: null });

    try {
      // 1. Read image + compute hashes
      const base64   = await FileSystem.readAsStringAsync(imageUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const fileInfo  = await FileSystem.getInfoAsync(imageUri, { size: true });
      const imageBytes = base64ToUint8Array(base64);
      const imageSha256 = await sha256Bytes(imageBytes);
      const capturedAt  = new Date().toISOString();

      // 2. Compute composite capsule hash (LOCKED formula — first page)
      const metadata = {
        iebcStationCode: session.station.iebcCode,
        positionCode:    session.positionCode,
        electionYear:    session.electionYear,
        tenantId,
      };
      const sha256Hash = await computeCapsuleHash(imageSha256, metadata, capturedAt);

      // 3. Build first page
      const firstPage: CapsulePage = {
        pageNumber:     1,
        imageUri,
        imageSha256,
        imageSizeBytes: (fileInfo as any).size ?? 0,
        capturedAt,
      };

      // 4. Create LocalCapsule with pages array
      const localId = generateUUID();
      const capsule: LocalCapsule = {
        localId,
        serverId:        null,
        tenantId,
        iebcStationCode: session.station.iebcCode,
        positionCode:    session.positionCode,
        electionYear:    session.electionYear,
        sha256Hash,
        imageSha256,
        capturedAt,
        imageUri,               // first page — backwards compat
        imageMimeType:   'image/jpeg',
        imageSizeBytes:  (fileInfo as any).size ?? 0,
        pages:           [firstPage],
        partyOrg:        session.partyOrg,
        gps:             session.gps,
        tallyData:       session.tallyData ?? undefined,
        status:          'CAPTURED',
        syncAttempts:    0,
        lastSyncError:   null,
        createdAt:       capturedAt,
        updatedAt:       capturedAt,
      };

      // 5. Persist + track active capsule (DO NOT enqueue yet — more pages may come)
      await saveCapsule(capsule);
      set((s) => ({
        isProcessing: false,
        session: { ...s.session, activeCapsuleId: localId },
      }));

      return localId;

    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Capture failed';
      set({ isProcessing: false, error: msg });
      return null;
    }
  },

  captureAdditionalPage: async (localId: string, imageUri: string): Promise<boolean> => {
    set({ isProcessing: true, error: null });

    try {
      // Load existing capsule
      const capsule = await getCapsule(localId);
      if (!capsule) throw new Error('Capsule not found');

      const currentPageCount = capsule.pages?.length ?? 1;
      if (currentPageCount >= MAX_PAGES) {
        set({ isProcessing: false, error: `Maximum ${MAX_PAGES} pages per capsule` });
        return false;
      }

      // Hash the new image
      const base64   = await FileSystem.readAsStringAsync(imageUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const fileInfo  = await FileSystem.getInfoAsync(imageUri, { size: true });
      const imageBytes = base64ToUint8Array(base64);
      const imageSha256 = await sha256Bytes(imageBytes);
      const capturedAt  = new Date().toISOString();

      const newPage: CapsulePage = {
        pageNumber:     currentPageCount + 1,
        imageUri,
        imageSha256,
        imageSizeBytes: (fileInfo as any).size ?? 0,
        capturedAt,
      };

      const updatedPages = [...(capsule.pages ?? [{ pageNumber: 1, imageUri: capsule.imageUri, imageSha256: capsule.imageSha256, imageSizeBytes: capsule.imageSizeBytes, capturedAt: capsule.capturedAt }]), newPage];

      await updateCapsule(localId, { pages: updatedPages });

      set({ isProcessing: false });
      return true;

    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Page capture failed';
      set({ isProcessing: false, error: msg });
      return false;
    }
  },

  /** Finalise the capsule — enqueue for upload (called when agent is done adding pages) */

  resetSession: () => set({ session: defaultSession, error: null, isProcessing: false }),

  // Legacy alias
  captureImage: async (imageUri: string, tenantId: string, userId: string): Promise<string | null> => {
    const localId = await get().captureFirstPage(imageUri, tenantId, userId);
    if (localId) {
      // Auto-enqueue (single-page backwards-compat mode)
      await enqueueAndSync(localId);
    }
    return localId;
  },
}));

// ── Helpers ──────────────────────────────────────────────────

export function generateUUID(): string {
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
