/**
 * SyncUp Spacing Tokens — React Native
 *
 * Source of truth: ANCHOR.pdf v2.5 / TOKENS.ts (monorepo root, SPACING + SPACE).
 *
 * The Anchor's grid is in points, which map 1:1 to React Native's unitless numbers.
 * Use `spacingGrid` for raw 4pt-grid values; use `spacing` aliases in component code.
 *
 * Note on aliases: this file extends the canonical SPACE aliases with `mdl` (14),
 * `xl` (18), `xxl` (22), `3xl` (28), `4xl` (32) so every value in the 4pt grid has
 * a named alias usable in component styles. Raw grid values remain authoritative.
 */

// Base 4pt grid — all spacing values in the app derive from this.
export const spacingGrid = [4, 8, 12, 14, 16, 18, 22, 28, 32] as const;

export const spacing = {
  xs:    4,
  sm:    8,
  md:    12,
  mdl:   14,
  lg:    16,
  xl:    18,
  xxl:   22,
  '3xl': 28,
  '4xl': 32,
} as const;

export type SpacingKey = keyof typeof spacing;
export type SpacingGridValue = typeof spacingGrid[number];
