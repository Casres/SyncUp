/**
 * EmptyAvailability — "Set your first day" / secondary "Try a Quickset".
 */

import React from 'react';
import Svg, { Path, Rect } from 'react-native-svg';

import { colors } from '../../theme';
import { EmptyStateBlock } from '../social/EmptyStateBlock';

type Theme = typeof colors.light;

export interface EmptyAvailabilityProps {
  T?: Theme;
  onSetDay?: () => void;
  onTryQuickset?: () => void;
}

export function EmptyAvailability({
  T = colors.light,
  onSetDay,
  onTryQuickset,
}: EmptyAvailabilityProps): React.JSX.Element {
  return (
    <EmptyStateBlock
      T={T}
      icon={<CalendarGridIcon T={T} />}
      headline="Set your first day"
      body="Mark when you're free or busy."
      primary={onSetDay ? { label: 'Set a day', onPress: onSetDay } : undefined}
      secondary={
        onTryQuickset ? { label: 'Try a Quickset', onPress: onTryQuickset } : undefined
      }
    />
  );
}

function CalendarGridIcon({ T }: { T: Theme }): React.JSX.Element {
  const stroke = T.ink2;
  return (
    <Svg width={26} height={26} viewBox="0 0 24 24" fill="none" opacity={0.5}>
      <Rect x={3} y={5} width={18} height={16} rx={2} stroke={stroke} strokeWidth={1.8} />
      <Path
        d="M3 10h18M9 5v16M15 5v16M3 15h18"
        stroke={stroke}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
    </Svg>
  );
}
