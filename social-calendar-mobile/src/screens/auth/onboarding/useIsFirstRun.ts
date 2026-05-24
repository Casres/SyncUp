/**
 * R15-13: derives the "first-run" flag from User.stats.
 *
 * A user is first-run when ALL THREE counters are zero:
 *   User.stats.hosted   === 0
 *   User.stats.friends  === 0
 *   User.stats.groups   === 0
 *
 * The transition out of first-run is ONE-WAY and GLOBAL: the instant any
 * counter becomes non-zero, every R15-13 surface stops rendering first-run
 * copy. There is no persisted "first-run dismissed" flag — the derivation is
 * purely from User.stats, and React Query revalidation handles the
 * cross-surface refresh.
 *
 * Returns `false` while the User is still loading (conservative — avoids
 * flashing first-run copy to a returning user).
 */

import { useMyProfile } from '../../../api/profile';

export function useIsFirstRun(): boolean {
  const { data: me } = useMyProfile();
  if (!me) return false;
  return me.stats.hosted === 0 && me.stats.friends === 0 && me.stats.groups === 0;
}
