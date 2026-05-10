# syntax=docker/dockerfile:1.6

# ─── Stage 1: builder ────────────────────────────────────────────────────────
# Installs all dependencies (incl. dev), generates the Prisma client, and
# compiles TypeScript. Also serves as the dev target — docker-compose runs
# `tsx watch` against this image so a single Dockerfile covers both modes.
#
# Base image: Debian Bookworm slim (glibc + OpenSSL 3). Prisma's Alpine
# autodetection on ARM64 picks the OpenSSL 1.1 query-engine binary, which
# Alpine 3.18+ no longer ships, so the engine fails to load. Bookworm
# ships libssl3 natively and Prisma's `linux-arm64-openssl-3.0.x` engine
# (and the equivalent x64) loads cleanly.
FROM node:20-bookworm-slim AS builder

# Bookworm slim strips OpenSSL by default; Prisma autodetection then falls
# back to its OpenSSL 1.1 query engine (which Bookworm doesn't ship). Install
# `openssl` (provides libssl3) so Prisma picks the OpenSSL 3 engine.
RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Layer cache: copy manifests first.
# Repo is an npm workspace at the monorepo root, so a per-package
# package-lock.json is not generated. Copy whatever's present and use
# `npm install` (graceful when the lockfile is absent).
COPY package.json package-lock.json* ./
RUN npm install --no-audit --no-fund

# Prisma client generation needs the schema.
COPY prisma ./prisma
RUN npx prisma generate

# Build.
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ─── Stage 2: runner ─────────────────────────────────────────────────────────
# Slim production image. Drops dev dependencies, keeps the generated Prisma
# client + compiled output + migration files (needed by `prisma migrate
# deploy` at start time).
FROM node:20-bookworm-slim AS runner

WORKDIR /app
ENV NODE_ENV=production

# Copy installed deps and prune to production-only.
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
RUN npm prune --omit=dev

# Compiled JS + Prisma assets.
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

# Run as non-root. (Debian-style; previous Alpine used `addgroup -S`.)
RUN groupadd --system app && useradd --system --gid app app && chown -R app:app /app
USER app

EXPOSE 3000

CMD ["node", "dist/server.js"]
