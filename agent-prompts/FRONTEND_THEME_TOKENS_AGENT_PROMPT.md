# Frontend — Theme / Tokens Agent Prompt

> **You are the Frontend / Theme & Tokens agent.** Read this entire document before writing a single line of code. Your job is precisely scoped — implement the SyncUp design token system in TypeScript for React Native. Do not build components, screens, or navigation.

---

## Context: What Exists

You are working inside the React Native / Expo / TypeScript app at `social-calendar-mobile/`. The following is your input:

| File | Location | What it contains |
|------|----------|-----------------|
| Design Handoff Bundle | Monorepo root | `TOKENS.ts` (web tokens to port), `ANCHOR.md` (full design system), `TYPES.ts` (data shapes) |
| LEAD_MANAGER.md | Monorepo root | Hierarchy, ownership, build order |

**Read these files before writing any code:**
- `ANCHOR.md` — canonical design system reference (all token values, motion table, haptic rules, spacing grid, radii, hard rules)
- `TOKENS.ts` — the web-format token reference produced by the Design Handoff Export agent; port these values into React Native format
- `social-calendar-mobile/CLAUDE.md` — architecture rules, tech stack, folder structure (if it exists; if not, follow the rules in this prompt)

---

## Tech Stack

- React Native + Expo SDK 51+
- TypeScript (strict mode — `"strict": true` in tsconfig)
- `expo-haptics` for haptic feedback
- `react-native-reanimated` v3 for animations (Reanimated 2 API)
- No web CSS — all token values must be React Native compatible (no `cubic-bezier` strings, no CSS keyframes)

---

## Non-Negotiable Contracts

### 1. State management rule — tokens are static constants
Tokens are compile-time constants. They never go in Zustand or React Query. No theming context is required at this stage — light/dark switching is a future concern. Export both `light` and `dark` token sets; the default export should be `light` for now.

### 2. No `any`
TypeScript strict mode is active. Every export must be fully typed. Use `as const` on all token objects to get literal types.

### 3. Naming must match ANCHOR exactly
Token names in your exports must match the Anchor's camelCase names verbatim (e.g., `bgElevated`, `accentSoft`, `availFree`). Do not rename, alias, or reorganize token names.

### 4. React Native unit equivalents
- The Anchor's spacing grid is in points (pt), which are 1:1 with React Native's unitless numbers.
- Font sizes are in px from the Anchor — treat them as React Native font size numbers (1:1).
- Font weights: convert string weights to React Native's `TextStyle['fontWeight']` union (e.g., `800` → `'800'`).
- `letterSpacing` values from the Anchor are in CSS `em`/`px` — convert to React Native's `letterSpacing` (points). For a 15px font: `-0.2em` ≈ `-3`.
- Do not use `px`, `rem`, `em`, or any CSS units in exported values.

### 5. Haptics map 1:1 to `expo-haptics`
The 6 haptic types map exactly:
- `light` → `Haptics.ImpactFeedbackStyle.Light`
- `medium` → `Haptics.ImpactFeedbackStyle.Medium`
- `heavy` → `Haptics.ImpactFeedbackStyle.Heavy`
- `success` → `Haptics.NotificationFeedbackType.Success`
- `warning` → `Haptics.NotificationFeedbackType.Warning`
- `error` → `Haptics.NotificationFeedbackType.Error`

### 6. Motion values are Reanimated-compatible
Easing curves are expressed as `Easing` functions from `react-native-reanimated`, not CSS strings. Duration values are plain numbers in ms.

---

## Files to Create

Create these files inside `social-calendar-mobile/src/theme/`:

```
src/theme/colors.ts
src/theme/typography.ts
src/theme/spacing.ts
src/theme/radii.ts
src/theme/motion.ts
src/theme/haptics.ts
src/theme/index.ts
```

Do not create any files outside this list.

---

## File Specifications

### `colors.ts`

Export a `colors` object with `light` and `dark` sub-objects. Every token from the Anchor's `FLOW_TOKENS.light` and `FLOW_TOKENS.dark` sections must be present.

```ts
import { COLORS as C } from '../../TOKENS'; // reference only — port values manually

export const colors = {
  light: {
    bg:           '#F2EFEA',
    bgElevated:   '#FFFFFF',
    bgSunken:     '#EEEAE2',
    ink:          '#15141A',
    ink2:         '#45424F',
    ink3:         '#8B8799',
    hair:         '#E4DFD4',
    hairStrong:   '#CDC7B8',
    accent:       '#4F3BFF',
    accentInk:    '#2A1F9E',
    accentSoft:   '#E9E5FF',
    pop:          '#FF7A59',
    popInk:       '#9A3E22',
    popSoft:      '#FFE4D9',
    lime:         '#A8E063',
    limeInk:      '#3F6014',
    limeSoft:     '#ECF8DA',
    availFree:    '#2BB673',
    availMaybe:   '#E8A93A',
    availBusy:    '#D14545',
    danger:       '#D14545',
    dangerSoft:   '#FFE4D9',   // popSoft equivalent for danger fills
    shadowAccent: 'rgba(79,59,255,0.28)',
  },
  dark: {
    bg:           '#0D0C12',
    bgElevated:   '#17161F',
    bgSunken:     '#0A0910',
    ink:          '#F2EFEA',
    ink2:         '#B8B5C2',
    ink3:         '#6F6C7C',
    hair:         'rgba(255,255,255,0.06)',
    hairStrong:   'rgba(255,255,255,0.12)',
    accent:       '#8575FF',
    accentInk:    '#4F3BFF',
    accentSoft:   'rgba(79,59,255,0.18)',
    // ... mirror remaining light tokens with dark values from ANCHOR
  },
} as const;

export type ColorScheme = typeof colors.light;
export type ColorKey = keyof ColorScheme;

// Default export is light; theming layer will swap in future
export default colors.light;
```

Include every token. Do not omit any.

---

### `typography.ts`

Export a `typography` object where each key is a type scale name and each value contains `fontSize`, `fontWeight`, `letterSpacing`, and `fontFamily`. Also export `fonts` with the `sans` and `mono` font stack strings (React Native format).

```ts
export const fonts = {
  sans: 'Manrope',      // loaded via expo-font; fallback handled in app entry
  mono: 'JetBrainsMono',
} as const;

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
```

---

### `spacing.ts`

Export the 4px grid and named aliases.

```ts
// Base grid — all spacing values in the app derive from this
export const spacingGrid = [4, 8, 12, 14, 16, 18, 22, 28, 32] as const;

export const spacing = {
  xs:  4,
  sm:  8,
  md:  12,
  mdl: 14,
  lg:  16,
  xl:  18,
  xxl: 22,
  '3xl': 28,
  '4xl': 32,
} as const;

export type SpacingKey = keyof typeof spacing;
```

---

### `radii.ts`

```ts
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
```

---

### `motion.ts`

Reanimated-compatible motion values. No CSS strings.

```ts
import { Easing } from 'react-native-reanimated';

// Named easing functions — use these with Reanimated's withTiming / withSpring
export const easings = {
  // spring: use withSpring — these are reference values only
  spring:       { damping: 10, stiffness: 150, mass: 1 },   // overshoot for entrances
  springSnappy: { damping: 12, stiffness: 200, mass: 0.8 }, // tighter overshoot
  easeOut:      Easing.bezier(0.2, 0, 0, 1),
  easeStd:      Easing.bezier(0.4, 0, 0.2, 1),
  linear:       Easing.linear,
} as const;

// Duration table — transcribed from the Anchor's CONFIRMED motion table
export const durations = {
  tapFeedback:        200,   // tap / press feedback
  stepPush:           240,   // Step 1→2→3 advance
  sheetUp:            280,   // RSVP sheet, picker sheet
  modalUp:            280,   // Create event modal
  broadcastCardOpen:  320,   // broadcast card spring open
  toastFadeUp:        320,   // Broadcast / Error toast entrance
  staggerList:        320,   // list entrance (30ms/item, base 60ms, cap 12 items)
  staggerItemBase:    60,    // stagger list base delay
  staggerItemStep:    30,    // stagger list per-item delay increment
  staggerItemCap:     12,    // max stagger items before capping
  longPressArm:       450,   // chip carousel, RSVP pill long-press arm
  spinner:            900,   // su-spin rotation (linear infinite)
  toastAutoDismiss:   3200,  // BroadcastToast + ErrorToast auto-dismiss
  quicksetConfirm:    1600,  // Quickset "Applied" confirm feedback
  // Day-cell drag-paint: 0ms (instant, 1:1 finger tracking)
  // Parallax / scroll-bound transforms: FORBIDDEN (R5-3)
} as const;

export type DurationKey = keyof typeof durations;
```

---

### `haptics.ts`

```ts
import * as Haptics from 'expo-haptics';
import { useCallback } from 'react';

/**
 * SyncUp haptic types — 6 fixed types, mapped 1:1 to expo-haptics.
 * Hard Rule R5-8: Use ONLY these types. See ANCHOR.md haptic rules section.
 */
export const HAPTIC_TYPES = {
  light:   'light',
  medium:  'medium',
  heavy:   'heavy',
  success: 'success',
  warning: 'warning',
  error:   'error',
} as const;

export type HapticType = typeof HAPTIC_TYPES[keyof typeof HAPTIC_TYPES];

const hapticMap: Record<HapticType, () => Promise<void>> = {
  light:   () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
  medium:  () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
  heavy:   () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy),
  success: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
  warning: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning),
  error:   () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error),
};

let lastHapticAt = 0;
const HAPTIC_DEBOUNCE_MS = 80; // Hard Rule H-2: never stack haptics within 80ms

/**
 * useHaptic — returns a stable fire() callback.
 *
 * Rules:
 *   H-1. NEVER call on scroll, drag-momentum, or visual-only transitions.
 *   H-2. Debounced at 80ms — stacked calls within that window are silently dropped.
 *   H-3. NEVER call on initial mount or auto-fired events the user did not trigger.
 *
 * Usage:
 *   const fire = useHaptic();
 *   fire('medium'); // call ONCE per gesture
 */
export function useHaptic() {
  return useCallback((type: HapticType) => {
    const now = Date.now();
    if (now - lastHapticAt < HAPTIC_DEBOUNCE_MS) return;
    lastHapticAt = now;
    hapticMap[type]().catch(() => {
      // Haptics may fail on simulator — silent fail is correct
    });
  }, []);
}
```

---

### `index.ts`

Barrel export — re-export everything from each module. This is the single import point for all theme consumers.

```ts
export * from './colors';
export * from './typography';
export * from './spacing';
export * from './radii';
export * from './motion';
export * from './haptics';

// Re-export defaults for convenience
export { default as themeColors } from './colors';
```

---

## Handoff Document

When all files are written and TypeScript compiles clean (`npx tsc --noEmit` inside `social-calendar-mobile/`), write `src/theme/THEME_HANDOFF.md`:

1. **What was built** — table of files and what each exports
2. **Font loading note** — `Manrope` and `JetBrains Mono` must be loaded with `expo-font` in the app entry point (`App.tsx` or `_layout.tsx`). The theme exports the font family name strings only — font loading is NOT in scope for this agent. Flag for the Screens agent or app shell to handle.
3. **Dark mode note** — `colors.dark` is exported but not yet wired to a system theme hook. Flag for a future theming agent or the Screens agent to consume via `useColorScheme`.
4. **Decisions made** — any non-obvious choices (e.g., `spring` easing represented as Reanimated spring config rather than a cubic-bezier)
5. **Open items** — anything that needs a cross-section decision

---

## Final Checklist

- [ ] `npx tsc --noEmit` passes with zero errors inside `social-calendar-mobile/`
- [ ] Every token from ANCHOR `FLOW_TOKENS.light` and `FLOW_TOKENS.dark` is present in `colors.ts`
- [ ] All typography scale entries from ANCHOR are present in `typography.ts`
- [ ] `haptics.ts` exports `useHaptic()` with 80ms debounce
- [ ] No CSS units (`px`, `rem`, `em`) anywhere in the output
- [ ] No `any` types anywhere
- [ ] `motion.ts` does not contain CSS `cubic-bezier` strings — only Reanimated `Easing` functions and spring configs
- [ ] `index.ts` re-exports everything
- [ ] `THEME_HANDOFF.md` is written and complete
- [ ] `LEAD_MANAGER.md` Progress Tracker row for Theme/Tokens → `COMPLETE (date)`
