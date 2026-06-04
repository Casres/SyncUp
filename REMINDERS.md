# SyncUp — What's Done and What's Next

A reference doc to share with a new chat so they can pick up where we left off. Paste the relevant sections (or the whole thing) into any new conversation.

> ⚠️ **This doc is legacy (early auth-middleware era).** For current ground
> truth use `PROJECT_TRACKER.md`, `BUILD-CHECKLIST.md`, and `LEAD_MANAGER.md`.
> The "frontend not yet built" line below is long obsolete — the mobile app,
> all backend domains, and (as of **2026-06-04**) the **R18 messaging build**
> (DM · group · event chat) are done and **MERGED to `main`** (PR #1, `a62668a`;
> round-trip 31/31). The realtime socket client and Friends·Groups·Messages
> carousel are also built (carousel on branch `r17-friends-carousel`); only
> device QA remains. See `R18-PLAN.md` "Build notes".

## Project at a glance

SyncUp is a social calendar app. The backend lives in `social-calendar-api/` and is built with Fastify + TypeScript + Prisma + Postgres. Authentication is handled by Clerk. A frontend exists in plan but is not yet built.

## What's done

**Clerk JWT authentication middleware (backend).** Verifies incoming Clerk JWTs, looks up the matching `User` row in Postgres, and attaches it to `request.user`. Files involved:

- `src/plugins/auth.ts` — Fastify plugin that calls `@clerk/backend`'s `authenticateRequest`, looks up the user by `clerkId`, and decorates the app instance with a `requireAuth` preHandler.
- `src/types/fastify.d.ts` — TypeScript module augmentation so `request.user` is typed as the Prisma `User` and `app.requireAuth` is typed as a preHandler.
- `src/app.ts` — registers the auth plugin before routes.
- `src/routes/events.routes.ts` — applies `requireAuth` to `GET /events/:id` as the example protected route.
- `package.json` — added `@clerk/backend` and `fastify-plugin` as dependencies.
- `.env` — created with placeholder values for `DATABASE_URL`, `REDIS_URL`, `CLERK_SECRET_KEY`, `PORT`, `NODE_ENV`.
- `package.json` dev script updated to `tsx watch --env-file=.env src/server.ts` so `.env` actually loads.

**Smoke test passed.** Hitting `GET /events/anything` with no `Authorization` header correctly returns `401 Unauthorized` with `{"error":"Missing or malformed Authorization header"}`. The unauthenticated path is verified end to end.

## What's next (in roughly priority order)

**1. Build out the frontend enough to fetch a Clerk session token.** Until the frontend can call `await getToken()` from `@clerk/clerk-react` (or equivalent), the authenticated path of the auth middleware can't be tested end to end. Frontend rules to remember:
- API data lives in React Query. No exceptions.
- Non-network data lives in Zustand. No exceptions.
- Never store API response data manually in Zustand.

**2. Run the authenticated smoke test once a token is available.** Steps:
- Swap the placeholder `CLERK_SECRET_KEY` in `.env` for the real one from the Clerk dashboard.
- Swap the placeholder `DATABASE_URL` for a real Postgres connection string that points at a database with a populated `User` table.
- Run `curl -i -H "Authorization: Bearer <token>" http://localhost:3000/events/<event-id>`.
- Three outcomes are possible: `401 Invalid or expired token` (bad JWT), `401 User not provisioned` (Clerk verified but no matching local `User` row — see #3), or `200` with the event payload.

**3. Build the Clerk → Postgres user provisioning flow.** When someone signs up with Clerk, a corresponding `User` row needs to be created in Postgres with their `clerkId`. The standard pattern is a Clerk webhook that fires on `user.created` and inserts the row. Without this, every authenticated request will fail with `User not provisioned` even when the JWT is valid.

**4. Build the rest of the events API.** Today only `GET /events/:id` exists. Likely next: `POST /events`, `PATCH /events/:id`, `DELETE /events/:id`, `GET /events` (list).

**5. Build the other resource routes.** Users, groups, availability, invitations — based on the Prisma schema, these are all on the roadmap.

**6. Delete the seed file before going to production.** `prisma/seed.ts` exists for development convenience and must be removed before production deploy. Christian asked to be reminded about this.

## Important constraints to remember

- The backend is ESM (`"type": "module"` in `package.json`). All internal imports use `.js` extensions even though source files are `.ts`. TypeScript needs `module: "NodeNext"` for this to work.
- `request.user` is typed as non-optional `User`, but it's only actually populated when `requireAuth` ran. Don't read `request.user` from a handler that didn't run the preHandler — TypeScript won't catch that mistake.
- The "user not provisioned" case currently returns `401`. If you want to distinguish "valid token but unknown user" from "bad token", change that to `403` in `src/plugins/auth.ts`.

## Useful commands

From inside `social-calendar-api/`:
- `npm install` — install dependencies (run this if `package.json` changed).
- `npm run dev` — start the dev server with hot reload on port 3000.
- `npm run prisma:generate` — regenerate the Prisma client after schema changes.
- `npm run prisma:migrate` — create and apply a Prisma migration.

From any directory:
- `curl -i http://localhost:3000/events/anything` — should return 401 (smoke test).
