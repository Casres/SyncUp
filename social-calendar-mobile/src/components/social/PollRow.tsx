/**
 * PollRow — Card row in Group Detail Polls tab.
 *
 * Question + horizontal vote bar viz across each option.
 * Tapping an option fires `onVote(optionId)`. Haptic: light on vote.
 * R5-1: each option line shows percent text, never bar color alone.
 */

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing, typography, useHaptic } from '../../theme';
import type { Poll } from '../../../../TYPES';

type Theme = typeof colors.light;

export interface PollRowProps {
  T?: Theme;
  poll: Poll;
  onVote: (optionId: string) => void;
  /** When provided, marks the local user's selected option (highlights it). */
  myVote?: string | null;
}

export function PollRow({
  T = colors.light,
  poll,
  onVote,
  myVote,
}: PollRowProps): React.JSX.Element {
  const fire = useHaptic();
  const total = poll.options.reduce((sum, o) => sum + o.votes, 0) || 1;

  return (
    <View style={[styles.card, { backgroundColor: T.bgElevated, borderColor: T.hair }]}>
      <Text style={[typography.title, { color: T.ink }]} numberOfLines={2}>
        {poll.question}
      </Text>
      <View style={styles.options}>
        {poll.options.map((opt) => {
          const pct = Math.round((opt.votes / total) * 100);
          const isMine = opt.id === myVote;
          return (
            <Pressable
              key={opt.id}
              accessibilityRole="button"
              accessibilityState={{ selected: isMine }}
              accessibilityLabel={`${opt.label} ${pct}%`}
              onPress={() => {
                fire('light');
                onVote(opt.id);
              }}
              style={({ pressed }) => [
                styles.option,
                {
                  backgroundColor: T.bgSunken,
                  borderColor: isMine ? T.accent : T.hair,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <View
                style={[
                  styles.bar,
                  {
                    width: `${pct}%`,
                    backgroundColor: isMine ? T.accentSoft : T.bgElevated,
                  },
                ]}
              />
              <View style={styles.optionRow}>
                <Text style={[typography.bodyMed, { color: T.ink, flex: 1 }]} numberOfLines={1}>
                  {opt.label}
                </Text>
                <Text style={[typography.caption, { color: T.ink2, fontWeight: '700' }]}>
                  {`${pct}%`}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
      <Text style={[typography.micro, { color: T.ink3 }]}>
        {`${total} ${total === 1 ? 'vote' : 'votes'}`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.mdl,
    borderRadius: radii.card,
    borderWidth: StyleSheet.hairlineWidth,
    gap: spacing.md,
  },
  options: {
    gap: spacing.sm,
  },
  option: {
    minHeight: 44,
    borderRadius: radii.input,
    borderWidth: 1,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  bar: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
});
