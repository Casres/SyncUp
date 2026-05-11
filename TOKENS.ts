/**
 * SyncUp Design Tokens
 *
 * Source of truth: ANCHOR.pdf v2.5 (2026-04-27).
 * All token names match ANCHOR exactly. Do not invent aliases or rename tokens.
 *
 * This module is consumed by every Frontend agent. Zero `any` types.
 */

// ============================================================================
// COLORS — FLOW_TOKENS (light + dark)
// ============================================================================

export const COLORS = {
  light: {
    bg: '#F2EFEA',
    bgElevated: '#FFFFFF',
    bgSunken: '#EEEAE2',
    ink: '#15141A',
    ink2: '#45424F',
    ink3: '#8B8799',
    hair: '#E4DFD4',
    hairStrong: '#CDC7B8',
    accent: '#4F3BFF',
    accentInk: '#2A1F9E',
    accentSoft: '#E9E5FF',
    pop: '#FF7A59',
    popInk: '#9A3E22',
    popSoft: '#FFE4D9',
    lime: '#A8E063',
    limeInk: '#3F6014',
    limeSoft: '#ECF8DA',
    availFree: '#2BB673',
    availMaybe: '#E8A93A',
    availBusy: '#D14545',
    danger: '#D14545',
    // dangerSoft is the popSoft equivalent for danger fills (per ANCHOR).
    dangerSoft: '#FFE4D9',
    shadowAccent: 'rgba(79,59,255,0.28)',
  },
  dark: {
    bg: '#0D0C12',
    bgElevated: '#17161F',
    bgSunken: '#0A0910',
    ink: '#F2EFEA',
    ink2: '#B8B5C2',
    ink3: '#6F6C7C',
    hair: 'rgba(255,255,255,0.06)',
    hairStrong: 'rgba(255,255,255,0.12)',
    accent: '#8575FF',
    // accentInk not explicitly redefined for dark in ANCHOR; reuses light value.
    accentInk: '#2A1F9E',
    accentSoft: 'rgba(79,59,255,0.18)',
    pop: '#FF7A59',
    popInk: '#9A3E22',
    popSoft: '#FFE4D9',
    lime: '#A8E063',
    limeInk: '#3F6014',
    limeSoft: '#ECF8DA',
    availFree: '#2BB673',
    availMaybe: '#E8A93A',
    availBusy: '#D14545',
    danger: '#D14545',
    dangerSoft: '#FFE4D9',
    shadowAccent: 'rgba(79,59,255,0.28)',
  },
} as const;

export type ColorMode = keyof typeof COLORS;
export type ColorToken = keyof typeof COLORS.light;

// ============================================================================
// TYPOGRAPHY — Type scale (FLOW_FONTS)
// ============================================================================

export const FONTS = {
  sans: 'Manrope, system-ui, -apple-system, sans-serif',
  mono: 'JetBrains Mono, ui-monospace, monospace',
} as const;

export type FontFamily = typeof FONTS[keyof typeof FONTS];

interface TypeScaleEntry {
  fontSize: number;
  fontWeight: number;
  letterSpacing: number;
  fontFamily: FontFamily;
}

export const TYPOGRAPHY: Record<
  | 'display'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'title'
  | 'body'
  | 'bodyMed'
  | 'caption'
  | 'micro'
  | 'overline'
  | 'statNum',
  TypeScaleEntry
> = {
  display: { fontSize: 48, fontWeight: 800, letterSpacing: -2.0, fontFamily: FONTS.sans },
  h1: { fontSize: 28, fontWeight: 800, letterSpacing: -1.0, fontFamily: FONTS.sans },
  h2: { fontSize: 22, fontWeight: 800, letterSpacing: -0.5, fontFamily: FONTS.sans },
  h3: { fontSize: 17, fontWeight: 700, letterSpacing: -0.2, fontFamily: FONTS.sans },
  title: { fontSize: 15, fontWeight: 700, letterSpacing: -0.2, fontFamily: FONTS.sans },
  body: { fontSize: 15, fontWeight: 500, letterSpacing: -0.1, fontFamily: FONTS.sans },
  bodyMed: { fontSize: 14, fontWeight: 600, letterSpacing: -0.15, fontFamily: FONTS.sans },
  caption: { fontSize: 12, fontWeight: 500, letterSpacing: 0, fontFamily: FONTS.sans },
  micro: { fontSize: 11, fontWeight: 500, letterSpacing: 0, fontFamily: FONTS.sans },
  // Overline uses mono uppercase, letter-spacing 1.5–1.8 (anchored midpoint 1.6).
  overline: { fontSize: 10, fontWeight: 600, letterSpacing: 1.6, fontFamily: FONTS.mono },
  statNum: { fontSize: 20, fontWeight: 800, letterSpacing: -0.5, fontFamily: FONTS.sans },
} as const;

export type TypeScale = keyof typeof TYPOGRAPHY;

// ============================================================================
// SPACING — 4px grid
// ============================================================================

export const SPACING = [4, 8, 12, 14, 16, 18, 22, 28, 32] as const;

export const SPACE = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 22,
  xxl: 28,
  xxxl: 32,
} as const;

export type SpaceAlias = keyof typeof SPACE;

// ============================================================================
// RADII
// ============================================================================

export const RADII = {
  inline: 8,
  tabpill: 9,
  small: 10,
  input: 12,
  card: 14,
  hero: 16,
  surface: 18,
  sheet: 22,
  pill: 999,
} as const;

export type RadiusToken = keyof typeof RADII;

// ============================================================================
// HAIRLINES
// ============================================================================

export const HAIRLINES = {
  hair: 1,
  hairStrongDashed: 1.5,
} as const;

// ============================================================================
// SHADOWS
// ============================================================================

export const SHADOWS = {
  accentBtn: '0 6px 18px rgba(79,59,255,0.28)',
  qrCard: '0 8px 28px rgba(79,59,255,0.28)',
  tweaksPanel: '0 12px 40px rgba(0,0,0,0.18)',
  broadcastToast: '0 12px 40px rgba(0,0,0,0.25)',
} as const;

export type ShadowToken = keyof typeof SHADOWS;

// ============================================================================
// MOTION (FLOW_MOTION)
// ============================================================================

export const MOTION = {
  curves: {
    spring: 'cubic-bezier(0.34,1.56,0.64,1)',
    springSnappy: 'cubic-bezier(0.2,0.9,0.3,1.2)',
    easeOut: 'cubic-bezier(0.2,0,0,1)',
    easeStd: 'cubic-bezier(0.4,0,0.2,1)',
    linear: 'linear',
  },
  durations: {
    tapFeedback: 200,
    stepPush: 240,
    sheetUp: 280,
    modalUp: 280,
    broadcastCardOpen: 320,
    toastFadeUp: 320,
    staggerListEntrance: 320,
    longPressArm: 450,
    spinnerRotation: 900,
    toastAutoDismiss: 3200,
    quicksetAppliedConfirm: 1600,
    dayCellDragPaint: 0,
  },
  keyframes: {
    suSpin: 'su-spin',
    suSlideDown: 'su-slide-down',
    suStaggerIn: 'su-stagger-in',
    flowFadeUp: 'flow-fade-up',
    flowSheetUp: 'flow-sheet-up',
  },
  // Stagger list configuration (per ANCHOR motion table).
  stagger: {
    perItemMs: 30,
    baseMs: 60,
    capItems: 12,
  },
  // Sheet rubber-band overscroll threshold (per ANCHOR motion table).
  sheetRubberBandPx: 100,
} as const;

export type MotionCurve = keyof typeof MOTION.curves;
export type MotionDuration = keyof typeof MOTION.durations;
export type MotionKeyframe = keyof typeof MOTION.keyframes;

// ============================================================================
// HAPTICS — 6 fixed types only (R5-8)
// Maps 1:1 to expo-haptics in production.
// ============================================================================

export const HAPTICS = {
  light: 'light',
  medium: 'medium',
  heavy: 'heavy',
  success: 'success',
  warning: 'warning',
  error: 'error',
} as const;

export type HapticType = typeof HAPTICS[keyof typeof HAPTICS];

// Debounce window for stacked haptics (Hard Rule H-2).
export const HAPTIC_DEBOUNCE_MS = 80;

// ============================================================================
// AVAILABILITY DAY-FILL HELPERS
// Per ANCHOR: MonthGrid uses `${color}22`; WeekView/DayView use `${color}18`.
// ============================================================================

export const AVAIL_FILL_ALPHA = {
  monthGrid: '22',
  weekDayView: '18',
} as const;

// ============================================================================
// SPINNER SIZES (per ANCHOR · Loading pattern · Spinner spec)
// ============================================================================

export const SPINNER_SIZES = {
  XS: 18,
  SM: 20,
  MD: 28,
  LG: 40,
} as const;

export type SpinnerSize = keyof typeof SPINNER_SIZES;

// ============================================================================
// THEME UNION — re-export for downstream agents
// ============================================================================

export type Theme = typeof COLORS.light | typeof COLORS.dark;
