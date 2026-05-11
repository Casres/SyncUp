/**
 * Events API — React Query hooks.
 *
 * DATA FLOW
 *   When `isApiConfigured()` is true (EXPO_PUBLIC_API_URL or
 *   EXPO_PUBLIC_DEV_TOKEN set) the hooks call the real SyncUp backend.
 *   Otherwise they fall back to MOCK_EVENTS / MOCK_RSVPS / MOCK_EVENT_ORGANISERS
 *   so screens stay exercisable without a running server.
 *
 * REAL BACKEND ENDPOINTS
 *   GET    /events                       → Event[]
 *   GET    /events/:id                   → Event
 *   POST   /events                       → Event             (body: EventDraft)
 *   PATCH  /events/:id                   → Event             (body: Partial<Event>)
 *   DELETE /events/:id                   → 204 No Content
 *   GET    /events/:id/rsvps             → RSVPEntry[]
 *   POST   /events/:id/rsvp              → 204               (body: { status })
 *
 * CLERK INTEGRATION
 *   All hooks pull a pre-authorized fetch/mutate via `useApiFetch()` /
 *   `useApiMutate()` from `_client.ts` — never import @clerk/clerk-expo
 *   directly here. Tokens are intentionally absent from query keys so
 *   logout/login is handled by the auth layer's cache invalidation.
 *
 * MOCK-ONLY ERROR SIMULATIONS (live API uses real HTTP status codes):
 *   - getEvent('unknown')    → NOT_FOUND
 *   - deleteEvent('event-4') → FORBIDDEN (only Priya, the CREATOR, can delete)
 *   - submitRSVP             → ~10% SERVER_ERROR to exercise the RSVP toast
 */
import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';

import type { Event, RSVPStatus } from '../../../TYPES';
import {
  MOCK_EVENTS,
  MOCK_EVENT_ORGANISERS,
  MOCK_RSVPS,
  type EventOrganiser,
} from '../mocks';

import { ApiError, shouldSimulateFailure, simulateLatency } from './_utils';
import {
  isApiConfigured,
  useApiFetch,
  useApiMutate,
  type AuthedFetch,
  type AuthedMutate,
} from './_client';
import { queryKeys } from './queryKeys';

// ---------------------------------------------------------------------------
// Types specific to the Events API surface
// ---------------------------------------------------------------------------

/**
 * The array form of RSVP rows screens iterate (Attendees list, RSVP sheet).
 * Mirrors `Event.rsvps` map but is more ergonomic for `.map()` rendering.
 */
export interface RSVPEntry {
  userId: string;
  status: RSVPStatus;
}

/** Draft input for `createEvent`. Server fills `id` and `createdAt`-style fields. */
export type EventDraft = Omit<Event, 'id'>;

// ---------------------------------------------------------------------------
// Fetch / mutate functions
// ---------------------------------------------------------------------------

export async function getEvents(authedFetch: AuthedFetch): Promise<Event[]> {
  if (!isApiConfigured()) {
    await simulateLatency();
    return [...MOCK_EVENTS];
  }
  return authedFetch<Event[]>('/events');
}

export async function getEvent(
  authedFetch: AuthedFetch,
  id: string,
): Promise<Event> {
  if (!isApiConfigured()) {
    await simulateLatency();
    const evt = MOCK_EVENTS.find((e) => e.id === id);
    if (!evt) {
      throw new ApiError('NOT_FOUND', `Event "${id}" not found.`);
    }
    return evt;
  }
  return authedFetch<Event>(`/events/${encodeURIComponent(id)}`);
}

export async function createEvent(
  authedMutate: AuthedMutate,
  draft: EventDraft,
): Promise<Event> {
  if (!isApiConfigured()) {
    await simulateLatency();
    const id = `event-${Date.now().toString(36)}`;
    return { ...draft, id };
  }
  return authedMutate<Event>('POST', '/events', draft);
}

export async function updateEvent(
  authedMutate: AuthedMutate,
  id: string,
  patch: Partial<Event>,
): Promise<Event> {
  if (!isApiConfigured()) {
    await simulateLatency();
    const existing = MOCK_EVENTS.find((e) => e.id === id);
    if (!existing) {
      throw new ApiError('NOT_FOUND', `Event "${id}" not found.`);
    }
    return { ...existing, ...patch, id: existing.id };
  }
  return authedMutate<Event>('PATCH', `/events/${encodeURIComponent(id)}`, patch);
}

export async function deleteEvent(
  authedMutate: AuthedMutate,
  id: string,
): Promise<void> {
  if (!isApiConfigured()) {
    await simulateLatency();
    if (id === 'event-4') {
      const meRow: EventOrganiser | undefined = MOCK_EVENT_ORGANISERS.find(
        (o) => o.eventId === id && o.userId === 'me',
      );
      if (!meRow || meRow.role !== 'CREATOR') {
        throw new ApiError(
          'FORBIDDEN',
          'Only the event creator can delete this event.',
        );
      }
    }
    return;
  }
  await authedMutate<void>('DELETE', `/events/${encodeURIComponent(id)}`);
}

export async function getRSVPs(
  authedFetch: AuthedFetch,
  eventId: string,
): Promise<RSVPEntry[]> {
  if (!isApiConfigured()) {
    await simulateLatency();
    const rows = MOCK_RSVPS[eventId];
    if (!rows) return [];
    return rows.map((r) => ({ userId: r.userId, status: r.status }));
  }
  return authedFetch<RSVPEntry[]>(`/events/${encodeURIComponent(eventId)}/rsvps`);
}

export async function submitRSVP(
  authedMutate: AuthedMutate,
  eventId: string,
  status: RSVPStatus,
): Promise<void> {
  if (!isApiConfigured()) {
    await simulateLatency();
    if (shouldSimulateFailure(0.1)) {
      throw new ApiError(
        'SERVER_ERROR',
        `Failed to submit RSVP for event "${eventId}". Please try again.`,
      );
    }
    return;
  }
  await authedMutate<void>(
    'POST',
    `/events/${encodeURIComponent(eventId)}/rsvp`,
    { status },
  );
}

// ---------------------------------------------------------------------------
// React Query hooks
// ---------------------------------------------------------------------------

export function useEvents(): UseQueryResult<Event[], ApiError> {
  const authedFetch = useApiFetch();
  return useQuery<Event[], ApiError>({
    queryKey: queryKeys.events.all(),
    queryFn: () => getEvents(authedFetch),
  });
}

export function useEvent(id: string): UseQueryResult<Event, ApiError> {
  const authedFetch = useApiFetch();
  return useQuery<Event, ApiError>({
    queryKey: queryKeys.events.detail(id),
    queryFn: () => getEvent(authedFetch, id),
    enabled: !!id,
  });
}

export function useEventRSVPs(
  eventId: string,
): UseQueryResult<RSVPEntry[], ApiError> {
  const authedFetch = useApiFetch();
  return useQuery<RSVPEntry[], ApiError>({
    queryKey: queryKeys.events.rsvps(eventId),
    queryFn: () => getRSVPs(authedFetch, eventId),
    enabled: !!eventId,
  });
}

interface SubmitRSVPVars {
  eventId: string;
  status: RSVPStatus;
}

interface SubmitRSVPContext {
  previousEvent: Event | undefined;
}

/**
 * Optimistic RSVP submission. Pattern:
 *  1. Cancel in-flight refetches for the affected event.
 *  2. Snapshot the prior cache value.
 *  3. Patch `Event.rsvps['me']` optimistically.
 *  4. On error, restore the snapshot.
 *  5. On settle, invalidate so the canonical truth is fetched.
 */
export function useSubmitRSVP(): UseMutationResult<
  void,
  ApiError,
  SubmitRSVPVars,
  SubmitRSVPContext
> {
  const queryClient = useQueryClient();
  const authedMutate = useApiMutate();

  return useMutation<void, ApiError, SubmitRSVPVars, SubmitRSVPContext>({
    mutationFn: ({ eventId, status }) => submitRSVP(authedMutate, eventId, status),
    onMutate: async ({ eventId, status }) => {
      const key = queryKeys.events.detail(eventId);
      await queryClient.cancelQueries({ queryKey: key });
      const previousEvent = queryClient.getQueryData<Event>(key);
      if (previousEvent) {
        queryClient.setQueryData<Event>(key, {
          ...previousEvent,
          rsvps: { ...previousEvent.rsvps, me: status },
        });
      }
      return { previousEvent };
    },
    onError: (_err, { eventId }, context) => {
      if (context?.previousEvent) {
        queryClient.setQueryData(
          queryKeys.events.detail(eventId),
          context.previousEvent,
        );
      }
    },
    onSettled: (_data, _err, { eventId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.events.detail(eventId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.events.rsvps(eventId) });
    },
  });
}

export function useCreateEvent(): UseMutationResult<Event, ApiError, EventDraft> {
  const queryClient = useQueryClient();
  const authedMutate = useApiMutate();
  return useMutation<Event, ApiError, EventDraft>({
    mutationFn: (draft) => createEvent(authedMutate, draft),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.events.all() });
    },
  });
}

interface UpdateEventVars {
  id: string;
  patch: Partial<Event>;
}

export function useUpdateEvent(): UseMutationResult<
  Event,
  ApiError,
  UpdateEventVars
> {
  const queryClient = useQueryClient();
  const authedMutate = useApiMutate();
  return useMutation<Event, ApiError, UpdateEventVars>({
    mutationFn: ({ id, patch }) => updateEvent(authedMutate, id, patch),
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKeys.events.detail(updated.id), updated);
      queryClient.invalidateQueries({ queryKey: queryKeys.events.all() });
    },
  });
}

export function useDeleteEvent(): UseMutationResult<void, ApiError, string> {
  const queryClient = useQueryClient();
  const authedMutate = useApiMutate();
  return useMutation<void, ApiError, string>({
    mutationFn: (id) => deleteEvent(authedMutate, id),
    onSuccess: (_data, id) => {
      queryClient.removeQueries({ queryKey: queryKeys.events.detail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.events.all() });
    },
  });
}
