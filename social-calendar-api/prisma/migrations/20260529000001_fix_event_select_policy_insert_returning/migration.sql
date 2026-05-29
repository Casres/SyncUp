-- ─── Fix: event_select_participant causes INSERT...RETURNING to fail ──────────
--
-- Root cause: Prisma always appends RETURNING to INSERT. PostgreSQL evaluates
-- the SELECT policy as a WITH CHECK for INSERT...RETURNING. The SELECT policy
-- called app_can_view_event → app_is_event_creator, which does:
--
--   SELECT EXISTS (SELECT 1 FROM "Event" WHERE ...)
--
-- app_is_event_creator is SECURITY DEFINER (runs as syncup_migrate). Its inner
-- SELECT uses a snapshot captured BEFORE the INSERT row entered the heap, so it
-- cannot see the row being inserted and returns FALSE. The WITH CHECK therefore
-- fails with 42501, even though the INSERT WITH CHECK (the actual insert policy)
-- is `"creatorId" = current_app_user_id()` which would have passed.
--
-- Fix: inline the creator visibility check directly in event_select_participant
-- using the row's own "creatorId" column instead of re-querying "Event".
-- A direct column comparison needs no secondary SELECT and is immune to the
-- snapshot-isolation issue. The organiser and invitee legs are unaffected
-- because EventOrganiser / EventInvite rows can only exist after their parent
-- Event has been committed, so app_is_event_organiser / app_is_event_invitee
-- will always see the Event row.
--
-- While here: restore helper functions to their canonical STABLE sql form
-- (the running dev DB had them flipped to VOLATILE during debugging) and
-- drop the debug_current_user_id() function that was created during diagnosis.

-- ─── Restore helper functions to canonical STABLE sql form ───────────────────

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

-- ─── Drop debug artifact ─────────────────────────────────────────────────────

DROP FUNCTION IF EXISTS debug_current_user_id();

-- ─── Fix: event_select_participant ───────────────────────────────────────────
--
-- Old: USING (app_can_view_event("Event"."id", current_app_user_id()))
--   ↳ calls app_is_event_creator → secondary SELECT on "Event" → snapshot miss
--
-- New: inline "creatorId" = current_app_user_id() (no secondary SELECT),
--      keep organiser/invitee legs through their own tables (safe — those rows
--      only exist after the parent Event is committed).

DROP POLICY IF EXISTS event_select_participant ON "Event";
CREATE POLICY event_select_participant ON "Event"
  FOR SELECT USING (
    current_app_user_id() IS NOT NULL
    AND (
      "creatorId" = current_app_user_id()
      OR app_is_event_organiser("Event"."id", current_app_user_id())
      OR app_is_event_invitee("Event"."id", current_app_user_id())
    )
  );

-- ─── Restore event_insert_creator_self to correct WITH CHECK ─────────────────
-- (Dev DB had this set to `WITH CHECK (true)` during diagnosis.)

DROP POLICY IF EXISTS event_insert_creator_self ON "Event";
CREATE POLICY event_insert_creator_self ON "Event"
  FOR INSERT WITH CHECK (
    "creatorId" = current_app_user_id()
  );

COMMENT ON FUNCTION app_can_view_event(text, text) IS
  'SECURITY DEFINER helper used by EventOrganiser/EventException/EventInvite RLS
   policies. NOT used in the Event SELECT policy itself — the Event SELECT policy
   inlines the "creatorId" check directly to avoid a snapshot-isolation deadlock
   where the SECURITY DEFINER helper cannot see the row just inserted by the
   calling INSERT...RETURNING statement.';
