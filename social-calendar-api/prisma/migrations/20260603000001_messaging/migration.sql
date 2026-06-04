-- ─── Messaging domain (R18) ───────────────────────────────────────────────────
--
-- Adds Conversation, Message, ConversationParticipant + ConversationType enum.
-- Mirrors the mobile contract (R17 rules) and the R18-PLAN B1/B2 spec.
--
-- ─── RLS design (read this before touching the policies) ──────────────────────
--
-- Hard lessons baked in here (see CLAUDE.md + migrations 20260529000001,
-- 20260601000001, 20260601000002):
--
-- 1. NO SECURITY DEFINER helpers in any SELECT policy. The STABLE
--    SECURITY DEFINER pattern returned stale/false results under the
--    INSERT...RETURNING snapshot that bit `event_select_participant` and the
--    invitee leg. Every visibility check here is an INLINE EXISTS subquery.
--
-- 2. NO policy on ConversationParticipant may query ConversationParticipant —
--    Postgres raises "infinite recursion detected in policy for relation".
--    So CP's SELECT policy gates on the row's own `userId` only. Co-participant
--    rows (needed to render group/DM inbox avatars) are hydrated by the
--    repository through the migration-owner `prisma` client AFTER the service
--    has proven the caller is a participant — the same gated-owner-client
--    pattern as `notificationsRepository.create`.
--
-- 3. ALL writes (Conversation / Message / Participant) route through the
--    migration-owner `prisma` client (bypasses RLS), NOT `prismaApp`. They are
--    cross-user by nature (a message row is read by every other participant; a
--    conversation seeds participant rows for other users). Service-layer checks
--    gate WHO may write. Because the owner client bypasses RLS, the
--    INSERT...RETURNING never re-evaluates a SELECT policy on the new row —
--    the snapshot-isolation bug cannot occur on the write path at all.
--
-- The app-role (`prismaApp`) client therefore only ever READS these tables, and
-- those reads are governed by the inline-EXISTS SELECT policies below.

-- CreateEnum
CREATE TYPE "ConversationType" AS ENUM ('DIRECT', 'GROUP', 'EVENT');

-- CreateTable
CREATE TABLE "Conversation" (
    "id" TEXT NOT NULL,
    "type" "ConversationType" NOT NULL,
    "linkedGroupId" TEXT,
    "linkedEventId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConversationParticipant" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastReadMessageId" TEXT,

    CONSTRAINT "ConversationParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Conversation_lastMessageAt_idx" ON "Conversation"("lastMessageAt");
CREATE INDEX "Conversation_type_linkedGroupId_idx" ON "Conversation"("type", "linkedGroupId");
CREATE INDEX "Conversation_type_linkedEventId_idx" ON "Conversation"("type", "linkedEventId");

-- CreateIndex
CREATE INDEX "Message_conversationId_sentAt_idx" ON "Message"("conversationId", "sentAt");

-- CreateIndex
CREATE UNIQUE INDEX "ConversationParticipant_conversationId_userId_key"
  ON "ConversationParticipant"("conversationId", "userId");
CREATE INDEX "ConversationParticipant_userId_idx" ON "ConversationParticipant"("userId");

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_linkedGroupId_fkey"
  FOREIGN KEY ("linkedGroupId") REFERENCES "FriendGroup"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_linkedEventId_fkey"
  FOREIGN KEY ("linkedEventId") REFERENCES "Event"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Message" ADD CONSTRAINT "Message_conversationId_fkey"
  FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Message" ADD CONSTRAINT "Message_senderId_fkey"
  FOREIGN KEY ("senderId") REFERENCES "User"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ConversationParticipant" ADD CONSTRAINT "ConversationParticipant_conversationId_fkey"
  FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ConversationParticipant" ADD CONSTRAINT "ConversationParticipant_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- ─── RLS ──────────────────────────────────────────────────────────────────────

ALTER TABLE "Conversation"            ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Message"                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ConversationParticipant" ENABLE ROW LEVEL SECURITY;

-- Conversation: visible only to its participants. Inline EXISTS against
-- ConversationParticipant — the subquery filters `cp."userId" =
-- current_app_user_id()`, so CP's own SELECT policy (own-rows-only, below) is
-- satisfied and there is no recursion (CP's policy never references CP).
CREATE POLICY conversation_select_participant ON "Conversation"
  FOR SELECT USING (
    current_app_user_id() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM "ConversationParticipant" cp
      WHERE cp."conversationId" = "Conversation"."id"
        AND cp."userId" = current_app_user_id()
    )
  );

COMMENT ON POLICY conversation_select_participant ON "Conversation" IS
  'A Conversation is visible only to its participants. Inline EXISTS against
   ConversationParticipant (no SECURITY DEFINER — see migration header).
   Conversation/Message/Participant WRITES bypass RLS via the migration-owner
   client, so this policy only governs app-role reads.';

-- Message: visible only to participants of the parent conversation. Same
-- inline-EXISTS pattern. This also governs the read-back of a freshly-sent
-- message IF it were ever inserted via the app client — but message INSERTs go
-- through the owner client (bypass), so this is purely the GET-thread gate.
CREATE POLICY message_select_participant ON "Message"
  FOR SELECT USING (
    current_app_user_id() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM "ConversationParticipant" cp
      WHERE cp."conversationId" = "Message"."conversationId"
        AND cp."userId" = current_app_user_id()
    )
  );

-- ConversationParticipant: a user sees ONLY their own membership rows. A policy
-- that let co-participants see each other would have to query
-- ConversationParticipant from within its own policy → infinite-recursion
-- error. Co-participant rows are hydrated by the repository through the
-- migration-owner client after the service confirms membership. This own-rows
-- policy is exactly what the Conversation/Message inline-EXISTS subqueries need
-- (they look up the caller's own row).
CREATE POLICY participant_select_self ON "ConversationParticipant"
  FOR SELECT USING ("userId" = current_app_user_id());

COMMENT ON POLICY participant_select_self ON "ConversationParticipant" IS
  'Own-rows-only by design: a co-participant-visibility policy would recurse
   into ConversationParticipant from its own policy. Co-participants are
   hydrated via the migration-owner client after a service-layer membership
   gate (R18 B2).';

-- No INSERT/UPDATE/DELETE policies: all writes use the migration-owner client
-- which bypasses RLS. With RLS enabled and no write policy, an accidental
-- app-role write fails closed — the intended defence-in-depth posture.
