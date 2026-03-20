/**
 * Unified motion system for Store Partner Panel (and shared use).
 * Timing: Fast 150ms, Standard 250ms, Complex 300ms. No bounce, no overshoot.
 */

export const motionDurations = {
  fast: 0.15,
  standard: 0.25,
  complex: 0.3,
} as const;

export const motionEasing = "easeOut" as const;

/** Page route transition: opacity 0→1, translateY 12px→0. Trigger only on route change. */
export const pageTransition = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.25, ease: motionEasing },
} as const;

/** Card hover: subtle 2px lift. */
export const cardHover = {
  transition: { duration: motionDurations.fast, ease: motionEasing },
  whileHover: { y: -2 },
} as const;

/** Dropdown fade-in with small slide (opacity + translateY). */
export const dropdownTransition = {
  initial: { opacity: 0, y: -6 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -6 },
  transition: { duration: 0.18, ease: motionEasing },
} as const;

/** Modal/drawer scale-in: 0.96 → 1, 200ms. */
export const modalTransition = {
  initial: { opacity: 0, scale: 0.96 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.96 },
  transition: { duration: 0.2, ease: motionEasing },
} as const;
