/**
 * Friends API — React Query hooks.
 *
 * DATA FLOW
 *   Every hook calls the live SyncUp backend via `useApiFetch()` /
 *   `useApiMutate()`.
 *
 * REAL BACKEND ENDPOINTS
 *   GET    /friends?label=                  → Friend[]
 *   GET    /friends/requests                → Friend[]
 *   POST   /friends/requests                → 204            (body: { recipientId })
 *   POST   /friends/requests/:id/respond    → 204            (body: { action })
 *   DELETE /friends/:id                     → 204            (R16-7 · unfriend)
 *   PATCH  /friends/:id/block               → 200            (R16-8 · block user)
 *   GET    /users/:id                       → User
 *   GET    /friend-groups                   → FriendType[]   (useFriendTypes)
 *   POST   /friend-groups                   → FriendType     (useCreateFriendType)
 *   DELETE /friend-groups/:id              → 204            (useDeleteFriendType)
 *
 * CLERK INTEGRATION via `useApiFetch()` / `useApiMutate()` only — never
 * import @clerk/clerk-expo here.
 */
import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';

import type { Friend, FriendType, User } from '../../../TYPES';

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

export async function getFriends(
  authedFetch: AuthedFetch,
  label?: string,
): Promise<Friend[]> {
  const path = label
    ? `/friends?label=${encodeURIComponent(label)}`
    : '/friends';
  return authedFetch<Friend[]>(path);
}

export async function getFriendRequests(
  authedFetch: AuthedFetch,
): Promise<Friend[]> {
  return authedFetch<Friend[]>('/friends/requests');
}

export async function sendFriendRequest(
  authedMutate: AuthedMutate,
  recipientId: string,
): Promise<void> {
  await authedMutate<void>('POST', '/friends/requests', { recipientId });
}

export async function respondToFriendRequest(
  authedMutate: AuthedMutate,
  id: string,
  action: 'accept' | 'decline',
): Promise<void> {
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
  return authedFetch<User>(`/users/${encodeURIComponent(friendId)}`);
}

/**
 * R16-7. Soft-delete the friendship with `friendId`. Backend resolves which
 * party initiates; either side may unfriend.
 */
export async function removeFriend(
  authedMutate: AuthedMutate,
  friendId: string,
): Promise<void> {
  await authedMutate<void>('DELETE', `/friends/${encodeURIComponent(friendId)}`);
}

/**
 * R16-8. Block the target user. Backend transitions the friendship to
 * BLOCKED, which implicitly severs the relationship — the UI does NOT need
 * to call `removeFriend` separately.
 */
export async function blockUser(
  authedMutate: AuthedMutate,
  friendId: string,
): Promise<void> {
  await authedMutate<void>('PATCH', `/friends/${encodeURIComponent(friendId)}/block`);
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

/**
 * R16-7. Remove a friend (soft-delete the friendship).
 *
 * Invalidates `friends.all()` so FriendsList drops the row, and
 * `friends.profile(friendId)` so any open profile view re-fetches and
 * resolves to NOT_FOUND. The FriendProfileScreen pops to FriendsList on
 * success per spec — no toast.
 */
export function useRemoveFriend(): UseMutationResult<void, ApiError, string> {
  const queryClient = useQueryClient();
  const authedMutate = useApiMutate();
  return useMutation<void, ApiError, string>({
    mutationFn: (friendId) => removeFriend(authedMutate, friendId),
    onSuccess: (_data, friendId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.friends.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.friends.profile(friendId) });
    },
  });
}

/**
 * R16-8. Block a user. Backend treats Block as a superset of Remove, so
 * `friends.all()` invalidation handles the implicit friendship removal.
 *
 * Additional invalidations cover content surfaces that may render the
 * blocked user (events, notifications, the blocks list itself). Explore
 * feed is parameterized by location bucket and category — we use the
 * predicate form to invalidate every cached slot rather than enumerating.
 */
export function useBlockUser(): UseMutationResult<void, ApiError, string> {
  const queryClient = useQueryClient();
  const authedMutate = useApiMutate();
  return useMutation<void, ApiError, string>({
    mutationFn: (friendId) => blockUser(authedMutate, friendId),
    onSuccess: (_data, friendId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.friends.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.friends.profile(friendId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.friends.blocks() });
      queryClient.invalidateQueries({ queryKey: queryKeys.events.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all() });
    },
  });
}

// ---------------------------------------------------------------------------
// FriendType (FriendGroup) hooks — /friend-groups
// ---------------------------------------------------------------------------

/** Wire shape from the backend FriendGroupResponse to the shared FriendType. */
interface FriendGroupApiItem {
  id: string;
  name: string;
  memberIds: string[];
}

export async function getFriendTypes(authedFetch: AuthedFetch): Promise<FriendType[]> {
  const data = await authedFetch<{ groups: FriendGroupApiItem[] }>('/friend-groups');
  return data.groups.map((g) => ({ id: g.id, label: g.name, members: g.memberIds }));
}

/**
 * List the caller's private FriendType buckets.
 * Backed by GET /friend-groups. Maps backend FriendGroup → FriendType shape.
 */
export function useFriendTypes(): UseQueryResult<FriendType[], ApiError> {
  const authedFetch = useApiFetch();
  return useQuery<FriendType[], ApiError>({
    queryKey: queryKeys.friends.types(),
    queryFn: () => getFriendTypes(authedFetch),
  });
}

/**
 * Derive the list of distinct friend category labels the caller has used.
 * Shares the `friends.list()` cache with `useFriends()` — no extra network
 * call when both are mounted on the same screen.
 *
 * With real API data, `Friend.category` is already the display string
 * (e.g. 'BFF', 'Work'). The returned `{ id, label }` pairs have id === label
 * so existing `labelLookup[id] ?? id` fallback patterns continue to work.
 */
export function useFriendLabels(): UseQueryResult<
  Array<{ id: string; label: string }>,
  ApiError
> {
  const authedFetch = useApiFetch();
  return useQuery<Friend[], ApiError, Array<{ id: string; label: string }>>({
    queryKey: queryKeys.friends.list(),
    queryFn: () => getFriends(authedFetch),
    select: (friends) => {
      const seen = new Set<string>();
      const result: Array<{ id: string; label: string }> = [];
      for (const f of friends) {
        if (f.category && !seen.has(f.category)) {
          seen.add(f.category);
          result.push({ id: f.category, label: f.category });
        }
      }
      return result;
    },
  });
}

/**
 * Create a new FriendType bucket. Invalidates the types list on success.
 */
export function useCreateFriendType(): UseMutationResult<FriendType, ApiError, string> {
  const queryClient = useQueryClient();
  const authedMutate = useApiMutate();
  return useMutation<FriendType, ApiError, string>({
    mutationFn: async (name) => {
      const item = await authedMutate<FriendGroupApiItem>('POST', '/friend-groups', { name });
      return { id: item.id, label: item.name, members: item.memberIds };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.friends.types() });
    },
  });
}

/**
 * Delete a FriendType bucket by id. Invalidates the types list on success.
 */
export function useDeleteFriendType(): UseMutationResult<void, ApiError, string> {
  const queryClient = useQueryClient();
  const authedMutate = useApiMutate();
  return useMutation<void, ApiError, string>({
    mutationFn: async (typeId) => {
      await authedMutate<void>('DELETE', `/friend-groups/${encodeURIComponent(typeId)}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.friends.types() });
    },
  });
}
