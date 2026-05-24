/**
 * GroupsListScreen — All social groups for 'me'.
 *
 * SCREENS.md Groups List layout:
 *  1. FlowHeader title "Groups · {N}"
 *  2. SegmentedSwitcher — All / Mine / Joined
 *  3. StaggerList of group cards: CoverArt + name + member count + PrivateBadge
 *  4. Floating "+" FAB → opens CreateGroup
 *
 * Hard rules: Hard Rule 11 (PrivateBadge sparingly — list rows where the
 * privacy isn't already screen-stated), R5-6 (2-line clamp on group name).
 *
 * Edge cases: long group name → 2-line clamp; group of 1 still appears.
 *
 * Haptics: tab change → light; card tap → light.
 */
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  CoverArt,
  EmptyGroups,
  ErrorState,
  FlowHeader,
  LoadingOverlay,
  PillBtn,
  PrivateBadge,
  SegmentedSwitcher,
  StaggerList,
} from '../../components';
import { colors, radii, spacing, typography, useHaptic } from '../../theme';
import { useGroups } from '../../api';
import { useIsFirstRun } from '../auth/onboarding/useIsFirstRun';
import type { GroupsListScreenProps } from '../../navigation/types';
import type { SocialGroup } from '../../../../TYPES';

const SEGMENTS = [
  { id: 'all',    label: 'All' },
  { id: 'mine',   label: 'Mine' },
  { id: 'joined', label: 'Joined' },
];

export default function GroupsListScreen({
  navigation,
}: GroupsListScreenProps): React.JSX.Element {
  const T = colors.light;
  const fire = useHaptic();
  const firstRun = useIsFirstRun();
  const [segment, setSegment] = useState<string>('all');

  const { data: groups, isLoading, error, refetch } = useGroups();

  const visibleGroups = useMemo(
    () => filterGroups(groups ?? [], segment),
    [groups, segment]
  );

  if (isLoading) {
    return (
      <SafeAreaView edges={['top']} style={[styles.root, { backgroundColor: T.bg }]}>
        <FlowHeader T={T} title="Groups" />
        <LoadingOverlay T={T} caption="LOADING ·" />
      </SafeAreaView>
    );
  }
  if (error) {
    return (
      <SafeAreaView edges={['top']} style={[styles.root, { backgroundColor: T.bg }]}>
        <FlowHeader T={T} title="Groups" />
        <View style={styles.fill}>
          <ErrorState T={T} kind="network" onPrimary={() => refetch()} />
        </View>
      </SafeAreaView>
    );
  }

  const count = groups?.length ?? 0;

  // TODO (GAP 2): wire SearchOverlay entry via FlowHeader search icon.

  return (
    <SafeAreaView edges={['top']} style={[styles.root, { backgroundColor: T.bg }]}>
      <FlowHeader T={T} title={`Groups · ${count}`} />

      <View style={styles.segRow}>
        <SegmentedSwitcher T={T} options={SEGMENTS} value={segment} onChange={setSegment} />
      </View>

      {visibleGroups.length === 0 ? (
        <ScrollView contentContainerStyle={styles.emptyContent}>
          <EmptyGroups T={T} firstRun={firstRun} onCreate={() => navigation.navigate('CreateGroup')} />
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={styles.listContent}>
          <StaggerList>
            {visibleGroups.map((g) => (
              <Pressable
                key={g.id}
                accessibilityRole="button"
                accessibilityLabel={g.name}
                onPress={() => {
                  fire('light');
                  navigation.navigate('GroupDetail', { groupId: g.id });
                }}
                style={({ pressed }) => [
                  styles.card,
                  {
                    backgroundColor: T.bgElevated,
                    borderColor: T.hair,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <CoverArt T={T} cover={g.cover} size={56} />
                <View style={styles.cardBody}>
                  <Text
                    style={[typography.h3, { color: T.ink }]}
                    numberOfLines={2}
                    ellipsizeMode="tail"
                  >
                    {g.name}
                  </Text>
                  <Text style={[typography.caption, { color: T.ink2 }]}>
                    {`${g.members.length} member${g.members.length === 1 ? '' : 's'}`}
                  </Text>
                </View>
                {g.isPrivate ? <PrivateBadge T={T} /> : null}
              </Pressable>
            ))}
          </StaggerList>
        </ScrollView>
      )}

      <View style={styles.fab}>
        <PillBtn
          T={T}
          label="+ New"
          variant="primary"
          size="md"
          onPress={() => navigation.navigate('CreateGroup')}
        />
      </View>
    </SafeAreaView>
  );
}

function filterGroups(groups: SocialGroup[], segment: string): SocialGroup[] {
  if (segment === 'mine') return groups.filter((g) => g.userRole === 'admin');
  if (segment === 'joined') return groups.filter((g) => g.userRole === 'member');
  return groups;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  fill: { flex: 1 },
  segRow: {
    paddingHorizontal: spacing.mdl,
    paddingVertical: spacing.sm,
  },
  emptyContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  listContent: {
    padding: spacing.mdl,
    gap: spacing.sm,
    paddingBottom: spacing['4xl'] * 2,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.mdl,
    borderRadius: radii.card,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: spacing.sm,
  },
  cardBody: {
    flex: 1,
    minWidth: 0,
    gap: spacing.xs,
  },
  fab: {
    position: 'absolute',
    right: spacing.mdl,
    bottom: spacing.lg,
  },
});
