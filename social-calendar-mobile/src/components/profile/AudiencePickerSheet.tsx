/**
 * AudiencePickerSheet — Bottom sheet for picking friends OR friend types as the
 * audience for a broadcast / invite.
 *
 * NOTE: This is the PRESENTATIONAL component. The navigator-backed sheet route
 * is owned by the Navigation agent. The parent screen handles the modal-sheet
 * presentation; this component just renders the visible body when `visible`.
 *
 * - `mode='types'` → friend-type rows: PrivateBadge + label + "{n} members" + checkbox
 * - `mode='friends'` → friend rows: RingAvatar + name + handle (mono) + CategoryBadge;
 *                      selection visualised via `RingAvatar.selected`.
 *
 * Header: title (h3) + N selected sub + accent "Done" pill.
 * Sheet up: 280ms spring (rubber-band @100px is owned by the parent presenter).
 *
 * Haptics:
 *   - light on row toggle
 *   - medium on Done
 *
 * R7-3 — In `mode='types'` selection is a flat checkbox set: each tap
 * toggles a single FriendType id in/out of `selected`. There is NO compound
 * filtering (no "match all of these types" / intersection mode). Because
 * FriendType.members[] is disjoint across types, picking N types resolves
 * to the UNION of their members — disjointness is enforced by the data
 * layer (see `src/mocks/friendTypes.ts`), not by this component.
 */

import React, { useEffect, useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { Ionicons } from '@expo/vector-icons';

import { colors, durations, radii, spacing, springs, typography, useHaptic } from '../../theme';
import { PillBtn } from '../foundation/PillBtn';
import { RingAvatar } from '../foundation/RingAvatar';
import { CategoryBadge } from '../social/CategoryBadge';
import { PrivateBadge } from '../social/PrivateBadge';
import type { AudiencePickerMode, Friend, FriendType } from '../../../../TYPES';

type Theme = typeof colors.light;

export interface AudiencePickerSheetProps {
  T?: Theme;
  visible: boolean;
  mode: AudiencePickerMode;
  selected: string[];
  onChange: (next: string[]) => void;
  onClose: () => void;
  onDone: () => void;
  /** Provided when mode === 'friends'. */
  friends?: Friend[];
  /** Provided when mode === 'types'. */
  types?: FriendType[];
  /** Resolver for category id → display label (used in friends mode). */
  resolveCategoryLabel?: (categoryId: string) => string;
  /** Resolver for category id → tint color (used in friends mode). */
  resolveCategoryTint?: (categoryId: string) => string | undefined;
}

export function AudiencePickerSheet({
  T = colors.light,
  visible,
  mode,
  selected,
  onChange,
  onClose,
  onDone,
  friends = [],
  types = [],
  resolveCategoryLabel,
  resolveCategoryTint,
}: AudiencePickerSheetProps): React.JSX.Element | null {
  const fire = useHaptic();
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(40);

  useEffect(() => {
    if (visible) {
      opacity.value = withTiming(1, { duration: durations.sheetUp });
      translateY.value = withSpring(0, springs.spring);
    } else {
      opacity.value = withTiming(0, { duration: durations.tapFeedback });
      translateY.value = withTiming(40, { duration: durations.tapFeedback });
    }
  }, [visible, opacity, translateY]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  const selectedSet = useMemo(() => new Set(selected), [selected]);

  const toggle = (id: string): void => {
    fire('light');
    if (selectedSet.has(id)) {
      onChange(selected.filter((s) => s !== id));
    } else {
      onChange([...selected, id]);
    }
  };

  const handleDone = (): void => {
    fire('medium');
    onDone();
  };

  if (!visible) return null;

  // R13-4 — zero-friend empty state applies ONLY to mode='friends'. mode='types'
  // is never affected. When the friends array becomes non-empty during the
  // session (parent re-renders with new props) the empty state is automatically
  // replaced by the friend list — no special logic needed.
  const isZeroFriendState = mode === 'friends' && friends.length === 0;

  return (
    <Animated.View
      accessibilityViewIsModal
      style={[
        styles.root,
        { backgroundColor: T.bgElevated, borderColor: T.hair },
        animStyle,
      ]}
    >
      <View style={[styles.handle, { backgroundColor: T.hairStrong }]} />
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={[typography.h3, { color: T.ink }]}>
            {mode === 'friends' ? 'Pick friends' : 'Pick friend types'}
          </Text>
          <Text style={[typography.caption, { color: T.ink2 }]}>
            {`${selected.length} selected`}
          </Text>
        </View>
        <PillBtn
          T={T}
          label="Done"
          onPress={handleDone}
          size="sm"
          disabled={isZeroFriendState}
        />
      </View>

      {isZeroFriendState ? (
        <View style={styles.emptyFill}>
          <View style={[styles.emptyTile, { backgroundColor: T.bgSunken }]}>
            <Ionicons name="people-outline" size={28} color={T.ink3} />
          </View>
          <Text style={[styles.emptyTitle, { color: T.ink }]}>No friends yet</Text>
          <Text style={[styles.emptyBody, { color: T.ink2 }]}>
            Add friends to invite them to events.
          </Text>
          {/* R13-4 — NO CTA. Never navigate away from a picker sheet. */}
        </View>
      ) : (
        <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
          {mode === 'friends' ? (
            friends.map((f) => (
              <FriendRow
                key={f.id}
                T={T}
                friend={f}
                selected={selectedSet.has(f.id)}
                onToggle={() => toggle(f.id)}
                resolveCategoryLabel={resolveCategoryLabel}
                resolveCategoryTint={resolveCategoryTint}
              />
            ))
          ) : (
            types.map((t) => (
              <TypeRow
                key={t.id}
                T={T}
                type={t}
                selected={selectedSet.has(t.id)}
                onToggle={() => toggle(t.id)}
              />
            ))
          )}
        </ScrollView>
      )}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Close"
        onPress={onClose}
        hitSlop={8}
        style={({ pressed }) => [styles.closeBtn, { opacity: pressed ? 0.7 : 1 }]}
      >
        <Text style={[typography.bodyMed, { color: T.ink2 }]}>Cancel</Text>
      </Pressable>
    </Animated.View>
  );
}

interface FriendRowProps {
  T: Theme;
  friend: Friend;
  selected: boolean;
  onToggle: () => void;
  resolveCategoryLabel?: (categoryId: string) => string;
  resolveCategoryTint?: (categoryId: string) => string | undefined;
}

function FriendRow({
  T,
  friend,
  selected,
  onToggle,
  resolveCategoryLabel,
  resolveCategoryTint,
}: FriendRowProps): React.JSX.Element {
  const catLabel = resolveCategoryLabel?.(friend.category) ?? friend.category;
  const catTint = resolveCategoryTint?.(friend.category);
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={friend.name}
      onPress={onToggle}
      style={({ pressed }) => [
        styles.row,
        { borderBottomColor: T.hair, opacity: pressed ? 0.85 : 1 },
      ]}
    >
      <RingAvatar T={T} letter={friend.letter} selected={selected} size={36} />
      <View style={styles.rowBody}>
        <Text style={[typography.bodyMed, { color: T.ink }]} numberOfLines={1}>
          {friend.name}
        </Text>
        <Text style={[typography.micro, { color: T.ink2, fontFamily: 'JetBrainsMono' }]} numberOfLines={1}>
          {friend.handle}
        </Text>
      </View>
      <CategoryBadge T={T} label={catLabel} tint={catTint} />
    </Pressable>
  );
}

interface TypeRowProps {
  T: Theme;
  type: FriendType;
  selected: boolean;
  onToggle: () => void;
}

function TypeRow({ T, type, selected, onToggle }: TypeRowProps): React.JSX.Element {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={type.label}
      onPress={onToggle}
      style={({ pressed }) => [
        styles.row,
        { borderBottomColor: T.hair, opacity: pressed ? 0.85 : 1 },
      ]}
    >
      <PrivateBadge T={T} />
      <View style={styles.rowBody}>
        <Text style={[typography.bodyMed, { color: T.ink }]} numberOfLines={1}>
          {type.label}
        </Text>
        <Text style={[typography.caption, { color: T.ink2 }]} numberOfLines={1}>
          {`${type.members.length} members`}
        </Text>
      </View>
      <Checkbox T={T} checked={selected} />
    </Pressable>
  );
}

interface CheckboxProps {
  T: Theme;
  checked: boolean;
}

function Checkbox({ T, checked }: CheckboxProps): React.JSX.Element {
  return (
    <View
      style={[
        styles.checkbox,
        {
          backgroundColor: checked ? T.accent : 'transparent',
          borderColor: checked ? T.accent : T.hairStrong,
        },
      ]}
    >
      {checked ? (
        <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
          <Path
            d="M5 12l5 5 9-11"
            stroke={T.bgElevated}
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: '78%',
    borderTopLeftRadius: radii.sheet,
    borderTopRightRadius: radii.sheet,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderRightWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
  },
  handle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginVertical: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingBottom: spacing.md,
  },
  list: {
    flexShrink: 1,
  },
  listContent: {
    paddingBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    minHeight: 56,
  },
  rowBody: {
    flex: 1,
    minWidth: 0,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
  },
  emptyFill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing['3xl'],
  },
  emptyTile: {
    width: 56,
    height: 56,
    borderRadius: radii.hero,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: spacing.md,
    textAlign: 'center',
  },
  emptyBody: {
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: spacing.sm,
    maxWidth: 260,
  },
});
