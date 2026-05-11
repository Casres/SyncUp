/**
 * EmptySearch — "Nothing matched" / secondary "Invite by handle".
 */

import React from 'react';
import Svg, { Circle, Path } from 'react-native-svg';

import { colors } from '../../theme';
import { EmptyStateBlock } from '../social/EmptyStateBlock';

type Theme = typeof colors.light;

export interface EmptySearchProps {
  T?: Theme;
  onInviteByHandle?: () => void;
}

export function EmptySearch({
  T = colors.light,
  onInviteByHandle,
}: EmptySearchProps): React.JSX.Element {
  return (
    <EmptyStateBlock
      T={T}
      icon={<SearchIcon T={T} />}
      headline="Nothing matched"
      body="Try another spelling or invite by handle."
      secondary={
        onInviteByHandle
          ? { label: 'Invite by handle', onPress: onInviteByHandle }
          : undefined
      }
    />
  );
}

function SearchIcon({ T }: { T: Theme }): React.JSX.Element {
  const stroke = T.ink2;
  return (
    <Svg width={26} height={26} viewBox="0 0 24 24" fill="none" opacity={0.5}>
      <Circle cx={11} cy={11} r={6.5} stroke={stroke} strokeWidth={1.8} />
      <Path
        d="M16 16l4.5 4.5"
        stroke={stroke}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
    </Svg>
  );
}
