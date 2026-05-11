/**
 * Step2Screen — Create Event Flow / Pick a time.
 *
 * SCREENS.md Step 2 layout:
 *  1. FlowHeader title "When?" + back chevron
 *  2. ProgressBar (step 2 of 3)
 *  3. AvailabilitySummaryBar (banded — Hard Rule 1 LOCKED)
 *  4. Day picker / time picker (FormField surfaces in stub phase)
 *  5. Footer "Next" pill — writes draft.eventIso → Step 3 wire-back
 *
 * Edge cases:
 *  - getFriendAvailability('user-3') throws FORBIDDEN → treat as "unknown"
 *  - getFriendAvailability('user-2') returns empty map → "unknown"
 *  - DO NOT show error toast for the FORBIDDEN case (per prompt R3 / edge case)
 *
 * Hard rules: R5-1 (state shows dot + label — handled by AvailabilitySummaryBar),
 * Hard Rule 1 (banded viz LOCKED — same component).
 *
 * Haptics: light on day select; medium on Step 2 → Step 3 advance.
 */
import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQueries } from '@tanstack/react-query';

import {
  AvailabilitySummaryBar,
  ErrorState,
  FlowHeader,
  FormField,
  LoadingOverlay,
  PillBtn,
  ProgressBar,
  type FriendsAvailMap,
} from '../../components';
import { colors, spacing, useHaptic } from '../../theme';
import { ApiError, getFriendAvailability, queryKeys, useApiFetch, useFriends } from '../../api';
import type { Step2ScreenProps } from '../../navigation/types';
import type { AvailState, AvailabilityEntry } from '../../../../TYPES';
import { updateDraft, useDraft } from './draftStore';

export default function Step2Screen({ navigation }: Step2ScreenProps): React.JSX.Element {
  const T = colors.light;
  const fire = useHaptic();
  const draft = useDraft();

  const { data: friends, isLoading: friendsLoading, error: friendsError, refetch } = useFriends();
  const authedFetch = useApiFetch();

  const availQueries = useQueries({
    queries: (friends ?? []).map((f) => ({
      queryKey: queryKeys.availability.friend(f.id),
      queryFn: () => getFriendAvailability(authedFetch, f.id),
      // Don't auto-retry FORBIDDEN — the block is sticky.
      retry: (failureCount: number, err: unknown) => {
        if (err instanceof ApiError && err.code === 'FORBIDDEN') return false;
        return failureCount < 1;
      },
    })),
  });

  /**
   * Build the friend → state map for the chosen iso. FORBIDDEN (Marcus) and
   * empty map (Sasha) both surface as `null` ("unknown"). Per the prompt,
   * blocked users are NOT toast-erroring — graceful "unknown" only.
   */
  const friendsAvail = useMemo<FriendsAvailMap>(() => {
    const map: FriendsAvailMap = {};
    if (!friends || !draft.eventIso) return map;
    friends.forEach((f, idx) => {
      const q = availQueries[idx];
      if (!q || q.isError) {
        map[f.id] = null; // FORBIDDEN or other → treat as unknown
        return;
      }
      const entry = q.data as AvailabilityEntry | undefined;
      const state = entry?.[draft.eventIso!];
      map[f.id] = state ?? null;
    });
    return map;
  }, [friends, availQueries, draft.eventIso]);

  const handleNext = (): void => {
    fire('medium');
    navigation.navigate('Step3');
  };

  const onIsoChange = (iso: string): void => {
    fire('light');
    updateDraft({ eventIso: iso });
  };

  const renderBody = (): React.JSX.Element => {
    if (friendsLoading) {
      return <LoadingOverlay T={T} caption="LOADING ·" />;
    }
    if (friendsError) {
      return (
        <ErrorState T={T} kind="network" onPrimary={() => refetch()} />
      );
    }
    return (
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <FormField
          T={T}
          label="Date (YYYY-MM-DD)"
          value={draft.eventIso ?? ''}
          onChange={onIsoChange}
          placeholder="2026-05-11"
          autoCapitalize="none"
        />
        <FormField
          T={T}
          label="Start time (HH:MM)"
          value={extractTime(draft.startAt)}
          onChange={(time) =>
            updateDraft({ startAt: composeIsoDt(draft.eventIso, time) })
          }
          placeholder="19:30"
          autoCapitalize="none"
        />
        <FormField
          T={T}
          label="End time (HH:MM)"
          value={extractTime(draft.endAt)}
          onChange={(time) =>
            updateDraft({ endAt: composeIsoDt(draft.eventIso, time) })
          }
          placeholder="22:30"
          autoCapitalize="none"
        />

        <View style={styles.summary}>
          <AvailabilitySummaryBar
            T={T}
            draft={draft}
            friendsAvail={friendsAvail}
          />
        </View>
      </ScrollView>
    );
  };

  return (
    <SafeAreaView edges={['top']} style={[styles.root, { backgroundColor: T.bg }]}>
      <FlowHeader T={T} title="When?" onBack={() => navigation.goBack()} />
      <ProgressBar T={T} step={2} />

      <View style={styles.fill}>{renderBody()}</View>

      <View style={[styles.ctaRow, { backgroundColor: T.bgElevated, borderTopColor: T.hair }]}>
        <PillBtn
          T={T}
          label="Next"
          variant="primary"
          size="lg"
          onPress={handleNext}
          disabled={!draft.eventIso}
        />
      </View>
    </SafeAreaView>
  );
}

function extractTime(iso?: string): string {
  if (!iso) return '';
  const m = iso.match(/T(\d{2}):(\d{2})/);
  return m ? `${m[1]}:${m[2]}` : '';
}

function composeIsoDt(dateIso: string | undefined, hhmm: string): string | undefined {
  if (!dateIso || !/^\d{2}:\d{2}$/.test(hhmm)) return undefined;
  return `${dateIso}T${hhmm}:00`;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  fill: { flex: 1 },
  body: {
    padding: spacing.mdl,
    gap: spacing.md,
    paddingBottom: spacing['4xl'],
  },
  summary: {
    marginTop: spacing.md,
  },
  ctaRow: {
    padding: spacing.mdl,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});

// Keep the unused-suppressor calm under strict TS — `AvailState` only flows
// through types here.
void ({} as AvailState);
