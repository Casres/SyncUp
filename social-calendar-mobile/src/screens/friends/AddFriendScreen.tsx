/**
 * AddFriendScreen — Add a friend via QR / Link / Username.
 *
 * SCREENS.md Add Friend layout:
 *  1. FlowHeader back + title "Add friend"
 *  2. SegmentedSwitcher — QR / Link / Username
 *  3. Body per mode:
 *     - QR → QRArt card centered
 *     - Link → shareable link field + Copy / Share PillBtns
 *     - Username → FormField + Send Request PillBtn primary
 *
 * Empty state (Username): EmptySearch when search returns nothing.
 *
 * Hard rules: Hard Rule 3 (no generic gradients in hero), Hard Rule 2 (44pt).
 *
 * Haptics: SegmentedSwitcher flip → light; Search tap → medium; success on
 * accept (fired locally); error via ErrorToast.
 */
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  EmptySearch,
  ErrorToast,
  FlowHeader,
  FormField,
  Overline,
  PillBtn,
  QRArt,
  SegmentedSwitcher,
  TOAST_POSITION_DEFAULTS,
} from '../../components';
import { colors, radii, spacing, typography, useHaptic } from '../../theme';
import { useSendFriendRequest } from '../../api';
import type { AddFriendScreenProps } from '../../navigation/types';
import type { AddFriendMethod } from '../../../../TYPES';

const SEGMENTS = [
  { id: 'qr',       label: 'QR' },
  { id: 'link',     label: 'Link' },
  { id: 'username', label: 'Username' },
];

export default function AddFriendScreen({
  navigation,
  route,
}: AddFriendScreenProps): React.JSX.Element {
  const T = colors.light;
  const fire = useHaptic();
  const initialMethod = route.params?.method ?? 'qr';

  const [method, setMethod] = useState<AddFriendMethod>(initialMethod);
  const [handle, setHandle] = useState<string>('');
  const [hasSearched, setHasSearched] = useState(false);
  const [errorVisible, setErrorVisible] = useState(false);

  const sendRequest = useSendFriendRequest();

  const handleSearch = (): void => {
    if (!handle.trim()) return;
    fire('medium');
    setHasSearched(true);
    sendRequest.mutate(handle.trim().replace(/^@/, ''), {
      onSuccess: () => {
        fire('success');
        navigation.goBack();
      },
      onError: () => setErrorVisible(true),
    });
  };

  return (
    <SafeAreaView edges={['top']} style={[styles.root, { backgroundColor: T.bg }]}>
      <FlowHeader T={T} title="Add friend" onBack={() => navigation.goBack()} />

      <View style={styles.segRow}>
        <SegmentedSwitcher
          T={T}
          options={SEGMENTS}
          value={method}
          onChange={(next) => setMethod(next as AddFriendMethod)}
        />
      </View>

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        {method === 'qr' ? (
          <View style={styles.qrCol}>
            <QRArt T={T} payload="@ben" size={220} />
            <Text style={[typography.caption, { color: T.ink2, textAlign: 'center' }]}>
              Scan a friend's code
            </Text>
          </View>
        ) : null}

        {method === 'link' ? (
          <View style={styles.linkCol}>
            <Overline T={T} color="ink2">YOUR INVITE LINK</Overline>
            <View style={[styles.linkBox, { backgroundColor: T.bgElevated, borderColor: T.hair }]}>
              <Text style={[typography.body, { color: T.ink }]} numberOfLines={1}>
                syncup.app/i/ben
              </Text>
            </View>
            <View style={styles.linkActions}>
              <PillBtn T={T} label="Copy" variant="ghost" size="md" onPress={() => fire('medium')} />
              <PillBtn T={T} label="Share" variant="primary" size="md" onPress={() => fire('medium')} />
            </View>
          </View>
        ) : null}

        {method === 'username' ? (
          <View style={styles.usernameCol}>
            <FormField
              T={T}
              label="@handle"
              value={handle}
              onChange={setHandle}
              placeholder="@friend"
              autoCapitalize="none"
            />
            <PillBtn
              T={T}
              label="Send request"
              variant="primary"
              size="md"
              onPress={handleSearch}
              loading={sendRequest.isPending}
              disabled={!handle.trim() || sendRequest.isPending}
            />
            {hasSearched && !sendRequest.isPending && sendRequest.isError ? (
              <View style={styles.emptyWrap}>
                <EmptySearch T={T} />
              </View>
            ) : null}
          </View>
        ) : null}
      </ScrollView>

      <View pointerEvents="box-none" style={TOAST_POSITION_DEFAULTS}>
        <ErrorToast
          T={T}
          kind="friend"
          visible={errorVisible}
          onRetry={() => {
            setErrorVisible(false);
            handleSearch();
          }}
          onClose={() => setErrorVisible(false)}
          sub={
            sendRequest.error?.code === 'CONFLICT'
              ? 'Already in your friends list.'
              : 'Try again or invite by handle.'
          }
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  segRow: {
    paddingHorizontal: spacing.mdl,
    paddingVertical: spacing.sm,
  },
  body: {
    padding: spacing.mdl,
    gap: spacing.lg,
    paddingBottom: spacing['4xl'] * 2,
  },
  qrCol: {
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xl,
  },
  linkCol: {
    gap: spacing.md,
  },
  linkBox: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: radii.input,
    borderWidth: StyleSheet.hairlineWidth,
  },
  linkActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  usernameCol: {
    gap: spacing.md,
  },
  emptyWrap: {
    paddingVertical: spacing.xl,
  },
});
