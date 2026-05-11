/**
 * EmptySuggestions — "No ideas yet" / "Suggest one".
 */

import React from 'react';
import Svg, { Path } from 'react-native-svg';

import { colors } from '../../theme';
import { EmptyStateBlock } from '../social/EmptyStateBlock';

type Theme = typeof colors.light;

export interface EmptySuggestionsProps {
  T?: Theme;
  onSuggest?: () => void;
}

export function EmptySuggestions({
  T = colors.light,
  onSuggest,
}: EmptySuggestionsProps): React.JSX.Element {
  return (
    <EmptyStateBlock
      T={T}
      icon={<LightbulbIcon T={T} />}
      headline="No ideas yet"
      body="Drop the first thought."
      primary={
        onSuggest ? { label: 'Suggest one', onPress: onSuggest } : undefined
      }
    />
  );
}

function LightbulbIcon({ T }: { T: Theme }): React.JSX.Element {
  const stroke = T.ink2;
  return (
    <Svg width={26} height={26} viewBox="0 0 24 24" fill="none" opacity={0.5}>
      <Path
        d="M9 18h6M10 21h4M12 3a6 6 0 014 10.5V16h-8v-2.5A6 6 0 0112 3z"
        stroke={stroke}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
