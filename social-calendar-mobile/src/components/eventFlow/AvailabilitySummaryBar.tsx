/**
 * AvailabilitySummaryBar — Banded aggregate availability viz (Hard Rule 1).
 *
 * Shows aggregate counts (free / maybe / busy) across invitees for the chosen
 * day window. Always pairs color with text label (R5-1).
 *
 * Hard Rule 1: viz LOCKED to banded — do not swap visualizations.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing, typography } from '../../theme';
import { AvailDot } from '../profile/AvailDot';
import type { AvailState, Draft } from '../../../../TYPES';

type Theme = typeof colors.light;

export type FriendsAvailMap = Record<string, AvailState | null>;

export interface AvailabilitySummaryBarProps {
  T?: Theme;
  draft: Draft;
  /** Map of friend id → their availability for the candidate date. */
  friendsAvail: FriendsAvailMap;
}

interface Counts {
  free: number;
  maybe: number;
  busy: number;
  unset: number;
}

function tally(map: FriendsAvailMap): Counts {
  const counts: Counts = { free: 0, maybe: 0, busy: 0, unset: 0 };
  for (const state of Object.values(map)) {
    if (state === 'free') counts.free += 1;
    else if (state === 'maybe') counts.maybe += 1;
    else if (state === 'busy') counts.busy += 1;
    else counts.unset += 1;
  }
  return counts;
}

export function AvailabilitySummaryBar({
  T = colors.light,
  draft,
  friendsAvail,
}: AvailabilitySummaryBarProps): React.JSX.Element {
  const counts = tally(friendsAvail);
  const total = counts.free + counts.maybe + counts.busy + counts.unset || 1;

  const segments: { key: string; flex: number; bg: string }[] = [
    { key: 'free', flex: counts.free, bg: T.availFree },
    { key: 'maybe', flex: counts.maybe, bg: T.availMaybe },
    { key: 'busy', flex: counts.busy, bg: T.availBusy },
    { key: 'unset', flex: counts.unset, bg: T.bgSunken },
  ].filter((s) => s.flex > 0);

  return (
    <View style={[styles.root, { backgroundColor: T.bgElevated, borderColor: T.hair }]}>
      <View style={styles.header}>
        <Text style={[typography.title, { color: T.ink, flex: 1 }]} numberOfLines={1}>
          {draft.title || 'Availability'}
        </Text>
        <Text style={[typography.caption, { color: T.ink2 }]}>{total} invited</Text>
      </View>
      <View style={[styles.bar, { backgroundColor: T.bgSunken }]}>
        {segments.map((seg) => (
          <View key={seg.key} style={{ flex: seg.flex, backgroundColor: seg.bg }} />
        ))}
      </View>
      <View style={styles.legend}>
        <LegendItem T={T} status="free" label="Free" count={counts.free} />
        <LegendItem T={T} status="maybe" label="Maybe" count={counts.maybe} />
        <LegendItem T={T} status="busy" label="Busy" count={counts.busy} />
      </View>
    </View>
  );
}

interface LegendItemProps {
  T: Theme;
  status: AvailState;
  label: string;
  count: number;
}

function LegendItem({ T, status, label, count }: LegendItemProps): React.JSX.Element {
  return (
    <View style={styles.legendItem}>
      <AvailDot T={T} status={status} />
      <Text style={[typography.caption, { color: T.ink2 }]}>
        {`${label} · ${count}`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    borderRadius: radii.card,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.mdl,
    gap: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  bar: {
    height: 12,
    borderRadius: radii.inline,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  legend: {
    flexDirection: 'row',
    gap: spacing.mdl,
    flexWrap: 'wrap',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
});
