/**
 * app-factory.ts
 *
 * Wraps `buildApp()` from `src/app.ts` so supertest can hit the real
 * Fastify instance without ever calling `app.listen()`. The instance is
 * cached as a module-level singleton so multiple tests in the same file
 * (and across files in a single Jest run) share the same connection
 * pool — significantly faster than rebuilding per test.
 *
 * Each test file is responsible for calling `closeApp()` in its own
 * `afterAll`, otherwise Jest will hold the Postgres connection open and
 * the runner will hang.
 *
 * Note: `src/app.ts` already exports `buildApp()` as an async factory
 * (added by the Auth agent). No refactor was needed for the test
 * infrastructure — see JEST_HANDOFF.md.
 *
 * Note on Socket.io: `src/server.ts` initialises Socket.io AFTER
 * `app.listen()` and then decorates the Fastify instance with `io`. In
 * the test environment we do NOT call `listen()`, so `request.server.io`
 * is `undefined` here. Several controllers pass `request.server.io`
 * through to services that emit socket events. Those services accept
 * `io` as an optional parameter and skip the emit when it's missing —
 * tests therefore exercise the REST path end-to-end without needing a
 * Socket.io server in scope.
 */
import type { FastifyInstance } from 'fastify';

let _app: FastifyInstance | null = null;

export async function getApp(): Promise<FastifyInstance> {
  if (_app) return _app;
  const { buildApp } = await import('../../src/app.js');
  const app = await buildApp();
  await app.ready();
  _app = app;
  return app;
}

export async function closeApp(): Promise<void> {
  if (_app) {
    await _app.close();
    _app = null;
  }
}
