/**
 * SearchOverlay — full-screen search surface (R8-1 through R8-7).
 *
 * Mounted at the root level (sibling to the tab tree). Triggered by the
 * search icon in FlowHeader on Home / Friends / Groups screens via
 * useSearch().openSearch(). NOT a tab, NOT a route — a transient overlay.
 *
 * Section order is LOCKED: FRIENDS → PEOPLE → GROUPS → EVENTS (R8-2).
 * Empty sections are omitted entirely. Zero-result query renders
 * EmptySearch as a full replacement (R8-5).
 *
 * Friend / group / event results are filtered client-side against the live
 * React Query caches (useFriends / useGroups / useEvents). The PEOPLE section
 * (non-friend discovery) is still a local fixture until a /search endpoint
 * lands.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
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
import { Overline } from '../foundation/Overline';
import { PillBtn } from '../foundation/PillBtn';
import { Spinner } from '../polish/Spinner';
import { EmptySearch } from '../emptyStates/EmptySearch';
import { useEvents, useFriends, useGroups } from '../../api';
import type {
  Event,
  Friend,
  RSVPStatus,
  SocialGroup,
} from '../../../../TYPES';

import { FriendResultRow } from './FriendResultRow';
import { PeopleResultRow, type PeopleResultPerson } from './PeopleResultRow';
import { GroupResultRow } from './GroupResultRow';
import { EventResultRow } from './EventResultRow';
import { RecentRow } from './RecentRow';
import {
  QuickProfileSheet,
  type QuickProfilePerson,
  type QuickProfileMutualFriend,
  type QuickProfileStats,
} from './QuickProfileSheet';

type Theme = typeof colors.light;

export interface SearchOverlayProps {
  T?: Theme;
  open: boolean;
  onClose: () => void;
  onNavigateToFriendProfile: (friendId: string) => void;
  onNavigateToGroupDetail: (groupId: string) => void;
  onNavigateToEventDetail: (eventId: string) => void;
}

const DEBOUNCE_MS = 220;
const MAX_RECENTS = 7;
const SIMULATED_QUERY_LATENCY_MS = 120;

interface SearchResults {
  friends: Friend[];
  people: PeopleResultPerson[];
  groups: SocialGroup[];
  events: Event[];
}

const EMPTY_RESULTS: SearchResults = {
  friends: [],
  people: [],
  groups: [],
  events: [],
};

// ── Mock "people" universe — non-friends discoverable via Search. ────────────
// Real API integration is deferred — when the live endpoint lands, swap the
// `runSearch` helper to call it. The shape returned here matches what the
// real /search route should produce. R8-3 row content drives the field set.
const MOCK_PEOPLE: Array<PeopleResultPerson & { mutualCount: number }> = [
  { id: 'p-100', name: 'Tomás Vera',   handle: '@tomas',  letter: 'T', mutualCount: 3 },
  { id: 'p-101', name: 'Iris Park',    handle: '@iris',   letter: 'I', mutualCount: 1 },
  { id: 'p-102', name: 'Naomi Sato',   handle: '@naomi',  letter: 'N', mutualCount: 0 },
  { id: 'p-103', name: 'Dev Patel',    handle: '@devp',   letter: 'D', mutualCount: 2 },
];

const PEOPLE_MUTUAL_LOOKUP = new Map<string, number>(
  MOCK_PEOPLE.map((p) => [p.id, p.mutualCount]),
);

function matchesQuery(haystack: string, q: string): boolean {
  return haystack.toLowerCase().includes(q.toLowerCase());
}

function runSearch(
  query: string,
  allFriends: Friend[],
  allGroups: SocialGroup[],
  allEvents: Event[],
): SearchResults {
  const q = query.trim();
  if (q.length === 0) return EMPTY_RESULTS;

  const friends = allFriends.filter(
    (f) => matchesQuery(f.name, q) || matchesQuery(f.handle, q),
  );
  const people: PeopleResultPerson[] = MOCK_PEOPLE.filter(
    (p) => matchesQuery(p.name, q) || matchesQuery(p.handle, q),
  );
  const groups = allGroups.filter((g) => matchesQuery(g.name, q));
  const events = allEvents.filter((e) => matchesQuery(e.title, q));

  return { friends, people, groups, events };
}

export function SearchOverlay({
  T = colors.light,
  open,
  onClose,
  onNavigateToFriendProfile,
  onNavigateToGroupDetail,
  onNavigateToEventDetail,
}: SearchOverlayProps): React.JSX.Element | null {
  const fire = useHaptic();
  const inputRef = useRef<TextInput | null>(null);

  // ── Live data (React Query caches) ─────────────────────────────────────────
  // Search filters these client-side. Held in a ref so the debounced query
  // effect reads the latest data without re-subscribing on every cache update.
  const { data: friends = [] } = useFriends();
  const { data: groups = [] } = useGroups();
  const { data: events = [] } = useEvents();
  const searchDataRef = useRef({ friends, groups, events });
  searchDataRef.current = { friends, groups, events };

  // ── Local state ──────────────────────────────────────────────────────────
  const [query, setQuery] = useState('');
  const [recents, setRecents] = useState<string[]>([]);
  const [results, setResults] = useState<SearchResults>(EMPTY_RESULTS);
  const [loading, setLoading] = useState(false);
  const [friendRequestStates, setFriendRequestStates] = useState<
    Record<string, 'none' | 'sent'>
  >({});
  const [quickProfileOpen, setQuickProfileOpen] = useState(false);
  const [quickProfilePerson, setQuickProfilePerson] = useState<QuickProfilePerson | null>(null);

  const emptyHapticFiredRef = useRef(false);

  // ── Overlay animation ────────────────────────────────────────────────────
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

  const overlayAStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  // Reset input + query state when the overlay opens. Recents persist
  // for the lifetime of the parent (in-memory only).
  useEffect(() => {
    if (open) {
      setQuery('');
      setResults(EMPTY_RESULTS);
      emptyHapticFiredRef.current = false;
      // Auto-focus once the animation begins so the keyboard appears.
      const t = setTimeout(() => inputRef.current?.focus(), 60);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [open]);

  // ── Debounced query ──────────────────────────────────────────────────────
  useEffect(() => {
    const q = query.trim();
    if (q.length === 0) {
      setLoading(false);
      setResults(EMPTY_RESULTS);
      emptyHapticFiredRef.current = false;
      return;
    }
    setLoading(true);
    const debounce = setTimeout(() => {
      // Simulate a tiny latency so the spinner is visible.
      const latency = setTimeout(() => {
        const { friends: fr, groups: gr, events: ev } = searchDataRef.current;
        const next = runSearch(q, fr, gr, ev);
        setResults(next);
        setLoading(false);
        const isFullyEmpty =
          next.friends.length === 0 &&
          next.people.length === 0 &&
          next.groups.length === 0 &&
          next.events.length === 0;
        if (isFullyEmpty && !emptyHapticFiredRef.current) {
          fire('light');
          emptyHapticFiredRef.current = true;
        } else if (!isFullyEmpty) {
          emptyHapticFiredRef.current = false;
        }
      }, SIMULATED_QUERY_LATENCY_MS);
      return () => clearTimeout(latency);
    }, DEBOUNCE_MS);
    return () => clearTimeout(debounce);
  }, [query, fire]);

  // ── Recents helpers ──────────────────────────────────────────────────────
  const pushRecent = useCallback((term: string) => {
    const trimmed = term.trim();
    if (trimmed.length === 0) return;
    setRecents((prev) => {
      const filtered = prev.filter((t) => t.toLowerCase() !== trimmed.toLowerCase());
      return [trimmed, ...filtered].slice(0, MAX_RECENTS);
    });
  }, []);

  function removeRecent(term: string) {
    setRecents((prev) => prev.filter((t) => t !== term));
  }

  function clearAllRecents() {
    fire('warning');
    setRecents([]);
  }

  function selectRecent(term: string) {
    setQuery(term);
    inputRef.current?.focus();
  }

  function clearInput() {
    fire('light');
    setQuery('');
    inputRef.current?.focus();
  }

  // ── Result handlers ──────────────────────────────────────────────────────
  function handleFriendPress(friend: Friend) {
    pushRecent(query);
    onNavigateToFriendProfile(friend.id);
  }

  function handleGroupPress(group: SocialGroup) {
    pushRecent(query);
    onNavigateToGroupDetail(group.id);
  }

  function handleEventPress(event: Event) {
    pushRecent(query);
    onNavigateToEventDetail(event.id);
  }

  function handlePeopleAdd(personId: string) {
    setFriendRequestStates((prev) => ({ ...prev, [personId]: 'sent' }));
  }

  function handlePeopleRowBodyPress(person: PeopleResultPerson) {
    setQuickProfilePerson({
      id: person.id,
      name: person.name,
      handle: person.handle,
      letter: person.letter,
      photoUrl: person.photoUrl ?? null,
    });
    setQuickProfileOpen(true);
  }

  // QuickProfile mutual-friend preview — derived from the live friends cache.
  const quickProfileMutuals: QuickProfileMutualFriend[] = useMemo(() => {
    if (!quickProfilePerson) return [];
    const count = PEOPLE_MUTUAL_LOOKUP.get(quickProfilePerson.id) ?? 0;
    return friends.slice(0, count).map((f) => ({
      id: f.id,
      name: f.name,
      letter: f.letter,
      availState: null,
    }));
  }, [quickProfilePerson, friends]);

  const quickProfileStats: QuickProfileStats = { hosted: 4, attended: 11 };

  const friendRequestStatus = quickProfilePerson
    ? (friendRequestStates[quickProfilePerson.id] ?? 'none')
    : 'none';

  function handleQuickProfileAdd() {
    if (!quickProfilePerson) return;
    handlePeopleAdd(quickProfilePerson.id);
  }

  // ── Visible flags ────────────────────────────────────────────────────────
  if (!open) return null;

  const queryTrimmed = query.trim();
  const hasQuery = queryTrimmed.length > 0;
  const totalResults =
    results.friends.length +
    results.people.length +
    results.groups.length +
    results.events.length;
  const isFullyEmpty = hasQuery && !loading && totalResults === 0;

  function rsvpForEvent(event: Event): RSVPStatus {
    return event.rsvps['me'] ?? null;
  }

  return (
    <Animated.View
      pointerEvents="auto"
      accessibilityViewIsModal
      style={[
        styles.root,
        { backgroundColor: T.bg },
        overlayAStyle,
      ]}
    >
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Cancel search"
            hitSlop={8}
            onPress={() => {
              fire('light');
              onClose();
            }}
            style={styles.cancelBtn}
          >
            <Text style={[styles.cancelLabel, { color: T.ink2 }]}>Cancel</Text>
          </Pressable>
        </View>

        {/* Search input pill (R8-6 — locked, no filter chips / scope pickers / voice) */}
        <View style={styles.inputWrap}>
          <View style={[styles.inputPill, { backgroundColor: T.bgSunken }]}>
            <Ionicons name="search" size={16} color={T.ink3} />
            <TextInput
              ref={(ref) => {
                inputRef.current = ref;
              }}
              accessibilityLabel="Search friends, groups, events"
              value={query}
              onChangeText={setQuery}
              placeholder="Search friends, groups, events…"
              placeholderTextColor={T.ink3}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
              style={[styles.input, typography.body, { color: T.ink }]}
            />
            {query.length > 0 ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Clear search"
                hitSlop={8}
                onPress={clearInput}
              >
                <Ionicons name="close-circle" size={18} color={T.ink3} />
              </Pressable>
            ) : null}
          </View>
        </View>

        {/* Body */}
        <ScrollView
          style={styles.body}
          contentContainerStyle={styles.bodyContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {!hasQuery ? (
            <DefaultState
              T={T}
              recents={recents}
              onSelectRecent={selectRecent}
              onRemoveRecent={removeRecent}
              onClearAll={clearAllRecents}
            />
          ) : isFullyEmpty ? (
            <View style={styles.emptyWrap}>
              <EmptySearch T={T} />
            </View>
          ) : (
            <ResultsState
              T={T}
              results={results}
              loading={loading}
              friendRequestStates={friendRequestStates}
              onPressFriend={handleFriendPress}
              onPressGroup={handleGroupPress}
              onPressEvent={handleEventPress}
              onPressPeopleAdd={handlePeopleAdd}
              onPressPeopleBody={handlePeopleRowBodyPress}
              rsvpForEvent={rsvpForEvent}
            />
          )}
        </ScrollView>
      </SafeAreaView>

      {/* QuickProfileSheet stacks on top of this overlay (R12-5). */}
      <QuickProfileSheet
        T={T}
        open={quickProfileOpen}
        person={quickProfilePerson}
        mutualFriends={quickProfileMutuals}
        stats={quickProfileStats}
        friendRequestStatus={friendRequestStatus}
        onAddFriend={handleQuickProfileAdd}
        onAccept={() => {}}
        onDecline={() => {}}
        onClose={() => setQuickProfileOpen(false)}
      />
    </Animated.View>
  );
}

// ── Default state — recents + handle hint (R8-4) ─────────────────────────────

interface DefaultStateProps {
  T: Theme;
  recents: string[];
  onSelectRecent: (term: string) => void;
  onRemoveRecent: (term: string) => void;
  onClearAll: () => void;
}

function DefaultState({
  T,
  recents,
  onSelectRecent,
  onRemoveRecent,
  onClearAll,
}: DefaultStateProps): React.JSX.Element {
  return (
    <View style={styles.defaultStack}>
      {recents.length > 0 ? (
        <View>
          <View style={styles.recentHeader}>
            <Overline T={T} color="ink3">RECENT</Overline>
            <PillBtn
              T={T}
              label="Clear all"
              variant="ghost"
              size="sm"
              onPress={onClearAll}
            />
          </View>
          {recents.map((term) => (
            <RecentRow
              key={term}
              T={T}
              term={term}
              onSelect={onSelectRecent}
              onRemove={onRemoveRecent}
            />
          ))}
        </View>
      ) : null}
      <Text style={[styles.handleHint, { color: T.ink3 }]}>
        Find anyone by{' '}
        <Text style={[styles.handleMono, { color: T.ink3, fontFamily: fonts.mono }]}>
          @handle
        </Text>
      </Text>
    </View>
  );
}

// ── Results state — locked section order (R8-2) ──────────────────────────────

interface ResultsStateProps {
  T: Theme;
  results: SearchResults;
  loading: boolean;
  friendRequestStates: Record<string, 'none' | 'sent'>;
  onPressFriend: (f: Friend) => void;
  onPressGroup: (g: SocialGroup) => void;
  onPressEvent: (e: Event) => void;
  onPressPeopleAdd: (personId: string) => void;
  onPressPeopleBody: (person: PeopleResultPerson) => void;
  rsvpForEvent: (event: Event) => RSVPStatus;
}

function ResultsState({
  T,
  results,
  loading,
  friendRequestStates,
  onPressFriend,
  onPressGroup,
  onPressEvent,
  onPressPeopleAdd,
  onPressPeopleBody,
  rsvpForEvent,
}: ResultsStateProps): React.JSX.Element {
  return (
    <View>
      {loading ? (
        <View style={styles.spinnerWrap}>
          <Spinner T={T} size="SM" />
        </View>
      ) : null}

      {results.friends.length > 0 ? (
        <View style={styles.section}>
          <SectionHeader T={T} label="FRIENDS" count={results.friends.length} />
          {results.friends.map((f) => (
            <FriendResultRow
              key={f.id}
              T={T}
              friend={f}
              availState={null}
              onPress={() => onPressFriend(f)}
            />
          ))}
        </View>
      ) : null}

      {results.people.length > 0 ? (
        <View style={styles.section}>
          <SectionHeader T={T} label="PEOPLE" count={results.people.length} />
          {results.people.map((p) => {
            const mutualCount = PEOPLE_MUTUAL_LOOKUP.get(p.id) ?? 0;
            const status = friendRequestStates[p.id] ?? 'none';
            return (
              <PeopleResultRow
                key={p.id}
                T={T}
                person={p}
                mutualCount={mutualCount}
                friendRequestStatus={status}
                onAdd={() => onPressPeopleAdd(p.id)}
                onRowBodyPress={() => onPressPeopleBody(p)}
              />
            );
          })}
        </View>
      ) : null}

      {results.groups.length > 0 ? (
        <View style={styles.section}>
          <SectionHeader T={T} label="GROUPS" count={results.groups.length} />
          {results.groups.map((g) => (
            <GroupResultRow
              key={g.id}
              T={T}
              group={g}
              onPress={() => onPressGroup(g)}
            />
          ))}
        </View>
      ) : null}

      {results.events.length > 0 ? (
        <View style={styles.section}>
          <SectionHeader T={T} label="EVENTS" count={results.events.length} />
          {results.events.map((e) => (
            <EventResultRow
              key={e.id}
              T={T}
              event={e}
              rsvpStatus={rsvpForEvent(e)}
              onPress={() => onPressEvent(e)}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

interface SectionHeaderProps {
  T: Theme;
  label: string;
  count: number;
}

function SectionHeader({ T, label, count }: SectionHeaderProps): React.JSX.Element {
  return (
    <View style={styles.sectionHeader}>
      <Overline T={T} color="ink3">{label}</Overline>
      <View style={[styles.countChip, { backgroundColor: T.bgSunken }]}>
        <Text style={[styles.countChipText, { color: T.ink3, fontFamily: fonts.mono }]}>
          {count}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 100,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
  },
  cancelBtn: {
    minHeight: 44,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelLabel: {
    ...typography.bodyMed,
    fontSize: 15,
    fontWeight: '600',
  },
  inputWrap: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  inputPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    height: 44,
    borderRadius: radii.input,
    paddingHorizontal: spacing.md,
  },
  input: {
    flex: 1,
    paddingVertical: 0,
    fontSize: 15,
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    paddingBottom: spacing['4xl'],
  },
  defaultStack: {
    gap: spacing.lg,
    paddingTop: spacing.md,
  },
  recentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  handleHint: {
    fontSize: 13,
    fontWeight: '500',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  handleMono: {
    fontSize: 13,
    fontWeight: '500',
  },
  spinnerWrap: {
    alignItems: 'flex-end',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  section: {
    paddingTop: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
  },
  countChip: {
    minWidth: 22,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countChipText: {
    fontSize: 9,
    fontWeight: '600',
  },
  emptyWrap: {
    paddingTop: spacing['3xl'],
    alignItems: 'center',
  },
});
