/**
 * CreateEventStack — Modal stack mounted at the root navigator.
 *
 * Presented as `fullScreenModal` (slides up; swipe-down to dismiss). The whole
 * stack lives ABOVE the tab bar — pressing the center "Create" tab triggers
 * a navigation event that opens this modal stack instead of switching tab.
 *
 * Routes:
 *   Step1   (initial) — Basic info
 *   Step2             — Pick a time (AvailabilitySummaryBar)
 *   Step3             — Invite (banded availability viz; wired variant when
 *                       Draft.eventIso is in the AvailabilityEntry map)
 *   Confirm           — Success / Done
 *
 * Transitions: modal up — duration `durations.modalUp` (280ms) with
 * `springSnappy` semantics. Inner step pushes (1→2→3→Confirm) use the native
 * stack default step push.
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import type { CreateEventStackParamList } from './types';
import { durations } from '../theme';
import Step1Screen from '../screens/create/Step1Screen';
import Step2Screen from '../screens/create/Step2Screen';
import Step3Screen from '../screens/create/Step3Screen';
import ConfirmScreen from '../screens/create/ConfirmScreen';

const Stack = createNativeStackNavigator<CreateEventStackParamList>();

/**
 * Modal duration is anchored to `durations.modalUp` (280ms). React Navigation
 * v7's native-stack does not accept a numeric `animationDuration` for the
 * `fullScreenModal` presentation directly on iOS (the native modal is a fixed
 * system animation), but we keep the token reference here so any future
 * custom presentation (e.g. `containedTransparentModal` with Reanimated) can
 * pull from the same source. `springSnappy` easing is the intended curve;
 * `easings`/`springs` are imported by consumers that animate modal contents.
 */
export const CREATE_MODAL_DURATION_MS = durations.modalUp;

export default function CreateEventStack() {
  return (
    <Stack.Navigator
      initialRouteName="Step1"
      screenOptions={{
        headerShown: false,
        animation: 'default',
      }}
    >
      <Stack.Screen name="Step1" component={Step1Screen} />
      <Stack.Screen name="Step2" component={Step2Screen} />
      <Stack.Screen name="Step3" component={Step3Screen} />
      <Stack.Screen name="Confirm" component={ConfirmScreen} />
    </Stack.Navigator>
  );
}
