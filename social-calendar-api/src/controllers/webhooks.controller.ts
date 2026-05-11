import type { FastifyReply, FastifyRequest } from 'fastify';
import { Webhook, WebhookVerificationError } from 'svix';
import { prisma } from '../config/prisma.js';
import { env } from '../config/env.js';

type ClerkEmailAddress = { email_address: string };

type ClerkUserPayload = {
  id: string;
  username?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  email_addresses?: ClerkEmailAddress[];
  image_url?: string | null;
};

type ClerkWebhookEvent = {
  type: string;
  data: Record<string, unknown>;
};

function deriveUsername(payload: ClerkUserPayload): string {
  if (payload.username && payload.username.length > 0) return payload.username;
  const primary = payload.email_addresses?.[0]?.email_address;
  if (primary) {
    const localPart = primary.split('@')[0];
    if (localPart && localPart.length > 0) return localPart;
  }
  return `user_${payload.id.slice(0, 12)}`;
}

function deriveDisplayName(payload: ClerkUserPayload, fallback: string): string {
  const parts = [payload.first_name, payload.last_name].filter(
    (p): p is string => Boolean(p && p.length > 0),
  );
  if (parts.length > 0) return parts.join(' ');
  return fallback;
}

export async function clerkWebhookHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const svixId = request.headers['svix-id'];
  const svixTimestamp = request.headers['svix-timestamp'];
  const svixSignature = request.headers['svix-signature'];

  if (
    typeof svixId !== 'string' ||
    typeof svixTimestamp !== 'string' ||
    typeof svixSignature !== 'string'
  ) {
    return reply.code(400).send({ error: 'Missing Svix headers' });
  }

  const rawBody = request.rawBody;
  if (typeof rawBody !== 'string' || rawBody.length === 0) {
    return reply.code(400).send({ error: 'Missing request body' });
  }

  const wh = new Webhook(env.CLERK_WEBHOOK_SECRET);
  let event: ClerkWebhookEvent;
  try {
    event = wh.verify(rawBody, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    }) as ClerkWebhookEvent;
  } catch (err) {
    if (err instanceof WebhookVerificationError) {
      request.log.warn({ err }, 'Clerk webhook signature verification failed');
      return reply.code(400).send({ error: 'Invalid signature' });
    }
    throw err;
  }

  if (event.type === 'user.created' || event.type === 'user.updated') {
    const data = event.data as unknown as ClerkUserPayload;
    const clerkId = data.id;
    const username = deriveUsername(data);
    const displayName = deriveDisplayName(data, username);
    const avatarUrl = data.image_url ?? undefined;

    await prisma.user.upsert({
      where: { clerkId },
      create: { clerkId, username, displayName, avatarUrl },
      update: { username, displayName, avatarUrl },
    });

    request.log.info(
      { clerkId, eventType: event.type },
      'Clerk user synced via webhook',
    );
  } else {
    request.log.debug(
      { eventType: event.type },
      'Ignoring Clerk webhook event',
    );
  }

  return reply.code(200).send({ ok: true });
}
