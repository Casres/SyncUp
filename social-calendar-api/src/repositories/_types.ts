import type { PrismaClient } from '@prisma/client';
import type { ITXClientDenyList } from '@prisma/client/runtime/library';

/**
 * Either the singleton PrismaClient or a per-request transaction client.
 *
 * Domain repositories accept this so callers can pick the right client.
 * In production, the auth middleware always passes the per-request
 * transaction client (`request.prismaTransaction`) so RLS policies see
 * `app.current_user_id`. See `src/middleware/AUTH_HANDOFF.md`.
 *
 * Originally introduced inline in `events.repository.ts`; lifted here
 * once the Friends domain landed so multiple repositories can share the
 * type without one domain importing from another.
 */
export type Db = Omit<PrismaClient, ITXClientDenyList> | PrismaClient;
