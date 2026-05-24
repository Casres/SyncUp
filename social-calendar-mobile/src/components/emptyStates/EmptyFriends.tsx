/**
 * EmptyFriends — "No friends yet" / "Add one" / "Share QR".
 */

import React from 'react';
import Svg, { Circle, Path } from 'react-native-svg';

import { colors } from '../../theme';
import { EmptyStateBlock } from '../social/EmptyStateBlock';

type Theme = typeof colors.light;

export interface EmptyFriendsProps {
  T?: Theme;
  onAdd?: () => void;
  onShareQR?: () => void;
  firstRun?: boolean;
}

export function EmptyFriends({
  T = colors.light,
  onAdd,
  onShareQR,
  firstRun = false,
}: EmptyFriendsProps): React.JSX.Element {
  const headline = firstRun ? 'Find your first friend.' : 'No friends yet';
  const body = firstRun
    ? 'Search by @handle or share your QR for them to scan.'
    : 'Add one to start planning.';
  return (
    <EmptyStateBlock
      T={T}
      icon={<UserPlusIcon T={T} />}
      headline={headline}
      body={body}
      primary={onAdd ? { label: 'Add one', onPress: onAdd } : undefined}
      secondary={onShareQR ? { label: 'Share QR', onPress: onShareQR } : undefined}
    />
  );
}

function UserPlusIcon({ T }: { T: Theme }): React.JSX.Element {
  const stroke = T.ink2;
  return (
    <Svg width={26} height={26} viewBox="0 0 24 24" fill="none" opacity={0.5}>
      <Circle cx={9} cy={8} r={3.5} stroke={stroke} strokeWidth={1.8} />
      <Path
        d="M3 20a6 6 0 0112 0M18 8v6M15 11h6"
        stroke={stroke}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
    </Svg>
  );
}
