/**
 * SyncUp Typography Tokens — React Native
 *
 * Source of truth: ANCHOR.pdf v2.5 / TOKENS.ts (monorepo root, FONTS + TYPOGRAPHY).
 * Token names match ANCHOR exactly. Do NOT rename or alias.
 *
 * Notes:
 *   - Font sizes are React Native unitless numbers (1:1 with the Anchor's px values).
 *   - `fontWeight` uses React Native's `TextStyle['fontWeight']` union (string form).
 *   - `letterSpacing` is in points (RN units), converted from the Anchor's px values.
 *   - The `fontFamily` strings here are the FAMILY NAMES — they must be loaded by the
 *     app shell via `expo-font` before first render. See THEME_HANDOFF.md.
 */

import type { TextStyle } from 'react-native';

export const fonts = {
  sans: 'Manrope',
  mono: 'JetBrainsMono',
} as const;

export type FontFamily = typeof fonts[keyof typeof fonts];

export interface TypeScaleEntry {
  fontSize: number;
  fontWeight: TextStyle['fontWeight'];
  letterSpacing: number;
  fontFamily: FontFamily;
  textTransform?: TextStyle['textTransform'];
}

export const typography = {
  display: {
    fontSize:      48,
    fontWeight:    '800' as const,
    letterSpacing: -2.0,
    fontFamily:    fonts.sans,
  },
  h1: {
    fontSize:      28,
    fontWeight:    '800' as const,
    letterSpacing: -1.0,
    fontFamily:    fonts.sans,
  },
  h2: {
    fontSize:      22,
    fontWeight:    '800' as const,
    letterSpacing: -0.5,
    fontFamily:    fonts.sans,
  },
  h3: {
    fontSize:      17,
    fontWeight:    '700' as const,
    letterSpacing: -0.2,
    fontFamily:    fonts.sans,
  },
  title: {
    fontSize:      15,
    fontWeight:    '700' as const,
    letterSpacing: -0.2,
    fontFamily:    fonts.sans,
  },
  body: {
    fontSize:      15,
    fontWeight:    '500' as const,
    letterSpacing: -0.1,
    fontFamily:    fonts.sans,
  },
  bodyMed: {
    fontSize:      14,
    fontWeight:    '600' as const,
    letterSpacing: -0.15,
    fontFamily:    fonts.sans,
  },
  caption: {
    fontSize:      12,
    fontWeight:    '500' as const,
    letterSpacing: 0,
    fontFamily:    fonts.sans,
  },
  micro: {
    fontSize:      11,
    fontWeight:    '500' as const,
    letterSpacing: 0,
    fontFamily:    fonts.sans,
  },
  // Overline uses mono uppercase, letter-spacing 1.5–1.8 (anchored midpoint 1.6).
  overline: {
    fontSize:      10,
    fontWeight:    '600' as const,
    letterSpacing: 1.6,
    fontFamily:    fonts.mono,
    textTransform: 'uppercase' as const,
  },
  statNum: {
    fontSize:      20,
    fontWeight:    '800' as const,
    letterSpacing: -0.5,
    fontFamily:    fonts.sans,
  },
} as const;

export type TypographyKey = keyof typeof typography;
