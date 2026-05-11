/**
 * SyncUp Color Tokens — React Native
 *
 * Source of truth: ANCHOR.pdf v2.5 / TOKENS.ts (monorepo root).
 * Token names match ANCHOR / FLOW_TOKENS exactly. Do NOT rename or alias.
 *
 * The default export is `colors.light` for now; theming layer (useColorScheme
 * driven) is a future concern owned by the Screens / theming agent.
 */

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
    // dangerSoft is the popSoft equivalent for danger fills (per ANCHOR).
    dangerSoft:   '#FFE4D9',
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
    // accentInk not explicitly redefined for dark in ANCHOR; reuses light value.
    accentInk:    '#2A1F9E',
    accentSoft:   'rgba(79,59,255,0.18)',
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
    dangerSoft:   '#FFE4D9',
    shadowAccent: 'rgba(79,59,255,0.28)',
  },
} as const;

export type ColorScheme = typeof colors.light;
export type ColorKey = keyof ColorScheme;
export type ColorMode = keyof typeof colors;

// Default export is light; theming layer will swap in future.
export default colors.light;
