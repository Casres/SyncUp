/**
 * EmptyGroups — "No groups yet" / "Create one".
 */

import React from 'react';
import Svg, { Circle, Path } from 'react-native-svg';

import { colors } from '../../theme';
import { EmptyStateBlock } from '../social/EmptyStateBlock';

type Theme = typeof colors.light;

export interface EmptyGroupsProps {
  T?: Theme;
  onCreate?: () => void;
}

export function EmptyGroups({
  T = colors.light,
  onCreate,
}: EmptyGroupsProps): React.JSX.Element {
  return (
    <EmptyStateBlock
      T={T}
      icon={<UsersIcon T={T} />}
      headline="No groups yet"
      body="Make a space to plan together."
      primary={onCreate ? { label: 'Create one', onPress: onCreate } : undefined}
    />
  );
}

function UsersIcon({ T }: { T: Theme }): React.JSX.Element {
  const stroke = T.ink2;
  return (
    <Svg width={26} height={26} viewBox="0 0 24 24" fill="none" opacity={0.5}>
      <Circle cx={12} cy={8} r={3.5} stroke={stroke} strokeWidth={1.8} />
      <Circle cx={5.5} cy={9.5} r={2.5} stroke={stroke} strokeWidth={1.8} />
      <Circle cx={18.5} cy={9.5} r={2.5} stroke={stroke} strokeWidth={1.8} />
      <Path
        d="M5 20a7 7 0 0114 0M2 20a4 4 0 014-4M22 20a4 4 0 00-4-4"
        stroke={stroke}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
    </Svg>
  );
}
