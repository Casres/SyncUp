import type { FastifyPluginAsync } from 'fastify';
import { eventsController } from '../controllers/events.controller.js';

export const eventsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/', eventsController.list);
  fastify.get('/:id', eventsController.getById);
  fastify.post('/', eventsController.create);
  fastify.patch('/:id', eventsController.update);
  fastify.delete('/:id', eventsController.softDelete);
};
