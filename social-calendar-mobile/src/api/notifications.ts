/**
 * Notifications API — React Query hooks for the NotifSheet activity feed.
 *
 * DATA FLOW
 *   Every hook calls the live SyncUp backend via `useApiFetch()` /
 *   `useApiMutate()`.
 *
 * REAL BACKEND ENDPOINTS
 *   GET    /notifications                     → { notifications: NotifPayload[], unreadCount: number }
 *   POST   /notifications/:id/read            → 204
 *   POST   /notifications/read-all            → { count: number }
 *   DELETE /notifications/:id                 → 204 (dismiss / soft-delete)
 *
 * SHAPE MAPPING
 *   The backend `type` field is SCREAMING_SNAKE_CASE (Prisma enum) while the
 *   mobile `Notif` union uses lowercase_snake (e.g. 'RSVP' → 'rsvp').
 *   `toMobileNotif()` handles the conversion. The RSVP notification's
 *   `rsvpStatus` is also re-mapped: InviteStatus → NotifRsvpStatus
 *   (ACCEPTED→'yes', DECLINED→'no', MAYBE→'maybe').
 *
 *   GROUP_INVITE notifications are currently dispatched for both event
 *   invites and group invites (backend convention). The mobile renders
 *   them as `group_invite` cards — `eventId`/`eventName` fields are
 *   present in the payload for event-invite rows; `groupId`/`groupName`
 *   for true group invites (dispatched when that domain is wired).
 *
 * staleTime: 60_000 (1 min) so a quick re-open of the sheet doesn't refetch.
 */

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';

import type { Notif, NotifType } from '../../../TYPES';

import { ApiError } from './_utils';
import {
  useApiFetch,
  useApiMutate,
  type AuthedFetch,
  type AuthedMutate,
} from './_client';
import { queryKeys } from './queryKeys';

const STALE_MS = 60_000;

// ---------------------------------------------------------------------------
// Backend wire type
// ---------------------------------------------------------------------------

/**
 * Shape returned by the backend `toPayload()` function in
 * `notifications.service.ts`. The `type` is the Prisma enum value
 * (SCREAMING_SNAKE_CASE); extra payload fields are hoisted to the top level.
 */
interface BackendNotif {
  id: string;
  type: string;
  read: boolean;
  createdAt: string;
  [key: string]: unknown; // hoisted payload fields
}

// ---------------------------------------------------------------------------
// Shape-mapping helpers
// ---------------------------------------------------------------------------

/** Prisma NotifType (SCREAMING_SNAKE) → mobile NotifType (lowercase_snake). */
const BACKEND_TYPE_MAP: Record<string, NotifType> = {
  RSVP: 'rsvp',
  EVENT_REMINDER: 'event_reminder',
  CO_HOST: 'co_host',
  CO_HOST_REVOKED: 'co_host_revoked',
  GROUP_ACTIVITY: 'group_activity',
  INBOUND_BROADCAST: 'inbound_broadcast',
  FRIEND_REQUEST: 'friend_request',
  GROUP_INVITE: 'group_invite',
};

/**
 * Convert a backend notification row into the mobile `Notif` union shape.
 * Returns `null` for any unknown `type` so the caller can filter safely.
 *
 * The RSVP `rsvpStatus` field is re-mapped from InviteStatus to
 * `NotifRsvpStatus` ('yes' | 'maybe' | 'no').
 */
function toMobileNotif(raw: BackendNotif): Notif | null {
  const type = BACKEND_TYPE_MAP[raw.type];
  if (!type) return null;

  const base = { id: raw.id, type, read: raw.read, createdAt: raw.createdAt };

  // For RSVP cards, re-map rsvpStatus from InviteStatus to NotifRsvpStatus.
  if (type === 'rsvp') {
    const backendStatus = raw['rsvpStatus'] as string | undefined;
    const rsvpStatus =
      backendStatus === 'ACCEPTED' ? 'yes' :
      backendStatus === 'DECLINED' ? 'no' :
      'maybe';
    return { ...base, ...raw, type, rsvpStatus } as unknown as Notif;
  }

  return { ...base, ...raw, type } as unknown as Notif;
}

// ---------------------------------------------------------------------------
// Fetch / mutate functions
// ---------------------------------------------------------------------------

export async function getNotifications(
  authedFetch: AuthedFetch,
): Promise<Notif[]> {
  const data = await authedFetch<{ notifications: BackendNotif[]; unreadCount: number }>(
    '/notifications',
  );
  return data.notifications.flatMap((n) => {
    const mapped = toMobileNotif(n);
    return mapped ? [mapped] : [];
  });
}

export async function markNotifRead(
  authedMutate: AuthedMutate,
  id: string,
): Promise<void> {
  await authedMutate<void>('POST', `/notifications/${encodeURIComponent(id)}/read`);
}

export async function markAllNotifsRead(
  authedMutate: AuthedMutate,
): Promise<void> {
  await authedMutate<void>('POST', '/notifications/read-all');
}

export async function dismissNotif(
  authedMutate: AuthedMutate,
  id: string,
): Promise<void> {
  await authedMutate<void>('DELETE', `/notifications/${encodeURIComponent(id)}`);
}

// ---------------------------------------------------------------------------
// React Query hooks
// ---------------------------------------------------------------------------

export function useNotifications(): UseQueryResult<Notif[], ApiError> {
  const authedFetch = useApiFetch();
  return useQuery<Notif[], ApiError>({
    queryKey: queryKeys.notifications.all(),
    queryFn: () => getNotifications(authedFetch),
    staleTime: STALE_MS,
  });
}

/** Mark a single notification read. Optimistically flips `read` in cache. */
export function useMarkNotifRead(): UseMutationResult<void, ApiError, string> {
  const queryClient = useQueryClient();
  const authedMutate = useApiMutate();
  return useMutation<void, ApiError, string>({
    mutationFn: (id) => markNotifRead(authedMutate, id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.notifications.all() });
      queryClient.setQueryData<Notif[]>(
        queryKeys.notifications.all(),
        (prev) => prev?.map((n) => (n.id === id ? { ...n, read: true } : n)) ?? [],
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all() });
    },
  });
}

/** Mark every unread notification read. Optimistically flips the whole list. */
export function useMarkAllNotifsRead(): UseMutationResult<void, ApiError, void> {
  const queryClient = useQueryClient();
  const authedMutate = useApiMutate();
  return useMutation<void, ApiError, void>({
    mutationFn: () => markAllNotifsRead(authedMutate),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: queryKeys.notifications.all() });
      queryClient.setQueryData<Notif[]>(
        queryKeys.notifications.all(),
        (prev) => prev?.map((n) => ({ ...n, read: true })) ?? [],
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all() });
    },
  });
}

/** Dismiss (soft-delete) a notification. Optimistically removes it from cache. */
export function useDismissNotif(): UseMutationResult<void, ApiError, string> {
  const queryClient = useQueryClient();
  const authedMutate = useApiMutate();
  return useMutation<void, ApiError, string>({
    mutationFn: (id) => dismissNotif(authedMutate, id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.notifications.all() });
      queryClient.setQueryData<Notif[]>(
        queryKeys.notifications.all(),
        (prev) => prev?.filter((n) => n.id !== id) ?? [],
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all() });
    },
  });
}
