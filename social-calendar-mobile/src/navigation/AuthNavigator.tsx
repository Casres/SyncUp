/**
 * AuthNavigator — pre-auth navigation stack (R9-1).
 *
 * Mounted by RootNavigator when `useAuth().isSignedIn === false`. Houses
 * the full Round 9 onboarding flow:
 *
 *   Welcome → SignUpStep1..6
 *   Welcome → SignIn → ForgotPassword → ForgotPasswordConfirm
 *
 * Per R9-3 every step uses its own back arrow (navigator gestures off)
 * and preserves state on goBack().
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import type { AuthStackParamList } from './types';
import WelcomeScreen from '../screens/auth/WelcomeScreen';
import SignInScreen from '../screens/auth/SignInScreen';
import SignUpStep1Screen from '../screens/auth/SignUpStep1Screen';
import SignUpStep2Screen from '../screens/auth/SignUpStep2Screen';
import SignUpStep3Screen from '../screens/auth/SignUpStep3Screen';
import SignUpStep4Screen from '../screens/auth/SignUpStep4Screen';
import SignUpStep5Screen from '../screens/auth/SignUpStep5Screen';
import SignUpStep6Screen from '../screens/auth/SignUpStep6Screen';
import PushPermissionGateScreen from '../screens/auth/PushPermissionGateScreen';
import FriendFindDecisionScreen from '../screens/auth/FriendFindDecisionScreen';
import FriendFindMatchesScreen from '../screens/auth/FriendFindMatchesScreen';
import FriendFindNoWorriesScreen from '../screens/auth/FriendFindNoWorriesScreen';
import YoureInScreen from '../screens/auth/YoureInScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';
import ForgotPasswordConfirmScreen from '../screens/auth/ForgotPasswordConfirmScreen';

const Stack = createNativeStackNavigator<AuthStackParamList>();

export default function AuthNavigator(): React.JSX.Element {
  return (
    <Stack.Navigator
      initialRouteName="Welcome"
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        gestureEnabled: false,
      }}
    >
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="SignIn" component={SignInScreen} />
      <Stack.Screen name="SignUpStep1" component={SignUpStep1Screen} />
      <Stack.Screen name="SignUpStep2" component={SignUpStep2Screen} />
      <Stack.Screen name="SignUpStep3" component={SignUpStep3Screen} />
      <Stack.Screen name="SignUpStep4" component={SignUpStep4Screen} />
      <Stack.Screen name="SignUpStep5" component={SignUpStep5Screen} />
      <Stack.Screen name="SignUpStep6" component={SignUpStep6Screen} />
      {/* Post-Step-6 onboarding flow (R15-7..R15-12) — no back arrow, no back stack */}
      <Stack.Screen
        name="PushPermissionGate"
        component={PushPermissionGateScreen}
        options={{ animation: 'none', gestureEnabled: false }}
      />
      <Stack.Screen
        name="FriendFindDecision"
        component={FriendFindDecisionScreen}
        options={{ gestureEnabled: false }}
      />
      <Stack.Screen
        name="FriendFindMatches"
        component={FriendFindMatchesScreen}
        options={{ gestureEnabled: false }}
      />
      <Stack.Screen
        name="FriendFindNoWorries"
        component={FriendFindNoWorriesScreen}
        options={{ gestureEnabled: false }}
      />
      <Stack.Screen
        name="YoureIn"
        component={YoureInScreen}
        options={{ gestureEnabled: false }}
      />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <Stack.Screen
        name="ForgotPasswordConfirm"
        component={ForgotPasswordConfirmScreen}
      />
    </Stack.Navigator>
  );
}
