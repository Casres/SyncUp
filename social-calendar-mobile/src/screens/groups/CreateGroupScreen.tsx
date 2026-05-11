/**
 * CreateGroupScreen — Create a new social group.
 *
 * SCREENS.md Create Group layout:
 *  1. FlowHeader back + title "New group"
 *  2. CoverArt picker entry tile → CoverPickerSheet
 *  3. FormField — group name
 *  4. Toggle — Private
 *  5. Footer "Create" PillBtn primary
 *
 * Hard rules: Hard Rule 10 (NO invites here — invites live in Group Detail
 * AdminBar), Hard Rule 8 (group is SHARED).
 *
 * Haptics: Toggle Private → medium (fired by Toggle component); Create →
 * medium; success animation → success.
 */
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  CoverArt,
  ErrorToast,
  FlowHeader,
  FormField,
  Overline,
  PillBtn,
  SettingsGroup,
  SettingsRow,
  TOAST_POSITION_DEFAULTS,
  Toggle,
} from '../../components';
import { colors, radii, spacing, typography, useHaptic } from '../../theme';
import { useCreateGroup } from '../../api';
import type { CreateGroupScreenProps } from '../../navigation/types';
import type { Cover } from '../../../../TYPES';

const DEFAULT_COVER: Cover = {
  id: 'cover-default',
  label: 'Default',
  art: 'covers/default.svg',
};

export default function CreateGroupScreen({
  navigation,
}: CreateGroupScreenProps): React.JSX.Element {
  const T = colors.light;
  const fire = useHaptic();

  const [name, setName] = useState<string>('');
  const [isPrivate, setIsPrivate] = useState<boolean>(false);
  const [errorVisible, setErrorVisible] = useState(false);

  const createGroup = useCreateGroup();

  const canCreate = name.trim().length > 0;

  const handleCreate = (): void => {
    if (!canCreate) return;
    fire('medium');
    createGroup.mutate(name.trim(), {
      onSuccess: (group) => {
        fire('success');
        navigation.replace('GroupDetail', { groupId: group.id });
      },
      onError: () => setErrorVisible(true),
    });
  };

  return (
    <SafeAreaView edges={['top']} style={[styles.root, { backgroundColor: T.bg }]}>
      <FlowHeader T={T} title="New group" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Choose cover"
          onPress={() => navigation.navigate('CoverPickerSheet', {})}
          style={({ pressed }) => [
            styles.coverPicker,
            { backgroundColor: T.bgElevated, borderColor: T.hair, opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <CoverArt T={T} cover={DEFAULT_COVER} size={56} />
          <View style={styles.coverBody}>
            <Text style={[typography.bodyMed, { color: T.ink }]}>Cover art</Text>
            <Text style={[typography.caption, { color: T.ink2 }]}>Tap to choose</Text>
          </View>
          <Overline T={T} color="ink3">EDIT</Overline>
        </Pressable>

        <FormField
          T={T}
          label="Group name"
          value={name}
          onChange={setName}
          placeholder="Weekend Crew"
        />

        <SettingsGroup T={T}>
          <SettingsRow
            T={T}
            label="Private"
            sub="Only invited members can join."
            trailing={<Toggle T={T} value={isPrivate} onChange={setIsPrivate} />}
            last
          />
        </SettingsGroup>
      </ScrollView>

      <View style={[styles.ctaRow, { backgroundColor: T.bgElevated, borderTopColor: T.hair }]}>
        <PillBtn
          T={T}
          label="Create"
          variant="primary"
          size="lg"
          onPress={handleCreate}
          disabled={!canCreate || createGroup.isPending}
          loading={createGroup.isPending}
        />
      </View>

      <View pointerEvents="box-none" style={TOAST_POSITION_DEFAULTS}>
        <ErrorToast
          T={T}
          kind="generic"
          visible={errorVisible}
          onRetry={() => {
            setErrorVisible(false);
            handleCreate();
          }}
          onClose={() => setErrorVisible(false)}
        />
      </View>
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
  coverPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.mdl,
    borderRadius: radii.card,
    borderWidth: StyleSheet.hairlineWidth,
  },
  coverBody: {
    flex: 1,
    minWidth: 0,
    gap: spacing.xs,
  },
  ctaRow: {
    padding: spacing.mdl,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
