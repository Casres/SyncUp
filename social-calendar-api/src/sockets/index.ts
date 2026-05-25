import { Server } from 'socket.io';
import type { FastifyInstance } from 'fastify';
import { verifyToken } from '@clerk/backend';
import type { JwtPayload } from '@clerk/types';
import { env } from '../config/env.js';
import { prisma } from '../config/prisma.js';
import { registerAvailabilityHandlers } from './availability.socket.js';
import { registerEventsHandlers } from './events.socket.js';
import { registerFriendsHandlers } from './friends.socket.js';
import { registerGroupsHandlers } from './groups.socket.js';
import { registerNotificationsHandlers } from './notifications.socket.js';
import { registerPresenceHandlers } from './presence.socket.js';
import type {
  ClientToServerEvents,
  InterServerEvents,
  ServerToClientEvents,
  SocketData,
} from '../types/socket.types.js';

/**
 * Initialise the Socket.io server, attach the Clerk auth middleware, and
 * register every domain's socket handlers.
 *
 * The auth middleware uses the migration-owner `prisma` client (NOT
 * `prismaApp`) for the connect-time user lookup, because no per-request
 * RLS context exists yet — `app.current_user_id` hasn't been set on any
 * connection that this socket-server lookup might use.
 *
 * Once the user is resolved, downstream handlers that need to query with
 * RLS gates apply (e.g. presence's friends lookup, groups' membership
 * check) wrap their calls in their own `prismaApp.$transaction(...)` with
 * a fresh `set_config('app.current_user_id', ...)`.
 *
 * Returns the typed `Server` so it can be decorated onto Fastify.
 */
export function initSocketServer(
  fastify: FastifyInstance,
): Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
> {
  const io = new Server<
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData
  >(fastify.server, {
    // CORS is permissive for now — this should tighten once a mobile
    // origin contract is locked. The mobile app is React Native and does
    // not send a browser Origin header, so '*' here is safe today.
    cors: { origin: '*', methods: ['GET', 'POST'] },
  });

  io.use(async (socket, next) => {
    const token = socket.handshake.auth.token as string | undefined;
    if (!token) return next(new Error('Unauthorized'));

    let claims: JwtPayload;
    try {
      claims = await verifyToken(token, { secretKey: env.CLERK_SECRET_KEY });
    } catch (err) {
      fastify.log.debug({ err }, 'Socket Clerk token verification failed');
      return next(new Error('Unauthorized'));
    }

    if (!claims.sub) return next(new Error('Unauthorized'));

    try {
      // Migration-owner client — bypasses RLS. We have no
      // `app.current_user_id` context at connect time (chicken-and-egg),
      // so we must use the privileged client. This mirrors the same
      // pattern in src/middleware/auth.middleware.ts. Lookup is by
      // clerkId; the row is expected to already exist (provisioned by
      // the auth middleware on the user's first REST call).
      const user = await prisma.user.findUnique({
        where: { clerkId: claims.sub },
        select: { id: true, username: true, displayName: true },
      });
      if (!user) return next(new Error('User not found'));

      socket.data.user = user;
      next();
    } catch (err) {
      fastify.log.error({ err }, 'Socket auth user lookup failed');
      next(new Error('Unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    fastify.log.debug(
      { userId: socket.data.user.id, socketId: socket.id },
      'socket connected',
    );

    registerPresenceHandlers(io, socket);
    registerEventsHandlers(io, socket);
    registerFriendsHandlers(io, socket);
    registerGroupsHandlers(io, socket);
    registerAvailabilityHandlers(io, socket);
    registerNotificationsHandlers(io, socket);

    socket.on('disconnect', (reason) => {
      fastify.log.debug(
        { userId: socket.data.user.id, socketId: socket.id, reason },
        'socket disconnected',
      );
    });
  });

  return io;
}
