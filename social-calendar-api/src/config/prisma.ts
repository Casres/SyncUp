import { PrismaClient } from '@prisma/client';
import { env } from './env.js';

// Migration-owner client — bypasses RLS. Use ONLY for:
//   1. Auth-time user upsert (chicken-and-egg: no current_user_id yet)
//   2. Webhook handler upserts
// Do NOT use this client anywhere else.
export const prisma = new PrismaClient({
  datasources: { db: { url: env.DATABASE_URL } },
  log: env.NODE_ENV === 'development' ? ['query', 'warn', 'error'] : ['error'],
});

// App-role client — subject to RLS. Use for ALL per-request transactions.
// This is what gets passed into request.prismaTransaction via auth.middleware.ts.
export const prismaApp = new PrismaClient({
  datasources: { db: { url: env.DATABASE_URL_APP } },
  log: [{ emit: 'event', level: 'query' }, 'warn', 'error'],
});

prismaApp.$on('query', (e) => {
  console.log('[prismaApp query]', e.query, '|params:', e.params);
});
