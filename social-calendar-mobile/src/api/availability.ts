/**
 * Availability API — React Query hooks.
 *
 * DATA FLOW
 *   Every hook calls the live SyncUp backend via `useApiFetch()` /
 *   `useApiMutate()`.
 *
 * REAL BACKEND ENDPOINTS
 *   GET  /availability/me                → AvailabilityEntry
 *   PUT  /availability/me                → 204                (body: AvailabilityEntry)
 *   GET  /availability/:id               → AvailabilityEntry  (403 if blocked)
 *   GET  /availability/broadcasts        → BroadcastSettings
 *   PUT  /availability/broadcasts        → 204                (body: BroadcastSettings)
 *
 * The API enforces availability blocks server-side: a blocked viewer gets
 * HTTP 403 → `ApiError('FORBIDDEN', ...)`.
 *
 * Optimistic mutations: updateAvailability + updateBroadcastSettings use the
 * cancel → snapshot → patch → onError rollback → onSettled invalidate pattern.
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

import type { AvailabilityEntry, BroadcastSettings } from '../../../TYPES';

import { ApiError } from './_utils';
import {
  useApiFetch,
  useApiMutate,
  type AuthedFetch,
  type AuthedMutate,
} from './_client';
import { queryKeys } from './queryKeys';

// ---------------------------------------------------------------------------
// Fetch / mutate functions
// ---------------------------------------------------------------------------

export async function getMyAvailability(
  authedFetch: AuthedFetch,
): Promise<AvailabilityEntry> {
  return authedFetch<AvailabilityEntry>('/availability/me');
}

export async function getFriendAvailability(
  authedFetch: AuthedFetch,
  userId: string,
): Promise<AvailabilityEntry> {
  return authedFetch<AvailabilityEntry>(
    `/availability/${encodeURIComponent(userId)}`,
  );
}

export async function updateAvailability(
  authedMutate: AuthedMutate,
  entry: AvailabilityEntry,
): Promise<void> {
  await authedMutate<void>('PUT', '/availability/me', entry);
}

export async function getBroadcastSettings(
  authedFetch: AuthedFetch,
): Promise<BroadcastSettings> {
  return authedFetch<BroadcastSettings>('/availability/broadcasts');
}

export async function updateBroadcastSettings(
  authedMutate: AuthedMutate,
  settings: BroadcastSettings,
): Promise<void> {
  await authedMutate<void>('PUT', '/availability/broadcasts', settings);
}

// ---------------------------------------------------------------------------
// React Query hooks
// ---------------------------------------------------------------------------

export function useMyAvailability(): UseQueryResult<AvailabilityEntry, ApiError> {
  const authedFetch = useApiFetch();
  return useQuery<AvailabilityEntry, ApiError>({
    queryKey: queryKeys.availability.mine(),
    queryFn: () => getMyAvailability(authedFetch),
  });
}

export function useFriendAvailability(
  userId: string,
): UseQueryResult<AvailabilityEntry, ApiError> {
  const authedFetch = useApiFetch();
  return useQuery<AvailabilityEntry, ApiError>({
    queryKey: queryKeys.availability.friend(userId),
    queryFn: () => getFriendAvailability(authedFetch, userId),
    enabled: !!userId,
  });
}

export function useBroadcastSettings(): UseQueryResult<BroadcastSettings, ApiError> {
  const authedFetch = useApiFetch();
  return useQuery<BroadcastSettings, ApiError>({
    queryKey: queryKeys.availability.broadcasts(),
    queryFn: () => getBroadcastSettings(authedFetch),
  });
}

interface UpdateAvailabilityContext {
  previous: AvailabilityEntry | undefined;
}

/**
 * Optimistic availability update. Patches the user's full map immediately,
 * rolls back on error, invalidates on settle.
 */
export function useUpdateAvailability(): UseMutationResult<
  void,
  ApiError,
  AvailabilityEntry,
  UpdateAvailabilityContext
> {
  const queryClient = useQueryClient();
  const authedMutate = useApiMutate();
  return useMutation<
    void,
    ApiError,
    AvailabilityEntry,
    UpdateAvailabilityContext
  >({
    mutationFn: (entry) => updateAvailability(authedMutate, entry),
    onMutate: async (entry) => {
      const key = queryKeys.availability.mine();
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<AvailabilityEntry>(key);
      queryClient.setQueryData<AvailabilityEntry>(key, entry);
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.availability.mine(), context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.availability.mine() });
    },
  });
}

interface UpdateBroadcastContext {
  previous: BroadcastSettings | undefined;
}

/**
 * Optimistic broadcast-settings update. Same cancel/snapshot/patch/rollback/
 * invalidate pattern as the availability mutation.
 */
export function useUpdateBroadcastSettings(): UseMutationResult<
  void,
  ApiError,
  BroadcastSettings,
  UpdateBroadcastContext
> {
  const queryClient = useQueryClient();
  const authedMutate = useApiMutate();
  return useMutation<void, ApiError, BroadcastSettings, UpdateBroadcastContext>({
    mutationFn: (settings) => updateBroadcastSettings(authedMutate, settings),
    onMutate: async (settings) => {
      const key = queryKeys.availability.broadcasts();
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<BroadcastSettings>(key);
      queryClient.setQueryData<BroadcastSettings>(key, settings);
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(
          queryKeys.availability.broadcasts(),
          context.previous,
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.availability.broadcasts(),
      });
    },
  });
}
