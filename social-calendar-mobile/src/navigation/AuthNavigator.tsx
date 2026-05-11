/**
 * AuthNavigator — pre-auth navigation stack.
 *
 * Mounted by RootNavigator when `useAuth().isSignedIn === false`.
 * Per R9-1, the main tab shell does NOT render until the user has a
 * valid Clerk session, so this stack is the only thing visible while
 * signed out.
 *
 * Currently houses the minimum-viable SignIn + SignUp shells. The full
 * Round 9 onboarding flow (Welcome, 6-step sign-up, forgot-password
 * sub-flow, invite-context) is GAP 1 — see ANCHOR-DESIGN.txt R9-1
 * through R9-10 and FRONTEND-HANDOFF.txt GAP 1.
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import type { AuthStackParamList } from './types';
import SignInScreen from '../screens/auth/SignInScreen';
import SignUpScreen from '../screens/auth/SignUpScreen';

const Stack = createNativeStackNavigator<AuthStackParamList>();

export default function AuthNavigator(): React.JSX.Element {
  return (
    <Stack.Navigator
      initialRouteName="SignIn"
      screenOptions={{ headerShown: false }}
    >
      <Stack.Screen name="SignIn" component={SignInScreen} />
      <Stack.Screen name="SignUp" component={SignUpScreen} />
    </Stack.Navigator>
  );
}
