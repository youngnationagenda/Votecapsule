/**
 * Vote Capsule™ Color Design Tokens (V14 Spec)
 *
 * These are the canonical color values for the entire platform.
 * Never use raw hex values in components — always import from this package.
 *
 * IMPORTANT: Political party colors are NEVER part of the platform theme.
 * Party colors are used only inside election result charts and visualizations.
 * Never use the word "blockchain" in user-facing labels. Use "integrity verified" or "trust verified".
 */

// ─── Core Brand Colors ───────────────────────────────────────────────────────

/** Deep Navy — Navigation, Primary Buttons */
export const PRIMARY = '#0B3C6D' as const;

/** Links, Active States */
export const PRIMARY_LIGHT = '#2563EB' as const;

/** Backgrounds */
export const SECONDARY = '#F5F7FA' as const;

/** Cards, Modals, Dialogs */
export const SURFACE = '#FFFFFF' as const;

/** Default Borders */
export const BORDER = '#D1D5DB' as const;

/** Main readable text */
export const TEXT_PRIMARY = '#111827' as const;

/** Supporting text */
export const TEXT_SECONDARY = '#6B7280' as const;

// ─── Semantic Status Colors ──────────────────────────────────────────────────

/** Green — Success, Approved */
export const SUCCESS = '#10B981' as const;

/** Amber — Pending, Awaiting */
export const PENDING = '#F59E0B' as const;

/** Orange — Warning */
export const WARNING = '#F97316' as const;

/** Red — Error, Rejected */
export const ERROR = '#EF4444' as const;

/** Blue — Information */
export const INFORMATION = '#3B82F6' as const;

/** Slate Gray — Offline, Unavailable */
export const OFFLINE = '#64748B' as const;

/** Emerald — Integrity Verified (trust ledger anchored) */
export const INTEGRITY_VERIFIED = '#059669' as const;

/** Purple — AI Review Required */
export const AI_REVIEW_REQUIRED = '#7C3AED' as const;

// ─── Structured Token Object ─────────────────────────────────────────────────

export const colors = {
  brand: {
    primary: PRIMARY,
    primaryLight: PRIMARY_LIGHT,
    primaryDark: '#072A4D',
    secondary: SECONDARY,
  },

  semantic: {
    success: SUCCESS,
    successLight: '#D1FAE5',
    successDark: '#059669',
    pending: PENDING,
    pendingLight: '#FEF3C7',
    pendingDark: '#D97706',
    warning: WARNING,
    warningLight: '#FFF7ED',
    warningDark: '#EA580C',
    error: ERROR,
    errorLight: '#FEE2E2',
    errorDark: '#DC2626',
    info: INFORMATION,
    infoLight: '#DBEAFE',
    infoDark: '#2563EB',
    offline: OFFLINE,
    offlineLight: '#F1F5F9',
    offlineDark: '#475569',
    integrityVerified: INTEGRITY_VERIFIED,
    aiReviewRequired: AI_REVIEW_REQUIRED,
  },

  neutral: {
    900: TEXT_PRIMARY,
    800: '#1F2937',
    700: '#374151',
    600: '#4B5563',
    500: TEXT_SECONDARY,
    400: '#9CA3AF',
    300: BORDER,
    200: '#E5E7EB',
    100: '#F3F4F6',
    50: '#F9FAFB',
    white: SURFACE,
  },

  /**
   * Evidence Capsule Status Colors
   * These represent the lifecycle state of an Evidence Capsule.
   * Used in badges, status indicators, and timeline components.
   */
  capsuleStatus: {
    draft: '#9CA3AF',
    submitted: INFORMATION,
    aiVerified: AI_REVIEW_REQUIRED,
    approved: SUCCESS,
    rejected: ERROR,
    published: PRIMARY,
  },

  /**
   * Trust & Integrity Colors
   * Used on the Trust Ledger Monitor page.
   * NEVER use the word "blockchain" — use "integrity verified" or "trust verified".
   */
  trust: {
    verified: INTEGRITY_VERIFIED,
    pending: PENDING,
    unverified: '#9CA3AF',
    failed: ERROR,
  },

  /**
   * Portal Identity Colors
   * Each portal has a badge color for its identifier.
   */
  portals: {
    superAdmin: PRIMARY,
    authority: '#059669',
    party: '#7C3AED',
    candidate: '#D97706',
    observer: '#0369A1',
    public: '#374151',
    support: '#6B7280',
  },
} as const;

export type Colors = typeof colors;
