/**
 * FriendFindMatchesScreen — R15-10 matches list (contacts-granted path).
 *
 * Shows contacts who are already on SyncUp. "Add" pill → friend request.
 * Row body tap is a NO-OP (QuickProfileSheet is not opened during onboarding).
 * "Continue" is always enabled — adding zero matches is permitted.
 * Zero-matches: inline empty state; "Continue" still visible.
 */

import React, { useState } from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { PillBtn } from '../../components/foundation/PillBtn';
import { RingAvatar } from '../../components/foundation/RingAvatar';
import { ErrorToast, TOAST_POSITION_DEFAULTS } from '../../components/polish/ErrorToast';
import { Spinner } from '../../components/polish/Spinner';
import { colors, radii, spacing, typography, useHaptic } from '../../theme';
import { useContactsMatches } from './onboarding/useContactsMatches';
import { useSendFriendRequestFromMatches } from '../../api/onboarding';
import type { ContactsMatch } from '../../api/onboarding';
import type { FriendFindMatchesScreenProps } from '../../navigation/types';

export default function FriendFindMatchesScreen({
  navigation,
}: FriendFindMatchesScreenProps): React.JSX.Element {
  const T = colors.light;
  const fire = useHaptic();
  const { data: matches = [], isLoading } = useContactsMatches();
  const mutation = useSendFriendRequestFromMatches();
  const [sentIds, setSentIds] = useState<Set<string>>(new Set());
  const [errorToastVisible, setErrorToastVisible] = useState(false);
  const [lastFailed, setLastFailed] = useState<ContactsMatch | null>(null);

  // Sort alphabetical, case-insensitive.
  const sorted = [...matches].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
  );

  function onAdd(match: ContactsMatch) {
    fire('success');
    mutation.mutate(match.id, {
      onSuccess: () => setSentIds((prev) => new Set([...prev, match.id])),
      onError: () => {
        // Mirror FriendProfileScreen pattern: capture which row failed so the
        // toast's Retry can re-fire the same mutation. ErrorToast itself fires
        // the H-5 error haptic, so we don't fire one here.
        setLastFailed(match);
        setErrorToastVisible(true);
      },
    });
  }

  function onRetryAdd() {
    setErrorToastVisible(false);
    if (lastFailed) onAdd(lastFailed);
  }

  function onContinue() {
    fire('light');
    navigation.replace('YoureIn');
  }

  return (
    <SafeAreaView edges={['top', 'bottom']} style={[styles.root, { backgroundColor: T.bg }]}>
      <Text style={[typography.h2, styles.heading, { color: T.ink }]}>
        Friends already on SyncUp.
      </Text>
      {matches.length > 0 && (
        <Text style={[styles.sub, { color: T.ink3 }]}>
          {`${matches.length} of your contacts.`}
        </Text>
      )}

      {isLoading ? (
        <View style={styles.loadingWrap}>
          <Spinner size="MD" />
        </View>
      ) : sorted.length === 0 ? (
        <ZeroMatchesEmpty T={T} />
      ) : (
        <FlatList
          data={sorted}
          keyExtractor={(item) => item.id}
          style={styles.list}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => (
            <View style={[styles.divider, { backgroundColor: T.hair }]} />
          )}
          renderItem={({ item }) => (
            <MatchRow
              T={T}
              match={item}
              sent={sentIds.has(item.id)}
              onAdd={onAdd}
            />
          )}
        />
      )}

      <View style={styles.ctas}>
        <PillBtn T={T} label="Continue" variant="primary" size="lg" onPress={onContinue} />
      </View>

      {/* Friend-request mutation failure (R15-10). Retry re-fires the same
          add against the last failed row. Local UI state only — no Zustand. */}
      <View pointerEvents="box-none" style={TOAST_POSITION_DEFAULTS}>
        <ErrorToast
          T={T}
          kind="friend"
          visible={errorToastVisible}
          onRetry={onRetryAdd}
          onClose={() => setErrorToastVisible(false)}
        />
      </View>
    </SafeAreaView>
  );
}

function MatchRow({
  T,
  match,
  sent,
  onAdd,
}: {
  T: typeof colors.light;
  match: ContactsMatch;
  sent: boolean;
  onAdd: (m: ContactsMatch) => void;
}): React.JSX.Element {
  return (
    <View style={styles.row}>
      <RingAvatar
        size={40}
        status={null}
        letter={match.letter}
        T={T}
      />
      <View style={styles.rowText}>
        <Text style={[styles.rowName, { color: T.ink }]} numberOfLines={1}>
          {match.name}
        </Text>
        <Text style={[styles.rowHandle, { color: T.ink3 }]} numberOfLines={1}>
          {match.handle}
        </Text>
      </View>
      {sent ? (
        <PillBtn
          T={T}
          label="Sent"
          variant="ghost"
          size="sm"
          disabled
        />
      ) : (
        <PillBtn
          T={T}
          label="Add"
          variant="primary"
          size="sm"
          onPress={() => onAdd(match)}
          accessibilityLabel={`Send friend request to ${match.name}`}
        />
      )}
    </View>
  );
}

function ZeroMatchesEmpty({ T }: { T: typeof colors.light }): React.JSX.Element {
  return (
    <View style={styles.emptyWrap}>
      <View style={[styles.emptyIcon, { backgroundColor: T.bgSunken, borderRadius: radii.card }]}>
        <Ionicons name="people-outline" size={24} color={T.ink3} />
      </View>
      <Text
        style={[styles.emptyTitle, { color: T.ink }]}
        accessibilityRole="header"
      >
        No one yet.
      </Text>
      <Text style={[styles.emptyBody, { color: T.ink2 }]}>
        Friends will show up here once they join SyncUp.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  heading: {
    marginHorizontal: spacing.md,
    marginTop: spacing.xl,
  },
  sub: {
    fontSize: 13,
    fontWeight: '500',
    marginHorizontal: spacing.md,
    marginTop: 4,
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: { flex: 1, marginTop: spacing.md },
  listContent: { paddingHorizontal: spacing.md },
  divider: { height: 1 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 64,
    gap: spacing.sm,
  },
  rowText: { flex: 1 },
  rowName: {
    fontSize: 15,
    fontWeight: '600',
  },
  rowHandle: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 96,
    paddingHorizontal: spacing.xl,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: spacing.sm,
  },
  emptyBody: {
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
    maxWidth: 260,
    marginTop: 6,
    lineHeight: 18,
  },
  ctas: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.lg,
  },
});
