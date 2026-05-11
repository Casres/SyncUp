/**
 * Clerk token cache — persists the active session token to the device
 * using expo-secure-store so it survives app restarts.
 *
 * expo-secure-store encrypts values before writing them to the keychain
 * (iOS) or Keystore (Android), making it the recommended storage layer
 * for sensitive data in Expo apps.
 *
 * This module re-exports the built-in token cache from @clerk/expo so
 * App.tsx has a clean, named import rather than importing directly from
 * the Clerk package internals.
 */

export { tokenCache } from '@clerk/expo/token-cache';
