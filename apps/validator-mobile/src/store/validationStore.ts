// ============================================================
// VoteCapsule -- Validation Store (Zustand)
// apps/validator-mobile/src/store/validationStore.ts
// ============================================================
import { create } from 'zustand';
import {
  CapsuleForReview,
  ValidationDecision,
  ValidationHistory,
  ValidatorStats,
} from '../types';
import {
  getValidationQueue,
  getCapsuleDetail,
  submitDecision,
  escalateCapsule,
  getValidationHistory,
  getValidatorStats,
} from '../services/api';

interface ValidationState {
  // Queue
  queue: CapsuleForReview[];
  queueTotal: number;
  queuePage: number;
  isLoadingQueue: boolean;

  // Current capsule under review
  currentCapsule: CapsuleForReview | null;
  isLoadingCapsule: boolean;

  // History
  history: ValidationHistory[];
  historyTotal: number;

  // Stats
  stats: ValidatorStats | null;

  // Submission state
  isSubmitting: boolean;
  submitError: string | null;

  // Actions
  fetchQueue: (page?: number) => Promise<void>;
  refreshQueue: () => Promise<void>;
  fetchCapsuleDetail: (capsuleId: string) => Promise<void>;
  submitDecision: (capsuleId: string, decision: ValidationDecision, reason: string) => Promise<void>;
  escalate: (capsuleId: string, reason: string) => Promise<void>;
  fetchHistory: (page?: number) => Promise<void>;
  fetchStats: () => Promise<void>;
  clearCurrentCapsule: () => void;
  clearSubmitError: () => void;
}

export const useValidationStore = create<ValidationState>((set, get) => ({
  queue: [],
  queueTotal: 0,
  queuePage: 1,
  isLoadingQueue: false,

  currentCapsule: null,
  isLoadingCapsule: false,

  history: [],
  historyTotal: 0,

  stats: null,

  isSubmitting: false,
  submitError: null,

  fetchQueue: async (page = 1) => {
    set({ isLoadingQueue: true });
    try {
      const result = await getValidationQueue(page);
      set({
        queue: result.items,
        queueTotal: result.total,
        queuePage: result.page,
      });
    } catch {
      // Silently fail -- user can pull-to-refresh
    } finally {
      set({ isLoadingQueue: false });
    }
  },

  refreshQueue: async () => {
    const { queuePage } = get();
    await get().fetchQueue(queuePage);
  },

  fetchCapsuleDetail: async (capsuleId: string) => {
    set({ isLoadingCapsule: true, currentCapsule: null });
    try {
      const capsule = await getCapsuleDetail(capsuleId);
      set({ currentCapsule: capsule });
    } catch {
      set({ submitError: 'Failed to load capsule details' });
    } finally {
      set({ isLoadingCapsule: false });
    }
  },

  submitDecision: async (capsuleId: string, decision: ValidationDecision, reason: string) => {
    set({ isSubmitting: true, submitError: null });
    try {
      await submitDecision(capsuleId, decision, reason);
      set({ currentCapsule: null });
      await get().refreshQueue();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to submit decision';
      set({ submitError: msg });
      throw err;
    } finally {
      set({ isSubmitting: false });
    }
  },

  escalate: async (capsuleId: string, reason: string) => {
    set({ isSubmitting: true, submitError: null });
    try {
      await escalateCapsule(capsuleId, reason);
      set({ currentCapsule: null });
      await get().refreshQueue();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to escalate capsule';
      set({ submitError: msg });
      throw err;
    } finally {
      set({ isSubmitting: false });
    }
  },

  fetchHistory: async (page = 1) => {
    try {
      const result = await getValidationHistory(page);
      set({ history: result.items, historyTotal: result.total });
    } catch {
      // Non-critical
    }
  },

  fetchStats: async () => {
    try {
      const stats = await getValidatorStats();
      set({ stats });
    } catch {
      // Non-critical
    }
  },

  clearCurrentCapsule: () => set({ currentCapsule: null }),
  clearSubmitError: () => set({ submitError: null }),
}));
