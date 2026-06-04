/**
 * ConversationAvatar — type-specific circular avatar for a conversation (R17-3).
 *
 *   DIRECT → the other participant's photo / initial.
 *   GROUP  → an overlapping cluster of up to 3 member avatars (cap ≤5 visually
 *            collapses to 3 + the rest implied).
 *   EVENT  → a single accent-soft tile with the title's initial (the schema
 *            has no event photo, so we use the initial rather than invent one).
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { RingAvatar } from '../foundation/RingAvatar';
import { colors, radii, typography } from '../../theme';
import type {
  ConversationType,
  PublicProfile,
} from '../../api/conversations.types';

type Theme = typeof colors.light;

export interface ConversationAvatarProps {
  type: ConversationType;
  title: string;
  participants: PublicProfile[];
  /** Excluded from the DIRECT "other party" pick and the GROUP cluster head. */
  currentUserId: string;
  size?: number;
  T?: Theme;
}

function initial(s: string): string {
  return (s.trim()[0] ?? '?').toUpperCase();
}

export function ConversationAvatar({
  type,
  title,
  participants,
  currentUserId,
  size = 44,
  T = colors.light,
}: ConversationAvatarProps): React.JSX.Element {
  if (type === 'DIRECT') {
    const other =
      participants.find((p) => p.id !== currentUserId) ?? participants[0];
    return (
      <RingAvatar
        T={T}
        letter={initial(other?.displayName ?? title)}
        photoUrl={other?.avatarUrl ?? null}
        size={size}
      />
    );
  }

  if (type === 'GROUP') {
    const members = participants.filter((p) => p.id !== currentUserId).slice(0, 3);
    const sub = Math.round(size * 0.62);
    return (
      <View style={[styles.cluster, { width: size, height: size }]}>
        {members.map((m, i) => (
          <View
            key={m.id}
            style={{
              position: 'absolute',
              left: i * (sub * 0.42),
              top: i % 2 === 0 ? 0 : size - sub,
            }}
          >
            <RingAvatar
              T={T}
              letter={initial(m.displayName)}
              photoUrl={m.avatarUrl}
              size={sub}
            />
          </View>
        ))}
        {members.length === 0 ? (
          <RingAvatar T={T} letter={initial(title)} size={size} />
        ) : null}
      </View>
    );
  }

  // EVENT
  return (
    <View
      style={[
        styles.eventTile,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: T.accentSoft,
        },
      ]}
    >
      <Text style={[typography.title, { color: T.accentInk }]}>
        {initial(title)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  cluster: {
    position: 'relative',
  },
  eventTile: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.pill,
  },
});
