/**
 * ProfileStack — Tab #5 stack navigator.
 *
 * Routes:
 *   ProfileSettings        (initial)
 *   AvailabilityEditor                — Month / Week / Day modes
 *   BroadcastSettings                 — 3-card stacked IA
 *   AudiencePickerSheet               — modal sheet (formSheet presentation)
 *
 * `AudiencePickerSheet` accepts an `onConfirm` callback in params. This is
 * acceptable for modal sheets per NAVIGATION.md and the agent prompt; for
 * non-sheet routes, prefer event-based or store-based callbacks.
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import type { ProfileStackParamList } from './types';
import ProfileSettingsScreen from '../screens/profile/ProfileSettingsScreen';
import AvailabilityEditorScreen from '../screens/profile/AvailabilityEditorScreen';
import BroadcastSettingsScreen from '../screens/profile/BroadcastSettingsScreen';
import AudiencePickerSheetScreen from '../screens/profile/AudiencePickerSheetScreen';

const Stack = createNativeStackNavigator<ProfileStackParamList>();

export default function ProfileStack() {
  return (
    <Stack.Navigator
      initialRouteName="ProfileSettings"
      screenOptions={{
        headerShown: false,
        animation: 'default',
      }}
    >
      <Stack.Screen name="ProfileSettings" component={ProfileSettingsScreen} />
      <Stack.Screen
        name="AvailabilityEditor"
        component={AvailabilityEditorScreen}
      />
      <Stack.Screen
        name="BroadcastSettings"
        component={BroadcastSettingsScreen}
      />
      <Stack.Screen
        name="AudiencePickerSheet"
        component={AudiencePickerSheetScreen}
        options={{
          presentation: 'formSheet',
          sheetGrabberVisible: true,
          sheetAllowedDetents: [0.5, 1.0],
          sheetCornerRadius: 16,
        }}
      />
    </Stack.Navigator>
  );
}
