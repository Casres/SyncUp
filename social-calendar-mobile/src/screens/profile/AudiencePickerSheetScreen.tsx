/**
 * AudiencePickerSheetScreen — Modal sheet for picking friends OR friend types.
 *
 * Route params: { mode, selected, ruleState, onConfirm }
 *
 * SCREENS.md Audience Picker layout:
 *  1. 38×4 grab handle
 *  2. Header: title + "N selected" + accent Done pill
 *  3. Body per mode:
 *     - mode='types' → friend-type rows (PrivateBadge + label + N members + check)
 *     - mode='friends' → friend rows (RingAvatar + name + handle + CategoryBadge)
 *
 * Empty state: friends list empty → EmptyFriends; types empty →
 * EmptyStateBlock "No friend types · Create one".
 *
 * Hard rules: Hard Rule 11 (PrivateBadge appears on type rows because the
 * sheet doesn't title-state privacy), Hard Rule 8 (Friend Type vs Social
 * Group never confused).
 *
 * Haptics: row toggle → light (fired by AudiencePickerSheet); Done → medium.
 */
import React, { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  AudiencePickerSheet,
  EmptyFriends,
  EmptyStateBlock,
  FlowHeader,
  LoadingOverlay,
} from '../../components';
import { colors, spacing } from '../../theme';
import { useFriends } from '../../api';
import { MOCK_FRIEND_LABELS, MOCK_FRIEND_TYPES } from '../../mocks';
import type { AudiencePickerSheetScreenProps } from '../../navigation/types';

export default function AudiencePickerSheetScreen({
  navigation,
  route,
}: AudiencePickerSheetScreenProps): React.JSX.Element {
  const T = colors.light;
  const { mode, selected: initialSelected, onConfirm } = route.params;
  const [selected, setSelected] = useState<string[]>(initialSelected);

  const { data: friends, isLoading } = useFriends();

  const labelLookup = useMemo(() => {
    const m: Record<string, string> = {};
    for (const c of MOCK_FRIEND_LABELS) m[c.id] = c.label;
    return m;
  }, []);

  const handleDone = (): void => {
    onConfirm(selected);
    navigation.goBack();
  };

  const empty =
    (mode === 'friends' && (friends ?? []).length === 0) ||
    (mode === 'types' && MOCK_FRIEND_TYPES.length === 0);

  return (
    <SafeAreaView edges={['top']} style={[styles.root, { backgroundColor: T.bg }]}>
      <FlowHeader
        T={T}
        title={mode === 'friends' ? 'Pick friends' : 'Pick friend types'}
        onBack={() => navigation.goBack()}
      />

      {isLoading && mode === 'friends' ? (
        <LoadingOverlay T={T} caption="LOADING ·" />
      ) : empty ? (
        <View style={styles.emptyWrap}>
          {mode === 'friends' ? (
            <EmptyFriends T={T} />
          ) : (
            <EmptyStateBlock
              T={T}
              icon={<View />}
              headline="No friend types"
              body="Create one to use as a broadcast audience."
              secondary={{
                label: 'Create one',
                onPress: () => navigation.goBack(),
              }}
            />
          )}
        </View>
      ) : (
        <View style={styles.fill}>
          <AudiencePickerSheet
            T={T}
            visible
            mode={mode}
            selected={selected}
            onChange={setSelected}
            onClose={() => navigation.goBack()}
            onDone={handleDone}
            friends={mode === 'friends' ? friends ?? [] : undefined}
            types={mode === 'types' ? MOCK_FRIEND_TYPES : undefined}
            resolveCategoryLabel={(id) => labelLookup[id] ?? id}
          />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  fill: { flex: 1 },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
});
