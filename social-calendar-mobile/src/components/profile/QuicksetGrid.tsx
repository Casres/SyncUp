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
 *   - light on ⋯ btn open / menu dismiss
 *   - heavy on delete arm; success on delete commit; light on auto-cancel
 *
 * Hard Rule 15: Quicksets are pure functions over the AvailabilityEntry map.
 *
 * R7-1 — Quicksets are USER-EXTENSIBLE. The 4 built-ins exported as
 * `BUILTIN_QUICKSETS` are PERMANENT and must never be deleted. Users can
 * save additional custom Quicksets beyond the built-ins. The grid is
 * NEVER hard-coded fixed-length-4 — it iterates `props.quicksets`. The
 * 2-column flexWrap layout already supports any count of tiles (R12-3).
 *
 * R12-4 — only custom tiles (q.isCustom === true) render a ⋯ icon-btn that
 * opens RowOverflowMenu with Rename + Delete. Delete arms the tile inline
 * (NOT TwoTapDestructive); a second tap on the armed tile commits.
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

import { colors, durations, easings, radii, spacing, typography, useHaptic } from '../../theme';
import { RowOverflowMenu, type OverflowMenuItem } from '../social/RowOverflowMenu';
import { AvailDot } from './AvailDot';
import type { Quickset, QuicksetStatus } from '../../../../TYPES';

/**
 * R7-1 — Permanent built-in Quicksets. These four MUST always be present
 * and are non-deletable. Custom user-saved Quicksets append after these;
 * the grid renders whatever the parent supplies.
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
  /** Opens QuicksetNameSheet in rename mode for a custom tile. */
  onRename?: (q: Quickset) => void;
  /** Removes the custom tile from the parent's quicksets array. */
  onDelete?: (id: string) => void;
}

const ARM_AUTO_CANCEL_MS = 4000;
const DELETE_OUT_MS = 320;

// R7-1 — `quicksets` is rendered by .map(); never assume fixed-length-4.
export function QuicksetGrid({
  T = colors.light,
  quicksets,
  onApply,
  onRename,
  onDelete,
}: QuicksetGridProps): React.JSX.Element {
  const fire = useHaptic();
  const [appliedId, setAppliedId] = useState<string | null>(null);
  const [armedId, setArmedId] = useState<string | null>(null);
  const [menuOpenForId, setMenuOpenForId] = useState<string | null>(null);
  const [anchor, setAnchor] = useState<{ top: number; right: number } | undefined>();

  useEffect(() => {
    if (!appliedId) return;
    const t = setTimeout(() => setAppliedId(null), durations.quicksetConfirm);
    return () => clearTimeout(t);
  }, [appliedId]);

  // R12-4 — auto-dismiss armed delete state after 4s.
  useEffect(() => {
    if (!armedId) return;
    const t = setTimeout(() => {
      fire('light');
      setArmedId(null);
    }, ARM_AUTO_CANCEL_MS);
    return () => clearTimeout(t);
  }, [armedId, fire]);

  function closeMenu() {
    fire('light');
    setMenuOpenForId(null);
  }

  function armForDelete(id: string) {
    fire('heavy');
    setArmedId(id);
  }

  function commitDelete(id: string) {
    fire('success');
    setArmedId(null);
    onDelete?.(id);
  }

  // Render the overflow menu for whichever custom tile most recently opened
  // it. Menu items depend on which quickset is active.
  const activeQuickset = quicksets.find((q) => q.id === menuOpenForId) ?? null;
  const menuItems: OverflowMenuItem[] = activeQuickset
    ? [
        {
          label: 'Rename',
          icon: 'pencil-outline',
          onPress: () => {
            setMenuOpenForId(null);
            onRename?.(activeQuickset);
          },
        },
        {
          label: 'Delete',
          icon: 'trash-outline',
          destructive: true,
          onPress: () => {
            setMenuOpenForId(null);
            armForDelete(activeQuickset.id);
          },
        },
      ]
    : [];

  return (
    <>
      <View style={styles.grid}>
        {quicksets.map((q) => (
          <QuicksetCell
            key={q.id}
            T={T}
            quickset={q}
            applied={appliedId === q.id}
            armed={armedId === q.id}
            onApply={() => {
              fire('medium');
              onApply(q);
              fire('success');
              setAppliedId(q.id);
            }}
            onOpenMenu={(anchorPos) => {
              fire('light');
              setAnchor(anchorPos);
              setMenuOpenForId(q.id);
            }}
            onCommitDelete={() => commitDelete(q.id)}
            tone={tone(q.status)}
          />
        ))}
      </View>

      {menuOpenForId !== null ? (
        <RowOverflowMenu
          T={T}
          items={menuItems}
          onClose={closeMenu}
          anchorPosition={anchor}
        />
      ) : null}
    </>
  );
}

interface QuicksetCellProps {
  T: Theme;
  quickset: Quickset;
  applied: boolean;
  armed: boolean;
  tone: 'free' | 'maybe' | null;
  onApply: () => void;
  onOpenMenu: (anchor: { top: number; right: number }) => void;
  onCommitDelete: () => void;
}

function QuicksetCell({
  T,
  quickset,
  applied,
  armed,
  tone: toneStatus,
  onApply,
  onOpenMenu,
  onCommitDelete,
}: QuicksetCellProps): React.JSX.Element {
  const isCustom = quickset.isCustom === true;
  const overflowRef = useRef<View>(null);

  // Exit animation when delete commits — parent removes the tile from the
  // array, but for the brief window before that the tile fades + shrinks.
  // We start at 1/1 and only animate to 0/0.95 when we receive the local
  // "exiting" trigger via the commit handler.
  const opacity = useSharedValue(1);
  const scale = useSharedValue(1);

  function handleCommitDelete() {
    opacity.value = withTiming(0, { duration: DELETE_OUT_MS, easing: easings.easeStd });
    scale.value = withTiming(0.95, { duration: DELETE_OUT_MS, easing: easings.easeStd });
    // Fire the parent commit immediately so state updates while the visual
    // animation plays. Parent's setState filters this tile out on next render.
    onCommitDelete();
  }

  const aStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  function onOverflowLayout(_e: LayoutChangeEvent) {
    const node = overflowRef.current;
    if (!node) return;
    node.measureInWindow((x, y, w) => {
      onOpenMenu({ top: y + 28, right: Math.max(0, 16 + (w - 24)) });
    });
  }

  if (armed) {
    return (
      <Animated.View style={[styles.cellWrap, aStyle]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Confirm delete ${quickset.label}`}
          onPress={handleCommitDelete}
          style={({ pressed }) => [
            styles.cell,
            {
              backgroundColor: T.dangerSoft,
              borderColor: T.danger,
              borderWidth: 1.5,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
        >
          <Text
            style={[
              styles.deleteLabel,
              { color: T.popInk },
            ]}
          >
            Delete?
          </Text>
        </Pressable>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={[styles.cellWrap, aStyle]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={quickset.label}
        onPress={onApply}
        style={({ pressed }) => [
          styles.cell,
          {
            backgroundColor: applied ? T.accentSoft : T.bgElevated,
            borderColor: applied ? T.accent : T.hair,
            opacity: pressed ? 0.85 : 1,
          },
        ]}
      >
        <View style={styles.headerRow}>
          <AvailDot T={T} status={toneStatus} size={8} />
          <Text style={[styles.title, { color: T.ink }]} numberOfLines={1}>
            {quickset.label}
          </Text>
        </View>
        <Text
          style={[styles.detail, { color: applied ? T.accentInk : T.ink3 }]}
          numberOfLines={2}
        >
          {applied ? 'Applied' : quickset.detail}
        </Text>
      </Pressable>

      {isCustom ? (
        <View
          ref={overflowRef}
          onLayout={onOverflowLayout}
          style={styles.overflowAnchor}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`More actions for ${quickset.label}`}
            hitSlop={12}
            onPress={() => {
              const node = overflowRef.current;
              if (!node) {
                onOpenMenu({ top: 120, right: 16 });
                return;
              }
              node.measureInWindow((x, y, w) => {
                onOpenMenu({ top: y + 28, right: Math.max(0, 16 + (w - 24)) });
              });
            }}
            style={styles.overflowBtn}
          >
            <Ionicons name="ellipsis-horizontal" size={18} color={T.ink3} />
          </Pressable>
        </View>
      ) : null}
    </Animated.View>
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
  cellWrap: {
    width: '48%',
    flexGrow: 1,
    position: 'relative',
  },
  cell: {
    minHeight: 66,
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
    flexShrink: 1,
  },
  detail: {
    ...typography.micro,
    fontSize: 11,
  },
  deleteLabel: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    minHeight: 50,
    textAlignVertical: 'center',
    paddingVertical: spacing.md,
  },
  overflowAnchor: {
    position: 'absolute',
    top: 0,
    right: 0,
  },
  overflowBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
