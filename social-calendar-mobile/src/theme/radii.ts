/**
 * SyncUp Radius Tokens — React Native
 *
 * Source of truth: ANCHOR.pdf v2.5 / TOKENS.ts (monorepo root, RADII).
 * Token names match ANCHOR exactly. Do NOT rename or alias.
 */

export const radii = {
  inline:  8,
  tabpill: 9,
  small:   10,
  input:   12,
  card:    14,
  hero:    16,
  surface: 18,
  sheet:   22,
  pill:    999,
} as const;

export type RadiusKey = keyof typeof radii;
