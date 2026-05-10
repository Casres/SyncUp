-- ─── RLS recursion fix ─────────────────────────────────────────────────────
--
-- The original `_rls_policies` migration declared several policies whose
-- USING clauses re-query the same table the policy is attached to (e.g.
-- EventOrganiser checking EventOrganiser, SocialGroupMember checking
-- SocialGroupMember). Postgres re-applies the policy to every inner SELECT,
-- which triggers `42P17 — infinite recursion detected in policy for relation`.
-- Cross-table chains that pass through these relations (Event -> EventOrganiser,
-- SocialGroup -> SocialGroupMember, etc.) inherit the same crash.
--
-- Fix: introduce SECURITY DEFINER helper functions owned by the migration
-- role (which has BYPASSRLS via being the table owner). Inner checks call
-- the helpers instead of re-querying directly, so the policy engine never
-- re-enters itself.
--
-- The helpers take both the row id AND the user id explicitly so they are
-- pure functions — no implicit reference to current_app_user_id() — making
-- them straightforward to test and reason about.

-- ─── Helper functions ──────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION app_is_event_creator(p_event_id text, p_user_id text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp AS $$
  SELECT EXISTS (
    SELECT 1 FROM "Event"
    WHERE "id" = p_event_id AND "creatorId" = p_user_id
  );
$$;

CREATE OR REPLACE FUNCTION app_is_event_organiser(p_event_id text, p_user_id text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp AS $$
  SELECT EXISTS (
    SELECT 1 FROM "EventOrganiser"
    WHERE "eventId" = p_event_id AND "userId" = p_user_id
  );
$$;

CREATE OR REPLACE FUNCTION app_is_event_invitee(p_event_id text, p_user_id text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp AS $$
  SELECT EXISTS (
    SELECT 1 FROM "EventInvite"
    WHERE "eventId" = p_event_id AND "recipientId" = p_user_id
  );
$$;

CREATE OR REPLACE FUNCTION app_can_view_event(p_event_id text, p_user_id text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp AS $$
  SELECT
    p_user_id IS NOT NULL
    AND (
      app_is_event_creator(p_event_id, p_user_id)
      OR app_is_event_organiser(p_event_id, p_user_id)
      OR app_is_event_invitee(p_event_id, p_user_id)
    );
$$;

CREATE OR REPLACE FUNCTION app_can_modify_event(p_event_id text, p_user_id text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp AS $$
  SELECT
    p_user_id IS NOT NULL
    AND (
      app_is_event_creator(p_event_id, p_user_id)
      OR app_is_event_organiser(p_event_id, p_user_id)
    );
$$;

CREATE OR REPLACE FUNCTION app_is_social_group_member(p_group_id text, p_user_id text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp AS $$
  SELECT EXISTS (
    SELECT 1 FROM "SocialGroupMember"
    WHERE "socialGroupId" = p_group_id AND "userId" = p_user_id
  );
$$;

CREATE OR REPLACE FUNCTION app_is_social_group_admin(p_group_id text, p_user_id text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp AS $$
  SELECT EXISTS (
    SELECT 1 FROM "SocialGroupMember"
    WHERE "socialGroupId" = p_group_id
      AND "userId" = p_user_id
      AND "role" = 'ADMIN'
  );
$$;

-- The runtime role queries through these — grant EXECUTE so it can call them.
GRANT EXECUTE ON FUNCTION app_is_event_creator(text, text)        TO syncup_app;
GRANT EXECUTE ON FUNCTION app_is_event_organiser(text, text)      TO syncup_app;
GRANT EXECUTE ON FUNCTION app_is_event_invitee(text, text)        TO syncup_app;
GRANT EXECUTE ON FUNCTION app_can_view_event(text, text)          TO syncup_app;
GRANT EXECUTE ON FUNCTION app_can_modify_event(text, text)        TO syncup_app;
GRANT EXECUTE ON FUNCTION app_is_social_group_member(text, text)  TO syncup_app;
GRANT EXECUTE ON FUNCTION app_is_social_group_admin(text, text)   TO syncup_app;

-- ─── Event ─────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS event_select_participant ON "Event";
CREATE POLICY event_select_participant ON "Event"
  FOR SELECT USING (
    app_can_view_event("Event"."id", current_app_user_id())
  );

DROP POLICY IF EXISTS event_modify_organiser ON "Event";
CREATE POLICY event_modify_organiser ON "Event"
  FOR UPDATE USING (
    app_can_modify_event("Event"."id", current_app_user_id())
  );

-- ─── EventOrganiser ────────────────────────────────────────────────────────

DROP POLICY IF EXISTS eventorganiser_select_event_visible ON "EventOrganiser";
CREATE POLICY eventorganiser_select_event_visible ON "EventOrganiser"
  FOR SELECT USING (
    app_can_view_event("EventOrganiser"."eventId", current_app_user_id())
  );

DROP POLICY IF EXISTS eventorganiser_modify_creator ON "EventOrganiser";
CREATE POLICY eventorganiser_modify_creator ON "EventOrganiser"
  FOR ALL USING (
    app_is_event_creator("EventOrganiser"."eventId", current_app_user_id())
  )
  WITH CHECK (
    app_is_event_creator("EventOrganiser"."eventId", current_app_user_id())
  );

-- ─── EventException ────────────────────────────────────────────────────────

DROP POLICY IF EXISTS eventexception_select_event_visible ON "EventException";
CREATE POLICY eventexception_select_event_visible ON "EventException"
  FOR SELECT USING (
    app_can_view_event("EventException"."eventId", current_app_user_id())
  );

DROP POLICY IF EXISTS eventexception_modify_organiser ON "EventException";
CREATE POLICY eventexception_modify_organiser ON "EventException"
  FOR ALL USING (
    app_can_modify_event("EventException"."eventId", current_app_user_id())
  )
  WITH CHECK (
    app_can_modify_event("EventException"."eventId", current_app_user_id())
  );

-- ─── EventInvite ───────────────────────────────────────────────────────────

DROP POLICY IF EXISTS eventinvite_select_party ON "EventInvite";
CREATE POLICY eventinvite_select_party ON "EventInvite"
  FOR SELECT USING (
    "recipientId" = current_app_user_id()
    OR app_can_modify_event("EventInvite"."eventId", current_app_user_id())
  );

DROP POLICY IF EXISTS eventinvite_insert_organiser ON "EventInvite";
CREATE POLICY eventinvite_insert_organiser ON "EventInvite"
  FOR INSERT WITH CHECK (
    app_can_modify_event("EventInvite"."eventId", current_app_user_id())
  );

DROP POLICY IF EXISTS eventinvite_update_recipient_or_organiser ON "EventInvite";
CREATE POLICY eventinvite_update_recipient_or_organiser ON "EventInvite"
  FOR UPDATE USING (
    "recipientId" = current_app_user_id()
    OR app_can_modify_event("EventInvite"."eventId", current_app_user_id())
  );

DROP POLICY IF EXISTS eventinvite_delete_organiser ON "EventInvite";
CREATE POLICY eventinvite_delete_organiser ON "EventInvite"
  FOR DELETE USING (
    app_can_modify_event("EventInvite"."eventId", current_app_user_id())
  );

-- ─── SocialGroup ───────────────────────────────────────────────────────────

DROP POLICY IF EXISTS socialgroup_select_member ON "SocialGroup";
CREATE POLICY socialgroup_select_member ON "SocialGroup"
  FOR SELECT USING (
    app_is_social_group_member("SocialGroup"."id", current_app_user_id())
  );

DROP POLICY IF EXISTS socialgroup_modify_admin ON "SocialGroup";
CREATE POLICY socialgroup_modify_admin ON "SocialGroup"
  FOR UPDATE USING (
    app_is_social_group_admin("SocialGroup"."id", current_app_user_id())
  );

DROP POLICY IF EXISTS socialgroup_delete_admin ON "SocialGroup";
CREATE POLICY socialgroup_delete_admin ON "SocialGroup"
  FOR DELETE USING (
    app_is_social_group_admin("SocialGroup"."id", current_app_user_id())
  );

-- ─── SocialGroupMember ─────────────────────────────────────────────────────

DROP POLICY IF EXISTS socialgroupmember_select_co_member ON "SocialGroupMember";
CREATE POLICY socialgroupmember_select_co_member ON "SocialGroupMember"
  FOR SELECT USING (
    app_is_social_group_member("SocialGroupMember"."socialGroupId", current_app_user_id())
  );

DROP POLICY IF EXISTS socialgroupmember_insert_admin ON "SocialGroupMember";
CREATE POLICY socialgroupmember_insert_admin ON "SocialGroupMember"
  FOR INSERT WITH CHECK (
    app_is_social_group_admin("SocialGroupMember"."socialGroupId", current_app_user_id())
    -- Self-INSERT for the create-group bootstrap (service layer enforces).
    OR "userId" = current_app_user_id()
  );

DROP POLICY IF EXISTS socialgroupmember_delete_admin_or_self ON "SocialGroupMember";
CREATE POLICY socialgroupmember_delete_admin_or_self ON "SocialGroupMember"
  FOR DELETE USING (
    "userId" = current_app_user_id()
    OR app_is_social_group_admin("SocialGroupMember"."socialGroupId", current_app_user_id())
  );

DROP POLICY IF EXISTS socialgroupmember_update_admin ON "SocialGroupMember";
CREATE POLICY socialgroupmember_update_admin ON "SocialGroupMember"
  FOR UPDATE USING (
    app_is_social_group_admin("SocialGroupMember"."socialGroupId", current_app_user_id())
  );

-- ─── GroupPoll / PollOption / PollVote / EventSuggestion / SuggestionVote ──
-- These cascade through SocialGroupMember, so they inherit the recursion
-- once SocialGroupMember has a self-referencing policy. Rebuild via the
-- group-membership helper.

DROP POLICY IF EXISTS grouppoll_select_member ON "GroupPoll";
CREATE POLICY grouppoll_select_member ON "GroupPoll"
  FOR SELECT USING (
    app_is_social_group_member("GroupPoll"."socialGroupId", current_app_user_id())
  );

DROP POLICY IF EXISTS grouppoll_insert_member ON "GroupPoll";
CREATE POLICY grouppoll_insert_member ON "GroupPoll"
  FOR INSERT WITH CHECK (
    "createdById" = current_app_user_id()
    AND app_is_social_group_member("GroupPoll"."socialGroupId", current_app_user_id())
  );

DROP POLICY IF EXISTS eventsuggestion_select_member ON "EventSuggestion";
CREATE POLICY eventsuggestion_select_member ON "EventSuggestion"
  FOR SELECT USING (
    app_is_social_group_member("EventSuggestion"."socialGroupId", current_app_user_id())
  );

DROP POLICY IF EXISTS eventsuggestion_insert_member ON "EventSuggestion";
CREATE POLICY eventsuggestion_insert_member ON "EventSuggestion"
  FOR INSERT WITH CHECK (
    "suggestedById" = current_app_user_id()
    AND app_is_social_group_member("EventSuggestion"."socialGroupId", current_app_user_id())
  );

-- PollOption / PollVote / SuggestionVote join through their parent rows;
-- their original policies use plain SELECT joins (no self-reference), so
-- once GroupPoll / EventSuggestion / SocialGroupMember are recursion-free,
-- these inherit the fix without further changes. The SocialGroupMember
-- self-reference inside their original SELECTs IS, however, triggered
-- through the JOINed SocialGroupMember table, so rebuild them too:

DROP POLICY IF EXISTS polloption_select_member ON "PollOption";
CREATE POLICY polloption_select_member ON "PollOption"
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM "GroupPoll" p
      WHERE p."id" = "PollOption"."pollId"
        AND app_is_social_group_member(p."socialGroupId", current_app_user_id())
    )
  );

DROP POLICY IF EXISTS pollvote_select_member ON "PollVote";
CREATE POLICY pollvote_select_member ON "PollVote"
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM "PollOption" po
      JOIN "GroupPoll" p ON p."id" = po."pollId"
      WHERE po."id" = "PollVote"."pollOptionId"
        AND app_is_social_group_member(p."socialGroupId", current_app_user_id())
    )
  );

DROP POLICY IF EXISTS suggestionvote_select_member ON "SuggestionVote";
CREATE POLICY suggestionvote_select_member ON "SuggestionVote"
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM "EventSuggestion" es
      WHERE es."id" = "SuggestionVote"."suggestionId"
        AND app_is_social_group_member(es."socialGroupId", current_app_user_id())
    )
  );

COMMENT ON FUNCTION app_can_view_event(text, text) IS
  'SECURITY DEFINER helper used by EventOrganiser/EventException/EventInvite RLS policies to break the recursion that the original Round-1 RLS migration introduced via direct EventOrganiser self-references.';
