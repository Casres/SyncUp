import 'fastify';
import type { PrismaClient, User } from '@prisma/client';
import type { ITXClientDenyList } from '@prisma/client/runtime/library';
import type { Server as SocketIOServer } from 'socket.io';
import type {
  ClientToServerEvents,
  InterServerEvents,
  ServerToClientEvents,
  SocketData,
} from './socket.types.js';

declare module 'fastify' {
  /**
   * The Socket.io server, wired in `src/server.ts` after `app.listen()`.
   * Domain services emit through this instance — see Option A pattern in
   * `src/sockets/SOCKETIO_HANDOFF.md`.
   */
  interface FastifyInstance {
    io: SocketIOServer<
      ClientToServerEvents,
      ServerToClientEvents,
      InterServerEvents,
      SocketData
    >;
  }

  interface FastifyRequest {
    /**
     * The authenticated User row, resolved from the Clerk JWT and upserted
     * by the global auth middleware. Always populated for authenticated
     * routes — the middleware short-circuits with 401 otherwise.
     */
    user: User;

    /**
     * Per-request Prisma transaction client. The auth middleware opens a
     * transaction and runs `set_config('app.current_user_id', ...)` on it
     * so RLS policies can resolve the caller's identity.
     *
     * Domain repositories MUST use this client, not the singleton from
     * `config/prisma.ts`. Queries issued through the singleton run on a
     * different connection that has no `app.current_user_id` set, so RLS
     * will deny everything.
     */
    prismaTransaction: Omit<PrismaClient, ITXClientDenyList>;

    /**
     * Raw request body, attached only by the webhook scope's content-type
     * parser. Used for Svix signature verification of Clerk webhooks.
     * Undefined on regular routes.
     */
    rawBody?: string;
  }
}
