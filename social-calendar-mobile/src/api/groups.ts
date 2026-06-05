/**
 * Groups API — React Query hooks.
 *
 * DATA FLOW
 *   Every hook calls the live SyncUp backend via `useApiFetch()` /
 *   `useApiMutate()`.
 *
 * REAL BACKEND ENDPOINTS
 *   GET    /groups                                → SocialGroup[]
 *   GET    /groups/:id                            → SocialGroup
 *   POST   /groups                                → SocialGroup     (body: { name })
 *   GET    /groups/:id/polls                      → Poll[]
 *   GET    /groups/:id/suggestions                → Suggestion[]
 *   POST   /groups/:id/polls/:pollId/vote         → 204              (body: { optionId })
 *   POST   /groups/:id/suggestions                → Suggestion       (body: { text })
 *
 * `Poll.closed` is derived from `closesAt < now()` per MOCKS_HANDOFF
 * inferred-shape #4. The fetcher returns the raw `Poll` and leaves that
 * derivation to the consumer (`pollIsClosed()` helper).
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

import type { Poll, SocialGroup, Suggestion } from '../../../TYPES';

import { ApiError } from './_utils';
import {
  useApiFetch,
  useApiMutate,
  type AuthedFetch,
  type AuthedMutate,
} from './_client';
import { queryKeys } from './queryKeys';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Derive whether a poll is closed. TYPES.ts has no `closed` flag — closure
 * is a function of `closesAt < now`.
 */
export function pollIsClosed(poll: Poll, now: Date = new Date()): boolean {
  if (!poll.closesAt) return false;
  return new Date(poll.closesAt) < now;
}

// ---------------------------------------------------------------------------
// Fetch / mutate functions
// ---------------------------------------------------------------------------

export async function getGroups(authedFetch: AuthedFetch): Promise<SocialGroup[]> {
  // Backend wraps the list: GET /groups → { groups: [...] }. Normalize
  // defensively so a bare-array response (e.g. mocks) also works.
  const res = await authedFetch<{ groups: SocialGroup[] } | SocialGroup[]>('/groups');
  return Array.isArray(res) ? res : (res?.groups ?? []);
}

export async function getGroupDetail(
  authedFetch: AuthedFetch,
  id: string,
): Promise<SocialGroup> {
  return authedFetch<SocialGroup>(`/groups/${encodeURIComponent(id)}`);
}

export async function getGroupPolls(
  authedFetch: AuthedFetch,
  groupId: string,
): Promise<Poll[]> {
  // Backend wraps: GET /groups/:id/polls → { polls: [...] }.
  const res = await authedFetch<{ polls: Poll[] } | Poll[]>(
    `/groups/${encodeURIComponent(groupId)}/polls`,
  );
  return Array.isArray(res) ? res : (res?.polls ?? []);
}

export async function getGroupSuggestions(
  authedFetch: AuthedFetch,
  groupId: string,
): Promise<Suggestion[]> {
  // Backend wraps: GET /groups/:id/suggestions → { suggestions: [...] }.
  const res = await authedFetch<{ suggestions: Suggestion[] } | Suggestion[]>(
    `/groups/${encodeURIComponent(groupId)}/suggestions`,
  );
  return Array.isArray(res) ? res : (res?.suggestions ?? []);
}

export async function createGroup(
  authedMutate: AuthedMutate,
  name: string,
): Promise<SocialGroup> {
  return authedMutate<SocialGroup>('POST', '/groups', { name });
}

export async function votePoll(
  authedMutate: AuthedMutate,
  groupId: string,
  pollId: string,
  optionId: string,
): Promise<void> {
  await authedMutate<void>(
    'POST',
    `/groups/${encodeURIComponent(groupId)}/polls/${encodeURIComponent(pollId)}/vote`,
    { optionId },
  );
}

export async function addSuggestion(
  authedMutate: AuthedMutate,
  groupId: string,
  text: string,
): Promise<Suggestion> {
  return authedMutate<Suggestion>(
    'POST',
    `/groups/${encodeURIComponent(groupId)}/suggestions`,
    { text },
  );
}

// ---------------------------------------------------------------------------
// React Query hooks
// ---------------------------------------------------------------------------

export function useGroups(): UseQueryResult<SocialGroup[], ApiError> {
  const authedFetch = useApiFetch();
  return useQuery<SocialGroup[], ApiError>({
    queryKey: queryKeys.groups.all(),
    queryFn: () => getGroups(authedFetch),
  });
}

export function useGroupDetail(id: string): UseQueryResult<SocialGroup, ApiError> {
  const authedFetch = useApiFetch();
  return useQuery<SocialGroup, ApiError>({
    queryKey: queryKeys.groups.detail(id),
    queryFn: () => getGroupDetail(authedFetch, id),
    enabled: !!id,
  });
}

export function useGroupPolls(groupId: string): UseQueryResult<Poll[], ApiError> {
  const authedFetch = useApiFetch();
  return useQuery<Poll[], ApiError>({
    queryKey: queryKeys.groups.polls(groupId),
    queryFn: () => getGroupPolls(authedFetch, groupId),
    enabled: !!groupId,
  });
}

export function useGroupSuggestions(
  groupId: string,
): UseQueryResult<Suggestion[], ApiError> {
  const authedFetch = useApiFetch();
  return useQuery<Suggestion[], ApiError>({
    queryKey: queryKeys.groups.suggestions(groupId),
    queryFn: () => getGroupSuggestions(authedFetch, groupId),
    enabled: !!groupId,
  });
}

export function useCreateGroup(): UseMutationResult<SocialGroup, ApiError, string> {
  const queryClient = useQueryClient();
  const authedMutate = useApiMutate();
  return useMutation<SocialGroup, ApiError, string>({
    mutationFn: (name) => createGroup(authedMutate, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.groups.all() });
    },
  });
}

interface VotePollVars {
  pollId: string;
  optionId: string;
  groupId: string;
}

export function useVotePoll(): UseMutationResult<void, ApiError, VotePollVars> {
  const queryClient = useQueryClient();
  const authedMutate = useApiMutate();
  return useMutation<void, ApiError, VotePollVars>({
    mutationFn: ({ groupId, pollId, optionId }) =>
      votePoll(authedMutate, groupId, pollId, optionId),
    onSuccess: (_data, { groupId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.groups.polls(groupId) });
    },
  });
}

interface AddSuggestionVars {
  groupId: string;
  text: string;
}

export function useAddSuggestion(): UseMutationResult<
  Suggestion,
  ApiError,
  AddSuggestionVars
> {
  const queryClient = useQueryClient();
  const authedMutate = useApiMutate();
  return useMutation<Suggestion, ApiError, AddSuggestionVars>({
    mutationFn: ({ groupId, text }) => addSuggestion(authedMutate, groupId, text),
    onSuccess: (_data, { groupId }) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.groups.suggestions(groupId),
      });
    },
  });
}
