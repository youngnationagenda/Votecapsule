/**
 * Vote Capsule™ Breakpoint Design Tokens (V14 Spec)
 *
 * Mobile-first responsive breakpoints.
 * All layouts must be tested at each breakpoint.
 *
 * Mobile   < 640px
 * Tablet   640px – 1024px
 * Laptop   1024px – 1280px
 * Desktop  1280px – 1536px
 * Wide     > 1536px
 */

/** Breakpoint string values (CSS media query format) */
export const breakpoints = {
  /** 640px — Landscape phone / small tablet */
  sm: '640px',
  /** 768px — Tablet portrait */
  md: '768px',
  /** 1024px — Tablet landscape / laptop */
  lg: '1024px',
  /** 1280px — Desktop */
  xl: '1280px',
  /** 1536px — Wide desktop */
  xxl: '1536px',
} as const;

/** Breakpoint numeric values (px) for programmatic use */
export const breakpointValues = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  xxl: 1536,
} as const;

export type Breakpoints = typeof breakpoints;
export type BreakpointKey = keyof typeof breakpoints;
