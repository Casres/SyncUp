/**
 * EmptyPolls — "No polls yet" / "Start a poll".
 */

import React from 'react';
import Svg, { Path } from 'react-native-svg';

import { colors } from '../../theme';
import { EmptyStateBlock } from '../social/EmptyStateBlock';

type Theme = typeof colors.light;

export interface EmptyPollsProps {
  T?: Theme;
  onStartPoll?: () => void;
}

export function EmptyPolls({
  T = colors.light,
  onStartPoll,
}: EmptyPollsProps): React.JSX.Element {
  return (
    <EmptyStateBlock
      T={T}
      icon={<PollBarsIcon T={T} />}
      headline="No polls yet"
      body="Get the group to weigh in."
      primary={
        onStartPoll ? { label: 'Start a poll', onPress: onStartPoll } : undefined
      }
    />
  );
}

function PollBarsIcon({ T }: { T: Theme }): React.JSX.Element {
  const stroke = T.ink2;
  return (
    <Svg width={26} height={26} viewBox="0 0 24 24" fill="none" opacity={0.5}>
      <Path
        d="M5 19V11M12 19V5M19 19v-7"
        stroke={stroke}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
      <Path d="M3 21h18" stroke={stroke} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}
