/**
 * Friends API — React Query hooks.
 *
 * DATA FLOW
 *   When `isApiConfigured()` is true, hooks call the real backend.
 *   Otherwise they fall back to MOCK_FRIENDS / MOCK_PENDING_REQUESTS /
 *   MOCK_USERS_BY_ID.
 *
 * REAL BACKEND ENDPOINTS
 *   GET    /friends?label=                  → Friend[]
 *   GET    /friends/requests                → Friend[]
 *   POST   /friends/requests                → 204            (body: { recipientId })
 *   POST   /friends/requests/:id/respond    → 204            (body: { action })
 *   GET    /users/:id                       → User
 *
 * CLERK INTEGRATION via `useApiFetch()` / `useApiMutate()` only — never
 * import @clerk/clerk-expo here.
 *
 * MOCK-ONLY ERROR SIMULATIONS:
 *   - sendFriendRequest(existingFriendId) → CONFLICT
 *   - getFriendProfile(unknownId)         → NOT_FOUND
 *   - respondToFriendRequest(unknownId)   → NOT_FOUND
 */
import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';

import type { Friend, User } from '../../../TYPES';
import {
  MOCK_FRIENDS,
  MOCK_PENDING_REQUESTS,
  MOCK_USERS_BY_ID,
} from '../mocks';

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
// Fetch / mutate functions
// ---------------------------------------------------------------------------

export async function getFriends(
  authedFetch: AuthedFetch,
  label?: string,
): Promise<Friend[]> {
  if (!isApiConfigured()) {
    await simulateLatency();
    if (!label) return [...MOCK_FRIENDS];
    return MOCK_FRIENDS.filter((f) => f.category === label);
  }
  const path = label
    ? `/friends?label=${encodeURIComponent(label)}`
    : '/friends';
  return authedFetch<Friend[]>(path);
}

export async function getFriendRequests(
  authedFetch: AuthedFetch,
): Promise<Friend[]> {
  if (!isApiConfigured()) {
    await simulateLatency();
    return [...MOCK_PENDING_REQUESTS];
  }
  return authedFetch<Friend[]>('/friends/requests');
}

export async function sendFriendRequest(
  authedMutate: AuthedMutate,
  recipientId: string,
): Promise<void> {
  if (!isApiConfigured()) {
    await simulateLatency();
    if (MOCK_FRIENDS.some((f) => f.id === recipientId)) {
      throw new ApiError(
        'CONFLICT',
        `User "${recipientId}" is already in your friends list.`,
      );
    }
    return;
  }
  await authedMutate<void>('POST', '/friends/requests', { recipientId });
}

export async function respondToFriendRequest(
  authedMutate: AuthedMutate,
  id: string,
  action: 'accept' | 'decline',
): Promise<void> {
  if (!isApiConfigured()) {
    await simulateLatency();
    if (!MOCK_PENDING_REQUESTS.some((r) => r.id === id)) {
      throw new ApiError('NOT_FOUND', `Friend request "${id}" not found.`);
    }
    void action;
    return;
  }
  // TODO: confirm endpoint — could also be PATCH /friends/requests/:id { action }
  await authedMutate<void>(
    'POST',
    `/friends/requests/${encodeURIComponent(id)}/respond`,
    { action },
  );
}

export async function getFriendProfile(
  authedFetch: AuthedFetch,
  friendId: string,
): Promise<User> {
  if (!isApiConfigured()) {
    await simulateLatency();
    const user = MOCK_USERS_BY_ID[friendId];
    if (!user) {
      throw new ApiError('NOT_FOUND', `User "${friendId}" not found.`);
    }
    return user;
  }
  return authedFetch<User>(`/users/${encodeURIComponent(friendId)}`);
}

// ---------------------------------------------------------------------------
// React Query hooks
// ---------------------------------------------------------------------------

export function useFriends(label?: string): UseQueryResult<Friend[], ApiError> {
  const authedFetch = useApiFetch();
  return useQuery<Friend[], ApiError>({
    queryKey: queryKeys.friends.list(label),
    queryFn: () => getFriends(authedFetch, label),
  });
}

export function useFriendRequests(): UseQueryResult<Friend[], ApiError> {
  const authedFetch = useApiFetch();
  return useQuery<Friend[], ApiError>({
    queryKey: queryKeys.friends.requests(),
    queryFn: () => getFriendRequests(authedFetch),
  });
}

export function useFriendProfile(id: string): UseQueryResult<User, ApiError> {
  const authedFetch = useApiFetch();
  return useQuery<User, ApiError>({
    queryKey: queryKeys.friends.profile(id),
    queryFn: () => getFriendProfile(authedFetch, id),
    enabled: !!id,
  });
}

export function useSendFriendRequest(): UseMutationResult<
  void,
  ApiError,
  string
> {
  const queryClient = useQueryClient();
  const authedMutate = useApiMutate();
  return useMutation<void, ApiError, string>({
    mutationFn: (recipientId) => sendFriendRequest(authedMutate, recipientId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.friends.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.friends.requests() });
    },
  });
}

interface RespondVars {
  id: string;
  action: 'accept' | 'decline';
}

export function useRespondToFriendRequest(): UseMutationResult<
  void,
  ApiError,
  RespondVars
> {
  const queryClient = useQueryClient();
  const authedMutate = useApiMutate();
  return useMutation<void, ApiError, RespondVars>({
    mutationFn: ({ id, action }) =>
      respondToFriendRequest(authedMutate, id, action),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.friends.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.friends.requests() });
    },
  });
}
