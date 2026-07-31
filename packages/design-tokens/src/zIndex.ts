/**
 * Vote Capsule™ Z-Index Design Tokens
 *
 * Layering system to prevent z-index wars.
 */

export const zIndex = {
  hide: -1,
  auto: 'auto',
  base: 0,
  raised: 1,
  dropdown: 10,
  sticky: 20,
  overlay: 30,
  modal: 40,
  popover: 50,
  toast: 60,
  tooltip: 70,
} as const;

export type ZIndex = typeof zIndex;
