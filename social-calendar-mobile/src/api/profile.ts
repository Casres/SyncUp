/**
 * Profile API — React Query hooks.
 *
 * DATA FLOW
 *   When `isApiConfigured()` is true, hooks call the real backend.
 *   Otherwise they fall back to MOCK_ME and synthesised default
 *   Notification + Privacy settings per the ANCHOR defaults:
 *
 *     NotificationSettings — all true except `availBroadcasts: false`
 *     PrivacySettings — `findableBy: 'friends-of-friends'`, `invitableBy: 'friends'`
 *
 * REAL BACKEND ENDPOINTS
 *   GET    /me                      → User
 *   PATCH  /me                      → User                  (body: Partial<User>)
 *   GET    /me/notifications        → NotificationSettings
 *   PUT    /me/notifications        → 204                   (body: NotificationSettings)
 *   GET    /me/privacy              → PrivacySettings
 *   PUT    /me/privacy              → 204                   (body: PrivacySettings)
 *
 * CLERK INTEGRATION via `useApiFetch()` / `useApiMutate()` only.
 */
import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';

import type {
  NotificationSettings,
  PrivacySettings,
  User,
} from '../../../TYPES';
import { MOCK_ME } from '../mocks';

import { ApiError, simulateLatency } from './_utils';
import {
  isApiConfigured,
  useApiFetch,
  useApiMutate,
  type AuthedFetch,
  type AuthedMutate,
} from './_client';
import { queryKeys } from './queryKeys';

// ---------------------------------------------------------------------------
// ANCHOR-defined defaults (mock fallback only)
// ---------------------------------------------------------------------------

const DEFAULT_NOTIFICATIONS: NotificationSettings = {
  eventInvites: true,
  friendRequests: true,
  groupInvites: true,
  rsvps: true,
  eventReminders: true,
  availBroadcasts: false,
};

const DEFAULT_PRIVACY: PrivacySettings = {
  findableBy: 'friends-of-friends',
  invitableBy: 'friends',
};

// ---------------------------------------------------------------------------
// Fetch / mutate functions
// ---------------------------------------------------------------------------

export async function getMyProfile(authedFetch: AuthedFetch): Promise<User> {
  if (!isApiConfigured()) {
    await simulateLatency();
    return { ...MOCK_ME };
  }
  return authedFetch<User>('/me');
}

export async function getNotificationSettings(
  authedFetch: AuthedFetch,
): Promise<NotificationSettings> {
  if (!isApiConfigured()) {
    await simulateLatency();
    return { ...DEFAULT_NOTIFICATIONS };
  }
  return authedFetch<NotificationSettings>('/me/notifications');
}

export async function getPrivacySettings(
  authedFetch: AuthedFetch,
): Promise<PrivacySettings> {
  if (!isApiConfigured()) {
    await simulateLatency();
    return { ...DEFAULT_PRIVACY };
  }
  return authedFetch<PrivacySettings>('/me/privacy');
}

export async function updateProfile(
  authedMutate: AuthedMutate,
  patch: Partial<User>,
): Promise<User> {
  if (!isApiConfigured()) {
    await simulateLatency();
    return { ...MOCK_ME, ...patch, id: MOCK_ME.id };
  }
  return authedMutate<User>('PATCH', '/me', patch);
}

export async function updateNotificationSettings(
  authedMutate: AuthedMutate,
  settings: NotificationSettings,
): Promise<void> {
  if (!isApiConfigured()) {
    await simulateLatency();
    void settings;
    return;
  }
  await authedMutate<void>('PUT', '/me/notifications', settings);
}

export async function updatePrivacySettings(
  authedMutate: AuthedMutate,
  settings: PrivacySettings,
): Promise<void> {
  if (!isApiConfigured()) {
    await simulateLatency();
    void settings;
    return;
  }
  await authedMutate<void>('PUT', '/me/privacy', settings);
}

// ---------------------------------------------------------------------------
// React Query hooks
// ---------------------------------------------------------------------------

export function useMyProfile(): UseQueryResult<User, ApiError> {
  const authedFetch = useApiFetch();
  return useQuery<User, ApiError>({
    queryKey: queryKeys.profile.me(),
    queryFn: () => getMyProfile(authedFetch),
  });
}

export function useNotificationSettings(): UseQueryResult<
  NotificationSettings,
  ApiError
> {
  const authedFetch = useApiFetch();
  return useQuery<NotificationSettings, ApiError>({
    queryKey: queryKeys.profile.notifications(),
    queryFn: () => getNotificationSettings(authedFetch),
  });
}

export function usePrivacySettings(): UseQueryResult<PrivacySettings, ApiError> {
  const authedFetch = useApiFetch();
  return useQuery<PrivacySettings, ApiError>({
    queryKey: queryKeys.profile.privacy(),
    queryFn: () => getPrivacySettings(authedFetch),
  });
}

export function useUpdateProfile(): UseMutationResult<
  User,
  ApiError,
  Partial<User>
> {
  const queryClient = useQueryClient();
  const authedMutate = useApiMutate();
  return useMutation<User, ApiError, Partial<User>>({
    mutationFn: (patch) => updateProfile(authedMutate, patch),
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKeys.profile.me(), updated);
    },
  });
}

export function useUpdateNotificationSettings(): UseMutationResult<
  void,
  ApiError,
  NotificationSettings
> {
  const queryClient = useQueryClient();
  const authedMutate = useApiMutate();
  return useMutation<void, ApiError, NotificationSettings>({
    mutationFn: (settings) => updateNotificationSettings(authedMutate, settings),
    onSuccess: (_data, settings) => {
      queryClient.setQueryData(queryKeys.profile.notifications(), settings);
    },
  });
}

export function useUpdatePrivacySettings(): UseMutationResult<
  void,
  ApiError,
  PrivacySettings
> {
  const queryClient = useQueryClient();
  const authedMutate = useApiMutate();
  return useMutation<void, ApiError, PrivacySettings>({
    mutationFn: (settings) => updatePrivacySettings(authedMutate, settings),
    onSuccess: (_data, settings) => {
      queryClient.setQueryData(queryKeys.profile.privacy(), settings);
    },
  });
}
