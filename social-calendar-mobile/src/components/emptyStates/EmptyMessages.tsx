/**
 * EmptyMessages — "No messages yet" for the Messages segment (R17-2).
 *
 * NO-CTA per R17-2: messaging starts from a friend / group / event surface,
 * not from the inbox, so there is no primary action here — just the explainer.
 */

import React from 'react';
import Svg, { Path } from 'react-native-svg';

import { colors } from '../../theme';
import { EmptyStateBlock } from '../social/EmptyStateBlock';

type Theme = typeof colors.light;

export interface EmptyMessagesProps {
  T?: Theme;
}

export function EmptyMessages({ T = colors.light }: EmptyMessagesProps): React.JSX.Element {
  return (
    <EmptyStateBlock
      T={T}
      icon={<ChatIcon T={T} />}
      headline="No messages yet"
      body="Start a chat from a friend, group, or event."
    />
  );
}

function ChatIcon({ T }: { T: Theme }): React.JSX.Element {
  return (
    <Svg width={26} height={26} viewBox="0 0 24 24" fill="none" opacity={0.5}>
      <Path
        d="M4 5h16v11H8l-4 4V5z"
        stroke={T.ink2}
        strokeWidth={1.8}
        strokeLinejoin="round"
      />
    </Svg>
  );
}
