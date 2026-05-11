/**
 * SuggestionRow — Lightbulb icon + author + idea text + upvote count.
 *
 * Used in Group Detail "Ideas" tab. Tapping the upvote control fires
 * `onUpvote(suggestionId)` and haptic light.
 *
 * Inferred shape: parent supplies the resolved `authorName` since the
 * Suggestion data only carries `authorId`.
 */

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { colors, radii, spacing, typography, useHaptic } from '../../theme';
import type { Suggestion } from '../../../../TYPES';

type Theme = typeof colors.light;

export interface SuggestionRowProps {
  T?: Theme;
  suggestion: Suggestion;
  /** Author display name (parent resolves from authorId). */
  authorName: string;
  /** Whether the local user has upvoted. */
  upvotedByMe: boolean;
  onUpvote: (suggestionId: string) => void;
}

export function SuggestionRow({
  T = colors.light,
  suggestion,
  authorName,
  upvotedByMe,
  onUpvote,
}: SuggestionRowProps): React.JSX.Element {
  const fire = useHaptic();
  return (
    <View style={[styles.row, { backgroundColor: T.bgElevated, borderColor: T.hair }]}>
      <View style={[styles.iconTile, { backgroundColor: T.limeSoft }]}>
        <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
          <Path
            d="M9 18h6M10 21h4M12 3a6 6 0 014 10.5V16h-8v-2.5A6 6 0 0112 3z"
            stroke={T.limeInk}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      </View>
      <View style={styles.body}>
        <Text style={[typography.bodyMed, { color: T.ink }]} numberOfLines={2}>
          {suggestion.text}
        </Text>
        <Text style={[typography.caption, { color: T.ink2 }]} numberOfLines={1}>
          {authorName}
        </Text>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected: upvotedByMe }}
        accessibilityLabel={`Upvote, ${suggestion.upvotes.length} so far`}
        onPress={() => {
          fire('light');
          onUpvote(suggestion.id);
        }}
        style={({ pressed }) => [
          styles.upvote,
          {
            backgroundColor: upvotedByMe ? T.accentSoft : T.bgSunken,
            borderColor: upvotedByMe ? T.accent : T.hair,
            opacity: pressed ? 0.7 : 1,
          },
        ]}
      >
        <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
          <Path
            d="M12 5l7 8h-4v6h-6v-6H5l7-8z"
            stroke={upvotedByMe ? T.accentInk : T.ink2}
            strokeWidth={2}
            strokeLinejoin="round"
          />
        </Svg>
        <Text
          style={[
            typography.micro,
            {
              color: upvotedByMe ? T.accentInk : T.ink2,
              fontWeight: '700',
            },
          ]}
        >
          {suggestion.upvotes.length}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.mdl,
    borderRadius: radii.card,
    borderWidth: StyleSheet.hairlineWidth,
  },
  iconTile: {
    width: 36,
    height: 36,
    borderRadius: radii.input,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  upvote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    borderWidth: 1,
    minHeight: 32,
  },
});
