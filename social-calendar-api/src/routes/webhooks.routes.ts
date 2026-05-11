import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import { clerkWebhookHandler } from '../controllers/webhooks.controller.js';

export const webhooksRoutes: FastifyPluginAsync = async (fastify) => {
  // Encapsulated content-type parser: keep the raw body string on the
  // request so Svix can verify the HMAC signature against the exact bytes
  // Clerk sent. Affects only this scope — other routes still get the
  // default JSON parser.
  fastify.removeContentTypeParser('application/json');
  fastify.addContentTypeParser(
    'application/json',
    { parseAs: 'string' },
    (req: FastifyRequest, body: string | Buffer, done) => {
      const raw = typeof body === 'string' ? body : body.toString('utf8');
      req.rawBody = raw;
      try {
        done(null, raw.length === 0 ? {} : JSON.parse(raw));
      } catch (err) {
        done(err as Error, undefined);
      }
    },
  );

  fastify.post('/webhooks/clerk', clerkWebhookHandler);
};
