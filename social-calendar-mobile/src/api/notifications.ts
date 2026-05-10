/**
 * Notifications API — React Query hooks for the NotifSheet activity feed.
 *
 * DATA FLOW
 *   For now this hook always returns MOCK_NOTIFICATIONS. The real backend
 *   endpoint will be wired here once the server route lands.
 *
 *   // TODO: replace with real endpoint (e.g. GET /me/notifications) once the
 *   //       backend route is implemented. Follow the explore.ts pattern:
 *   //         if (isApiConfigured()) return authedFetch<Notif[]>('/me/notifications');
 *
 * staleTime: 60_000 (1 min) so a quick re-open of the sheet doesn't refetch.
 */

import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import type { Notif } from '../../../TYPES';
import { MOCK_NOTIFICATIONS } from '../mocks';

import { simulateLatency, type ApiError } from './_utils';
import { queryKeys } from './queryKeys';

const STALE_MS = 60_000;

export async function getNotifications(): Promise<Notif[]> {
  // Mock-only path. When the live endpoint exists, branch on isApiConfigured()
  // here and call authedFetch<Notif[]>('/me/notifications').
  await simulateLatency();
  return [...MOCK_NOTIFICATIONS];
}

export function useNotifications(): UseQueryResult<Notif[], ApiError> {
  return useQuery<Notif[], ApiError>({
    queryKey: queryKeys.notifications.all(),
    queryFn: getNotifications,
    staleTime: STALE_MS,
  });
}
