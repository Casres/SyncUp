import { buildApp } from './app.js';
import { env } from './config/env.js';
import { initSocketServer } from './sockets/index.js';
import { startEventChatArchivalWorker } from './workers/eventChatArchival.worker.js';
import { startExplorePrewarmWorker } from './workers/explorePrewarm.worker.js';

async function start() {
  const app = await buildApp();

  // Pre-decorate before listen — Fastify v5 forbids `decorate()` after the
  // server starts. The real Socket.io server requires `app.server` which
  // doesn't exist until listen has run, so we register a placeholder here
  // and overwrite the value once the HTTP server is up.
  app.decorate('io', null as never);

  try {
    await app.listen({ port: env.PORT, host: '0.0.0.0' });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }

  // Direct assignment is allowed after the property has been decorated —
  // it just mutates the existing slot without going through Fastify's
  // "no decorate after start" check.
  app.io = initSocketServer(app);

  app.log.info('socket.io server initialised');

  // Start the Explore cache pre-warmer in production only.
  // Skipped in dev/test to avoid burning API quota on non-user traffic.
  if (env.NODE_ENV === 'production') {
    startExplorePrewarmWorker();
    app.log.info('explore pre-warm worker started');

    // Event-chat archival sweep (R18 B6). Prod-only — dev/test invoke
    // runEventChatArchivalSweep() directly when they need the behaviour.
    startEventChatArchivalWorker();
    app.log.info('event-chat archival worker started');
  }
}

start();
