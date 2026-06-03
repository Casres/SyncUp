/**
 * Events API — React Query hooks.
 *
 * DATA FLOW
 *   Every hook calls the live SyncUp backend via `useApiFetch()` /
 *   `useApiMutate()`.
 *
 * REAL BACKEND ENDPOINTS
 *   GET    /events                            → { events: BackendEvent[] }
 *   GET    /events/:id                        → BackendEvent (with invites)
 *   POST   /events                            → BackendEvent   (body: BackendCreateBody)
 *   POST   /events/:id/invites                → InvitePayload[] (body: { recipientIds })
 *   PATCH  /events/:id                        → BackendEvent   (body: BackendUpdateBody)
 *   DELETE /events/:id                        → 204 No Content
 *   POST   /events/:id/rsvp                   → 204            (body: { status })
 *
 * SHAPE MAPPING
 *   The backend uses a relational model (organisers[], invites[]) that differs
 *   from the mobile Event type (hostId, coHostIds, rsvps{}, inviteeIds[]).
 *   `toMobileEvent()` handles the translation. `currentUserId` (Clerk userId)
 *   is threaded through so the current user's invite is also indexed under the
 *   `'me'` key in `rsvps` — preserving the mock-data convention that screens
 *   depend on (e.g. `event.rsvps['me']`).
 *
 * CLERK INTEGRATION
 *   All hooks pull a pre-authorized fetch/mutate via `useApiFetch()` /
 *   `useApiMutate()` from `_client.ts` — never import @clerk/clerk-expo
 *   directly here. Tokens are intentionally absent from query keys so
 *   logout/login is handled by the auth layer's cache invalidation.
 *
 */
import { useAuth } from '@clerk/clerk-expo';
import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';

import type { Event, RSVPStatus } from '../../../TYPES';

import { ApiError } from './_utils';
import {
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
// Backend wire types (what the API actually returns)
// ---------------------------------------------------------------------------

interface BackendPublicProfile {
  id: string;
  username: string;    // Prisma User.username  (≈ mobile Friend.handle)
  displayName: string; // Prisma User.displayName (≈ mobile Friend.name)
  avatarUrl: string | null;
}

interface BackendOrganiser {
  id: string;
  role: string; // 'CREATOR' | 'CO_HOST'
  user: BackendPublicProfile;
}

interface BackendInvite {
  id: string;
  status: string; // 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'MAYBE'
  friendGroupId: string | null;
  recipient: BackendPublicProfile;
}

/**
 * Shape returned by `GET /events/:id` (full, with invites).
 * `GET /events` list omits `invites` — callers should treat it as optional.
 */
interface BackendEvent {
  id: string;
  creatorId: string;
  title: string;
  description: string | null;
  location: string | null;
  startsAt: string; // ISO datetime string
  endsAt: string;   // ISO datetime string
  recurrence: string;
  recurrenceRuleRaw: string | null;
  allowSuggestionVoting: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  creator: BackendPublicProfile;
  organisers: BackendOrganiser[];
  invites?: BackendInvite[]; // omitted from list endpoint
}

// ---------------------------------------------------------------------------
// Shape-mapping helpers
// ---------------------------------------------------------------------------

/**
 * Backend InviteStatus → mobile RSVPStatus.
 * PENDING → null (not yet responded), ACCEPTED → 'yes', DECLINED → 'no',
 * MAYBE → 'maybe'.
 */
function inviteStatusToRsvp(status: string): RSVPStatus {
  if (status === 'ACCEPTED') return 'yes';
  if (status === 'DECLINED') return 'no';
  if (status === 'MAYBE') return 'maybe';
  return null; // PENDING
}

/**
 * Convert a `BackendEvent` to the mobile `Event` shape.
 *
 * `currentUserId` (the Clerk userId of the authenticated user) is optional.
 * When supplied, the current user's invite is also indexed under the `'me'`
 * key in `rsvps` so that code like `event.rsvps['me']` continues to work
 * without change when screens are migrated to live data.
 */
function toMobileEvent(raw: BackendEvent, currentUserId?: string | null): Event {
  const coHostIds = raw.organisers
    .filter((o) => o.role !== 'CREATOR')
    .map((o) => o.user.id);

  const invites = raw.invites ?? [];
  const inviteeIds = invites.map((inv) => inv.recipient.id);

  const rsvps: Record<string, RSVPStatus> = {};
  for (const inv of invites) {
    const status = inviteStatusToRsvp(inv.status);
    rsvps[inv.recipient.id] = status;
    // Alias current user's entry under 'me' for backward compat with
    // code paths that do `event.rsvps['me']`.
    if (currentUserId && inv.recipient.id === currentUserId) {
      rsvps['me'] = status;
    }
  }

  return {
    id: raw.id,
    title: raw.title,
    hostId: raw.creatorId,
    coHostIds,
    // ISO date portion only (YYYY-MM-DD) — backend stores full datetime.
    iso: raw.startsAt.substring(0, 10),
    startAt: raw.startsAt,
    endAt: raw.endsAt,
    ...(raw.location != null ? { location: raw.location } : {}),
    ...(raw.description != null ? { description: raw.description } : {}),
    inviteeIds,
    rsvps,
    // geo, glyph, price, groupId — not in backend schema; omitted.
  };
}

// ---------------------------------------------------------------------------
// Fetch / mutate functions
// ---------------------------------------------------------------------------

export async function getEvents(
  authedFetch: AuthedFetch,
  currentUserId?: string | null,
): Promise<Event[]> {
  const data = await authedFetch<{ events: BackendEvent[] }>('/events');
  return data.events.map((e) => toMobileEvent(e, currentUserId));
}

export async function getEvent(
  authedFetch: AuthedFetch,
  id: string,
  currentUserId?: string | null,
): Promise<Event> {
  const raw = await authedFetch<BackendEvent>(`/events/${encodeURIComponent(id)}`);
  return toMobileEvent(raw, currentUserId);
}

export async function createEvent(
  authedMutate: AuthedMutate,
  draft: EventDraft,
): Promise<Event> {
  // Backend schema: title, description?, location?, startsAt, endsAt.
  // Unsupported draft fields (glyph, price, groupId, iso, geo) are dropped.
  const body: Record<string, unknown> = { title: draft.title };
  if (draft.description != null) body['description'] = draft.description;
  if (draft.location != null) body['location'] = draft.location;
  if (draft.startAt != null) body['startsAt'] = draft.startAt;
  if (draft.endAt != null) body['endsAt'] = draft.endAt;

  const created = await authedMutate<BackendEvent>('POST', '/events', body);

  // Send invites as a separate incremental request (event creation and
  // invite delivery are decoupled in the backend schema).
  if (draft.inviteeIds.length > 0) {
    await authedMutate<unknown>(
      'POST',
      `/events/${encodeURIComponent(created.id)}/invites`,
      { recipientIds: draft.inviteeIds },
    );
  }

  // Return the mapped event. inviteeIds/rsvps will be empty here (the
  // creation response has no invites yet); the detail screen re-fetches
  // via useEvent(id) which returns the full shape with invites.
  return toMobileEvent(created);
}

export async function updateEvent(
  authedMutate: AuthedMutate,
  id: string,
  patch: Partial<Event>,
  currentUserId?: string | null,
): Promise<Event> {
  // Translate mobile patch keys to backend field names.
  // Omit fields the backend update schema doesn't accept.
  const backendPatch: Record<string, unknown> = {};
  if (patch.title !== undefined) backendPatch['title'] = patch.title;
  if (patch.description !== undefined) backendPatch['description'] = patch.description;
  if (patch.location !== undefined) backendPatch['location'] = patch.location;
  if (patch.startAt !== undefined) backendPatch['startsAt'] = patch.startAt;
  if (patch.endAt !== undefined) backendPatch['endsAt'] = patch.endAt;

  const updated = await authedMutate<BackendEvent>(
    'PATCH',
    `/events/${encodeURIComponent(id)}`,
    backendPatch,
  );
  return toMobileEvent(updated, currentUserId);
}

export async function deleteEvent(
  authedMutate: AuthedMutate,
  id: string,
): Promise<void> {
  await authedMutate<void>('DELETE', `/events/${encodeURIComponent(id)}`);
}

export async function getRSVPs(
  authedFetch: AuthedFetch,
  eventId: string,
): Promise<RSVPEntry[]> {
  // The backend embeds invites in the event detail response; there is no
  // standalone /events/:id/rsvps endpoint. Fetch the event and extract.
  const raw = await authedFetch<BackendEvent>(
    `/events/${encodeURIComponent(eventId)}`,
  );
  return (raw.invites ?? []).map((inv) => ({
    userId: inv.recipient.id,
    status: inviteStatusToRsvp(inv.status),
  }));
}

export async function submitRSVP(
  authedMutate: AuthedMutate,
  eventId: string,
  status: RSVPStatus,
): Promise<void> {
  // Convenience endpoint — backend resolves inviteId from (eventId, userId).
  // Maps mobile RSVPStatus → backend InviteStatus.
  const backendStatus =
    status === 'yes' ? 'ACCEPTED' :
    status === 'no' ? 'DECLINED' :
    status === 'maybe' ? 'MAYBE' :
    'PENDING';
  await authedMutate<void>(
    'POST',
    `/events/${encodeURIComponent(eventId)}/rsvp`,
    { status: backendStatus },
  );
}

// ---------------------------------------------------------------------------
// React Query hooks
// ---------------------------------------------------------------------------

export function useEvents(): UseQueryResult<Event[], ApiError> {
  const authedFetch = useApiFetch();
  const { userId } = useAuth();
  return useQuery<Event[], ApiError>({
    queryKey: queryKeys.events.all(),
    queryFn: () => getEvents(authedFetch, userId),
  });
}

export function useEvent(id: string): UseQueryResult<Event, ApiError> {
  const authedFetch = useApiFetch();
  const { userId } = useAuth();
  return useQuery<Event, ApiError>({
    queryKey: queryKeys.events.detail(id),
    queryFn: () => getEvent(authedFetch, id, userId),
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
 *  3. Patch `Event.rsvps` optimistically under both `userId` and `'me'`.
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
  const { userId } = useAuth();

  return useMutation<void, ApiError, SubmitRSVPVars, SubmitRSVPContext>({
    mutationFn: ({ eventId, status }) => submitRSVP(authedMutate, eventId, status),
    onMutate: async ({ eventId, status }) => {
      const key = queryKeys.events.detail(eventId);
      await queryClient.cancelQueries({ queryKey: key });
      const previousEvent = queryClient.getQueryData<Event>(key);
      if (previousEvent) {
        queryClient.setQueryData<Event>(key, {
          ...previousEvent,
          rsvps: {
            ...previousEvent.rsvps,
            // Index under both the actual userId and the 'me' alias so any
            // code that reads either key sees the optimistic value.
            ...(userId ? { [userId]: status } : {}),
            me: status,
          },
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
  const { userId } = useAuth();
  return useMutation<Event, ApiError, UpdateEventVars>({
    mutationFn: ({ id, patch }) => updateEvent(authedMutate, id, patch, userId),
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
