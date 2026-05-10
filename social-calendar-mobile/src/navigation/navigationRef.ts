/**
 * Navigation ref — single global handle to the React Navigation tree.
 *
 * Use this to navigate imperatively from outside the navigator tree
 * (e.g. NotifSheet, deep-link handlers, push-notification listeners).
 *
 * Mounted in App.tsx via:
 *   <NavigationContainer ref={navigationRef}>
 *
 * Per the React Navigation docs, callers must guard with `isReady()`
 * before invoking `navigate(...)` to avoid firing during the initial
 * mount window.
 */

import { createNavigationContainerRef } from '@react-navigation/native';

import type { RootStackParamList } from './types';

export const navigationRef = createNavigationContainerRef<RootStackParamList>();
