/**
 * Vote Capsule™ Shadow Design Tokens (V14 Spec)
 *
 * Elevation shadows for cards, dropdowns, modals, and overlays.
 */

export const shadows = {
  none: 'none',
  /** Subtle elevation for form inputs, inline elements */
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  /** Standard card elevation */
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  /** Raised cards, dropdowns */
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  /** Modals, overlays, floating panels */
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  /** Deep elevation for large overlays */
  '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
  /** Inset shadow for pressed/active states */
  inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
} as const;

export type Shadows = typeof shadows;
export type ShadowKey = keyof typeof shadows;
