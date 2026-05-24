/**
 * EmptyHome — Empty state for the Home feed.
 *
 * Two variants:
 *   today → "No plans today" / "Plan something"
 *   week  → "Quiet week" / "Tap + to start"
 *   month → "Quiet month" / "Tap + to start"
 *
 * Icon: calendar mark, 18-stroke line at 50% opacity ink2.
 */

import React from 'react';
import Svg, { Path, Rect } from 'react-native-svg';

import { colors } from '../../theme';
import { EmptyStateBlock } from '../social/EmptyStateBlock';

type Theme = typeof colors.light;

export type EmptyHomeVariant = 'today' | 'week' | 'month';

export interface EmptyHomeProps {
  T?: Theme;
  variant?: EmptyHomeVariant;
  onPlan?: () => void;
  firstRun?: boolean;
}

const COPY: Record<EmptyHomeVariant, { headline: string; body?: string }> = {
  today: { headline: 'No plans today', body: 'Make something happen.' },
  week:  { headline: 'Quiet week',     body: 'Tap + to start.' },
  month: { headline: 'Quiet month',    body: 'Tap + to start.' },
};

const FIRST_RUN_COPY = { headline: 'Plan your first event.', body: 'Tap + to start.' };

export function EmptyHome({
  T = colors.light,
  variant = 'today',
  onPlan,
  firstRun = false,
}: EmptyHomeProps): React.JSX.Element {
  const c = firstRun ? FIRST_RUN_COPY : COPY[variant];
  return (
    <EmptyStateBlock
      T={T}
      icon={<CalendarIcon T={T} />}
      headline={c.headline}
      body={c.body}
      primary={onPlan ? { label: 'Plan something', onPress: onPlan } : undefined}
    />
  );
}

function CalendarIcon({ T }: { T: Theme }): React.JSX.Element {
  const stroke = T.ink2;
  return (
    <Svg width={26} height={26} viewBox="0 0 24 24" fill="none" opacity={0.5}>
      <Rect x={3} y={5} width={18} height={16} rx={2} stroke={stroke} strokeWidth={1.8} />
      <Path d="M3 10h18" stroke={stroke} strokeWidth={1.8} strokeLinecap="round" />
      <Path d="M8 3v4M16 3v4" stroke={stroke} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}
