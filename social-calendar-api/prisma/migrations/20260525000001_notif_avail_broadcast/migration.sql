-- ─── Adds Notification, BroadcastSettings, AvailState column ──────────────
--
-- Schema agent prep for the Notifications + Availability + Broadcasts
-- backend domains. Mirrors the mobile contract in TYPES.ts
-- (`Notif`, `AvailState`, `BroadcastSettings`).

-- CreateEnum
CREATE TYPE "AvailState" AS ENUM ('FREE', 'MAYBE', 'BUSY');

-- CreateEnum
CREATE TYPE "NotifType" AS ENUM (
  'RSVP',
  'EVENT_REMINDER',
  'CO_HOST',
  'CO_HOST_REVOKED',
  'GROUP_ACTIVITY',
  'INBOUND_BROADCAST',
  'FRIEND_REQUEST',
  'GROUP_INVITE'
);

-- CreateEnum
CREATE TYPE "BroadcastAudienceMode" AS ENUM ('EVERYONE', 'FRIENDS', 'TYPES');

-- AlterTable — add nullable state column to existing UserAvailability rows.
ALTER TABLE "UserAvailability" ADD COLUMN "state" "AvailState";

-- Unique-key the day-grain rows so the service can upsert idempotently
-- without two rows for the same (user, day) pair.
CREATE UNIQUE INDEX "UserAvailability_userId_windowStart_granularity_key"
  ON "UserAvailability"("userId", "windowStart", "granularity");

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotifType" NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "payload" JSONB NOT NULL,
    "groupKey" TEXT,
    "dismissedAt" TIMESTAMP(3),
    "mutedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Notification_userId_createdAt_idx"
  ON "Notification"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_userId_read_idx"
  ON "Notification"("userId", "read");

-- CreateIndex
CREATE INDEX "Notification_userId_groupKey_idx"
  ON "Notification"("userId", "groupKey");

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "BroadcastSettings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "freeOn" BOOLEAN NOT NULL DEFAULT false,
    "freeAudience" "BroadcastAudienceMode" NOT NULL DEFAULT 'FRIENDS',
    "freeTargets" JSONB NOT NULL DEFAULT '[]',
    "maybeOn" BOOLEAN NOT NULL DEFAULT false,
    "maybeAudience" "BroadcastAudienceMode" NOT NULL DEFAULT 'FRIENDS',
    "maybeTargets" JSONB NOT NULL DEFAULT '[]',
    "busyOn" BOOLEAN NOT NULL DEFAULT false,
    "busyAudience" "BroadcastAudienceMode" NOT NULL DEFAULT 'FRIENDS',
    "busyTargets" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BroadcastSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BroadcastSettings_userId_key"
  ON "BroadcastSettings"("userId");

-- AddForeignKey
ALTER TABLE "BroadcastSettings" ADD CONSTRAINT "BroadcastSettings_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- ─── RLS ──────────────────────────────────────────────────────────────────
-- New tables enable RLS so the app role only ever sees its own rows. The
-- existing migration enables RLS table-by-table; we follow the same
-- pattern. Each policy gates by `current_app_user_id()` matching the
-- row's `userId`.

ALTER TABLE "Notification"      ENABLE ROW LEVEL SECURITY;
ALTER TABLE "BroadcastSettings" ENABLE ROW LEVEL SECURITY;

-- Notification — owner-only across all verbs.
CREATE POLICY notification_select_self ON "Notification"
  FOR SELECT USING ("userId" = current_app_user_id());

CREATE POLICY notification_insert_self ON "Notification"
  FOR INSERT WITH CHECK ("userId" = current_app_user_id());

CREATE POLICY notification_update_self ON "Notification"
  FOR UPDATE USING ("userId" = current_app_user_id())
  WITH CHECK ("userId" = current_app_user_id());

CREATE POLICY notification_delete_self ON "Notification"
  FOR DELETE USING ("userId" = current_app_user_id());

-- BroadcastSettings — owner-only across all verbs.
CREATE POLICY broadcast_select_self ON "BroadcastSettings"
  FOR SELECT USING ("userId" = current_app_user_id());

CREATE POLICY broadcast_insert_self ON "BroadcastSettings"
  FOR INSERT WITH CHECK ("userId" = current_app_user_id());

CREATE POLICY broadcast_update_self ON "BroadcastSettings"
  FOR UPDATE USING ("userId" = current_app_user_id())
  WITH CHECK ("userId" = current_app_user_id());

CREATE POLICY broadcast_delete_self ON "BroadcastSettings"
  FOR DELETE USING ("userId" = current_app_user_id());
