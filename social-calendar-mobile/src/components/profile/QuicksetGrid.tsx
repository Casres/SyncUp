/**
 * QuicksetGrid — N-cell grid of quickset buttons (USER-EXTENSIBLE).
 *
 * Each ~66px min-height, radius 12. Title row: state dot + 13/700 label.
 * Below: 11/ink3 detail OR "Applied" (1600ms confirmation).
 * Applied = accentSoft fill + accent border.
 *
 * Haptics:
 *   - medium on Quickset apply (user-fired)
 *   - success on the "Applied" confirmation that follows
 *
 * Hard Rule 15: Quicksets are pure functions over the AvailabilityEntry map,
 * scoped to sensible windows. Mutation logic lives in the parent / store —
 * this component fires `onApply(quickset)` and shows a 1600ms applied state.
 *
 * R7-1 — Quicksets are USER-EXTENSIBLE. The 4 built-ins exported as
 * `BUILTIN_QUICKSETS` are PERMANENT and must never be deleted. Users can
 * save additional custom Quicksets beyond the built-ins (save/name flow
 * ships in a future round; until then only the 4 built-ins render). The
 * grid is NEVER hard-coded fixed-length-4 — it iterates `props.quicksets`
 * and renders whatever the parent passes in.
 */

import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, durations, radii, spacing, typography, useHaptic } from '../../theme';
import { AvailDot } from './AvailDot';
import type { Quickset, QuicksetStatus } from '../../../../TYPES';

/**
 * R7-1 — Permanent built-in Quicksets. These four MUST always be present
 * and are non-deletable. Custom user-saved Quicksets (future round) append
 * after these; the grid renders whatever the parent supplies.
 */
export const BUILTIN_QUICKSETS: readonly Quickset[] = Object.freeze([
  { id: 'weekends-free', label: 'Weekends free', detail: 'Sat + Sun · next 4 weeks',  status: 'free'  },
  { id: 'weekdays-5pm',  label: 'Weekdays 5pm+', detail: 'Mon–Fri evenings · 14 days', status: 'free'  },
  { id: 'next30-maybe',  label: 'Next 30 maybe', detail: 'Soft availability blanket',  status: 'maybe' },
  { id: 'clear-month',   label: 'Clear month',   detail: 'Wipe current month',         status: null    },
]);

type Theme = typeof colors.light;

export interface QuicksetGridProps {
  T?: Theme;
  quicksets: Quickset[];
  onApply: (q: Quickset) => void;
}

// R7-1 — `quicksets` is rendered by .map(); never assume fixed-length-4.
export function QuicksetGrid({
  T = colors.light,
  quicksets,
  onApply,
}: QuicksetGridProps): React.JSX.Element {
  const fire = useHaptic();
  const [appliedId, setAppliedId] = useState<string | null>(null);

  useEffect(() => {
    if (!appliedId) return;
    const t = setTimeout(() => setAppliedId(null), durations.quicksetConfirm);
    return () => clearTimeout(t);
  }, [appliedId]);

  return (
    <View style={styles.grid}>
      {quicksets.map((q) => {
        const isApplied = appliedId === q.id;
        return (
          <Pressable
            key={q.id}
            accessibilityRole="button"
            accessibilityLabel={q.label}
            onPress={() => {
              fire('medium');
              onApply(q);
              fire('success');
              setAppliedId(q.id);
            }}
            style={({ pressed }) => [
              styles.cell,
              {
                backgroundColor: isApplied ? T.accentSoft : T.bgElevated,
                borderColor: isApplied ? T.accent : T.hair,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <View style={styles.headerRow}>
              <AvailDot T={T} status={tone(q.status)} size={8} />
              <Text style={[styles.title, { color: T.ink }]} numberOfLines={1}>
                {q.label}
              </Text>
            </View>
            <Text style={[styles.detail, { color: isApplied ? T.accentInk : T.ink3 }]} numberOfLines={2}>
              {isApplied ? 'Applied' : q.detail}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function tone(s: QuicksetStatus): 'free' | 'maybe' | null {
  if (s === 'free') return 'free';
  if (s === 'maybe') return 'maybe';
  return null;
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  cell: {
    width: '48%',
    minHeight: 66,
    flexGrow: 1,
    padding: spacing.md,
    borderRadius: radii.input,
    borderWidth: 1,
    gap: spacing.xs,
    justifyContent: 'flex-start',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  title: {
    ...typography.bodyMed,
    fontSize: 13,
    fontWeight: '700',
  },
  detail: {
    ...typography.micro,
    fontSize: 11,
  },
});
