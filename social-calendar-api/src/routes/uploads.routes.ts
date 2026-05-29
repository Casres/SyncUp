import type { FastifyPluginAsync } from 'fastify';
import { uploadsController } from '../controllers/uploads.controller.js';

export const uploadsRoutes: FastifyPluginAsync = async (fastify) => {
  // Registered under the `/uploads` prefix in app.ts, after the auth plugin,
  // so request.user is guaranteed present.
  fastify.post('/avatar/sign', uploadsController.signAvatar);
};
