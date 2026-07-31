/**
 * Vote Capsule™ Design Tokens
 *
 * Central export for all design token values.
 * Import from '@vote-capsule/design-tokens' in all applications.
 *
 * @example
 * import { colors, typography, spacing } from '@vote-capsule/design-tokens';
 */

export { colors } from './colors';
export { spacing } from './spacing';
export { typography } from './typography';
export { breakpoints, breakpointValues } from './breakpoints';
export { shadows } from './shadows';
export { borderRadius } from './borderRadius';
export { zIndex } from './zIndex';

export type { Colors } from './colors';
export type { Spacing, SpacingKey } from './spacing';
export type { Typography } from './typography';
export type { Breakpoints, BreakpointKey } from './breakpoints';
export type { Shadows } from './shadows';
export type { BorderRadius } from './borderRadius';
export type { ZIndex } from './zIndex';

/**
 * Convenience: full token set as a single object.
 * Useful for theme providers and Tailwind config generation.
 */
export const tokens = {
  colors: {
    primary: '#0B3C6D',
    primaryLight: '#2563EB',
    background: '#F5F7FA',
    surface: '#FFFFFF',
    textPrimary: '#111827',
    textSecondary: '#6B7280',
    border: '#D1D5DB',
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#3B82F6',
  },
} as const;
