/**
 * AdminBar — Sticky top bar inside Group Detail.
 *
 * Hard Rule 9: ALWAYS visible when `userRole === 'admin'` (parent enforces).
 * Hard Rule 10: hosts the invite flow — invites live HERE, not in Create Group.
 *
 * Visual: bgElevated row with an "Invite" PillBtn (primary) and "Settings"
 * PillBtn (ghost). Hairline below.
 *
 * R7-6 — GROUP-DETAIL ADMINBAR IS PINNED. This component does NOT
 * collapse, fade, shrink, or auto-hide on scroll. It contains NO
 * scroll-listening logic and NO opacity/translate animations tied to
 * scroll position. Visibility is binary on role only — the parent
 * mounts it when `userRole === 'admin'` and unmounts it otherwise.
 * The parent MUST render this OUTSIDE any ScrollView so it stays
 * pinned when the body scrolls (see GroupDetailScreen).
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { colors, spacing } from '../../theme';
import { Overline } from '../foundation/Overline';
import { PillBtn } from '../foundation/PillBtn';

type Theme = typeof colors.light;

export interface AdminBarProps {
  T?: Theme;
  onInvite: () => void;
  onSettings: () => void;
}

export function AdminBar({
  T = colors.light,
  onInvite,
  onSettings,
}: AdminBarProps): React.JSX.Element {
  return (
    <View style={[styles.root, { backgroundColor: T.bgElevated, borderBottomColor: T.hair }]}>
      <Overline T={T} color="ink2">Admin</Overline>
      <View style={styles.actions}>
        <PillBtn
          T={T}
          label="Invite"
          variant="primary"
          size="sm"
          onPress={onInvite}
          icon={
            <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
              <Path
                d="M12 5v14M5 12h14"
                stroke={T.bgElevated}
                strokeWidth={2.5}
                strokeLinecap="round"
              />
            </Svg>
          }
        />
        <PillBtn T={T} label="Settings" variant="ghost" size="sm" onPress={onSettings} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.mdl,
    paddingVertical: spacing.sm,
    gap: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  actions: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
});
