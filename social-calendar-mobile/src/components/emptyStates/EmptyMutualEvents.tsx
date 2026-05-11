/**
 * EmptyMutualEvents — "Nothing planned together" / "Plan an event".
 */

import React from 'react';
import Svg, { Path } from 'react-native-svg';

import { colors } from '../../theme';
import { EmptyStateBlock } from '../social/EmptyStateBlock';

type Theme = typeof colors.light;

export interface EmptyMutualEventsProps {
  T?: Theme;
  onPlan?: () => void;
}

export function EmptyMutualEvents({
  T = colors.light,
  onPlan,
}: EmptyMutualEventsProps): React.JSX.Element {
  return (
    <EmptyStateBlock
      T={T}
      icon={<HandshakeIcon T={T} />}
      headline="Nothing planned together"
      body="Make something with them."
      primary={onPlan ? { label: 'Plan an event', onPress: onPlan } : undefined}
    />
  );
}

function HandshakeIcon({ T }: { T: Theme }): React.JSX.Element {
  const stroke = T.ink2;
  return (
    <Svg width={26} height={26} viewBox="0 0 24 24" fill="none" opacity={0.5}>
      <Path
        d="M3 12l3-3 3 3 3-3 3 3 3-3 3 3M6 14l3 3 3-3 3 3 3-3"
        stroke={stroke}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
