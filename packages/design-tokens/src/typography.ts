/**
 * Vote Capsule™ Typography Design Tokens
 *
 * Inter is the primary typeface — clean, readable, institutional.
 * JetBrains Mono is used for QLDB hashes, capsule IDs, and technical data.
 * Typography prioritizes readability during long election monitoring sessions.
 */

export const typography = {
  fontFamily: {
    sans: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif",
    mono: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', 'Consolas', monospace",
  },

  fontSize: {
    xs: '0.75rem',    // 12px — Captions, supporting text
    sm: '0.875rem',   // 14px — Table text, labels, form hints
    base: '1rem',     // 16px — Body text, standard content
    lg: '1.125rem',   // 18px — Lead text
    xl: '1.25rem',    // 20px — Card titles
    '2xl': '1.5rem',  // 24px — Section headings
    '3xl': '1.875rem',// 30px — Page titles
    '4xl': '2.25rem', // 36px — Dashboard display numbers
    '5xl': '3rem',    // 48px — Hero/landing display
  },

  fontWeight: {
    thin: 100,
    light: 300,
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
    extrabold: 800,
  },

  lineHeight: {
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

export type Typography = typeof typography;
