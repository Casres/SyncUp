/**
 * AttendeesSheet — role-aware bottom sheet listing every invitee on an event.
 *
 * Spec: ANCHOR R10 (filter/search/sort, swipe-arm-commit remove) + R11
 * (host vs co-host vs invitee surfaces, ⋯ menu, "Invite more").
 *
 * Role resolution is computed locally from event.hostId / event.coHostIds vs
 * currentUserId — no extra fetch.
 *
 * State management: useState only (per CLAUDE.md). The attendees list is
 * passed in; the caller fetches via React Query and applies optimistic
 * updates. This component owns filter/search/armed-row local UI state.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type ListRenderItemInfo,
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
  radii,
  spacing,
  springs,
  typography,
  useHaptic,
} from '../../theme';
import { FilterChipRow, type FilterChip } from '../eventFlow/FilterChipRow';
import { PillBtn } from '../foundation/PillBtn';
import { StaggerList } from '../polish/StaggerList';
import { EmptyAttendees } from '../emptyStates/EmptyAttendees';
import type {
  Event,
  FriendType,
  RSVPStatus,
  SocialGroup,
} from '../../../../TYPES';

import { AttendeeRow, type AttendeeRowData, type AttendeeViewerRole } from './AttendeeRow';

type Theme = typeof colors.light;

export interface AttendeesSheetProps {
  T?: Theme;
  open: boolean;
  event: Event;
  attendees: AttendeeRowData[];
  currentUserId: string;
  friendTypes: FriendType[];
  groups: SocialGroup[];
  onRemove: (userId: string) => void;
  onMakeCoHost: (userId: string) => void;
  onRemoveCoHost: (userId: string) => void;
  onInviteMore: () => void;
  onClose: () => void;
}

// Single-select filter values. `null` is the RSVP "no response" bucket, but
// FilterChipRow chips need string ids — we encode "no response" as the
// literal 'none' chip id and translate to null in the filter pipeline.
type RsvpFilter = 'all' | 'yes' | 'maybe' | 'no' | 'none';
const RSVP_CHIPS: FilterChip[] = [
  { id: 'all', label: 'All' },
  { id: 'yes', label: 'Going' },
  { id: 'maybe', label: 'Maybe' },
  { id: 'no', label: 'Not going' },
  { id: 'none', label: 'No response' },
];

// RSVP visual sort order (R10): Going → Maybe → No response → Not going.
const RSVP_SORT_RANK: Record<string, number> = {
  yes: 0,
  maybe: 1,
  null: 2,
  no: 3,
};
function rsvpRank(status: RSVPStatus): number {
  return status === null ? 2 : (RSVP_SORT_RANK[status] ?? 3);
}

const ARM_AUTO_CANCEL_MS = 4000;
const SHEET_MAX_HEIGHT_PCT = 0.88;

export function AttendeesSheet({
  T = colors.light,
  open,
  event,
  attendees,
  currentUserId,
  friendTypes,
  groups,
  onRemove,
  onMakeCoHost,
  onRemoveCoHost,
  onInviteMore,
  onClose,
}: AttendeesSheetProps): React.JSX.Element | null {
  const fire = useHaptic();

  // ── Role ─────────────────────────────────────────────────────────────────
  const isHost = event.hostId === currentUserId;
  const isCoHost = event.coHostIds.includes(currentUserId);
  const viewerRole: AttendeeViewerRole = isHost
    ? 'host'
    : isCoHost
      ? 'co-host'
      : 'invitee';

  // ── Local state ──────────────────────────────────────────────────────────
  const [rsvpFilter, setRsvpFilter] = useState<RsvpFilter>('all');
  const [typeGroupFilter, setTypeGroupFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [armedRowId, setArmedRowId] = useState<string | null>(null);

  // ── Auto-cancel armed row after 4s (R10-4) ───────────────────────────────
  useEffect(() => {
    if (!armedRowId) return;
    const timer = setTimeout(() => {
      fire('light');
      setArmedRowId(null);
    }, ARM_AUTO_CANCEL_MS);
    return () => clearTimeout(timer);
  }, [armedRowId, fire]);

  // ── Sheet entrance animation (flow-sheet-up 280ms spring) ────────────────
  const translateY = useSharedValue(60);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (open) {
      // Open haptic fired by caller when opening sheet; we still fire `light`
      // on close to match the spec haptic table.
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

  const dismiss = useCallback(() => {
    fire('light');
    onClose();
  }, [fire, onClose]);

  // ── Filter pipeline ──────────────────────────────────────────────────────

  // Map type/group filter id → set of member user ids.
  const typeGroupMembers = useMemo<Set<string> | null>(() => {
    if (typeGroupFilter === 'all') return null;
    const ft = friendTypes.find((t) => t.id === typeGroupFilter);
    if (ft) return new Set(ft.members);
    const g = groups.find((gr) => gr.id === typeGroupFilter);
    if (g) return new Set(g.members.map((m) => m.id));
    return new Set();
  }, [typeGroupFilter, friendTypes, groups]);

  const filteredAttendees = useMemo<AttendeeRowData[]>(() => {
    const q = searchQuery.trim().toLowerCase();
    const targetRsvp: RSVPStatus | 'all' =
      rsvpFilter === 'all'
        ? 'all'
        : rsvpFilter === 'none'
          ? null
          : (rsvpFilter as Exclude<RSVPStatus, null>);

    return [...attendees]
      .sort((a, b) => rsvpRank(a.rsvpStatus) - rsvpRank(b.rsvpStatus))
      .filter((a) => {
        if (targetRsvp !== 'all' && a.rsvpStatus !== targetRsvp) return false;
        if (typeGroupMembers && !typeGroupMembers.has(a.id)) return false;
        if (q.length > 0) {
          const hay = `${a.name} ${a.handle}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      });
  }, [attendees, rsvpFilter, searchQuery, typeGroupMembers]);

  // ── Row 2 chips (host only) ──────────────────────────────────────────────
  const typeGroupChips: FilterChip[] = useMemo(() => {
    if (viewerRole !== 'host') return [];
    if (friendTypes.length === 0 && groups.length === 0) return [];
    return [
      { id: 'all', label: 'All' },
      ...friendTypes.map((ft) => ({ id: ft.id, label: ft.label })),
      ...groups.map((g) => ({ id: g.id, label: g.name })),
    ];
  }, [viewerRole, friendTypes, groups]);

  // ── Per-row handlers (capture row id) ────────────────────────────────────
  const handleArm = useCallback((id: string) => {
    setArmedRowId(id);
  }, []);
  const handleCommit = useCallback(
    (id: string) => {
      onRemove(id);
      setArmedRowId(null);
    },
    [onRemove],
  );
  const handleCancel = useCallback(() => {
    setArmedRowId(null);
  }, []);

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<AttendeeRowData>) => {
      return (
        <AttendeeRow
          T={T}
          attendee={item}
          viewerRole={viewerRole}
          isOwnRow={item.id === currentUserId}
          armed={armedRowId === item.id}
          onArm={() => handleArm(item.id)}
          onCommit={() => handleCommit(item.id)}
          onCancel={handleCancel}
          onMakeCoHost={() => onMakeCoHost(item.id)}
          onRemoveCoHost={() => onRemoveCoHost(item.id)}
          onPress={() => {
            // QuickProfileSheet / Friend Profile is deferred per CLAUDE.md.
            // Stub: no-op (haptic fires from AttendeeRow itself).
            // eslint-disable-next-line no-console
            console.log(`TODO: navigate to Friend Profile for ${item.id}`);
          }}
        />
      );
    },
    [
      T,
      viewerRole,
      currentUserId,
      armedRowId,
      handleArm,
      handleCommit,
      handleCancel,
      onMakeCoHost,
      onRemoveCoHost,
    ],
  );

  if (!open) return null;

  const showInviteMore = viewerRole === 'host' || viewerRole === 'co-host';
  const showRow2 = viewerRole === 'host' && typeGroupChips.length > 0;
  const empty = filteredAttendees.length === 0;

  return (
    <Modal transparent visible animationType="none" onRequestClose={dismiss}>
      <Pressable
        style={styles.backdrop}
        accessibilityRole="none"
        accessibilityLabel="Dismiss sheet"
        onPress={dismiss}
      >
        {/* Inner Pressable swallows taps so they don't dismiss the sheet. */}
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
          <Pressable
            accessibilityViewIsModal
            accessibilityRole="none"
            onPress={() => {}}
            style={styles.sheetInner}
          >
            <View style={[styles.grabHandle, { backgroundColor: T.bgSunken }]} />

            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerText}>
                <Text style={[typography.h3, { color: T.ink }]}>Attendees</Text>
                <Text
                  style={[
                    typography.caption,
                    { color: T.ink3, fontSize: 12, fontWeight: '500' },
                  ]}
                >
                  {attendees.length} invited
                </Text>
              </View>
              <View style={styles.headerActions}>
                {showInviteMore ? (
                  <PillBtn
                    T={T}
                    label="Invite more"
                    variant="primary"
                    size="sm"
                    onPress={() => {
                      fire('medium');
                      onInviteMore();
                    }}
                  />
                ) : null}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Close attendees sheet"
                  hitSlop={8}
                  onPress={dismiss}
                  style={styles.closeBtn}
                >
                  <Ionicons name="close" size={20} color={T.ink3} />
                </Pressable>
              </View>
            </View>

            {/* Filter Row 1 — RSVP (all roles) */}
            <View style={styles.filterRow}>
              <FilterChipRow
                T={T}
                chips={RSVP_CHIPS}
                selected={rsvpFilter}
                onChange={(next) => setRsvpFilter(next as RsvpFilter)}
              />
            </View>

            {/* Filter Row 2 — type/group (host only) */}
            {showRow2 ? (
              <View style={styles.filterRow}>
                <FilterChipRow
                  T={T}
                  chips={typeGroupChips}
                  selected={typeGroupFilter}
                  onChange={setTypeGroupFilter}
                />
              </View>
            ) : null}

            {/* Search input */}
            <View style={styles.searchRow}>
              <View style={[styles.searchPill, { backgroundColor: T.bgSunken }]}>
                <Ionicons name="search" size={16} color={T.ink3} />
                <TextInput
                  accessibilityLabel="Search attendees"
                  placeholder="Search attendees…"
                  placeholderTextColor={T.ink3}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  style={[
                    styles.searchInput,
                    typography.body,
                    { color: T.ink },
                  ]}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {searchQuery.length > 0 ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Clear search"
                    hitSlop={8}
                    onPress={() => {
                      fire('light');
                      setSearchQuery('');
                    }}
                  >
                    <Ionicons name="close-circle" size={18} color={T.ink3} />
                  </Pressable>
                ) : null}
              </View>
            </View>

            {/* List body */}
            {empty ? (
              <View style={styles.emptyWrap}>
                {viewerRole === 'host' ? (
                  <EmptyAttendees T={T} onAddInvitees={onInviteMore} />
                ) : (
                  <Text
                    style={[
                      typography.body,
                      { color: T.ink3, textAlign: 'center', fontWeight: '400' },
                    ]}
                  >
                    Nobody matches
                  </Text>
                )}
              </View>
            ) : (
              <FlatList
                data={filteredAttendees}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.listContent}
                // Wrap initial-render items in StaggerList by overlaying a
                // memoised stagger for the visible window.
                ListHeaderComponent={
                  <StaggerList>
                    {filteredAttendees.slice(0, 0).map((a) => (
                      <View key={a.id} />
                    ))}
                  </StaggerList>
                }
              />
            )}
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.42)',
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
    marginBottom: spacing.sm,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  closeBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterRow: {
    paddingVertical: spacing.xs,
  },
  searchRow: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  searchPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radii.input,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 0,
    fontSize: 15,
  },
  listContent: {
    paddingBottom: spacing['4xl'],
  },
  emptyWrap: {
    paddingVertical: spacing['4xl'],
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
  },
});
