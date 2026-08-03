// ============================================================
// VoteCapsule™ — Sync Engine
// apps/agent-mobile/src/services/syncEngine.ts
//
// Offline-first upload queue. Runs as a timed background loop.
// Picks QUEUED / FAILED capsules from AsyncStorage and uploads
// them to the Evidence Service when connectivity is available.
//
// State machine per capsule:
//   DRAFT → CAPTURED → QUEUED → UPLOADING → UPLOADED
//                   ↑____________FAILED (retry with back-off)
//
// Hardening additions:
//  - UPLOADING capsules that are older than STUCK_THRESHOLD_MS
//    are reset to QUEUED so they are retried (handles app crash
//    mid-upload or killed process).
//  - Capsule image file existence is checked before each upload.
//  - Successful uploads are marked UPLOADED with the server ID.
// ============================================================
import NetInfo from '@react-native-community/netinfo';
import * as FileSystem from 'expo-file-system';
import {
  getAllCapsules,
  updateCapsule,
  getPendingCapsules,
  getCapsule,
} from '../utils/storage';
import { uploadCapsule } from './api';
import { LocalCapsule } from '../types';

const MAX_RETRIES       = 5;
const STUCK_THRESHOLD_MS = 3 * 60 * 1000; // 3 minutes — assume stuck if UPLOADING this long

/** Exponential back-off delays per attempt index (0-indexed) */
const RETRY_DELAY_MS = [5_000, 15_000, 30_000, 60_000, 120_000];

let syncTimer: ReturnType<typeof setInterval> | null = null;
let isSyncing = false;

// ── Public API ────────────────────────────────────────────────

export function startSyncEngine(intervalMs = 30_000): void {
  if (syncTimer) return; // already running
  runSync();             // run immediately on start
  syncTimer = setInterval(runSync, intervalMs);
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
    await recoverStuckCapsules();
    const pending = await getPendingCapsules();
    for (const capsule of pending) {
      await uploadOneCapsule(capsule);
    }
  } finally {
    isSyncing = false;
  }
}

/**
 * Immediately mark a newly-captured capsule as QUEUED and
 * attempt a single upload if we're online.
 */
export async function enqueueAndSync(localId: string): Promise<void> {
  await updateCapsule(localId, { status: 'QUEUED', syncAttempts: 0 });

  const netState = await NetInfo.fetch();
  if (!netState.isConnected) return;

  const capsule = await getCapsule(localId);
  if (capsule) await uploadOneCapsule(capsule);
}

// ── Stuck capsule recovery ────────────────────────────────────

/**
 * If the app was killed mid-upload the capsule will be permanently
 * stuck in UPLOADING. Detect these and reset them to QUEUED.
 */
async function recoverStuckCapsules(): Promise<void> {
  const all  = await getAllCapsules();
  const now  = Date.now();
  const stuck = all.filter(
    (c) =>
      c.status === 'UPLOADING' &&
      now - new Date(c.updatedAt).getTime() > STUCK_THRESHOLD_MS,
  );
  for (const c of stuck) {
    await updateCapsule(c.localId, {
      status:        'QUEUED',
      lastSyncError: 'Reset from stuck UPLOADING state',
    });
  }
}

// ── Core upload ───────────────────────────────────────────────

async function uploadOneCapsule(capsule: LocalCapsule): Promise<void> {
  // Max retries reached → mark permanently failed
  if (capsule.syncAttempts >= MAX_RETRIES) {
    await updateCapsule(capsule.localId, {
      status:        'FAILED',
      lastSyncError: `Maximum retry limit (${MAX_RETRIES}) exceeded`,
    });
    return;
  }

  // Apply back-off delay based on attempt number (skip on first attempt)
  if (capsule.syncAttempts > 0) {
    const delayIdx = Math.min(capsule.syncAttempts - 1, RETRY_DELAY_MS.length - 1);
    await sleep(RETRY_DELAY_MS[delayIdx]);
  }

  // Check image file still exists on device
  const fileInfo = await FileSystem.getInfoAsync(capsule.imageUri);
  if (!fileInfo.exists) {
    await updateCapsule(capsule.localId, {
      status:        'FAILED',
      lastSyncError: `Image file no longer exists on device: ${capsule.imageUri}`,
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
      capsule.tallyData ?? null,
    );

    // Upload successful — record server ID and mark UPLOADED
    await updateCapsule(capsule.localId, {
      serverId:      result.id,
      status:        'UPLOADED',
      lastSyncError: null,
    });

  } catch (err: unknown) {
    const msg      = err instanceof Error ? err.message : String(err);
    const attempts = capsule.syncAttempts + 1;
    await updateCapsule(capsule.localId, {
      status:        attempts >= MAX_RETRIES ? 'FAILED' : 'QUEUED',
      syncAttempts:  attempts,
      lastSyncError: msg,
    });
  }
}

// ── Helpers ───────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
