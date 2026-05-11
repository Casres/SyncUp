/**
 * SyncUp Theme — barrel export.
 *
 * Single import point for all theme consumers:
 *   import { colors, typography, spacing, radii, durations, easings, useHaptic } from '@/theme';
 *
 * No path-alias is configured yet, so use a relative path until the Screens
 * agent wires up `@/` (or similar) in `tsconfig.json` + `babel.config.js`.
 */

export * from './colors';
export * from './typography';
export * from './spacing';
export * from './radii';
export * from './motion';
export * from './haptics';

// Re-export the default light palette under an explicit name for convenience.
export { default as themeColors } from './colors';
