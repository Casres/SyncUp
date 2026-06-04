/**
 * SyncUp — App entrypoint.
 *
 * Wiring order (outermost → innermost):
 *   ClerkProvider            — must be the outermost provider so every
 *                              tree consumer (including useAuth() inside
 *                              the API hooks) sees the same session.
 *                              Token cache uses expo-secure-store.
 *   GestureHandlerRootView   — required by react-native-gesture-handler;
 *                              must wrap the entire tree for sheet drags etc.
 *   SafeAreaProvider         — supplies useSafeAreaInsets() to TabBar + screens.
 *   QueryClientProvider      — placed OUTSIDE NavigationContainer so the
 *                              React Query cache survives nav remounts and
 *                              modal pop/push.
 *   NavigationContainer      — React Navigation's required root container.
 *   RootNavigator            — gates between AuthNavigator (signed-out)
 *                              and the SyncUp tab + modal tree (signed-in).
 *
 * Font loading (Manrope, JetBrainsMono) is intentionally deferred — see
 * `src/theme/THEME_HANDOFF.md` Section 2. The Screens / app-shell agent will
 * add `useFonts(...)` here and gate render until loaded.
 */

import 'react-native-gesture-handler';

import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { QueryClientProvider } from '@tanstack/react-query';
import { ClerkProvider } from '@clerk/clerk-expo';

import RootNavigator from './src/navigation/RootNavigator';
import { navigationRef } from './src/navigation/navigationRef';
import { queryClient } from './src/api/queryClient';
import { tokenCache } from './src/auth/tokenCache';
import { RealtimeProvider } from './src/realtime';

const CLERK_PUBLISHABLE_KEY = process.env['EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY'];

if (!CLERK_PUBLISHABLE_KEY) {
  throw new Error(
    'Missing EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY. Copy .env.example to .env and paste your Clerk publishable key.',
  );
}

export default function App() {
  return (
    <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY} tokenCache={tokenCache}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <QueryClientProvider client={queryClient}>
            <RealtimeProvider>
              <NavigationContainer ref={navigationRef}>
                <RootNavigator />
                <StatusBar style="auto" />
              </NavigationContainer>
            </RealtimeProvider>
          </QueryClientProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ClerkProvider>
  );
}
