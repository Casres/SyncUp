/**
 * WeekView — 7 stacked rows for the anchor week (Sun → Sat).
 *
 * Each row 14px-padded, radius 12, fill `${stateColor}18`. 44px-wide left
 * column with mono dow + 22/800 date. Right side: status name + brush hint.
 * Trailing 10px state dot.
 *
 * Tap a row to apply the active brush. Haptic: light on tap.
 */

import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fonts, radii, spacing, typography, useHaptic } from '../../theme';
import { AvailDot } from './AvailDot';
import type { AvailabilityBrush, AvailabilityEntry, AvailState } from '../../../../TYPES';

type Theme = typeof colors.light;

export interface WeekViewProps {
  T?: Theme;
  anchor: Date;
  avail: AvailabilityEntry;
  brush: AvailabilityBrush;
  setDay: (iso: string) => void;
}

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const STATE_LABEL: Record<AvailState, string> = {
  free:  'Free',
  maybe: 'Maybe',
  busy:  'Busy',
};

const BRUSH_LABEL: Record<AvailabilityBrush, string> = {
  free:  'Free',
  maybe: 'Maybe',
  busy:  'Busy',
  clear: 'Clear',
};

export function WeekView({
  T = colors.light,
  anchor,
  avail,
  brush,
  setDay,
}: WeekViewProps): React.JSX.Element {
  const fire = useHaptic();
  const days = useMemo(() => buildWeekDays(anchor), [anchor]);

  return (
    <View style={styles.list}>
      {days.map((d) => {
        const status = avail[d.iso];
        const fill = status ? withAlpha18(T, status) : T.bgElevated;
        return (
          <Pressable
            key={d.iso}
            accessibilityRole="button"
            accessibilityLabel={`${DOW[d.dow]} ${d.dayNum}, ${status ? STATE_LABEL[status] : 'unset'}`}
            onPress={() => {
              fire('light');
              setDay(d.iso);
            }}
            style={({ pressed }) => [
              styles.row,
              {
                backgroundColor: fill,
                borderColor: T.hair,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <View style={styles.left}>
              <Text style={[styles.dow, { color: T.ink2 }]}>{DOW[d.dow]?.toUpperCase()}</Text>
              <Text style={[styles.dayNum, { color: T.ink }]}>{d.dayNum}</Text>
            </View>
            <View style={styles.body}>
              <Text style={[typography.title, { color: T.ink }]}>
                {status ? STATE_LABEL[status] : 'Unset'}
              </Text>
              <Text style={[typography.caption, { color: T.ink2 }]}>
                {`Tap to set ${BRUSH_LABEL[brush]}`}
              </Text>
            </View>
            <AvailDot T={T} status={status ?? null} size={10} />
          </Pressable>
        );
      })}
    </View>
  );
}

interface DayMeta {
  iso: string;
  dow: number;
  dayNum: number;
}

function buildWeekDays(anchor: Date): DayMeta[] {
  const start = new Date(anchor);
  const dayOfWeek = start.getDay(); // 0 = Sunday
  start.setDate(start.getDate() - dayOfWeek);
  const out: DayMeta[] = [];
  for (let i = 0; i < 7; i += 1) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    out.push({
      iso: isoOf(d),
      dow: d.getDay(),
      dayNum: d.getDate(),
    });
  }
  return out;
}

function isoOf(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

function withAlpha18(T: Theme, s: AvailState): string {
  const base = s === 'free' ? T.availFree : s === 'maybe' ? T.availMaybe : T.availBusy;
  return `${base}18`;
}

const styles = StyleSheet.create({
  list: {
    paddingHorizontal: spacing.mdl,
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.mdl,
    paddingVertical: spacing.md,
    borderRadius: radii.input,
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: 56,
  },
  left: {
    width: 44,
    alignItems: 'center',
  },
  dow: {
    fontFamily: fonts.mono,
    fontSize: 10,
    letterSpacing: 1.4,
    fontWeight: '600',
  },
  dayNum: {
    fontFamily: fonts.sans,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  body: {
    flex: 1,
    minWidth: 0,
  },
});
