/**
 * GroupsPane — the Groups segment body of the Friends-tab carousel (R17-1).
 *
 * Extracted from the former GroupsListScreen so the group list renders inside
 * the FriendsList SegmentedSwitcher (Groups is a Friends-tab segment, not a
 * tab). Self-contained data (useGroups) + its own inner All / Mine / Joined
 * switcher; the host owns the FlowHeader and the "+ New" FAB.
 *
 * SCREENS.md Groups List rules preserved: PrivateBadge sparingly (Hard Rule
 * 11), 2-line clamp on group name (R5-6), light haptic on card tap.
 */

import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

// Direct imports (not the barrel) — this component is itself re-exported by
// the barrel, so importing siblings from it would be a circular dependency.
import { CoverArt } from './CoverArt';
import { PrivateBadge } from './PrivateBadge';
import { SegmentedSwitcher } from './SegmentedSwitcher';
import { EmptyGroups } from '../emptyStates/EmptyGroups';
import { ErrorState } from '../polish/ErrorState';
import { LoadingOverlay } from '../polish/LoadingOverlay';
import { StaggerList } from '../polish/StaggerList';
import { colors, radii, spacing, typography, useHaptic } from '../../theme';
import { useGroups } from '../../api';
import { useIsFirstRun } from '../../screens/auth/onboarding/useIsFirstRun';
import type { SocialGroup } from '../../../../TYPES';

type Theme = typeof colors.light;

const SEGMENTS = [
  { id: 'all', label: 'All' },
  { id: 'mine', label: 'Mine' },
  { id: 'joined', label: 'Joined' },
];

export interface GroupsPaneProps {
  T?: Theme;
  onOpenGroup: (groupId: string) => void;
  onCreateGroup: () => void;
}

export function GroupsPane({
  T = colors.light,
  onOpenGroup,
  onCreateGroup,
}: GroupsPaneProps): React.JSX.Element {
  const fire = useHaptic();
  const firstRun = useIsFirstRun();
  const [segment, setSegment] = useState<string>('all');

  const { data: groups, isLoading, error, refetch } = useGroups();

  const visibleGroups = useMemo(
    () => filterGroups(groups ?? [], segment),
    [groups, segment],
  );

  if (isLoading) {
    return <LoadingOverlay T={T} caption="LOADING ·" />;
  }
  if (error) {
    return (
      <View style={styles.fill}>
        <ErrorState T={T} kind="network" onPrimary={() => refetch()} />
      </View>
    );
  }

  return (
    <View style={styles.fill}>
      <View style={styles.segRow}>
        <SegmentedSwitcher T={T} options={SEGMENTS} value={segment} onChange={setSegment} />
      </View>

      {visibleGroups.length === 0 ? (
        <ScrollView contentContainerStyle={styles.emptyContent}>
          <EmptyGroups T={T} firstRun={firstRun} onCreate={onCreateGroup} />
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
                  onOpenGroup(g.id);
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
    </View>
  );
}

function filterGroups(groups: SocialGroup[], segment: string): SocialGroup[] {
  if (segment === 'mine') return groups.filter((g) => g.userRole === 'admin');
  if (segment === 'joined') return groups.filter((g) => g.userRole === 'member');
  return groups;
}

const styles = StyleSheet.create({
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
});
