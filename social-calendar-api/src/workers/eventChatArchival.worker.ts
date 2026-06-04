/**
 * Event-chat archival worker (R18 B6 / D3).
 *
 * One-time EVENT conversations archive 48h after the event ends; recurring
 * events never archive. This sweep sets `Conversation.archivedAt` so the
 * inbox query (`GET /conversations`) stays a simple `archivedAt IS NULL`
 * filter — archival is materialised here, NOT computed at read time.
 *
 * Mechanism mirrors `explorePrewarm.worker.ts`: a node-cron schedule, prod-only
 * start (wired in server.ts). Queries run through the migration-owner `prisma`
 * client — a worker has no per-request RLS context, and a system sweep should
 * see every eligible row.
 *
 * `archivedAt` is set to the moment the conversation BECAME eligible
 * (`endsAt + 48h`), not "now", so the timestamp is deterministic regardless of
 * when the sweep happens to run.
 */

import cron from 'node-cron';
import { Recurrence } from '@prisma/client';
import { env } from '../config/env.js';
import { prisma } from '../config/prisma.js';

const ARCHIVE_DELAY_MS = 48 * 60 * 60 * 1000; // 48 hours

/**
 * Run one archival sweep. Exported for the round-trip test / manual invocation
 * so the 48h archival can be exercised without waiting on the cron tick.
 * Returns the number of conversations archived.
 */
export async function runEventChatArchivalSweep(now: Date): Promise<number> {
  const cutoff = new Date(now.getTime() - ARCHIVE_DELAY_MS);

  // One-time EVENT conversations whose event ended ≥48h ago and aren't yet
  // archived. Recurring events (recurrence !== NONE) are excluded.
  const due = await prisma.conversation.findMany({
    where: {
      type: 'EVENT',
      archivedAt: null,
      linkedEvent: {
        recurrence: Recurrence.NONE,
        endsAt: { lte: cutoff },
      },
    },
    select: { id: true, linkedEvent: { select: { endsAt: true } } },
  });

  let archived = 0;
  for (const conv of due) {
    if (!conv.linkedEvent) continue;
    const archivedAt = new Date(
      conv.linkedEvent.endsAt.getTime() + ARCHIVE_DELAY_MS,
    );
    await prisma.conversation.update({
      where: { id: conv.id },
      data: { archivedAt },
    });
    archived++;
  }
  return archived;
}

export function startEventChatArchivalWorker(): ReturnType<
  typeof cron.schedule
> {
  if (!cron.validate(env.MESSAGING_ARCHIVE_CRON)) {
    throw new Error(
      `Invalid MESSAGING_ARCHIVE_CRON: "${env.MESSAGING_ARCHIVE_CRON}"`,
    );
  }

  const task = cron.schedule(env.MESSAGING_ARCHIVE_CRON, async () => {
    const startedAt = Date.now();
    try {
      const archived = await runEventChatArchivalSweep(new Date());
      console.log('[event-chat-archival] complete', {
        ms: Date.now() - startedAt,
        archived,
      });
    } catch (err) {
      console.error('[event-chat-archival] sweep failed', {
        err: String(err),
      });
    }
  });

  task.start();
  return task;
}

export function stopEventChatArchivalWorker(
  task: ReturnType<typeof cron.schedule>,
): void {
  task.stop();
}
