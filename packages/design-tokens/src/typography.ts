/**
 * Vote Capsule™ Typography Design Tokens (V14 Spec)
 *
 * Inter is the primary typeface — clean, readable, institutional.
 * JetBrains Mono is used for QLDB hashes, capsule IDs, and technical data.
 * Typography prioritizes readability during long election monitoring sessions.
 */

export const fontFamily = {
  sans: 'Inter, system-ui, sans-serif',
  mono: 'JetBrains Mono, monospace',
} as const;

export const fontSize = {
  /** 36px — Dashboard display numbers, hero metrics */
  display: '2.25rem',
  /** 24px — Page/section headings */
  heading: '1.5rem',
  /** 18px — Card titles, lead text */
  title: '1.125rem',
  /** 16px — Body text, standard content */
  body: '1rem',
  /** 14px — Captions, table text, form hints */
  caption: '0.875rem',
  /** 12px — Labels, badges, supporting metadata */
  label: '0.75rem',
} as const;

export const fontWeight = {
  regular: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
} as const;

export const lineHeight = {
  tight: 1.25,
  normal: 1.5,
  relaxed: 1.75,
} as const;

/** Full typography token set */
export const typography = {
  fontFamily,
  fontSize,
  fontWeight,
  lineHeight,

  /** Extended font size scale (Tailwind-compatible) */
  fontSizeExtended: {
    xs: '0.75rem',      // 12px
    sm: '0.875rem',     // 14px
    base: '1rem',       // 16px
    lg: '1.125rem',     // 18px
    xl: '1.25rem',      // 20px
    '2xl': '1.5rem',    // 24px
    '3xl': '1.875rem',  // 30px
    '4xl': '2.25rem',   // 36px
    '5xl': '3rem',      // 48px
  },

  /** Extended font weight scale */
  fontWeightExtended: {
    thin: 100,
    light: 300,
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
    extrabold: 800,
  },

  /** Extended line-height scale */
  lineHeightExtended: {
    none: 1,
    tight: 1.25,
    snug: 1.375,
    normal: 1.5,
    relaxed: 1.625,
    loose: 2,
  },

  letterSpacing: {
    tighter: '-0.05em',
    tight: '-0.025em',
    normal: '0em',
    wide: '0.025em',
    wider: '0.05em',
    widest: '0.1em',
  },
} as const;

export type FontFamily = typeof fontFamily;
export type FontSize = typeof fontSize;
export type FontWeight = typeof fontWeight;
export type LineHeight = typeof lineHeight;
export type Typography = typeof typography;
