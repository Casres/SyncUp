/**
 * QuickProfileSheet — public mini-profile bottom sheet (R12-5, R12-6, R15-2,
 * R16-3, R16-4).
 *
 * TODO (GAP 2): Trigger from PEOPLE row body tap in SearchOverlay.
 *   This sheet is built fully self-contained; the search overlay wiring
 *   lands when GAP 2 is built.
 *
 * Visibility contract (R12-6) — limited public data only:
 *   ✓ name · handle · photo · bio (if set) · mutual-friend avatars
 *     (up to 5, status-ringed) · hosted count · attended count.
 *   ✗ NEVER show: availability · friend count · group membership ·
 *     friend type data. These are friends-only fields.
 *
 * Stacking — depth=0 (R12-5):
 *   The sheet sits on TOP of the Search overlay or AttendeesSheet. The
 *   underlying surface stays mounted; the sheet's backdrop is 30% black
 *   (intentionally lower than the standard 42%).
 *
 * Stacking — depth=1 (R16-3):
 *   A second QuickProfileSheet may be stacked above a depth-0 sheet when
 *   the user taps a mutual-friend avatar. The depth-1 sheet renders with
 *   a transparent backdrop — the depth-0 backdrop already covers the
 *   surface beneath, and stacking two 30% alpha layers would double-
 *   darken the screen. Mutual-friend taps inside a depth-1 sheet are
 *   no-ops (R16-3 depth cap = 1).
 *
 * Self-view guard (R16-4):
 *   If a mutual-friend avatar's userId equals `currentUserId`, the
 *   avatar renders as a non-interactive View (no Pressable, no haptic,
 *   no navigation). The avatar still shows its status ring per R15-2.
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

import {
  colors,
  durations,
  easings,
  fonts,
  radii,
  spacing,
  springs,
  typography,
  useHaptic,
} from '../../theme';
import { PillBtn } from '../foundation/PillBtn';
import { RingAvatar } from '../foundation/RingAvatar';
import { Overline } from '../foundation/Overline';
import { Spinner } from '../polish/Spinner';
import { StatTile } from '../profile/StatTile';
import type { AvailState } from '../../../../TYPES';
// AvailState re-used for friend-variant status ring (R15-2).

import { TwoTapDestructive } from './TwoTapDestructive';

type Theme = typeof colors.light;

export interface QuickProfilePerson {
  id: string;
  name: string;
  /** Includes the @ prefix, e.g. "@taro". */
  handle: string;
  /** Single character for the RingAvatar fallback. */
  letter: string;
  photoUrl?: string | null;
  bio?: string | null;
  /** R15-2: availability state for friend-variant status ring. */
  availState?: AvailState | null;
}

export interface QuickProfileMutualFriend {
  id: string;
  name: string;
  letter: string;
  availState?: AvailState | null;
}

export interface QuickProfileStats {
  hosted: number;
  attended: number;
}

export type FriendRequestStatus = 'none' | 'sent' | 'received';

export interface QuickProfileSheetProps {
  T?: Theme;
  open: boolean;
  /** True while person data is fetching. */
  loading?: boolean;
  person: QuickProfilePerson | null;
  /** Max 5 are rendered; pre-slice or let the component slice. */
  mutualFriends: QuickProfileMutualFriend[];
  stats: QuickProfileStats | null;
  friendRequestStatus: FriendRequestStatus;
  /**
   * R15-2: true when the target is already a friend (appears in any FriendType
   * assignment). Friend variant shows status ring + FriendType chip in place of
   * the Add/Requested/Accept/Decline CTA block.
   */
  isFriend?: boolean;
  /**
   * R15-2: The Friend Type label assigned to this person (e.g. "CLOSE FRIENDS").
   * Omit or pass null/undefined when isFriend=true but no type is assigned —
   * the chip slot is left blank (spec: "chip is OMITTED entirely").
   */
  friendTypeName?: string | null;
  onAddFriend: () => void;
  onAccept: () => void;
  onDecline: () => void;
  onClose: () => void;
  /**
   * R16-3 — Stacking depth.
   *   depth=0: standard sheet with 30% backdrop. Mutual-friend taps fire
   *            `onMutualFriendTap` if provided.
   *   depth=1: stacked sheet (sits above a depth-0 sheet). Backdrop is
   *            transparent so the existing depth-0 backdrop covers the
   *            surface beneath. Mutual-friend taps are NO-OPS (depth cap).
   * Defaults to 0.
   */
  depth?: 0 | 1;
  /**
   * R16-3 — Called when the user taps a mutual-friend avatar at depth 0.
   * Receives the tapped userId; the caller is responsible for opening the
   * stacked depth-1 sheet (with the new userId resolved into props).
   * Omitted/undefined at depth 1, or when the host surface chooses not to
   * support drilling (e.g. SearchOverlay before GAP 2 is wired).
   */
  onMutualFriendTap?: (userId: string) => void;
  /**
   * R16-4 — Self-view guard. Mutual-friend avatars whose `id` matches this
   * value render as non-interactive (no Pressable, no haptic). Optional;
   * when undefined the guard is skipped.
   */
  currentUserId?: string;
}

const SHEET_MAX_HEIGHT_PCT = 0.72;
const BACKDROP_OPACITY = 0.3; // R12-5 — intentional 30% (not the standard 42%).
const BIO_CLAMP_LINES = 3;
const MUTUAL_FRIEND_LIMIT = 5;

export function QuickProfileSheet({
  T = colors.light,
  open,
  loading = false,
  person,
  mutualFriends,
  stats,
  friendRequestStatus,
  isFriend = false,
  friendTypeName,
  onAddFriend,
  onAccept,
  onDecline,
  onClose,
  depth = 0,
  onMutualFriendTap,
  currentUserId,
}: QuickProfileSheetProps): React.JSX.Element | null {
  const fire = useHaptic();

  // ── Optimistic friend-request state ────────────────────────────────────
  // Local state initialised from the prop; updated immediately on Add tap
  // so the CTA can flip to "Requested" without waiting on the network.
  // The parent reverts by re-rendering with friendRequestStatus='none'.
  // TODO (GAP 2): propagate this back to the underlying PEOPLE row in
  // SearchOverlay — that wiring is handled by the parent via onAddFriend.
  const [localStatus, setLocalStatus] = useState<FriendRequestStatus>(friendRequestStatus);
  useEffect(() => {
    setLocalStatus(friendRequestStatus);
  }, [friendRequestStatus]);

  // ── Bio expand/collapse ────────────────────────────────────────────────
  const [bioExpanded, setBioExpanded] = useState(false);

  // ── Sheet entrance animation ───────────────────────────────────────────
  const translateY = useSharedValue(60);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (open) {
      opacity.value = withTiming(1, { duration: durations.sheetUp });
      translateY.value = withSpring(0, springs.spring);
    } else {
      opacity.value = withTiming(0, {
        duration: durations.stepPush,
        easing: easings.easeStd,
      });
      translateY.value = withTiming(60, {
        duration: durations.stepPush,
        easing: easings.easeStd,
      });
    }
  }, [open, opacity, translateY]);

  const sheetAStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  function dismiss() {
    fire('light');
    onClose();
  }

  function handleAddFriend() {
    fire('success');
    setLocalStatus('sent');
    onAddFriend();
  }

  function handleAccept() {
    fire('success');
    onAccept();
  }

  const limitedMutuals = useMemo(
    () => mutualFriends.slice(0, MUTUAL_FRIEND_LIMIT),
    [mutualFriends],
  );

  if (!open) return null;

  const showLoading = loading || person === null;

  // R16-3 — depth-1 sheets render with a transparent backdrop. The depth-0
  // sheet beneath already supplies the 30% layer (R12-5); stacking two would
  // double-darken the screen.
  const backdropColor =
    depth === 1
      ? 'transparent'
      : `rgba(0,0,0,${BACKDROP_OPACITY})`;

  return (
    <Modal transparent visible animationType="none" onRequestClose={dismiss}>
      <Pressable
        style={[styles.backdrop, { backgroundColor: backdropColor }]}
        accessibilityRole="none"
        accessibilityLabel="Dismiss profile sheet"
        onPress={dismiss}
      >
        <Animated.View
          style={[
            styles.sheet,
            {
              backgroundColor: T.bgElevated,
              maxHeight: `${SHEET_MAX_HEIGHT_PCT * 100}%`,
            },
            sheetAStyle,
          ]}
        >
          {/* Inner Pressable swallows taps so they don't dismiss the sheet. */}
          <Pressable
            accessibilityViewIsModal
            accessibilityRole="none"
            onPress={() => {}}
            style={styles.sheetInner}
          >
            {/* Grab handle */}
            <View style={[styles.grabHandle, { backgroundColor: T.bgSunken }]} />

            {/* Close X — top-right */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close profile sheet"
              hitSlop={8}
              onPress={dismiss}
              style={styles.closeBtn}
            >
              <Ionicons name="close" size={20} color={T.ink3} />
            </Pressable>

            {showLoading ? (
              <View style={styles.loadingFill}>
                <Spinner T={T} size="MD" />
              </View>
            ) : (
              <>
                {/* Identity block — non-scrollable, centered */}
                <View style={styles.identity}>
                  {/* R15-2: friend variant shows status ring; non-friend has no ring */}
                  <RingAvatar
                    T={T}
                    letter={person.letter}
                    size={64}
                    status={isFriend ? person.availState ?? null : null}
                  />
                  <Text style={[styles.name, { color: T.ink }]}>{person.name}</Text>
                  <Text
                    style={[
                      styles.handle,
                      { color: T.ink3, fontFamily: fonts.mono },
                    ]}
                  >
                    {person.handle}
                  </Text>
                </View>

                {/* CTA block — R15-2: friend variant shows FriendType chip or nothing */}
                <View style={styles.ctaBlock}>
                  {isFriend ? (
                    friendTypeName ? (
                      <View style={styles.friendTypeChipWrap}>
                        <View style={[styles.friendTypeChip, { backgroundColor: T.accentSoft }]}>
                          <Text style={[styles.friendTypeLabel, { color: T.accent, fontFamily: fonts.mono }]}>
                            {friendTypeName.toUpperCase()}
                          </Text>
                        </View>
                      </View>
                    ) : null
                  ) : renderCta({
                    T,
                    status: localStatus,
                    onAdd: handleAddFriend,
                    onAccept: handleAccept,
                    onDecline,
                  })}
                </View>

                {/* 1px hair separator */}
                <View style={[styles.separator, { backgroundColor: T.hair }]} />

                {/* Body — scrollable */}
                <ScrollView
                  style={styles.bodyScroll}
                  contentContainerStyle={styles.bodyContent}
                  showsVerticalScrollIndicator={false}
                >
                  {/* Mutual friends — omit when empty */}
                  {limitedMutuals.length > 0 ? (
                    <View style={styles.section}>
                      <Overline T={T} color="ink3">
                        {`${mutualFriends.length} MUTUAL FRIEND${mutualFriends.length === 1 ? '' : 'S'}`}
                      </Overline>
                      <View style={styles.mutualRow}>
                        {limitedMutuals.map((mf) => {
                          // R16-4 — self-view guard.
                          const isSelf = currentUserId !== undefined && mf.id === currentUserId;
                          // R16-3 — at depth=1 the mutual tap is a no-op (depth cap).
                          // At depth=0, a tap fires `light` haptic and asks the
                          // caller to open a stacked sheet.
                          const interactive = !isSelf && depth === 0 && onMutualFriendTap !== undefined;
                          const avatar = (
                            <RingAvatar
                              T={T}
                              letter={mf.letter}
                              size={24}
                              status={mf.availState ?? null}
                            />
                          );
                          if (!interactive) {
                            return (
                              <View
                                key={mf.id}
                                accessibilityRole="image"
                                accessibilityLabel={`Mutual friend ${mf.name}`}
                                accessibilityState={{ disabled: true }}
                              >
                                {avatar}
                              </View>
                            );
                          }
                          return (
                            <Pressable
                              key={mf.id}
                              accessibilityRole="button"
                              accessibilityLabel={`Open profile for ${mf.name}`}
                              hitSlop={4}
                              onPress={() => {
                                fire('light');
                                onMutualFriendTap?.(mf.id);
                              }}
                            >
                              {avatar}
                            </Pressable>
                          );
                        })}
                      </View>
                    </View>
                  ) : null}

                  {/* Bio — omit when empty */}
                  {person.bio && person.bio.trim().length > 0 ? (
                    <View style={styles.section}>
                      <Text
                        style={[
                          styles.bio,
                          { color: T.ink2 },
                        ]}
                        numberOfLines={bioExpanded ? undefined : BIO_CLAMP_LINES}
                      >
                        {person.bio}
                      </Text>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={bioExpanded ? 'Show less' : 'Read more'}
                        hitSlop={6}
                        onPress={() => {
                          fire('light');
                          setBioExpanded((p) => !p);
                        }}
                      >
                        <Text
                          style={[
                            styles.bioToggle,
                            { color: T.accent },
                          ]}
                        >
                          {bioExpanded ? 'Show less' : 'Read more'}
                        </Text>
                      </Pressable>
                    </View>
                  ) : null}

                  {/* Stats — HOSTED + ATTENDED only (R12-6) */}
                  <View style={styles.statsRow}>
                    <StatTile T={T} n={stats?.hosted ?? 0} label="HOSTED" />
                    <StatTile T={T} n={stats?.attended ?? 0} label="ATTENDED" />
                  </View>
                </ScrollView>
              </>
            )}
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

interface CtaProps {
  T: Theme;
  status: FriendRequestStatus;
  onAdd: () => void;
  onAccept: () => void;
  onDecline: () => void;
}

function renderCta({ T, status, onAdd, onAccept, onDecline }: CtaProps): React.JSX.Element {
  if (status === 'none') {
    return (
      <PillBtn
        T={T}
        label="Add friend"
        variant="primary"
        size="lg"
        onPress={onAdd}
      />
    );
  }
  if (status === 'sent') {
    return (
      <PillBtn
        T={T}
        label="Requested"
        variant="ghost"
        size="lg"
        disabled
        icon={<Ionicons name="checkmark-circle" size={16} color={T.limeInk} />}
        onPress={() => {}}
      />
    );
  }
  // 'received'
  return (
    <View style={styles.ctaRow}>
      <View style={styles.ctaCell}>
        <PillBtn
          T={T}
          label="Accept"
          variant="primary"
          size="lg"
          onPress={onAccept}
        />
      </View>
      <View style={styles.ctaCell}>
        <TwoTapDestructive
          T={T}
          label="Decline"
          confirmLabel="Confirm"
          onConfirm={onDecline}
          armHaptic="light"
          commitHaptic="light"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: radii.sheet,
    borderTopRightRadius: radii.sheet,
    overflow: 'hidden',
  },
  sheetInner: {
    flexShrink: 1,
  },
  grabHandle: {
    width: 38,
    height: 4,
    borderRadius: 999,
    alignSelf: 'center',
    marginTop: 8,
  },
  closeBtn: {
    position: 'absolute',
    top: 6,
    right: 8,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  loadingFill: {
    minHeight: 240,
    alignItems: 'center',
    justifyContent: 'center',
  },
  identity: {
    alignItems: 'center',
    paddingTop: spacing['3xl'],
    gap: 0,
  },
  name: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  handle: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: spacing.xs,
  },
  ctaBlock: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing['3xl'],
  },
  friendTypeChipWrap: {
    alignItems: 'center',
  },
  friendTypeChip: {
    borderRadius: radii.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  friendTypeLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  ctaRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  ctaCell: {
    flex: 1,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginTop: spacing.lg,
  },
  bodyScroll: {
    flexShrink: 1,
  },
  bodyContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing['4xl'],
    gap: spacing.lg,
  },
  section: {
    gap: spacing.sm,
  },
  mutualRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  bio: {
    ...typography.body,
    fontSize: 13,
    fontWeight: '500',
  },
  bioToggle: {
    ...typography.caption,
    fontSize: 13,
    fontWeight: '600',
    marginTop: spacing.xs,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
});
