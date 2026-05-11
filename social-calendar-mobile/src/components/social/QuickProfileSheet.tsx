/**
 * QuickProfileSheet — public mini-profile bottom sheet (R12-5, R12-6).
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
 * Stacking (R12-5): the sheet sits on TOP of the Search overlay. The
 * overlay stays mounted behind it and is already opaque, so the backdrop
 * here is intentionally 30% black (not the usual 42%).
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
  onAddFriend: () => void;
  onAccept: () => void;
  onDecline: () => void;
  onClose: () => void;
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
  onAddFriend,
  onAccept,
  onDecline,
  onClose,
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

  return (
    <Modal transparent visible animationType="none" onRequestClose={dismiss}>
      <Pressable
        style={[styles.backdrop, { backgroundColor: `rgba(0,0,0,${BACKDROP_OPACITY})` }]}
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
                  <RingAvatar T={T} letter={person.letter} size={64} status={null} />
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

                {/* CTA block */}
                <View style={styles.ctaBlock}>
                  {renderCta({
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
                        {limitedMutuals.map((mf) => (
                          <Pressable
                            key={mf.id}
                            accessibilityRole="button"
                            accessibilityLabel={`Mutual friend ${mf.name}`}
                            onPress={() => {
                              // TODO: navigate to Friend Profile (deferred per CLAUDE.md).
                              // No haptic per spec — pure stub.
                            }}
                          >
                            <RingAvatar
                              T={T}
                              letter={mf.letter}
                              size={24}
                              status={mf.availState ?? null}
                            />
                          </Pressable>
                        ))}
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
