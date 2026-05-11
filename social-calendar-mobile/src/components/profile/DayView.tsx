/**
 * DayView — Day chevron header + 4 stacked option rows.
 *
 * Options: Available / Maybe / Not available / Clear.
 * Each row 16×14 padding, radius 14, 12px state dot, title + sub.
 * Active = `${color}18` fill + 1.5px state border + check icon.
 *
 * Tapping an option calls `setDay(iso)` — the parent's `setDay` mapper handles
 * brush translation: 'Clear' deletes the iso key (Hard Rule 14).
 *
 * Haptic: light on choice select; light on day-nav arrow.
 */

import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { colors, radii, spacing, typography, useHaptic } from '../../theme';
import { AvailDot } from './AvailDot';
import type { AvailState } from '../../../../TYPES';

type Theme = typeof colors.light;

export interface DayViewProps {
  T?: Theme;
  anchor: Date;
  setAnchor: (next: Date) => void;
  avail: { [iso: string]: AvailState };
  setDay: (iso: string) => void;
  /** Optional brush override — not used inside DayView. The 4 options here
   * are the canonical brush set, so brush state is local to user taps. */
  onChoose?: (choice: 'free' | 'maybe' | 'busy' | 'clear') => void;
}

interface OptionSpec {
  id: 'free' | 'maybe' | 'busy' | 'clear';
  title: string;
  sub: string;
  tone: AvailState | null;
}

const OPTIONS: OptionSpec[] = [
  { id: 'free',  title: 'Available',     sub: 'You\'re open this day',    tone: 'free' },
  { id: 'maybe', title: 'Maybe',          sub: 'Could go either way',      tone: 'maybe' },
  { id: 'busy',  title: 'Not available',  sub: 'You can\'t make it',       tone: 'busy' },
  { id: 'clear', title: 'Clear',          sub: 'Remove this day\'s status', tone: null },
];

export function DayView({
  T = colors.light,
  anchor,
  setAnchor,
  avail,
  setDay,
  onChoose,
}: DayViewProps): React.JSX.Element {
  const fire = useHaptic();
  const iso = useMemo(() => isoOf(anchor), [anchor]);
  const current = avail[iso];

  const headerLabel = useMemo(() => formatDayHeader(anchor), [anchor]);

  const goPrev = (): void => {
    fire('light');
    const next = new Date(anchor);
    next.setDate(next.getDate() - 1);
    setAnchor(next);
  };
  const goNext = (): void => {
    fire('light');
    const next = new Date(anchor);
    next.setDate(next.getDate() + 1);
    setAnchor(next);
  };

  return (
    <View>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Previous day"
          onPress={goPrev}
          hitSlop={8}
          style={({ pressed }) => [styles.navBtn, { opacity: pressed ? 0.6 : 1 }]}
        >
          <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
            <Path d="M15 6l-6 6 6 6" stroke={T.ink} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </Pressable>
        <Text style={[typography.h3, { color: T.ink, flex: 1, textAlign: 'center' }]}>
          {headerLabel}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Next day"
          onPress={goNext}
          hitSlop={8}
          style={({ pressed }) => [styles.navBtn, { opacity: pressed ? 0.6 : 1 }]}
        >
          <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
            <Path d="M9 6l6 6-6 6" stroke={T.ink} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </Pressable>
      </View>

      <View style={styles.list}>
        {OPTIONS.map((opt) => {
          const active =
            (opt.id === 'clear' && current === undefined) ||
            (opt.id !== 'clear' && current === opt.id);
          const tone = opt.tone;
          const fill = active && tone ? withAlpha18(T, tone) : T.bgElevated;
          const borderColor = active
            ? tone
              ? stateColor(T, tone)
              : T.accent
            : T.hair;

          return (
            <Pressable
              key={opt.id}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={opt.title}
              onPress={() => {
                fire('light');
                setDay(iso);
                onChoose?.(opt.id);
              }}
              style={({ pressed }) => [
                styles.row,
                {
                  backgroundColor: fill,
                  borderColor,
                  borderWidth: active ? 1.5 : StyleSheet.hairlineWidth,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <AvailDot T={T} status={tone} size={12} />
              <View style={styles.body}>
                <Text style={[typography.title, { color: T.ink }]}>{opt.title}</Text>
                <Text style={[typography.caption, { color: T.ink2 }]}>{opt.sub}</Text>
              </View>
              {active ? (
                <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                  <Path
                    d="M5 12l5 5 9-11"
                    stroke={tone ? stateColor(T, tone) : T.accent}
                    strokeWidth={2.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </Svg>
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function isoOf(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

function formatDayHeader(d: Date): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

function stateColor(T: Theme, s: AvailState): string {
  return s === 'free' ? T.availFree : s === 'maybe' ? T.availMaybe : T.availBusy;
}

function withAlpha18(T: Theme, s: AvailState): string {
  return `${stateColor(T, s)}18`;
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.mdl,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  navBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    paddingHorizontal: spacing.mdl,
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.mdl,
    borderRadius: radii.card,
    minHeight: 56,
  },
  body: {
    flex: 1,
    minWidth: 0,
  },
});
