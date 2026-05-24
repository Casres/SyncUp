/**
 * PushPermissionGateScreen — R15-9.
 *
 * Near-invisible pass-through screen. Fires the native iOS push permission
 * prompt on mount, then immediately replaces to FriendFindDecision regardless
 * of grant or deny outcome. No SyncUp UI renders during the prompt.
 *
 * Registered with animation:'none' in AuthNavigator so it never appears in
 * the back stack — the PushPermissionGate → FriendFindDecision transition is
 * seamless to the user.
 */

import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import * as Notifications from 'expo-notifications';

import { Spinner } from '../../components/polish/Spinner';
import { colors } from '../../theme';
import type { PushPermissionGateScreenProps } from '../../navigation/types';

export default function PushPermissionGateScreen({
  navigation,
}: PushPermissionGateScreenProps): React.JSX.Element {
  const T = colors.light;
  // Show a spinner only as a fallback if the OS is slow (>600ms).
  const [showSpinner, setShowSpinner] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    timerRef.current = setTimeout(() => setShowSpinner(true), 600);

    // Fire native push permission prompt. Grant OR deny — both treated equally.
    void Notifications.requestPermissionsAsync()
      .catch(() => null)
      .finally(() => {
        if (timerRef.current) clearTimeout(timerRef.current);
        // Use replace so the gate never appears in the back stack.
        navigation.replace('FriendFindDecision');
      });

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={[styles.root, { backgroundColor: T.bg }]}>
      {showSpinner ? <Spinner size="MD" /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
