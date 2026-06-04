/**
 * Chat socket factory (R18 realtime client).
 *
 * The backend Socket.io server (`social-calendar-api/src/sockets/index.ts`)
 * authenticates via `socket.handshake.auth.token` (a Clerk JWT) and rejects
 * the handshake otherwise. We supply `auth` as a FUNCTION so a fresh token is
 * fetched before every (re)connection attempt — Clerk JWTs are short-lived and
 * a static token would fail on the first reconnect.
 *
 * Created with `autoConnect: false`; the RealtimeProvider owns the connect /
 * disconnect lifecycle (tied to the Clerk session).
 */

import { io } from 'socket.io-client';

import { apiOrigin } from '../api/_client';
import type { ChatSocket } from './events.types';

/** Resolves the current Clerk session JWT (or null when signed out). */
export type TokenGetter = () => Promise<string | null>;

export function createChatSocket(getToken: TokenGetter): ChatSocket {
  return io(apiOrigin, {
    autoConnect: false,
    transports: ['websocket'],
    // Called before each connection attempt (including reconnects), so the
    // server always sees a fresh token. socket.io awaits this callback.
    auth: (cb: (data: { token: string }) => void) => {
      getToken()
        .then((token) => cb({ token: token ?? '' }))
        .catch(() => cb({ token: '' }));
    },
  }) as ChatSocket;
}
