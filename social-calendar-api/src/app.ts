import Fastify, { type FastifyInstance } from 'fastify';
import authPlugin from './middleware/auth.middleware.js';
import { availabilityRoutes } from './routes/availability.routes.js';
import { eventsRoutes } from './routes/events.routes.js';
import { exploreRoutes } from './routes/explore.routes.js';
import { friendGroupsRoutes } from './routes/friendGroups.routes.js';
import { friendsRoutes } from './routes/friends.routes.js';
import { groupsRoutes } from './routes/groups.routes.js';
import { healthRoutes } from './routes/health.routes.js';
import { notificationsRoutes } from './routes/notifications.routes.js';
import { uploadsRoutes } from './routes/uploads.routes.js';
import { webhooksRoutes } from './routes/webhooks.routes.js';

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger: true });

  // Liveness check for Railway / load balancers. Registered before the
  // auth plugin so the global preHandler does not run for it (it's also
  // on the auth middleware's skip list as belt-and-braces). The route
  // path itself is `/health` — do not pass a prefix here.
  await app.register(healthRoutes);

  // Webhooks register in their own encapsulated scope. They use a raw-body
  // parser for Svix signature verification and DO NOT carry a Clerk JWT,
  // so the auth middleware below skips this URL prefix as well.
  await app.register(webhooksRoutes);

  // Global auth middleware. Wrapped with fastify-plugin so the preHandler
  // hook applies to every subsequent route registered on this instance.
  // Skips /webhooks/* and /health.
  await app.register(authPlugin);

  // Domain routes. Registered after the auth plugin so every handler
  // gets request.user + request.prismaTransaction. See
  // src/middleware/AUTH_HANDOFF.md.
  await app.register(eventsRoutes, { prefix: '/events' });
  await app.register(exploreRoutes, { prefix: '/explore' });
  await app.register(friendsRoutes, { prefix: '/friends' });
  await app.register(friendGroupsRoutes, { prefix: '/friend-groups' });
  await app.register(groupsRoutes, { prefix: '/groups' });
  await app.register(notificationsRoutes, { prefix: '/notifications' });
  await app.register(availabilityRoutes, { prefix: '/availability' });
  await app.register(uploadsRoutes, { prefix: '/uploads' });

  return app;
}
