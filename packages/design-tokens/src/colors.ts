/**
 * Vote Capsule™ Color Design Tokens
 *
 * These are the canonical color values for the entire platform.
 * Never use raw hex values in components — always import from this package.
 *
 * IMPORTANT: Political party colors are NEVER part of the platform theme.
 * Party colors are used only inside election result charts and visualizations.
 * Never use the word "blockchain" in user-facing labels. Use "integrity verified" or "trust verified".
 */

export const colors = {
  brand: {
    primary: '#0B3C6D',      // Deep Navy — Headers, Navigation, Primary Actions
    primaryLight: '#2563EB', // Links, Active States
    primaryDark: '#072A4D',  // Hover states, pressed states
    secondary: '#F5F7FA',    // Background surfaces
  },

  semantic: {
    success: '#10B981',
    successLight: '#D1FAE5',
    successDark: '#059669',
    warning: '#F59E0B',
    warningLight: '#FEF3C7',
    warningDark: '#D97706',
    error: '#EF4444',
    errorLight: '#FEE2E2',
    errorDark: '#DC2626',
    info: '#3B82F6',
    infoLight: '#DBEAFE',
    infoDark: '#2563EB',
  },

  neutral: {
    900: '#111827', // Text Primary — Main readable text
    800: '#1F2937',
    700: '#374151',
    600: '#4B5563',
    500: '#6B7280', // Text Secondary — Supporting text
    400: '#9CA3AF',
    300: '#D1D5DB', // Border — Default borders
    200: '#E5E7EB',
    100: '#F3F4F6',
    50: '#F9FAFB',
    white: '#FFFFFF', // Surface — Cards, modals, dialogs
  },

  /**
   * Evidence Capsule Status Colors
   * These represent the lifecycle state of an Evidence Capsule.
   * Used in badges, status indicators, and timeline components.
   */
  capsuleStatus: {
    draft: '#9CA3AF',       // Not yet submitted
    submitted: '#3B82F6',   // Submitted by agent, awaiting AI processing
    aiVerified: '#8B5CF6',  // AI has processed, awaiting human validation
    approved: '#10B981',    // Human validator approved — anchored to trust ledger
    rejected: '#EF4444',    // Human validator rejected
    published: '#0B3C6D',   // Officially published result
  },

  /**
   * Trust & Integrity Colors
   * Used on the Trust Ledger Monitor page.
   * NEVER use the word "blockchain" — use "integrity verified" or "trust verified".
   */
  trust: {
    verified: '#10B981',   // Integrity verified (QLDB anchored)
    pending: '#F59E0B',    // Pending anchoring
    unverified: '#9CA3AF', // Not yet in trust ledger
    failed: '#EF4444',     // Verification failed
  },

  /**
   * Portal Identity Colors
   * Each portal has a badge color for its identifier.
   */
  portals: {
    superAdmin: '#0B3C6D',    // Platform — Deep Navy
    authority: '#059669',     // Election Authority — Emerald
    party: '#7C3AED',         // Political Party — Violet
    candidate: '#D97706',     // Candidate — Amber
    observer: '#0369A1',      // Observer — Sky Blue
    public: '#374151',        // Public — Neutral
    support: '#6B7280',       // Support — Gray
  },
} as const;

export type Colors = typeof colors;
