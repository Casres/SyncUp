import type {
  FastifyInstance,
  FastifyPluginAsync,
  FastifyReply,
  FastifyRequest,
} from 'fastify';
import fp from 'fastify-plugin';
import { verifyToken } from '@clerk/backend';
import type { JwtPayload } from '@clerk/types';
import { prisma, prismaApp } from '../config/prisma.js';
import { env } from '../config/env.js';

const BEARER_PREFIX = 'Bearer ';
const SKIP_PREFIXES = ['/webhooks/', '/health'];
const TX_TIMEOUT_MS = 30_000;

type TxControl = {
  resolve: () => void;
  reject: (err: unknown) => void;
  promise: Promise<unknown>;
};

declare module 'fastify' {
  interface FastifyRequest {
    _txControl?: TxControl;
  }
}

function extractBearerToken(authorization: string | undefined): string | null {
  if (!authorization || !authorization.startsWith(BEARER_PREFIX)) return null;
  const token = authorization.slice(BEARER_PREFIX.length).trim();
  return token.length > 0 ? token : null;
}

type ClerkClaims = JwtPayload & {
  username?: string | null;
  name?: string | null;
  given_name?: string | null;
  family_name?: string | null;
  email?: string | null;
};

function deriveUsername(claims: ClerkClaims, clerkId: string): string {
  if (claims.username && claims.username.length > 0) return claims.username;
  if (claims.email) {
    const localPart = claims.email.split('@')[0];
    if (localPart && localPart.length > 0) return localPart;
  }
  return `user_${clerkId.slice(0, 12)}`;
}

function deriveDisplayName(claims: ClerkClaims, fallback: string): string {
  if (claims.name && claims.name.length > 0) return claims.name;
  const parts = [claims.given_name, claims.family_name].filter(
    (p): p is string => Boolean(p && p.length > 0),
  );
  if (parts.length > 0) return parts.join(' ');
  return fallback;
}

async function resolveUser(claims: ClerkClaims) {
  const clerkId = claims.sub;
  const username = deriveUsername(claims, clerkId);
  const displayName = deriveDisplayName(claims, username);

  // Upsert runs on the singleton connection (migration owner / RLS bypass).
  // See prisma/HANDOFF.md — runtime expects two roles, but on a single role
  // setup the owner bypasses RLS by default, so this also works.
  return prisma.user.upsert({
    where: { clerkId },
    update: {},
    create: { clerkId, username, displayName },
  });
}

const authPlugin: FastifyPluginAsync = async (app: FastifyInstance) => {
  app.addHook(
    'preHandler',
    async (request: FastifyRequest, reply: FastifyReply) => {
      if (SKIP_PREFIXES.some((p) => request.url.startsWith(p))) return;

      const token = extractBearerToken(request.headers.authorization);
      if (!token) {
        return reply
          .code(401)
          .send({ error: 'Missing or malformed Authorization header' });
      }

      let claims: ClerkClaims;
      try {
        claims = (await verifyToken(token, {
          secretKey: env.CLERK_SECRET_KEY,
        })) as ClerkClaims;
      } catch (err) {
        request.log.debug({ err }, 'Clerk token verification failed');
        return reply.code(401).send({ error: 'Invalid or expired token' });
      }

      if (!claims.sub) {
        return reply
          .code(401)
          .send({ error: 'Token is missing subject claim' });
      }

      const user = await resolveUser(claims);

      // Open a transaction that spans the entire request handler so that
      // SET LOCAL app.current_user_id stays in scope for every query the
      // handler issues. The callback awaits a deferred promise that we
      // resolve from onResponse / reject from onError.
      let txResolve!: () => void;
      let txReject!: (err: unknown) => void;
      let txReady!: () => void;
      const txDone = new Promise<void>((resolve, reject) => {
        txResolve = resolve;
        txReject = reject;
      });
      const ready = new Promise<void>((resolve) => {
        txReady = resolve;
      });

      // Per-request transaction runs on the app-role client so RLS policies
      // are actually enforced. The user upsert above intentionally uses the
      // migration-owner `prisma` client to bypass RLS (chicken-and-egg: no
      // current_user_id is set yet).
      const txPromise = prismaApp
        .$transaction(
          async (tx) => {
            await tx.$executeRaw`SELECT set_config('app.current_user_id', ${user.id}, true)`;
            request.user = user;
            request.prismaTransaction = tx;
            txReady();
            await txDone;
          },
          { timeout: TX_TIMEOUT_MS },
        )
        .catch((err: unknown) => {
          // If $transaction itself fails (e.g. connection error before the
          // callback runs), unblock preHandler so the request can fail
          // cleanly with a 500 rather than hang.
          txReady();
          throw err;
        });

      request._txControl = {
        resolve: txResolve,
        reject: txReject,
        promise: txPromise,
      };

      await ready;
    },
  );

  app.addHook('onResponse', async (request: FastifyRequest) => {
    const ctrl = request._txControl;
    if (!ctrl) return;
    ctrl.resolve();
    try {
      await ctrl.promise;
    } catch (err) {
      // Already logged via onError; swallow to avoid double-throwing in
      // the response lifecycle.
      request.log.debug({ err }, 'Transaction commit error after response');
    }
  });

  app.addHook(
    'onError',
    async (request: FastifyRequest, _reply: FastifyReply, err: Error) => {
      const ctrl = request._txControl;
      if (!ctrl) return;
      ctrl.reject(err);
      try {
        await ctrl.promise;
      } catch {
        // Expected — we just rejected it.
      }
    },
  );
};

export default fp(authPlugin, {
  name: 'auth',
  fastify: '5.x',
});
