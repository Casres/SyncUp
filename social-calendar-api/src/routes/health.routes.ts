import type { FastifyInstance } from 'fastify';

// Liveness check for Railway / load balancers. Registered before the auth
// plugin so the global preHandler does not run for it. The auth middleware
// also lists `/health` in SKIP_PREFIXES as belt-and-braces.
export async function healthRoutes(app: FastifyInstance) {
  app.get('/health', async (_request, reply) => {
    return reply.send({ status: 'ok' });
  });
}
