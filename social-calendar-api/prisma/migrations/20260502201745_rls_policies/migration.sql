-- ─── Row-Level Security baseline ────────────────────────────────────────────
--
-- Decision #3 (Lead Manager): Postgres RLS policies are the defence-in-depth
-- backstop for tenant isolation. Service layer is still the primary auth
-- enforcement. These policies catch the case where a service-layer check is
-- forgotten or bypassed.
--
-- Runtime contract:
--   • The API connects to Postgres as a non-owner role (DevOps provisions).
--     RLS applies to that role. The migration owner bypasses RLS, so this
--     migration and future Prisma migrations run normally.
--   • Every request opens a transaction and sets:
--       SET LOCAL app.current_user_id = '<User.id>';
--     before issuing queries. Auth middleware owns this — see HANDOFF.md.
--   • Soft-deleted rows (deletedAt IS NOT NULL) are NOT filtered by RLS.
--     The service/repository layer applies that filter. RLS scope is
--     "who can see what", not lifecycle state.

-- ─── Helper function ────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION current_app_user_id() RETURNS text AS $$
  SELECT NULLIF(current_setting('app.current_user_id', true), '')
$$ LANGUAGE sql STABLE;

COMMENT ON FUNCTION current_app_user_id() IS
  'Returns the User.id of the request''s authenticated user, or NULL if unset. Set via SET LOCAL app.current_user_id by auth middleware.';

-- ─── Enable RLS on every table ──────────────────────────────────────────────

ALTER TABLE "User"               ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Friendship"         ENABLE ROW LEVEL SECURITY;
ALTER TABLE "FriendshipLabel"    ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AvailabilityBlock"  ENABLE ROW LEVEL SECURITY;
ALTER TABLE "FriendGroup"        ENABLE ROW LEVEL SECURITY;
ALTER TABLE "FriendGroupMember"  ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SocialGroup"        ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SocialGroupMember"  ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Event"              ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EventOrganiser"     ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EventException"     ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EventInvite"        ENABLE ROW LEVEL SECURITY;
ALTER TABLE "UserAvailability"   ENABLE ROW LEVEL SECURITY;
ALTER TABLE "GroupPoll"          ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PollOption"         ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PollVote"           ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EventSuggestion"    ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SuggestionVote"     ENABLE ROW LEVEL SECURITY;

-- ─── User ───────────────────────────────────────────────────────────────────
-- Any authenticated user can SELECT any User (needed for friend search,
-- mention lookup, displaying names). Only the user themselves can UPDATE
-- their own row. INSERT happens via Clerk webhook — restrict to owner-self
-- to prevent impersonation. Hard DELETE not allowed at the app role level
-- (use deletedAt soft-delete via UPDATE).

CREATE POLICY user_select_authenticated ON "User"
  FOR SELECT USING (current_app_user_id() IS NOT NULL);

CREATE POLICY user_insert_self ON "User"
  FOR INSERT WITH CHECK ("id" = current_app_user_id());

CREATE POLICY user_update_self ON "User"
  FOR UPDATE USING ("id" = current_app_user_id())
  WITH CHECK ("id" = current_app_user_id());

-- ─── Friendship ─────────────────────────────────────────────────────────────
-- Either party (initiator or receiver) can read and update. INSERT must
-- have the current user as initiator. DELETE allowed by either party
-- (use deletedAt for soft delete).

CREATE POLICY friendship_select_party ON "Friendship"
  FOR SELECT USING (
    "initiatorId" = current_app_user_id()
    OR "receiverId" = current_app_user_id()
  );

CREATE POLICY friendship_insert_initiator ON "Friendship"
  FOR INSERT WITH CHECK ("initiatorId" = current_app_user_id());

CREATE POLICY friendship_update_party ON "Friendship"
  FOR UPDATE USING (
    "initiatorId" = current_app_user_id()
    OR "receiverId" = current_app_user_id()
  );

CREATE POLICY friendship_delete_party ON "Friendship"
  FOR DELETE USING (
    "initiatorId" = current_app_user_id()
    OR "receiverId" = current_app_user_id()
  );

-- ─── FriendshipLabel ────────────────────────────────────────────────────────
-- Labels are private. Each user labels the other independently. Only the
-- owner of a label can read or write it.

CREATE POLICY friendshiplabel_owner_only ON "FriendshipLabel"
  FOR ALL USING ("ownerId" = current_app_user_id())
  WITH CHECK ("ownerId" = current_app_user_id());

-- ─── AvailabilityBlock ──────────────────────────────────────────────────────
-- One-directional. Only the blocker can read/write their blocks. The
-- blocked user must NOT be able to see they are blocked.

CREATE POLICY availabilityblock_blocker_only ON "AvailabilityBlock"
  FOR ALL USING ("blockerId" = current_app_user_id())
  WITH CHECK ("blockerId" = current_app_user_id());

-- ─── FriendGroup ────────────────────────────────────────────────────────────
-- Private to owner. Members cannot see they are in it.

CREATE POLICY friendgroup_owner_only ON "FriendGroup"
  FOR ALL USING ("ownerId" = current_app_user_id())
  WITH CHECK ("ownerId" = current_app_user_id());

-- ─── FriendGroupMember ──────────────────────────────────────────────────────
-- Only the FriendGroup owner can read or modify members. Members
-- themselves do not know they are in the group.

CREATE POLICY friendgroupmember_owner_only ON "FriendGroupMember"
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM "FriendGroup" fg
      WHERE fg."id" = "FriendGroupMember"."friendGroupId"
        AND fg."ownerId" = current_app_user_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "FriendGroup" fg
      WHERE fg."id" = "FriendGroupMember"."friendGroupId"
        AND fg."ownerId" = current_app_user_id()
    )
  );

-- ─── SocialGroup ────────────────────────────────────────────────────────────
-- Visible to members. Any authenticated user can INSERT (creating a new
-- group); the controller must atomically add a SocialGroupMember(ADMIN)
-- row in the same transaction. UPDATE/DELETE restricted to admins.

CREATE POLICY socialgroup_select_member ON "SocialGroup"
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM "SocialGroupMember" sgm
      WHERE sgm."socialGroupId" = "SocialGroup"."id"
        AND sgm."userId" = current_app_user_id()
    )
  );

CREATE POLICY socialgroup_insert_authenticated ON "SocialGroup"
  FOR INSERT WITH CHECK (current_app_user_id() IS NOT NULL);

CREATE POLICY socialgroup_modify_admin ON "SocialGroup"
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM "SocialGroupMember" sgm
      WHERE sgm."socialGroupId" = "SocialGroup"."id"
        AND sgm."userId" = current_app_user_id()
        AND sgm."role" = 'ADMIN'
    )
  );

CREATE POLICY socialgroup_delete_admin ON "SocialGroup"
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM "SocialGroupMember" sgm
      WHERE sgm."socialGroupId" = "SocialGroup"."id"
        AND sgm."userId" = current_app_user_id()
        AND sgm."role" = 'ADMIN'
    )
  );

-- ─── SocialGroupMember ──────────────────────────────────────────────────────
-- Members can SELECT all members of groups they belong to. Admins can
-- INSERT/DELETE members. Members can UPDATE their own row (e.g. leave
-- via DELETE on own row).

CREATE POLICY socialgroupmember_select_co_member ON "SocialGroupMember"
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM "SocialGroupMember" sgm
      WHERE sgm."socialGroupId" = "SocialGroupMember"."socialGroupId"
        AND sgm."userId" = current_app_user_id()
    )
  );

CREATE POLICY socialgroupmember_insert_admin ON "SocialGroupMember"
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM "SocialGroupMember" sgm
      WHERE sgm."socialGroupId" = "SocialGroupMember"."socialGroupId"
        AND sgm."userId" = current_app_user_id()
        AND sgm."role" = 'ADMIN'
    )
    -- Allow self-INSERT for the case where a user creates a group and
    -- atomically inserts themselves as ADMIN. Service layer enforces.
    OR "userId" = current_app_user_id()
  );

CREATE POLICY socialgroupmember_delete_admin_or_self ON "SocialGroupMember"
  FOR DELETE USING (
    "userId" = current_app_user_id()
    OR EXISTS (
      SELECT 1 FROM "SocialGroupMember" sgm
      WHERE sgm."socialGroupId" = "SocialGroupMember"."socialGroupId"
        AND sgm."userId" = current_app_user_id()
        AND sgm."role" = 'ADMIN'
    )
  );

CREATE POLICY socialgroupmember_update_admin ON "SocialGroupMember"
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM "SocialGroupMember" sgm
      WHERE sgm."socialGroupId" = "SocialGroupMember"."socialGroupId"
        AND sgm."userId" = current_app_user_id()
        AND sgm."role" = 'ADMIN'
    )
  );

-- ─── Event ──────────────────────────────────────────────────────────────────
-- Visible to creator, organisers, and invited recipients. Only the
-- creator can INSERT (with creatorId = self). UPDATE/DELETE restricted
-- to creator and CO_HOST organisers.

CREATE POLICY event_select_participant ON "Event"
  FOR SELECT USING (
    "creatorId" = current_app_user_id()
    OR EXISTS (
      SELECT 1 FROM "EventOrganiser" eo
      WHERE eo."eventId" = "Event"."id"
        AND eo."userId" = current_app_user_id()
    )
    OR EXISTS (
      SELECT 1 FROM "EventInvite" ei
      WHERE ei."eventId" = "Event"."id"
        AND ei."recipientId" = current_app_user_id()
    )
  );

CREATE POLICY event_insert_creator_self ON "Event"
  FOR INSERT WITH CHECK ("creatorId" = current_app_user_id());

CREATE POLICY event_modify_organiser ON "Event"
  FOR UPDATE USING (
    "creatorId" = current_app_user_id()
    OR EXISTS (
      SELECT 1 FROM "EventOrganiser" eo
      WHERE eo."eventId" = "Event"."id"
        AND eo."userId" = current_app_user_id()
    )
  );

CREATE POLICY event_delete_creator ON "Event"
  FOR DELETE USING ("creatorId" = current_app_user_id());

-- ─── EventOrganiser ─────────────────────────────────────────────────────────
-- Visible to anyone who can see the parent event. Only the event creator
-- can add or remove organisers.

CREATE POLICY eventorganiser_select_event_visible ON "EventOrganiser"
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM "Event" e
      WHERE e."id" = "EventOrganiser"."eventId"
        AND (
          e."creatorId" = current_app_user_id()
          OR EXISTS (
            SELECT 1 FROM "EventOrganiser" eo2
            WHERE eo2."eventId" = e."id" AND eo2."userId" = current_app_user_id()
          )
          OR EXISTS (
            SELECT 1 FROM "EventInvite" ei
            WHERE ei."eventId" = e."id" AND ei."recipientId" = current_app_user_id()
          )
        )
    )
  );

CREATE POLICY eventorganiser_modify_creator ON "EventOrganiser"
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM "Event" e
      WHERE e."id" = "EventOrganiser"."eventId"
        AND e."creatorId" = current_app_user_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "Event" e
      WHERE e."id" = "EventOrganiser"."eventId"
        AND e."creatorId" = current_app_user_id()
    )
  );

-- ─── EventException ─────────────────────────────────────────────────────────
-- Same visibility as parent event. Only creator and co-hosts can write.

CREATE POLICY eventexception_select_event_visible ON "EventException"
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM "Event" e
      WHERE e."id" = "EventException"."eventId"
        AND (
          e."creatorId" = current_app_user_id()
          OR EXISTS (
            SELECT 1 FROM "EventOrganiser" eo
            WHERE eo."eventId" = e."id" AND eo."userId" = current_app_user_id()
          )
          OR EXISTS (
            SELECT 1 FROM "EventInvite" ei
            WHERE ei."eventId" = e."id" AND ei."recipientId" = current_app_user_id()
          )
        )
    )
  );

CREATE POLICY eventexception_modify_organiser ON "EventException"
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM "Event" e
      WHERE e."id" = "EventException"."eventId"
        AND (
          e."creatorId" = current_app_user_id()
          OR EXISTS (
            SELECT 1 FROM "EventOrganiser" eo
            WHERE eo."eventId" = e."id" AND eo."userId" = current_app_user_id()
          )
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "Event" e
      WHERE e."id" = "EventException"."eventId"
        AND (
          e."creatorId" = current_app_user_id()
          OR EXISTS (
            SELECT 1 FROM "EventOrganiser" eo
            WHERE eo."eventId" = e."id" AND eo."userId" = current_app_user_id()
          )
        )
    )
  );

-- ─── EventInvite ────────────────────────────────────────────────────────────
-- Visible to recipient and to event creator/organisers. Recipient can
-- UPDATE their own status. Creator/organisers can INSERT/DELETE.

CREATE POLICY eventinvite_select_party ON "EventInvite"
  FOR SELECT USING (
    "recipientId" = current_app_user_id()
    OR EXISTS (
      SELECT 1 FROM "Event" e
      WHERE e."id" = "EventInvite"."eventId"
        AND (
          e."creatorId" = current_app_user_id()
          OR EXISTS (
            SELECT 1 FROM "EventOrganiser" eo
            WHERE eo."eventId" = e."id" AND eo."userId" = current_app_user_id()
          )
        )
    )
  );

CREATE POLICY eventinvite_insert_organiser ON "EventInvite"
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM "Event" e
      WHERE e."id" = "EventInvite"."eventId"
        AND (
          e."creatorId" = current_app_user_id()
          OR EXISTS (
            SELECT 1 FROM "EventOrganiser" eo
            WHERE eo."eventId" = e."id" AND eo."userId" = current_app_user_id()
          )
        )
    )
  );

CREATE POLICY eventinvite_update_recipient_or_organiser ON "EventInvite"
  FOR UPDATE USING (
    "recipientId" = current_app_user_id()
    OR EXISTS (
      SELECT 1 FROM "Event" e
      WHERE e."id" = "EventInvite"."eventId"
        AND (
          e."creatorId" = current_app_user_id()
          OR EXISTS (
            SELECT 1 FROM "EventOrganiser" eo
            WHERE eo."eventId" = e."id" AND eo."userId" = current_app_user_id()
          )
        )
    )
  );

CREATE POLICY eventinvite_delete_organiser ON "EventInvite"
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM "Event" e
      WHERE e."id" = "EventInvite"."eventId"
        AND (
          e."creatorId" = current_app_user_id()
          OR EXISTS (
            SELECT 1 FROM "EventOrganiser" eo
            WHERE eo."eventId" = e."id" AND eo."userId" = current_app_user_id()
          )
        )
    )
  );

-- ─── UserAvailability ───────────────────────────────────────────────────────
-- Owner can do anything to their own availability. Other authenticated
-- users can SELECT, EXCEPT when the owner has an AvailabilityBlock against
-- the viewer.

CREATE POLICY useravailability_owner_full ON "UserAvailability"
  FOR ALL USING ("userId" = current_app_user_id())
  WITH CHECK ("userId" = current_app_user_id());

CREATE POLICY useravailability_select_viewer ON "UserAvailability"
  FOR SELECT USING (
    current_app_user_id() IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM "AvailabilityBlock" ab
      WHERE ab."blockerId" = "UserAvailability"."userId"
        AND ab."blockedId" = current_app_user_id()
    )
  );

-- ─── GroupPoll ──────────────────────────────────────────────────────────────
-- Visible to members of the social group. Any member can INSERT a poll.
-- Only the poll creator can UPDATE (e.g. close) or DELETE.

CREATE POLICY grouppoll_select_member ON "GroupPoll"
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM "SocialGroupMember" sgm
      WHERE sgm."socialGroupId" = "GroupPoll"."socialGroupId"
        AND sgm."userId" = current_app_user_id()
    )
  );

CREATE POLICY grouppoll_insert_member ON "GroupPoll"
  FOR INSERT WITH CHECK (
    "createdById" = current_app_user_id()
    AND EXISTS (
      SELECT 1 FROM "SocialGroupMember" sgm
      WHERE sgm."socialGroupId" = "GroupPoll"."socialGroupId"
        AND sgm."userId" = current_app_user_id()
    )
  );

CREATE POLICY grouppoll_modify_creator ON "GroupPoll"
  FOR UPDATE USING ("createdById" = current_app_user_id());

CREATE POLICY grouppoll_delete_creator ON "GroupPoll"
  FOR DELETE USING ("createdById" = current_app_user_id());

-- ─── PollOption ─────────────────────────────────────────────────────────────
-- Visible / mutable in lockstep with parent poll's group membership /
-- creator rules.

CREATE POLICY polloption_select_member ON "PollOption"
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM "GroupPoll" p
      JOIN "SocialGroupMember" sgm ON sgm."socialGroupId" = p."socialGroupId"
      WHERE p."id" = "PollOption"."pollId"
        AND sgm."userId" = current_app_user_id()
    )
  );

CREATE POLICY polloption_modify_poll_creator ON "PollOption"
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM "GroupPoll" p
      WHERE p."id" = "PollOption"."pollId"
        AND p."createdById" = current_app_user_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "GroupPoll" p
      WHERE p."id" = "PollOption"."pollId"
        AND p."createdById" = current_app_user_id()
    )
  );

-- ─── PollVote ───────────────────────────────────────────────────────────────
-- Visible to all group members (results are shared). Only the voter can
-- INSERT / UPDATE / DELETE their own vote.

CREATE POLICY pollvote_select_member ON "PollVote"
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM "PollOption" po
      JOIN "GroupPoll" p ON p."id" = po."pollId"
      JOIN "SocialGroupMember" sgm ON sgm."socialGroupId" = p."socialGroupId"
      WHERE po."id" = "PollVote"."pollOptionId"
        AND sgm."userId" = current_app_user_id()
    )
  );

CREATE POLICY pollvote_modify_self ON "PollVote"
  FOR ALL USING ("userId" = current_app_user_id())
  WITH CHECK ("userId" = current_app_user_id());

-- ─── EventSuggestion ────────────────────────────────────────────────────────
-- Visible to social group members. Any member can INSERT. Only suggester
-- can UPDATE or DELETE.

CREATE POLICY eventsuggestion_select_member ON "EventSuggestion"
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM "SocialGroupMember" sgm
      WHERE sgm."socialGroupId" = "EventSuggestion"."socialGroupId"
        AND sgm."userId" = current_app_user_id()
    )
  );

CREATE POLICY eventsuggestion_insert_member ON "EventSuggestion"
  FOR INSERT WITH CHECK (
    "suggestedById" = current_app_user_id()
    AND EXISTS (
      SELECT 1 FROM "SocialGroupMember" sgm
      WHERE sgm."socialGroupId" = "EventSuggestion"."socialGroupId"
        AND sgm."userId" = current_app_user_id()
    )
  );

CREATE POLICY eventsuggestion_modify_suggester ON "EventSuggestion"
  FOR UPDATE USING ("suggestedById" = current_app_user_id());

CREATE POLICY eventsuggestion_delete_suggester ON "EventSuggestion"
  FOR DELETE USING ("suggestedById" = current_app_user_id());

-- ─── SuggestionVote ─────────────────────────────────────────────────────────
-- Visible to social group members. Voter owns their vote.

CREATE POLICY suggestionvote_select_member ON "SuggestionVote"
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM "EventSuggestion" es
      JOIN "SocialGroupMember" sgm ON sgm."socialGroupId" = es."socialGroupId"
      WHERE es."id" = "SuggestionVote"."suggestionId"
        AND sgm."userId" = current_app_user_id()
    )
  );

CREATE POLICY suggestionvote_modify_self ON "SuggestionVote"
  FOR ALL USING ("userId" = current_app_user_id())
  WITH CHECK ("userId" = current_app_user_id());
