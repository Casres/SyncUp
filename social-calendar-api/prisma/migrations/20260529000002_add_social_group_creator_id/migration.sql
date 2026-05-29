-- ─── Add SocialGroup.creatorId — fix INSERT...RETURNING RLS on group creation ─
--
-- Same root cause as the Event INSERT...RETURNING fix (20260529000001):
-- `db.socialGroup.create()` issues INSERT...RETURNING, which causes PostgreSQL
-- to evaluate the SELECT policy `socialgroup_select_member` as a WITH CHECK on
-- the new row. That policy calls `app_is_social_group_member`, which queries
-- SocialGroupMember — but the first ADMIN member hasn't been inserted yet at
-- that point, so it returns FALSE and the INSERT is rejected with 42501.
--
-- Fix: denormalise `creatorId` onto SocialGroup (same pattern as Event.creatorId).
-- The SELECT policy can then check `"creatorId" = current_app_user_id()` inline,
-- with no secondary query — identical to how the Event SELECT policy was fixed.

-- ─── Schema ──────────────────────────────────────────────────────────────────

ALTER TABLE "SocialGroup" ADD COLUMN "creatorId" TEXT NOT NULL DEFAULT '';
-- Backfill for any existing rows (dev DB is empty; guard for safety).
UPDATE "SocialGroup" sg
SET "creatorId" = (
  SELECT sgm."userId" FROM "SocialGroupMember" sgm
  WHERE sgm."socialGroupId" = sg.id AND sgm."role" = 'ADMIN'
  LIMIT 1
)
WHERE "creatorId" = '';
-- Remove the placeholder default now that the column is populated.
ALTER TABLE "SocialGroup" ALTER COLUMN "creatorId" DROP DEFAULT;

ALTER TABLE "SocialGroup"
  ADD CONSTRAINT "SocialGroup_creatorId_fkey"
  FOREIGN KEY ("creatorId") REFERENCES "User"(id)
  ON UPDATE CASCADE ON DELETE RESTRICT;

CREATE INDEX "SocialGroup_creatorId_idx" ON "SocialGroup"("creatorId");

-- ─── Fix: socialgroup_select_member ──────────────────────────────────────────
--
-- Old: USING (app_is_social_group_member(...))
--   ↳ secondary SELECT on SocialGroupMember → not yet present during group
--     creation → snapshot miss for INSERT...RETURNING
--
-- New: inline "creatorId" = current_app_user_id() (no secondary SELECT),
--      keep member check for all non-creator members.

DROP POLICY IF EXISTS socialgroup_select_member ON "SocialGroup";
CREATE POLICY socialgroup_select_member ON "SocialGroup"
  FOR SELECT USING (
    current_app_user_id() IS NOT NULL
    AND (
      "creatorId" = current_app_user_id()
      OR app_is_social_group_member("SocialGroup"."id", current_app_user_id())
    )
  );

-- ─── Fix: socialgroupmember_select_co_member ─────────────────────────────────
--
-- Same snapshot issue: INSERT INTO SocialGroupMember...RETURNING triggers the
-- SELECT policy which calls app_is_social_group_member — a secondary SELECT that
-- can't see the row being inserted.
--
-- Fix: inline "userId" = current_app_user_id() so a member can always see their
-- own row (direct column compare, no secondary SELECT). The app_is_social_group_member
-- leg handles visibility of co-members' rows once the caller is established as a member.

DROP POLICY IF EXISTS socialgroupmember_select_co_member ON "SocialGroupMember";
CREATE POLICY socialgroupmember_select_co_member ON "SocialGroupMember"
  FOR SELECT USING (
    current_app_user_id() IS NOT NULL
    AND (
      "userId" = current_app_user_id()
      OR app_is_social_group_member("SocialGroupMember"."socialGroupId", current_app_user_id())
    )
  );
