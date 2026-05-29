import type { FastifyReply, FastifyRequest } from 'fastify';
import { uploadsService } from '../services/uploads.service.js';

export const uploadsController = {
  // POST /uploads/avatar/sign
  // Auth is enforced by the global auth middleware — request.user is always
  // populated here. The signature is scoped to the caller's own folder, so a
  // user can never sign an upload into another user's avatar folder.
  async signAvatar(request: FastifyRequest, reply: FastifyReply) {
    const signature = uploadsService.signAvatarUpload(request.user.id);
    return reply.send(signature);
  },
};
