/**
 * PeopleResultRow — Search result row for a non-friend person (R8-3, R8-7).
 *
 * RingAvatar 40px NO status ring + name + @handle + optional
 * "{N} mutual friends" sub-line + trailing "Add" pill (or "Sent" ghost
 * when the request was already sent). The "Add" pill is the only
 * in-row action; the rest of the row navigates to QuickProfileSheet.
 */

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors, fonts, spacing, typography, useHaptic } from '../../theme';
import { RingAvatar } from '../foundation/RingAvatar';
import { PillBtn } from '../foundation/PillBtn';

type Theme = typeof colors.light;

export interface PeopleResultPerson {
  id: string;
  name: string;
  handle: string;
  letter: string;
  photoUrl?: string | null;
}

export interface PeopleResultRowProps {
  T?: Theme;
  person: PeopleResultPerson;
  mutualCount: number;
  friendRequestStatus: 'none' | 'sent';
  onAdd: () => void;
  onRowBodyPress: () => void;
}

export function PeopleResultRow({
  T = colors.light,
  person,
  mutualCount,
  friendRequestStatus,
  onAdd,
  onRowBodyPress,
}: PeopleResultRowProps): React.JSX.Element {
  const fire = useHaptic();

  function onPressBody() {
    fire('light');
    onRowBodyPress();
  }

  function onPressAdd() {
    fire('success');
    onAdd();
  }

  const mutualLabel =
    mutualCount > 0
      ? `${mutualCount} mutual friend${mutualCount === 1 ? '' : 's'}`
      : null;

  return (
    <View style={[styles.row, { backgroundColor: T.bgElevated }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${person.name} ${person.handle}`}
        onPress={onPressBody}
        style={({ pressed }) => [
          styles.bodyTap,
          { opacity: pressed ? 0.85 : 1 },
        ]}
      >
        <RingAvatar T={T} letter={person.letter} size={40} status={null} />
        <View style={styles.body}>
          <Text style={[styles.name, { color: T.ink }]} numberOfLines={1}>
            {person.name}
          </Text>
          <Text
            style={[styles.handle, { color: T.ink3, fontFamily: fonts.mono }]}
            numberOfLines={1}
          >
            {person.handle}
          </Text>
          {mutualLabel !== null ? (
            <Text style={[styles.mutual, { color: T.ink2 }]}>{mutualLabel}</Text>
          ) : null}
        </View>
      </Pressable>
      <View style={styles.trailing}>
        {friendRequestStatus === 'none' ? (
          <PillBtn
            T={T}
            label="Add"
            variant="primary"
            size="sm"
            onPress={onPressAdd}
          />
        ) : (
          <PillBtn
            T={T}
            label="Sent"
            variant="ghost"
            size="sm"
            disabled
            icon={<Ionicons name="checkmark-circle" size={14} color={T.limeInk} />}
            onPress={() => {}}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  bodyTap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  body: {
    flex: 1,
    gap: 2,
  },
  name: {
    ...typography.body,
    fontSize: 15,
    fontWeight: '600',
  },
  handle: {
    fontSize: 12,
    fontWeight: '500',
  },
  mutual: {
    fontSize: 12,
    fontWeight: '500',
  },
  trailing: {
    alignItems: 'flex-end',
  },
});
