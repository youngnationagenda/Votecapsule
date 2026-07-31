// ============================================================
// VoteCapsule™ — AsyncStorage helpers
// apps/agent-mobile/src/utils/storage.ts
//
// Thin wrappers around AsyncStorage for typed reads/writes.
// All capsule queue operations live here so the sync engine
// has a single source of truth for persisted state.
// ============================================================
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LocalCapsule, AuthTokens, AgentUser } from '../types';

// ── Storage keys ─────────────────────────────────────────────

const KEYS = {
  CAPSULE_IDS:  'vc:capsule_ids',   // string[] of localId
  CAPSULE:      (id: string) => `vc:capsule:${id}`,
  AUTH_TOKENS:  'vc:auth_tokens',
  AGENT_USER:   'vc:agent_user',
  DEVICE_ID:    'vc:device_id',
} as const;

// ── Capsule queue ─────────────────────────────────────────────

export async function saveCapsule(capsule: LocalCapsule): Promise<void> {
  const ids = await getCapsuleIds();
  if (!ids.includes(capsule.localId)) {
    await AsyncStorage.setItem(KEYS.CAPSULE_IDS, JSON.stringify([...ids, capsule.localId]));
  }
  await AsyncStorage.setItem(KEYS.CAPSULE(capsule.localId), JSON.stringify(capsule));
}

export async function getCapsule(localId: string): Promise<LocalCapsule | null> {
  const raw = await AsyncStorage.getItem(KEYS.CAPSULE(localId));
  return raw ? (JSON.parse(raw) as LocalCapsule) : null;
}

export async function updateCapsule(
  localId: string,
  updates: Partial<LocalCapsule>,
): Promise<void> {
  const existing = await getCapsule(localId);
  if (!existing) return;
  const updated: LocalCapsule = {
    ...existing,
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  await AsyncStorage.setItem(KEYS.CAPSULE(localId), JSON.stringify(updated));
}

export async function deleteCapsule(localId: string): Promise<void> {
  const ids = await getCapsuleIds();
  await AsyncStorage.setItem(
    KEYS.CAPSULE_IDS,
    JSON.stringify(ids.filter((id) => id !== localId)),
  );
  await AsyncStorage.removeItem(KEYS.CAPSULE(localId));
}

export async function getAllCapsules(): Promise<LocalCapsule[]> {
  const ids = await getCapsuleIds();
  const results = await Promise.all(ids.map(getCapsule));
  return results.filter(Boolean) as LocalCapsule[];
}

export async function getCapsuleIds(): Promise<string[]> {
  const raw = await AsyncStorage.getItem(KEYS.CAPSULE_IDS);
  return raw ? (JSON.parse(raw) as string[]) : [];
}

export async function getPendingCapsules(): Promise<LocalCapsule[]> {
  const all = await getAllCapsules();
  return all.filter((c) => c.status === 'QUEUED' || c.status === 'FAILED');
}

// ── Auth ──────────────────────────────────────────────────────

export async function saveAuthTokens(tokens: AuthTokens): Promise<void> {
  await AsyncStorage.setItem(KEYS.AUTH_TOKENS, JSON.stringify(tokens));
}

export async function getAuthTokens(): Promise<AuthTokens | null> {
  const raw = await AsyncStorage.getItem(KEYS.AUTH_TOKENS);
  return raw ? (JSON.parse(raw) as AuthTokens) : null;
}

export async function clearAuthTokens(): Promise<void> {
  await AsyncStorage.removeItem(KEYS.AUTH_TOKENS);
}

export async function saveAgentUser(user: AgentUser): Promise<void> {
  await AsyncStorage.setItem(KEYS.AGENT_USER, JSON.stringify(user));
}

export async function getAgentUser(): Promise<AgentUser | null> {
  const raw = await AsyncStorage.getItem(KEYS.AGENT_USER);
  return raw ? (JSON.parse(raw) as AgentUser) : null;
}

export async function clearAgentUser(): Promise<void> {
  await AsyncStorage.removeItem(KEYS.AGENT_USER);
}

// ── Device ID ─────────────────────────────────────────────────

export async function getOrCreateDeviceId(): Promise<string> {
  const existing = await AsyncStorage.getItem(KEYS.DEVICE_ID);
  if (existing) return existing;
  const id = generateUUID();
  await AsyncStorage.setItem(KEYS.DEVICE_ID, id);
  return id;
}

// ── Helpers ───────────────────────────────────────────────────

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
