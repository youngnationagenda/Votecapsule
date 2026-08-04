/**
 * Vote Capsule™ Border Design Tokens (V14 Spec)
 *
 * Border radius using named scale.
 */

/** Named border radius scale */
export const borderRadius = {
  /** 4px — Subtle rounding (inputs, small elements) */
  sm: '4px',
  /** 8px — Standard rounding (cards, buttons) */
  md: '8px',
  /** 12px — Pronounced rounding (modals, panels) */
  lg: '12px',
  /** 16px — Heavy rounding (featured cards, banners) */
  xl: '16px',
  /** 9999px — Pill/circular (badges, avatars) */
  full: '9999px',
} as const;

/** Numeric border radius values (px) for programmatic use */
export const borderRadiusValues = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
} as const;

/** Extended border radius scale (Tailwind-compatible) */
export const borderRadiusExtended = {
  none: '0px',
  sm: '4px',
  DEFAULT: '6px',
  md: '8px',
  lg: '12px',
  xl: '16px',
  '2xl': '24px',
  '3xl': '32px',
  full: '9999px',
} as const;

export type BorderRadius = typeof borderRadius;
export type BorderRadiusKey = keyof typeof borderRadius;
