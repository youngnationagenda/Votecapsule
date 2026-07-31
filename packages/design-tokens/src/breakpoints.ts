/**
 * Vote Capsule™ Breakpoint Design Tokens
 *
 * Mobile-first responsive breakpoints.
 * All layouts must be tested at each breakpoint.
 *
 * Mobile  < 640px
 * Tablet  768px – 1024px
 * Laptop  1024px – 1440px
 * Desktop > 1440px
 */

export const breakpoints = {
  sm: '640px',    // Small mobile → landscape phone
  md: '768px',    // Tablet portrait
  lg: '1024px',   // Tablet landscape → laptop
  xl: '1280px',   // Desktop
  '2xl': '1536px',// Large desktop
} as const;

export const breakpointValues = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const;

export type Breakpoints = typeof breakpoints;
export type BreakpointKey = keyof typeof breakpoints;
