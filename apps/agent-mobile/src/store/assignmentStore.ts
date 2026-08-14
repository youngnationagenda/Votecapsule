// ============================================================
// VoteCapsule™ — Agent Assignment Store (Zustand)
// apps/agent-mobile/src/store/assignmentStore.ts
//
// Fetches and caches the agent's assignment from the server.
// An assignment scopes the agent to:
//   - A specific election (e.g., "MP Kasarani Nomination DCP")
//   - Specific polling stations + stream numbers within that area
//   - A position code (e.g., MP, GOVERNOR, MCA)
//   - Geographic bounds (county, constituency, ward)
//
// The mobile app uses this to:
//   1. Only show the assigned election on HomeScreen
//   2. Only allow station selection within assigned stations
//   3. Only show the assigned position for capture
//   4. Validate GPS proximity to assigned stations
// ============================================================
import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PollingStation, PositionCode } from '../types';

const ASSIGNMENT_STORAGE_KEY = 'vc_agent_assignment';

// ── Types ────────────────────────────────────────────────────

export interface ElectionAssignment {
  /** UUID of the election this agent is assigned to */
  electionId: string;
  /** Human-readable election name (e.g., "MP Kasarani Nomination — DCP") */
  electionName: string;
  /** Election year */
  electionYear: number;
  /** Election type: GENERAL, PARTY_NOMINATION */
  electionType: 'GENERAL' | 'PARTY_NOMINATION';
  /** The position this agent covers */
  positionCode: PositionCode;
  /** Position label */
  positionLabel: string;
}

export interface StationAssignment {
  /** IEBC 15-digit station code */
  iebcCode: string;
  /** Stream number (e.g., 1, 2, 3) — null means ALL streams at this centre */
  streamNumber: number | null;
  /** Station display name */
  name: string;
  /** Registration centre name */
  centreName: string;
  /** Registered voters at this station */
  registeredVoters: number;
  /** Station GPS (for geo-fencing) — null if not yet mapped */
  latitude: number | null;
  longitude: number | null;
  /** NEC geographic hierarchy */
  countyCode: string;
  countyName: string;
  constituencyCode: string;
  constituencyName: string;
  wardCode: string;
  wardName: string;
}

export interface AgentAssignment {
  /** Assignment UUID */
  id: string;
  /** Agent user ID */
  userId: string;
  /** Tenant (party) ID */
  tenantId: string;
  /** The election(s) this agent is assigned to — typically 1 for nominations */
  election: ElectionAssignment;
  /** Specific stations this agent must cover */
  stations: StationAssignment[];
  /** Geographic scope (e.g., "Kasarani Constituency") */
  areaName: string;
  /** Geo-fence radius in meters — captures beyond this are flagged */
  geofenceRadiusMeters: number;
  /** Assignment status */
  status: 'ACTIVE' | 'SUSPENDED' | 'COMPLETED';
  /** When the assignment was created */
  assignedAt: string;
  /** When the assignment expires (election end) */
  expiresAt: string | null;
}

// ── Store ────────────────────────────────────────────────────

interface AssignmentState {
  assignment: AgentAssignment | null;
  isLoading: boolean;
  error: string | null;
  lastFetchedAt: number | null;

  // Actions
  fetchAssignment: (userId: string, tenantId: string, token: string) => Promise<void>;
  hydrate: () => Promise<void>;
  clear: () => Promise<void>;

  // Helpers
  isStationAssigned: (iebcCode: string) => boolean;
  getAssignedStationCodes: () => string[];
  getAssignedPositions: () => PositionCode[];
}

// API base URL — same as main API client
const API_BASE = 'https://483uyy43nc.execute-api.us-east-1.amazonaws.com/api/v1';

export const useAssignmentStore = create<AssignmentState>((set, get) => ({
  assignment: null,
  isLoading: false,
  error: null,
  lastFetchedAt: null,

  /**
   * Fetch the agent's active assignment from the server.
   * Called after login and on each app foreground.
   */
  fetchAssignment: async (userId: string, tenantId: string, token: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(`${API_BASE}/identity/assignments/me`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Tenant-Id': tenantId,
          'X-User-Id': userId,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          // No assignment — agent is unassigned
          set({ assignment: null, isLoading: false, lastFetchedAt: Date.now() });
          await AsyncStorage.removeItem(ASSIGNMENT_STORAGE_KEY);
          return;
        }
        throw new Error(`Assignment fetch failed: ${response.status}`);
      }

      const data = await response.json();
      const assignment: AgentAssignment = data?.data ?? data;

      // Cache locally for offline access
      await AsyncStorage.setItem(ASSIGNMENT_STORAGE_KEY, JSON.stringify(assignment));
      set({ assignment, isLoading: false, lastFetchedAt: Date.now() });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load assignment';
      set({ error: msg, isLoading: false });
      // Fall back to cached assignment
      try {
        const cached = await AsyncStorage.getItem(ASSIGNMENT_STORAGE_KEY);
        if (cached) {
          set({ assignment: JSON.parse(cached) });
        }
      } catch {
        // No cache available
      }
    }
  },

  /**
   * Hydrate from AsyncStorage (app cold start / offline).
   */
  hydrate: async () => {
    try {
      const cached = await AsyncStorage.getItem(ASSIGNMENT_STORAGE_KEY);
      if (cached) {
        set({ assignment: JSON.parse(cached) });
      }
    } catch {
      // Silently fail
    }
  },

  /**
   * Clear assignment data (on logout).
   */
  clear: async () => {
    await AsyncStorage.removeItem(ASSIGNMENT_STORAGE_KEY);
    set({ assignment: null, error: null, lastFetchedAt: null });
  },

  /**
   * Check if a specific station code is in the agent's assignment.
   */
  isStationAssigned: (iebcCode: string): boolean => {
    const { assignment } = get();
    if (!assignment) return false;
    // If no specific stations assigned, allow all in area
    if (assignment.stations.length === 0) return true;
    return assignment.stations.some(s => s.iebcCode === iebcCode);
  },

  /**
   * Get all assigned station codes (for filtering station search).
   */
  getAssignedStationCodes: (): string[] => {
    const { assignment } = get();
    if (!assignment) return [];
    return assignment.stations.map(s => s.iebcCode);
  },

  /**
   * Get assigned position codes.
   */
  getAssignedPositions: (): PositionCode[] => {
    const { assignment } = get();
    if (!assignment) return [];
    return [assignment.election.positionCode];
  },
}));
