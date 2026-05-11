/**
 * EmptyAttendees — "No invites sent" / "Add invitees".
 */

import React from 'react';
import Svg, { Circle, Path } from 'react-native-svg';

import { colors } from '../../theme';
import { EmptyStateBlock } from '../social/EmptyStateBlock';

type Theme = typeof colors.light;

export interface EmptyAttendeesProps {
  T?: Theme;
  onAddInvitees?: () => void;
}

export function EmptyAttendees({
  T = colors.light,
  onAddInvitees,
}: EmptyAttendeesProps): React.JSX.Element {
  return (
    <EmptyStateBlock
      T={T}
      icon={<UserCircleIcon T={T} />}
      headline="No invites sent"
      body="Pick friends or types to invite."
      primary={
        onAddInvitees ? { label: 'Add invitees', onPress: onAddInvitees } : undefined
      }
    />
  );
}

function UserCircleIcon({ T }: { T: Theme }): React.JSX.Element {
  const stroke = T.ink2;
  return (
    <Svg width={26} height={26} viewBox="0 0 24 24" fill="none" opacity={0.5}>
      <Circle cx={12} cy={12} r={9} stroke={stroke} strokeWidth={1.8} />
      <Circle cx={12} cy={10} r={3} stroke={stroke} strokeWidth={1.8} />
      <Path
        d="M5.5 19a7 7 0 0113 0"
        stroke={stroke}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
    </Svg>
  );
}
