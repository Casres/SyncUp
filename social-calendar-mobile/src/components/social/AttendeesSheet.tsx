/**
 * AttendeesSheet — role-aware bottom sheet listing every invitee on an event.
 *
 * Spec: ANCHOR R10 + R11 + R15-1 through R15-6.
 *
 * R15-1: Row tap → QuickProfileSheet (terminal). Self-row = no-op.
 * R15-2: QuickProfileSheet friend variant (status ring + FriendType chip).
 * R15-3: RSVP grouping with HOSTS pinned on top. Hosts double-appear.
 * R15-4: Search revealed from header magnifier. Title collapses 200ms easeStd.
 * R15-5: Chip filter bar sticky above FlatList (outside scroll container).
 * R15-6: Offline state — OfflineBar above chips, network actions disabled.
 *
 * keyExtractor combines row.id + section to prevent key collisions when the
 * same person appears in HOSTS and their RSVP section (R15-3).
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  fonts,
  radii,
  spacing,
  springs,
  typography,
  useHaptic,
} from '../../theme';
import { FilterChipRow, type FilterChip } from '../eventFlow/FilterChipRow';
import { PillBtn } from '../foundation/PillBtn';
import { OfflineBar } from '../polish/OfflineBar';
import { EmptyAttendees } from '../emptyStates/EmptyAttendees';
import type {
  Event,
  FriendType,
  RSVPStatus,
  SocialGroup,
} from '../../../../TYPES';

import { AttendeeRow, type AttendeeRowData, type AttendeeViewerRole } from './AttendeeRow';
import { QuickProfileSheet } from './QuickProfileSheet';

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
  /** R15-6: offline flag drives OfflineBar + disables network actions. */
  offline?: boolean;
  /** R15-6: ISO timestamp of last successful sync. */
  lastSyncedAt?: string;
}

// ── Filter constants ──────────────────────────────────────────────────────────

type RsvpFilter = 'all' | 'yes' | 'maybe' | 'no' | 'none';
const RSVP_CHIPS: FilterChip[] = [
  { id: 'all',    label: 'All' },
  { id: 'yes',    label: 'Going' },
  { id: 'maybe',  label: 'Maybe' },
  { id: 'no',     label: 'Not going' },
  { id: 'none',   label: 'No response' },
];

// R15-3 section order. "HOSTS" is always first, then RSVP buckets.
const RSVP_SECTION_ORDER: Array<{ key: RsvpFilter; label: string }> = [
  { key: 'yes',   label: 'GOING' },
  { key: 'maybe', label: 'MAYBE' },
  { key: 'no',    label: 'NOT GOING' },
  { key: 'none',  label: 'NO RESPONSE' },
];

function rsvpSection(status: RSVPStatus): RsvpFilter {
  if (status === null) return 'none';
  return status as RsvpFilter;
}

const ARM_AUTO_CANCEL_MS = 4000;
const SHEET_MAX_HEIGHT_PCT = 0.88;
const HEADER_ANIM_MS = 200;

// ── FlatList item types ───────────────────────────────────────────────────────

type ListItem =
  | { type: 'section-header'; id: string; label: string }
  | { type: 'row'; id: string; attendee: AttendeeRowData; section: string; isHostSection: boolean };

// ── Main component ────────────────────────────────────────────────────────────

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
  offline = false,
  lastSyncedAt,
}: AttendeesSheetProps): React.JSX.Element | null {
  const fire = useHaptic();

  // ── Role ──────────────────────────────────────────────────────────────────
  const isHost = event.hostId === currentUserId;
  const isCoHost = event.coHostIds.includes(currentUserId);
  const viewerRole: AttendeeViewerRole = isHost ? 'host' : isCoHost ? 'co-host' : 'invitee';

  // ── Local state ──────────────────────────────────────────────────────────
  const [rsvpFilter, setRsvpFilter] = useState<RsvpFilter>('all');
  const [typeGroupFilter, setTypeGroupFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchActive, setSearchActive] = useState(false);
  const [armedRowId, setArmedRowId] = useState<string | null>(null);
  // R15-1: QuickProfileSheet state
  const [quickProfileTargetId, setQuickProfileTargetId] = useState<string | null>(null);
  const searchInputRef = useRef<TextInput>(null);

  // ── R15-6: Auto-cancel armed row on network drop ──────────────────────────
  useEffect(() => {
    if (offline && armedRowId) {
      setArmedRowId(null);
    }
  }, [offline, armedRowId]);

  // ── Auto-cancel armed row after 4s (R10-4) ───────────────────────────────
  useEffect(() => {
    if (!armedRowId) return;
    const timer = setTimeout(() => {
      fire('light');
      setArmedRowId(null);
    }, ARM_AUTO_CANCEL_MS);
    return () => clearTimeout(timer);
  }, [armedRowId, fire]);

  // ── Sheet entrance animation (280ms spring) ───────────────────────────────
  const translateY = useSharedValue(60);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (open) {
      opacity.value = withTiming(1, { duration: durations.sheetUp });
      translateY.value = withSpring(0, springs.spring);
    } else {
      opacity.value = withTiming(0, { duration: durations.stepPush, easing: easings.easeStd });
      translateY.value = withTiming(60, { duration: durations.stepPush, easing: easings.easeStd });
    }
  }, [open, opacity, translateY]);

  const sheetAStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  // ── R15-4: Header collapse animation ─────────────────────────────────────
  const titleOpacity = useSharedValue(1);
  const titleTranslateY = useSharedValue(0);
  const searchBarOpacity = useSharedValue(0);

  function enterSearch() {
    fire('light');
    setSearchActive(true);
    titleOpacity.value = withTiming(0, { duration: HEADER_ANIM_MS, easing: easings.easeStd });
    titleTranslateY.value = withTiming(-8, { duration: HEADER_ANIM_MS, easing: easings.easeStd });
    searchBarOpacity.value = withTiming(1, { duration: HEADER_ANIM_MS, easing: easings.easeStd });
    // Auto-focus happens via ref after state update
    setTimeout(() => searchInputRef.current?.focus(), HEADER_ANIM_MS);
  }

  function exitSearch() {
    fire('light');
    setSearchActive(false);
    setSearchQuery('');
    titleOpacity.value = withTiming(1, { duration: HEADER_ANIM_MS, easing: easings.easeStd });
    titleTranslateY.value = withTiming(0, { duration: HEADER_ANIM_MS, easing: easings.easeStd });
    searchBarOpacity.value = withTiming(0, { duration: HEADER_ANIM_MS, easing: easings.easeStd });
  }

  const titleAStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: titleTranslateY.value }],
    pointerEvents: titleOpacity.value < 0.5 ? 'none' : 'auto',
  }));

  const searchBarAStyle = useAnimatedStyle(() => ({
    opacity: searchBarOpacity.value,
    pointerEvents: searchBarOpacity.value > 0.5 ? 'auto' : 'none',
  }));

  const dismiss = useCallback(() => {
    fire('light');
    onClose();
  }, [fire, onClose]);

  // ── R15-2: Friend resolution ──────────────────────────────────────────────
  const friendMemberSet = useMemo<Set<string>>(() => {
    const ids = new Set<string>();
    for (const ft of friendTypes) {
      for (const id of ft.members) ids.add(id);
    }
    return ids;
  }, [friendTypes]);

  function getFriendTypeName(userId: string): string | null {
    const ft = friendTypes.find((t) => t.members.includes(userId));
    return ft?.label ?? null;
  }

  // ── Filter pipeline ──────────────────────────────────────────────────────
  const typeGroupMembers = useMemo<Set<string> | null>(() => {
    if (typeGroupFilter === 'all') return null;
    const ft = friendTypes.find((t) => t.id === typeGroupFilter);
    if (ft) return new Set(ft.members);
    const g = groups.find((gr) => gr.id === typeGroupFilter);
    if (g) return new Set(g.members.map((m) => m.id));
    return new Set();
  }, [typeGroupFilter, friendTypes, groups]);

  // Chip filter only (no search) — used for grouped view.
  const chipFiltered = useMemo<AttendeeRowData[]>(() => {
    const targetRsvp: RSVPStatus | 'all' =
      rsvpFilter === 'all' ? 'all' : rsvpFilter === 'none' ? null : (rsvpFilter as Exclude<RSVPStatus, null>);
    return attendees.filter((a) => {
      if (targetRsvp !== 'all' && a.rsvpStatus !== targetRsvp) return false;
      if (typeGroupMembers && !typeGroupMembers.has(a.id)) return false;
      return true;
    });
  }, [attendees, rsvpFilter, typeGroupMembers]);

  // Search filter (composes with chip filter) — used for flat search view.
  const searchFiltered = useMemo<AttendeeRowData[]>(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return chipFiltered;
    return chipFiltered.filter((a) => `${a.name} ${a.handle}`.toLowerCase().includes(q));
  }, [chipFiltered, searchQuery]);

  // ── R15-3: Build FlatList sections ───────────────────────────────────────
  const listItems = useMemo<ListItem[]>(() => {
    if (searchActive && searchQuery.trim().length > 0) {
      // Flat alphabetical list during active search (R15-4).
      const sorted = [...searchFiltered].sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
      );
      return sorted.map((a) => ({
        type: 'row' as const,
        id: `search-${a.id}`,
        attendee: a,
        section: 'search',
        isHostSection: false,
      }));
    }

    const items: ListItem[] = [];
    const hostId = event.hostId;
    const coHostIds = new Set(event.coHostIds);

    // HOSTS section — only if at least one host/co-host is in chipFiltered.
    const hostsInFilter = chipFiltered.filter(
      (a) => a.id === hostId || coHostIds.has(a.id),
    );

    if (hostsInFilter.length > 0) {
      items.push({ type: 'section-header', id: 'header-HOSTS', label: 'HOSTS' });
      // Host first, then co-hosts alphabetical.
      const hostRow = hostsInFilter.find((a) => a.id === hostId);
      const coHostRows = hostsInFilter
        .filter((a) => a.id !== hostId)
        .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
      const orderedHosts = hostRow ? [hostRow, ...coHostRows] : coHostRows;
      for (const a of orderedHosts) {
        items.push({ type: 'row', id: `HOSTS-${a.id}`, attendee: a, section: 'HOSTS', isHostSection: true });
      }
    }

    // RSVP sections — in fixed order, empty sections omitted.
    for (const { key, label } of RSVP_SECTION_ORDER) {
      const targetRsvp: RSVPStatus | null =
        key === 'none' ? null : (key as Exclude<RSVPStatus, null>);
      const sectionRows = chipFiltered.filter((a) => a.rsvpStatus === targetRsvp);
      if (sectionRows.length === 0) continue;
      items.push({
        type: 'section-header',
        id: `header-${label}`,
        label: `${label} (${sectionRows.length})`,
      });
      for (const a of sectionRows) {
        items.push({ type: 'row', id: `${label}-${a.id}`, attendee: a, section: label, isHostSection: false });
      }
    }

    return items;
  }, [searchActive, searchQuery, searchFiltered, chipFiltered, event.hostId, event.coHostIds]);

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

  // ── Per-row handlers ──────────────────────────────────────────────────────
  const handleArm = useCallback((id: string) => { setArmedRowId(id); }, []);
  const handleCommit = useCallback((id: string) => { onRemove(id); setArmedRowId(null); }, [onRemove]);
  const handleCancel = useCallback(() => { setArmedRowId(null); }, []);

  // ── QuickProfileSheet target ──────────────────────────────────────────────
  const quickTarget = useMemo<AttendeeRowData | null>(
    () => attendees.find((a) => a.id === quickProfileTargetId) ?? null,
    [attendees, quickProfileTargetId],
  );

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<ListItem>) => {
      if (item.type === 'section-header') {
        return (
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionLabel, { color: T.ink3, fontFamily: fonts.mono }]}>
              {item.label}
            </Text>
          </View>
        );
      }
      const { attendee, isHostSection } = item;
      const isOwnRow = attendee.id === currentUserId;
      const isEventHost = attendee.id === event.hostId;
      return (
        <AttendeeRow
          T={T}
          attendee={attendee}
          viewerRole={viewerRole}
          isOwnRow={isOwnRow}
          isHost={isEventHost}
          armed={armedRowId === attendee.id && !isHostSection}
          onArm={() => handleArm(attendee.id)}
          onCommit={() => handleCommit(attendee.id)}
          onCancel={handleCancel}
          onMakeCoHost={() => onMakeCoHost(attendee.id)}
          onRemoveCoHost={() => onRemoveCoHost(attendee.id)}
          onPress={() => {
            if (!isOwnRow) setQuickProfileTargetId(attendee.id);
          }}
        />
      );
    },
    [
      T, viewerRole, currentUserId, event.hostId, armedRowId,
      handleArm, handleCommit, handleCancel, onMakeCoHost, onRemoveCoHost,
    ],
  );

  if (!open) return null;

  const showInviteMore = (viewerRole === 'host' || viewerRole === 'co-host') && !offline;
  const showRow2 = viewerRole === 'host' && typeGroupChips.length > 0;
  const isSearchWithQuery = searchActive && searchQuery.trim().length > 0;
  const empty = listItems.length === 0;

  // ── QuickProfileSheet derived data ───────────────────────────────────────
  const isFriend = quickTarget ? friendMemberSet.has(quickTarget.id) : false;
  const friendTypeName = quickTarget ? getFriendTypeName(quickTarget.id) : null;

  // Format last-sync sub-line.
  const syncedAgo = lastSyncedAt
    ? `SYNCED ${formatSyncedAgo(lastSyncedAt)} AGO`
    : null;

  return (
    <Modal transparent visible animationType="none" onRequestClose={dismiss}>
      <Pressable
        style={styles.backdrop}
        accessibilityRole="none"
        accessibilityLabel="Dismiss sheet"
        onPress={dismiss}
      >
        <Animated.View
          style={[
            styles.sheet,
            { backgroundColor: T.bgElevated, maxHeight: `${SHEET_MAX_HEIGHT_PCT * 100}%` },
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

            {/* Header (R15-4: title vs search bar toggle) */}
            <View style={styles.header}>
              {/* Title block — animated out when search active */}
              <Animated.View style={[styles.titleBlock, titleAStyle]}>
                <Text style={[typography.h3, { color: T.ink }]}>Attendees</Text>
                <Text style={[styles.headerSub, { color: T.ink3 }]}>
                  {attendees.length} invited
                </Text>
              </Animated.View>

              {/* Search input bar — animated in when search active */}
              <Animated.View style={[styles.searchBarWrap, searchBarAStyle]}>
                <View style={[styles.searchPill, { backgroundColor: T.bgSunken, borderColor: T.hair }]}>
                  <TextInput
                    ref={searchInputRef}
                    accessibilityLabel="Search attendees"
                    placeholder="Search attendees…"
                    placeholderTextColor={T.ink3}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    style={[styles.searchInput, typography.body, { color: T.ink }]}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  {searchQuery.length > 0 ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Clear search"
                      hitSlop={8}
                      onPress={() => { fire('light'); setSearchQuery(''); }}
                    >
                      <Ionicons name="close-circle" size={18} color={T.ink3} />
                    </Pressable>
                  ) : null}
                </View>
              </Animated.View>

              {/* Trailing cluster */}
              <View style={styles.headerActions}>
                {/* Magnifier OR Cancel (R15-4) */}
                {searchActive ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Cancel search"
                    hitSlop={8}
                    onPress={exitSearch}
                  >
                    <Text style={[styles.cancelLabel, { color: T.accent }]}>Cancel</Text>
                  </Pressable>
                ) : (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Search attendees"
                    hitSlop={8}
                    onPress={enterSearch}
                    style={styles.iconBtn}
                  >
                    <Ionicons name="search" size={20} color={T.ink3} />
                  </Pressable>
                )}
                {/* Invite more — HOST + CO-HOST views, hidden in search mode */}
                {showInviteMore && !searchActive ? (
                  <PillBtn
                    T={T}
                    label="Invite more"
                    variant="primary"
                    size="sm"
                    onPress={() => { fire('medium'); onInviteMore(); }}
                  />
                ) : null}
                {/* Close X always visible */}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Close attendees sheet"
                  hitSlop={8}
                  onPress={dismiss}
                  style={styles.iconBtn}
                >
                  <Ionicons name="close" size={20} color={T.ink3} />
                </Pressable>
              </View>
            </View>

            {/* R15-6: Offline bar between header and chips */}
            <OfflineBar T={T} visible={offline} />
            {offline && syncedAgo ? (
              <Text style={[styles.syncedLine, { color: T.ink3, fontFamily: fonts.mono }]}>
                {syncedAgo}
              </Text>
            ) : null}

            {/* Filter Row 1 — RSVP (all roles, sticky per R15-5) */}
            <View style={styles.filterRow}>
              <FilterChipRow
                T={T}
                chips={RSVP_CHIPS}
                selected={rsvpFilter}
                onChange={(next) => { fire('light'); setRsvpFilter(next as RsvpFilter); }}
              />
            </View>

            {/* Filter Row 2 — type/group (host only, sticky per R15-5) */}
            {showRow2 ? (
              <View style={styles.filterRow}>
                <FilterChipRow
                  T={T}
                  chips={typeGroupChips}
                  selected={typeGroupFilter}
                  onChange={(next) => { fire('light'); setTypeGroupFilter(next); }}
                />
              </View>
            ) : null}

            {/* List body */}
            {empty ? (
              <View style={styles.emptyWrap}>
                {!isSearchWithQuery && viewerRole === 'host' ? (
                  <EmptyAttendees T={T} onAddInvitees={onInviteMore} />
                ) : (
                  <View style={styles.noMatchWrap}>
                    <Text style={[styles.noMatchTitle, { color: T.ink }]}>No one matches.</Text>
                    <Text style={[styles.noMatchSub, { color: T.ink2 }]}>Try a different filter.</Text>
                  </View>
                )}
              </View>
            ) : (
              <FlatList
                data={listItems}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.listContent}
                initialNumToRender={12}
              />
            )}
          </Pressable>
        </Animated.View>
      </Pressable>

      {/* R15-1: QuickProfileSheet stacked above AttendeesSheet */}
      {quickTarget ? (
        <QuickProfileSheet
          T={T}
          open={quickProfileTargetId !== null}
          person={{
            id: quickTarget.id,
            name: quickTarget.name,
            handle: quickTarget.handle,
            letter: quickTarget.letter,
            availState: quickTarget.availState ?? null,
          }}
          mutualFriends={[]}
          stats={null}
          friendRequestStatus="none"
          isFriend={isFriend}
          friendTypeName={friendTypeName}
          onAddFriend={() => {}}
          onAccept={() => {}}
          onDecline={() => {}}
          onClose={() => setQuickProfileTargetId(null)}
        />
      ) : null}
    </Modal>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatSyncedAgo(isoString: string): string {
  const diffMs = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return 'JUST NOW';
  if (mins === 1) return '1 MIN';
  if (mins < 60) return `${mins} MINS`;
  const hrs = Math.floor(mins / 60);
  if (hrs === 1) return '1 HR';
  return `${hrs} HRS`;
}

// ── Styles ────────────────────────────────────────────────────────────────────

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
    gap: spacing.sm,
    minHeight: 52,
  },
  titleBlock: {
    flex: 1,
    gap: 2,
  },
  headerSub: {
    fontSize: 12,
    fontWeight: '500',
  },
  searchBarWrap: {
    flex: 1,
    position: 'absolute',
    left: spacing.lg,
    right: 0,
  },
  searchPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radii.input,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 0,
    fontSize: 15,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelLabel: {
    fontSize: 13,
    fontWeight: '500',
    paddingHorizontal: spacing.sm,
  },
  syncedLine: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
    paddingHorizontal: spacing.lg,
    paddingVertical: 4,
  },
  filterRow: {
    paddingVertical: spacing.xs,
  },
  sectionHeader: {
    paddingTop: 12,
    paddingBottom: 6,
    paddingHorizontal: spacing.md,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1.6,
  },
  listContent: {
    paddingBottom: spacing['4xl'],
  },
  emptyWrap: {
    paddingVertical: spacing['4xl'],
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
  },
  noMatchWrap: {
    alignItems: 'center',
    paddingTop: spacing.xl,
  },
  noMatchTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  noMatchSub: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 4,
  },
});
