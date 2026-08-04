/**
 * Vote Capsule™ Tailwind CSS Preset (V14 Spec)
 *
 * All portals extend their tailwind.config with this preset to guarantee
 * visual consistency across the platform.
 *
 * @example
 * // tailwind.config.ts
 * import { voteCapsulePreset } from '@vote-capsule/design-tokens/tailwind';
 * export default { presets: [voteCapsulePreset], content: [...] }
 */

import { colors, PRIMARY, PRIMARY_LIGHT, SECONDARY, SURFACE, BORDER, TEXT_PRIMARY, TEXT_SECONDARY, SUCCESS, PENDING, WARNING, ERROR, INFORMATION, OFFLINE, INTEGRITY_VERIFIED, AI_REVIEW_REQUIRED } from './colors';
import { fontFamily, fontSize, fontWeight, lineHeight } from './typography';
import { spacingScale } from './spacing';
import { borderRadius } from './borders';
import { shadows } from './shadows';
import { breakpoints } from './breakpoints';

export const voteCapsulePreset = {
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: PRIMARY,
          light: PRIMARY_LIGHT,
          dark: '#072A4D',
        },
        secondary: SECONDARY,
        surface: SURFACE,
        border: BORDER,
        'text-primary': TEXT_PRIMARY,
        'text-secondary': TEXT_SECONDARY,
        success: {
          DEFAULT: SUCCESS,
          light: '#D1FAE5',
          dark: '#059669',
        },
        pending: {
          DEFAULT: PENDING,
          light: '#FEF3C7',
          dark: '#D97706',
        },
        warning: {
          DEFAULT: WARNING,
          light: '#FFF7ED',
          dark: '#EA580C',
        },
        error: {
          DEFAULT: ERROR,
          light: '#FEE2E2',
          dark: '#DC2626',
        },
        info: {
          DEFAULT: INFORMATION,
          light: '#DBEAFE',
          dark: '#2563EB',
        },
        offline: {
          DEFAULT: OFFLINE,
          light: '#F1F5F9',
          dark: '#475569',
        },
        integrity: INTEGRITY_VERIFIED,
        'ai-review': AI_REVIEW_REQUIRED,
        capsule: {
          draft: colors.capsuleStatus.draft,
          submitted: colors.capsuleStatus.submitted,
          'ai-verified': colors.capsuleStatus.aiVerified,
          approved: colors.capsuleStatus.approved,
          rejected: colors.capsuleStatus.rejected,
          published: colors.capsuleStatus.published,
        },
        portal: {
          'super-admin': colors.portals.superAdmin,
          authority: colors.portals.authority,
          party: colors.portals.party,
          candidate: colors.portals.candidate,
          observer: colors.portals.observer,
          public: colors.portals.public,
          support: colors.portals.support,
        },
      },
      fontFamily: {
        sans: [fontFamily.sans],
        mono: [fontFamily.mono],
      },
      fontSize: {
        display: [fontSize.display, { lineHeight: '1.25' }],
        heading: [fontSize.heading, { lineHeight: '1.25' }],
        title: [fontSize.title, { lineHeight: '1.375' }],
        body: [fontSize.body, { lineHeight: '1.5' }],
        caption: [fontSize.caption, { lineHeight: '1.5' }],
        label: [fontSize.label, { lineHeight: '1.5' }],
      },
      fontWeight: {
        regular: fontWeight.regular,
        medium: fontWeight.medium,
        semibold: fontWeight.semibold,
        bold: fontWeight.bold,
      },
      lineHeight: {
        tight: String(lineHeight.tight),
        normal: String(lineHeight.normal),
        relaxed: String(lineHeight.relaxed),
      },
      spacing: {
        xs: spacingScale.xs,
        sm: spacingScale.sm,
        md: spacingScale.md,
        lg: spacingScale.lg,
        xl: spacingScale.xl,
        xxl: spacingScale.xxl,
        xxxl: spacingScale.xxxl,
      },
      borderRadius: {
        sm: borderRadius.sm,
        md: borderRadius.md,
        lg: borderRadius.lg,
        xl: borderRadius.xl,
        full: borderRadius.full,
      },
      boxShadow: {
        sm: shadows.sm,
        md: shadows.md,
        lg: shadows.lg,
        xl: shadows.xl,
      },
      screens: {
        sm: breakpoints.sm,
        md: breakpoints.md,
        lg: breakpoints.lg,
        xl: breakpoints.xl,
        '2xl': breakpoints.xxl,
      },
    },
  },
} as const;

export type VoteCapsulePreset = typeof voteCapsulePreset;
