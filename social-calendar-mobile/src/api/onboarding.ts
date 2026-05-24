/**
 * Onboarding API stubs.
 *
 * Stub-phase: contactsLookup returns empty results (mocks were evacuated
 * 2026-05-21). Production wire-in: POST SHA-256 hashed phones + emails to
 * /onboarding/contacts/lookup — NEVER upload raw contact data (R15-10).
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { simulateLatency } from './_utils';
import { queryKeys } from './queryKeys';

export interface ContactsMatch {
  id: string;
  name: string;
  handle: string;
  letter: string;
  photoUrl?: string | null;
  requestState: 'none' | 'sent';
}

/**
 * Stub-phase: returns an empty array since mock data was evacuated.
 * Production: POST hashed contact identifiers to /onboarding/contacts/lookup.
 */
export async function contactsLookup(): Promise<ContactsMatch[]> {
  await simulateLatency();
  // TODO(contacts-lookup-endpoint): hash local contacts + POST to backend
  return [];
}

/**
 * Friend-request from the Matches list. Isolated from src/api/friends.ts so
 * the Matches screen doesn't inherit unrelated invalidations.
 */
export function useSendFriendRequestFromMatches() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (personId: string) => {
      await simulateLatency();
      // 10% failure rate to exercise the error path during dev
      if (Math.random() < 0.1) throw new Error('Network error');
      return personId;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.friends.requests() });
    },
  });
}
