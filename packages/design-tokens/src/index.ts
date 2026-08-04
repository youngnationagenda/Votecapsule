/**
 * Vote Capsule™ Design Tokens (V14 Spec)
 *
 * Central export for all design token values.
 * Import from '@vote-capsule/design-tokens' in all applications.
 *
 * @example
 * import { colors, typography, spacing } from '@vote-capsule/design-tokens';
 * import { voteCapsulePreset } from '@vote-capsule/design-tokens/tailwind';
 * import type { StatusBadgeProps, CardProps } from '@vote-capsule/design-tokens/components';
 */

// ─── Color Tokens ────────────────────────────────────────────────────────────
export {
  colors,
  PRIMARY,
  PRIMARY_LIGHT,
  SECONDARY,
  SURFACE,
  BORDER,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  SUCCESS,
  PENDING,
  WARNING,
  ERROR,
  INFORMATION,
  OFFLINE,
  INTEGRITY_VERIFIED,
  AI_REVIEW_REQUIRED,
} from './colors';
export type { Colors } from './colors';

// ─── Typography Tokens ───────────────────────────────────────────────────────
export { typography, fontFamily, fontSize, fontWeight, lineHeight } from './typography';
export type { Typography, FontFamily, FontSize, FontWeight, LineHeight } from './typography';

// ─── Spacing Tokens ──────────────────────────────────────────────────────────
export { spacing, spacingScale, spacingValues } from './spacing';
export type { Spacing, SpacingKey, SpacingScale, SpacingScaleKey } from './spacing';

// ─── Shadow Tokens ───────────────────────────────────────────────────────────
export { shadows } from './shadows';
export type { Shadows, ShadowKey } from './shadows';

// ─── Border Tokens ───────────────────────────────────────────────────────────
export { borderRadius, borderRadiusValues, borderRadiusExtended } from './borders';
export type { BorderRadius, BorderRadiusKey } from './borders';

// ─── Breakpoint Tokens ───────────────────────────────────────────────────────
export { breakpoints, breakpointValues } from './breakpoints';
export type { Breakpoints, BreakpointKey } from './breakpoints';

// ─── Z-Index Tokens ──────────────────────────────────────────────────────────
export { zIndex } from './zIndex';
export type { ZIndex } from './zIndex';

// ─── Tailwind Preset ─────────────────────────────────────────────────────────
export { voteCapsulePreset } from './tailwind-preset';
export type { VoteCapsulePreset } from './tailwind-preset';

// ─── Component Type Definitions ──────────────────────────────────────────────
export type {
  CapsuleStatus,
  BadgeSize,
  StatusBadgeProps,
  TrendDirection,
  CardProps,
  ColumnAlignment,
  SortDirection,
  DataTableColumn,
  DataTableProps,
} from './components';

// ─── Convenience: Full Token Set ─────────────────────────────────────────────
/**
 * Flat token object for quick access.
 * Useful for theme providers and non-Tailwind styling solutions.
 */
export const tokens = {
  colors: {
    primary: '#0B3C6D',
    primaryLight: '#2563EB',
    background: '#F5F7FA',
    surface: '#FFFFFF',
    border: '#D1D5DB',
    textPrimary: '#111827',
    textSecondary: '#6B7280',
    success: '#10B981',
    pending: '#F59E0B',
    warning: '#F97316',
    error: '#EF4444',
    info: '#3B82F6',
    offline: '#64748B',
    integrityVerified: '#059669',
    aiReviewRequired: '#7C3AED',
  },
} as const;
