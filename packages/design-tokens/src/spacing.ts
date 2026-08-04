/**
 * Vote Capsule™ Spacing Design Tokens (V14 Spec)
 *
 * Based on a 4px baseline grid.
 * All spacing in the platform must use these values.
 */

/** Named spacing scale (4px base grid) */
export const spacingScale = {
  /** 4px */
  xs: '4px',
  /** 8px */
  sm: '8px',
  /** 16px */
  md: '16px',
  /** 24px */
  lg: '24px',
  /** 32px */
  xl: '32px',
  /** 48px */
  xxl: '48px',
  /** 64px */
  xxxl: '64px',
} as const;

/** Numeric spacing values (px) for programmatic use */
export const spacingValues = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
} as const;

/** Full numeric spacing scale (Tailwind-compatible) */
export const spacing = {
  0: '0px',
  0.5: '2px',
  1: '4px',
  1.5: '6px',
  2: '8px',
  2.5: '10px',
  3: '12px',
  3.5: '14px',
  4: '16px',
  5: '20px',
  6: '24px',
  7: '28px',
  8: '32px',
  9: '36px',
  10: '40px',
  11: '44px',
  12: '48px',
  14: '56px',
  16: '64px',
  20: '80px',
  24: '96px',
  28: '112px',
  32: '128px',
} as const;

export type SpacingScale = typeof spacingScale;
export type SpacingScaleKey = keyof typeof spacingScale;
export type Spacing = typeof spacing;
export type SpacingKey = keyof typeof spacing;
