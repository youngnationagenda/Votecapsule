// ============================================================
// VoteCapsule™ — Sync Engine
// apps/agent-mobile/src/services/syncEngine.ts
//
// Offline-first upload queue. Runs as a background loop.
// Takes QUEUED / FAILED capsules from AsyncStorage and
// uploads them to the Evidence Service when connectivity
// is available.
//
// State machine per capsule:
//   DRAFT → CAPTURED → QUEUED → UPLOADING → UPLOADED → (deleted from queue)
//   QUEUED / UPLOADED → FAILED (on error, retry with back-off)
// ============================================================
import NetInfo from '@react-native-community/netinfo';
import * as FileSystem from 'expo-file-system';
import {
  getAllCapsules,
  updateCapsule,
  deleteCapsule,
  getPendingCapsules,
} from '../utils/storage';
import { uploadCapsule } from './api';
import { LocalCapsule } from '../types';

const MAX_RETRIES    = 5;
const RETRY_DELAY_MS = [5_000, 15_000, 30_000, 60_000, 120_000]; // exponential steps

let syncTimer: ReturnType<typeof setInterval> | null = null;
let isSyncing = false;

// ── Public API ────────────────────────────────────────────────

export function startSyncEngine(intervalMs = 30_000): void {
  if (syncTimer) return; // already running
  syncTimer = setInterval(() => runSync(), intervalMs);
  runSync(); // run once immediately on start
}

export function stopSyncEngine(): void {
  if (syncTimer) {
    clearInterval(syncTimer);
    syncTimer = null;
  }
}

export async function runSync(): Promise<void> {
  if (isSyncing) return;

  const netState = await NetInfo.fetch();
  if (!netState.isConnected) return; // offline — skip

  isSyncing = true;
  try {
    const pending = await getPendingCapsules();
    for (const capsule of pending) {
      await uploadOneCapsule(capsule);
    }
  } finally {
    isSyncing = false;
  }
}

/** Trigger immediate sync of a single capsule (called after capture). */
export async function enqueueAndSync(localId: string): Promise<void> {
  await updateCapsule(localId, { status: 'QUEUED' });
  const netState = await NetInfo.fetch();
  if (netState.isConnected) {
    const capsule = await (await import('../utils/storage')).getCapsule(localId);
    if (capsule) await uploadOneCapsule(capsule);
  }
}

// ── Core upload ───────────────────────────────────────────────

async function uploadOneCapsule(capsule: LocalCapsule): Promise<void> {
  if (capsule.syncAttempts >= MAX_RETRIES) {
    await updateCapsule(capsule.localId, {
      status:        'FAILED',
      lastSyncError: `Max retries (${MAX_RETRIES}) exceeded`,
    });
    return;
  }

  // Check image still exists on device
  const fileInfo = await FileSystem.getInfoAsync(capsule.imageUri);
  if (!fileInfo.exists) {
    await updateCapsule(capsule.localId, {
      status:        'FAILED',
      lastSyncError: 'Image file no longer exists on device',
    });
    return;
  }

  await updateCapsule(capsule.localId, { status: 'UPLOADING' });

  try {
    const result = await uploadCapsule(
      capsule.imageUri,
      `capsule_${capsule.localId}.jpg`,
      {
        tenantId:        capsule.tenantId,
        iebcStationCode: capsule.iebcStationCode,
        positionCode:    capsule.positionCode,
        electionYear:    capsule.electionYear,
        sha256Hash:      capsule.sha256Hash,
        capturedAt:      capsule.capturedAt,
        partyOrg:        capsule.partyOrg ?? undefined,
        latitude:        capsule.gps?.latitude,
        longitude:       capsule.gps?.longitude,
        altitude:        capsule.gps?.altitude ?? undefined,
        accuracyMeters:  capsule.gps?.accuracyMeters ?? undefined,
      },
    );

    // Upload successful — record server ID and mark UPLOADED
    await updateCapsule(capsule.localId, {
      serverId:      result.id,
      status:        'UPLOADED',
      lastSyncError: null,
    });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    const attempts = capsule.syncAttempts + 1;
    await updateCapsule(capsule.localId, {
      status:        attempts >= MAX_RETRIES ? 'FAILED' : 'QUEUED',
      syncAttempts:  attempts,
      lastSyncError: msg,
    });
  }
}
