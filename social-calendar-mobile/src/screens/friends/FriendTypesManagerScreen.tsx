/**
 * FriendTypesManagerScreen — Manage private FriendType buckets.
 *
 * SCREENS.md Friend Types Manager layout:
 *  1. FlowHeader title "Friend types" + back + right "+ Add type"
 *  2. List of FriendType cards: label + N members + edit / delete affordance
 *  3. New-type entry (FormField) + create button
 *  4. TwoTapDestructive on each row for delete
 *
 * Hard rules: Hard Rule 7 (TwoTapDestructive — only destructive pattern),
 * Hard Rule 8 (Friend Type is PRIVATE), Hard Rule 11 (PrivateBadge sparingly:
 * the screen title states privacy, so per-row badges omitted).
 *
 * Data: read from useFriendTypes() (GET /friend-groups). Create/delete actions
 * wire through useCreateFriendType / useDeleteFriendType mutations.
 *
 * Haptics: type assigned/created → medium; deletion arm → heavy + commit
 * success — fired internally by TwoTapDestructive.
 */
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  EmptyStateBlock,
  FlowHeader,
  FormField,
  PillBtn,
  TwoTapDestructive,
} from '../../components';
import { colors, radii, spacing, typography, useHaptic } from '../../theme';
import {
  useCreateFriendType,
  useDeleteFriendType,
  useFriendTypes,
} from '../../api';
import type { FriendTypesManagerScreenProps } from '../../navigation/types';

export default function FriendTypesManagerScreen({
  navigation,
}: FriendTypesManagerScreenProps): React.JSX.Element {
  const T = colors.light;
  const fire = useHaptic();

  const { data: types = [] } = useFriendTypes();
  const createType = useCreateFriendType();
  const deleteType = useDeleteFriendType();
  const [newLabel, setNewLabel] = useState<string>('');

  const handleCreate = (): void => {
    const label = newLabel.trim();
    if (!label) return;
    fire('medium');
    createType.mutate(label, { onSuccess: () => setNewLabel('') });
  };

  const handleDelete = (typeId: string): void => {
    deleteType.mutate(typeId);
  };

  return (
    <SafeAreaView edges={['top']} style={[styles.root, { backgroundColor: T.bg }]}>
      <FlowHeader T={T} title="Friend types" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        {types.length === 0 ? (
          <EmptyStateBlock
            T={T}
            icon={<View />}
            headline="No friend types"
            body="Create one to organise broadcasts and invites."
          />
        ) : (
          types.map((t) => (
            <View
              key={t.id}
              style={[styles.row, { backgroundColor: T.bgElevated, borderColor: T.hair }]}
            >
              <View style={styles.rowBody}>
                <Text style={[typography.bodyMed, { color: T.ink }]} numberOfLines={1}>
                  {t.label}
                </Text>
                <Text style={[typography.caption, { color: T.ink2 }]}>
                  {`${t.members.length} member${t.members.length === 1 ? '' : 's'}`}
                </Text>
              </View>
              <TwoTapDestructive
                T={T}
                label="Delete"
                confirmLabel="Tap to confirm"
                onConfirm={() => handleDelete(t.id)}
              />
            </View>
          ))
        )}

        <View
          style={[
            styles.newCard,
            { backgroundColor: T.bgElevated, borderColor: T.hair },
          ]}
        >
          <FormField
            T={T}
            label="New type"
            value={newLabel}
            onChange={setNewLabel}
            placeholder="e.g. Climbing crew"
          />
          <PillBtn
            T={T}
            label="Create"
            variant="primary"
            size="md"
            onPress={handleCreate}
            disabled={!newLabel.trim()}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  body: {
    padding: spacing.mdl,
    gap: spacing.md,
    paddingBottom: spacing['4xl'] * 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.mdl,
    borderRadius: radii.card,
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: 56,
  },
  rowBody: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  newCard: {
    padding: spacing.mdl,
    borderRadius: radii.card,
    borderWidth: StyleSheet.hairlineWidth,
    gap: spacing.md,
    marginTop: spacing.lg,
  },
});
