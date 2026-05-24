/**
 * R15-10: stub hook for contacts → SyncUp user matching.
 *
 * Stub-phase: returns users from the API stub layer (empty in prod-readiness
 * mode since the mocks were evacuated; will be non-empty once the backend
 * contacts-lookup endpoint ships).
 *
 * Production wire-in (NOT done here — separate backend agent):
 *   1. Read contacts via Contacts.getContactsAsync()
 *   2. Hash phones + emails locally (SHA-256, lower-cased)
 *   3. POST hashes to /onboarding/contacts/lookup
 *   4. NEVER upload raw contact data — only hashes (R15-10 explicit)
 */

import { useQuery } from '@tanstack/react-query';
import { contactsLookup } from '../../../api/onboarding';
import { queryKeys } from '../../../api/queryKeys';

export function useContactsMatches() {
  return useQuery({
    queryKey: queryKeys.onboarding.contactsMatches('stub'),
    queryFn: () => contactsLookup(),
    staleTime: 5 * 60 * 1000,
  });
}
