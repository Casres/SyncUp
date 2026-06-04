import type { FastifyPluginAsync } from 'fastify';
import { eventsController } from '../controllers/events.controller.js';

export const eventsRoutes: FastifyPluginAsync = async (fastify) => {
  // Core CRUD
  fastify.get('/', eventsController.list);
  fastify.get('/:id', eventsController.getById);
  fastify.post('/', eventsController.create);
  fastify.patch('/:id', eventsController.update);
  fastify.delete('/:id', eventsController.softDelete);

  // Convenience RSVP — caller does not need to know their inviteId.
  fastify.post('/:id/rsvp', eventsController.rsvp);

  // Invites (incremental) — see EVENTS_HANDOFF.md "Open items §1".
  // Folded into the Events domain rather than a standalone /invites
  // module because the schema's EventInvite is event-scoped (unique by
  // (eventId, recipientId)) and the existing src/sockets/events.socket.ts
  // TODOs already anticipated this placement.
  fastify.post('/:id/invites', eventsController.sendInvites);
  fastify.patch('/:id/invites/:inviteId', eventsController.respondToInvite);
  fastify.delete('/:id/invites/:inviteId', eventsController.rescindInvite);

  // Event chat (R18). Organiser-only, deliberate host action — creates the
  // EVENT Conversation and seeds participants = organisers + all invitees.
  fastify.post('/:id/chat', eventsController.enableChat);
};
