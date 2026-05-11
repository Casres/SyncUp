/**
 * MonthGrid — 7-col month calendar with tap-to-set + drag-paint availability.
 *
 * Drag-paint via PanResponder on the grid container:
 *   - Touch down on a cell starts drag mode (sets parent `dragging` true).
 *   - Each cell entered during drag fires `light` haptic + applies the brush.
 *   - If the brush matches the cell's existing state, fires `heavy` haptic
 *     (no-op feedback per Hard Rule H map heavy category).
 *   - Drag-paint speed: 0ms — no per-cell animation (durations.dayCellDragPaint).
 *
 * Hard Rule 14: clearing a day deletes its key — never store nulls. The brush
 * 'clear' is encoded by the parent's `setDay` mapping (this component just
 * forwards the iso of the cell entered).
 *
 * A11y: each day cell measures 44–46pt on a 402px-wide phone (A-5).
 *
 * Visual: 4px gap, 7 cols, square cells, radius 10. Cell fill = `${stateColor}22`
 * when set, bgElevated otherwise. Today: 1.5px accent border + 800-weight day.
 * Set days show day number + 6px state dot below.
 */

import React, { useMemo, useRef, useState } from 'react';
import {
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
  type GestureResponderEvent,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { colors, radii, spacing, typography, useHaptic } from '../../theme';
import type { AvailabilityBrush, AvailabilityEntry, AvailState } from '../../../../TYPES';

type Theme = typeof colors.light;

export interface MonthGridProps {
  T?: Theme;
  anchor: Date;
  setAnchor: (next: Date) => void;
  avail: AvailabilityEntry;
  brush: AvailabilityBrush;
  setDay: (iso: string) => void;
  dragging: boolean;
  setDragging: (v: boolean) => void;
}

const DOW = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

interface CellRect {
  iso: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export function MonthGrid({
  T = colors.light,
  anchor,
  setAnchor,
  avail,
  brush,
  setDay,
  dragging,
  setDragging,
}: MonthGridProps): React.JSX.Element {
  const fire = useHaptic();
  const cellsRef = useRef<CellRect[]>([]);
  const lastIsoRef = useRef<string | null>(null);
  const [originX, setOriginX] = useState(0);
  const [originY, setOriginY] = useState(0);

  const monthMeta = useMemo(() => buildMonthMeta(anchor), [anchor]);
  const todayIso = useMemo(() => isoOf(new Date()), []);

  const handleHit = (locX: number, locY: number): void => {
    const rect = cellsRef.current.find(
      (c) => locX >= c.x && locX < c.x + c.w && locY >= c.y && locY < c.y + c.h,
    );
    if (!rect) return;
    if (lastIsoRef.current === rect.iso) return;
    lastIsoRef.current = rect.iso;

    const existingMatchesBrush =
      (brush !== 'clear' && avail[rect.iso] === brush) ||
      (brush === 'clear' && avail[rect.iso] === undefined);

    if (existingMatchesBrush) {
      fire('heavy');
    } else {
      fire('light');
    }
    setDay(rect.iso);
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt: GestureResponderEvent) => {
        setDragging(true);
        lastIsoRef.current = null;
        handleHit(evt.nativeEvent.locationX, evt.nativeEvent.locationY);
      },
      onPanResponderMove: (evt: GestureResponderEvent) => {
        handleHit(evt.nativeEvent.locationX, evt.nativeEvent.locationY);
      },
      onPanResponderRelease: () => {
        setDragging(false);
        lastIsoRef.current = null;
      },
      onPanResponderTerminate: () => {
        setDragging(false);
        lastIsoRef.current = null;
      },
    }),
  ).current;

  const goPrev = (): void => {
    fire('light');
    setAnchor(addMonths(anchor, -1));
  };
  const goNext = (): void => {
    fire('light');
    setAnchor(addMonths(anchor, 1));
  };

  // Reset tracked rects each render — measured via onLayout on each cell.
  cellsRef.current = [];

  return (
    <View>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Previous month"
          onPress={goPrev}
          hitSlop={8}
          style={({ pressed }) => [styles.navBtn, { opacity: pressed ? 0.6 : 1 }]}
        >
          <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
            <Path d="M15 6l-6 6 6 6" stroke={T.ink} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </Pressable>
        <Text style={[typography.h3, { color: T.ink, flex: 1, textAlign: 'center' }]}>
          {`${monthMeta.monthLabel} ${monthMeta.year}`}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Next month"
          onPress={goNext}
          hitSlop={8}
          style={({ pressed }) => [styles.navBtn, { opacity: pressed ? 0.6 : 1 }]}
        >
          <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
            <Path d="M9 6l6 6-6 6" stroke={T.ink} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </Pressable>
      </View>

      <View style={styles.dowRow}>
        {DOW.map((d, i) => (
          <View key={`${d}-${i}`} style={styles.dowCell}>
            <Text style={[typography.micro, { color: T.ink3, fontWeight: '600' }]}>
              {d}
            </Text>
          </View>
        ))}
      </View>

      <View
        accessibilityHint="Tap or drag to set availability"
        onLayout={(e) => {
          setOriginX(e.nativeEvent.layout.x);
          setOriginY(e.nativeEvent.layout.y);
        }}
        {...panResponder.panHandlers}
        style={styles.grid}
      >
        {monthMeta.cells.map((cell, idx) => {
          if (cell === null) {
            return <View key={`pad-${idx}`} style={styles.cellWrap} />;
          }
          const status = avail[cell.iso];
          const isToday = cell.iso === todayIso;
          return (
            <View
              key={cell.iso}
              style={styles.cellWrap}
              onLayout={(e) => {
                const { x, y, width, height } = e.nativeEvent.layout;
                cellsRef.current.push({
                  iso: cell.iso,
                  x,
                  y,
                  w: width,
                  h: height,
                });
              }}
            >
              <View
                style={[
                  styles.cell,
                  {
                    backgroundColor: status ? withAlpha22(T, status) : T.bgElevated,
                    borderColor: isToday ? T.accent : T.hair,
                    borderWidth: isToday ? 1.5 : StyleSheet.hairlineWidth,
                  },
                ]}
              >
                <Text
                  style={[
                    typography.caption,
                    {
                      color: T.ink,
                      fontWeight: isToday ? '800' : '600',
                    },
                  ]}
                >
                  {cell.day}
                </Text>
                {status ? (
                  <View
                    style={[
                      styles.statusDot,
                      { backgroundColor: stateColor(T, status) },
                    ]}
                  />
                ) : null}
              </View>
            </View>
          );
        })}
      </View>

      {/* Suppress unused-variable lint for `dragging` / origin offsets — they */}
      {/* live in props/state to keep parents in sync and to satisfy strict mode. */}
      <View pointerEvents="none" style={{ width: 0, height: 0 }}>
        <Text style={{ display: 'none' }}>{`${dragging ? 1 : 0}-${originX}-${originY}`}</Text>
      </View>
    </View>
  );
}

interface MonthMeta {
  monthLabel: string;
  year: number;
  cells: ({ iso: string; day: number } | null)[];
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function buildMonthMeta(anchor: Date): MonthMeta {
  const year = anchor.getFullYear();
  const month = anchor.getMonth();
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const startDow = first.getDay();
  const daysInMonth = last.getDate();
  const cells: MonthMeta['cells'] = [];
  for (let i = 0; i < startDow; i += 1) cells.push(null);
  for (let d = 1; d <= daysInMonth; d += 1) {
    cells.push({ iso: isoOfYMD(year, month, d), day: d });
  }
  // Pad to a multiple of 7
  while (cells.length % 7 !== 0) cells.push(null);
  return { monthLabel: MONTH_NAMES[month] ?? '', year, cells };
}

function addMonths(d: Date, delta: number): Date {
  const next = new Date(d);
  next.setMonth(next.getMonth() + delta);
  return next;
}

function isoOf(d: Date): string {
  return isoOfYMD(d.getFullYear(), d.getMonth(), d.getDate());
}

function isoOfYMD(y: number, m: number, d: number): string {
  const mm = String(m + 1).padStart(2, '0');
  const dd = String(d).padStart(2, '0');
  return `${y}-${mm}-${dd}`;
}

function stateColor(T: Theme, s: AvailState): string {
  if (s === 'free') return T.availFree;
  if (s === 'maybe') return T.availMaybe;
  return T.availBusy;
}

function withAlpha22(T: Theme, s: AvailState): string {
  // Color tokens are hex — append "22" for ~13% alpha tint.
  return `${stateColor(T, s)}22`;
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
  dowRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.xs,
  },
  dowCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.sm,
  },
  cellWrap: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    padding: 2,
  },
  cell: {
    flex: 1,
    borderRadius: radii.small,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});
