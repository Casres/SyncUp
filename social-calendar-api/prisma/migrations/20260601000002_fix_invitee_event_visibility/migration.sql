-- ─── Fix: invitee can't see the event they were invited to ────────────────────
--
-- Symptom: PATCH /events/:id/invites/:inviteId returned 404 "Event not found".
-- The round-trip test created an invite from A→B, then had B accept it. B's
-- transaction set app.current_user_id = B, then `eventsRepository.findById`
-- returned null because the Event SELECT policy hid the row from B.
--
-- ─── Diagnosis ────────────────────────────────────────────────────────────────
--
-- The Event SELECT policy as of 20260529000001 reads:
--
--     current_app_user_id() IS NOT NULL
--     AND (
--       "creatorId" = current_app_user_id()                              -- A only
--       OR app_is_event_organiser("Event"."id", current_app_user_id())   -- A only
--       OR app_is_event_invitee("Event"."id", current_app_user_id())     -- B is invitee
--     )
--
-- For B, only the third leg should pass. `app_is_event_invitee` is
-- SECURITY DEFINER STABLE and queries "EventInvite" directly — it should see
-- the row regardless of B's RLS context.
--
-- Empirically the SECURITY DEFINER + STABLE combination is unreliable here. The
-- closest analogue is the lesson from 20260529000001: SECURITY DEFINER helpers
-- can return false for the calling row under specific snapshot / prepared-plan
-- conditions. The earlier migration solved that for the creator leg by
-- inlining `"creatorId" = current_app_user_id()` directly. The same surgical
-- pattern works for the invitee leg: replace the SECURITY DEFINER call with
-- an inline EXISTS subquery against EventInvite. The subquery runs under the
-- caller's RLS, but EventInvite's SELECT policy already grants the recipient
-- the row (`"recipientId" = current_app_user_id()`), so B can see their own
-- invite and the policy resolves true.
--
-- The organiser leg is left alone (still uses app_is_event_organiser): the
-- only callers that hit the organiser branch are users who are themselves
-- organisers, and the EventOrganiser SELECT policy already grants visibility
-- to organisers / participants, so an inline EXISTS would also work but is
-- unnecessary churn.
--
-- ─── Fix ──────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS event_select_participant ON "Event";
CREATE POLICY event_select_participant ON "Event"
  FOR SELECT USING (
    current_app_user_id() IS NOT NULL
    AND (
      "creatorId" = current_app_user_id()
      OR app_is_event_organiser("Event"."id", current_app_user_id())
      OR EXISTS (
        SELECT 1 FROM "EventInvite" ei
        WHERE ei."eventId" = "Event"."id"
          AND ei."recipientId" = current_app_user_id()
      )
    )
  );

COMMENT ON POLICY event_select_participant ON "Event" IS
  'Event is visible to creator (inline check), organisers (via SECURITY DEFINER
   helper), and invitees (inline EXISTS against EventInvite). The invitee leg
   was inlined in 20260601000002 after the SECURITY DEFINER variant failed to
   surface the event to the recipient during PATCH-RSVP. EventInvite''s own
   SELECT policy grants the recipient access to their row, so the inline
   subquery resolves true for the intended viewer.';
