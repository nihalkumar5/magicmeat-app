// Golden-ratio layout scale (φ ≈ 1.618). Spacing steps are Fibonacci
// numbers, so each one is ~φ× the last; type sizes follow the same steps.
export const PHI = 1.618;

export const SPACE = {
  xxs: 3,
  xs: 5,
  sm: 8,
  md: 13,
  lg: 21,
  xl: 34,
  xxl: 55,
} as const;

/** Page side margin on the home screen. */
export const GUTTER = SPACE.lg; // 21

/** Type sizes on the same scale: body 13 → title 21 → display 34. */
export const TYPE = {
  micro: 11,
  body: 13,
  lead: 16,
  title: 21,
  display: 34,
} as const;

export const RADIUS = {
  sm: 8,
  md: 13,
  lg: 21,
} as const;
