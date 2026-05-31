import type { FastifyReply, FastifyRequest } from 'fastify';
import { AvailState, BroadcastAudienceMode } from '@prisma/client';
import { z } from 'zod';
import {
  AvailabilityForbiddenError,
  AvailabilityInvalidDateError,
  availabilityService,
} from '../services/availability.service.js';

// ─── Schemas ──────────────────────────────────────────────────────────────

const userIdParamsSchema = z.object({ userId: z.string().min(1) });
const dateParamsSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD'),
});

// The mobile contract's `AvailState` values are lowercase
// ('free' | 'maybe' | 'busy'); the Prisma enum is uppercase. We accept
// both and normalise to the Prisma enum here. The on-wire response also
// converts back to lowercase before sending — see toWireMap.
const availStateInputSchema = z
  .union([
    z.literal('free'),
    z.literal('maybe'),
    z.literal('busy'),
    z.literal('FREE'),
    z.literal('MAYBE'),
    z.literal('BUSY'),
  ])
  .transform(
    (v): AvailState =>
      (v.toUpperCase() as 'FREE' | 'MAYBE' | 'BUSY') as AvailState,
  );

const availStateOrClearSchema = z.union([availStateInputSchema, z.null()]);

const isoDateKeySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Availability map keys must be YYYY-MM-DD');

// Replace-map body: { [iso]: 'free' | 'maybe' | 'busy' }
const replaceMapBodySchema = z
  .record(isoDateKeySchema, availStateInputSchema)
  .refine((m) => Object.keys(m).length <= 1000, {
    message: 'Map exceeds the 1000-entry cap',
  });

// Patch body: { [iso]: 'free' | 'maybe' | 'busy' | null }
const patchMapBodySchema = z
  .record(isoDateKeySchema, availStateOrClearSchema)
  .refine((m) => Object.keys(m).length <= 1000, {
    message: 'Patch exceeds the 1000-entry cap',
  });

const setDayBodySchema = z
  .object({ state: availStateOrClearSchema })
  .strict();

const broadcastRuleSchema = z
  .object({
    on: z.boolean(),
    audience: z.union([
      z.literal('EVERYONE'),
      z.literal('FRIENDS'),
      z.literal('TYPES'),
      z.literal('everyone'),
      z.literal('friends'),
      z.literal('types'),
    ]).transform(
      (v): BroadcastAudienceMode =>
        v.toUpperCase() as 'EVERYONE' | 'FRIENDS' | 'TYPES' as BroadcastAudienceMode,
    ),
    targets: z.array(z.string().min(1)).max(500),
  })
  .strict();

const broadcastSettingsBodySchema = z
  .object({
    free: broadcastRuleSchema,
    maybe: broadcastRuleSchema,
    busy: broadcastRuleSchema,
  })
  .strict();

// ─── Helpers ──────────────────────────────────────────────────────────────

function badRequest(reply: FastifyReply, error: z.ZodError) {
  return reply.code(400).send({
    error: 'Invalid request',
    details: error.flatten().fieldErrors,
  });
}

/**
 * The wire shape uses lowercase state values to match the mobile
 * `AvailState` union (`'free' | 'maybe' | 'busy'`).
 */
function toWireMap(
  internal: Record<string, AvailState>,
): Record<string, 'free' | 'maybe' | 'busy'> {
  const out: Record<string, 'free' | 'maybe' | 'busy'> = {};
  for (const [iso, state] of Object.entries(internal)) {
    out[iso] = (state as string).toLowerCase() as 'free' | 'maybe' | 'busy';
  }
  return out;
}

function toWireSettings(
  internal: Awaited<ReturnType<typeof availabilityService.getBroadcasts>>,
) {
  const mapAudience = (
    a: BroadcastAudienceMode,
  ): 'everyone' | 'friends' | 'types' =>
    (a as string).toLowerCase() as 'everyone' | 'friends' | 'types';
  return {
    free: {
      on: internal.free.on,
      audience: mapAudience(internal.free.audience),
      targets: internal.free.targets,
    },
    maybe: {
      on: internal.maybe.on,
      audience: mapAudience(internal.maybe.audience),
      targets: internal.maybe.targets,
    },
    busy: {
      on: internal.busy.on,
      audience: mapAudience(internal.busy.audience),
      targets: internal.busy.targets,
    },
  };
}

// ─── Controller ───────────────────────────────────────────────────────────

export const availabilityController = {
  async getMine(request: FastifyRequest, reply: FastifyReply) {
    const map = await availabilityService.getMine(
      request.prismaTransaction,
      request.user.id,
    );
    return reply.send(toWireMap(map));
  },

  async replaceMine(request: FastifyRequest, reply: FastifyReply) {
    const body = replaceMapBodySchema.safeParse(request.body);
    if (!body.success) return badRequest(reply, body.error);

    try {
      await availabilityService.replaceMine(
        request.prismaTransaction,
        request.user.id,
        body.data,
        request.server.io,
      );
      return reply.code(204).send();
    } catch (err) {
      if (err instanceof AvailabilityInvalidDateError) {
        return reply.code(400).send({ error: err.message });
      }
      throw err;
    }
  },

  async patchMine(request: FastifyRequest, reply: FastifyReply) {
    const body = patchMapBodySchema.safeParse(request.body);
    if (!body.success) return badRequest(reply, body.error);

    try {
      await availabilityService.patchMine(
        request.prismaTransaction,
        request.user.id,
        body.data,
        request.server.io,
      );
      return reply.code(204).send();
    } catch (err) {
      if (err instanceof AvailabilityInvalidDateError) {
        return reply.code(400).send({ error: err.message });
      }
      throw err;
    }
  },

  async setDay(request: FastifyRequest, reply: FastifyReply) {
    const params = dateParamsSchema.safeParse(request.params);
    if (!params.success) return badRequest(reply, params.error);

    const body = setDayBodySchema.safeParse(request.body);
    if (!body.success) return badRequest(reply, body.error);

    try {
      await availabilityService.setDay(
        request.prismaTransaction,
        request.user.id,
        params.data.date,
        body.data.state,
        request.server.io,
      );
      return reply.code(204).send();
    } catch (err) {
      if (err instanceof AvailabilityInvalidDateError) {
        return reply.code(400).send({ error: err.message });
      }
      throw err;
    }
  },

  async getFriend(request: FastifyRequest, reply: FastifyReply) {
    const params = userIdParamsSchema.safeParse(request.params);
    if (!params.success) return badRequest(reply, params.error);

    try {
      const map = await availabilityService.getFriend(
        request.prismaTransaction,
        request.user.id,
        params.data.userId,
      );
      return reply.send(toWireMap(map));
    } catch (err) {
      if (err instanceof AvailabilityForbiddenError) {
        return reply.code(403).send({ error: err.message });
      }
      throw err;
    }
  },

  async getBroadcasts(request: FastifyRequest, reply: FastifyReply) {
    const data = await availabilityService.getBroadcasts(
      request.prismaTransaction,
      request.user.id,
    );
    return reply.send(toWireSettings(data));
  },

  async updateBroadcasts(request: FastifyRequest, reply: FastifyReply) {
    const body = broadcastSettingsBodySchema.safeParse(request.body);
    if (!body.success) return badRequest(reply, body.error);

    await availabilityService.updateBroadcasts(
      request.prismaTransaction,
      request.user.id,
      body.data,
    );
    return reply.code(204).send();
  },
};
