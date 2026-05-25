-- ─── Fix: current_app_user_id() STABLE → VOLATILE ────────────────────────────
--
-- Root cause: current_app_user_id() was declared LANGUAGE sql STABLE, which
-- allows PostgreSQL to evaluate it at plan-creation time in generic prepared
-- statement plans (activated after 5 uses of the same named prepared statement).
--
-- Prisma's ORM uses the Extended Query Protocol with named prepared statements
-- on a reused connection pool. After 5 executions, PostgreSQL switches to a
-- generic plan and evaluates STABLE functions at plan time — at which point no
-- SET LOCAL is in effect, so current_setting('app.current_user_id', true) returns
-- '' → NULLIF → NULL. The RLS WITH CHECK "creatorId" = NULL is NULL (not TRUE)
-- → 42501 error.
--
-- $executeRaw uses the Simple Query Protocol (no named prepared statements),
-- which always evaluates at execution time — this is why raw INSERTs worked while
-- ORM tx.event.create() failed.
--
-- Fix: VOLATILE forces evaluation at execution time in every plan type, including
-- generic plans. The function is called once per statement (RLS policy evaluation),
-- not once per row, so the performance impact is negligible.

CREATE OR REPLACE FUNCTION current_app_user_id() RETURNS text AS $$
  SELECT NULLIF(current_setting('app.current_user_id', true), '')
$$ LANGUAGE sql VOLATILE;

COMMENT ON FUNCTION current_app_user_id() IS
  'Returns the User.id of the request''s authenticated user, or NULL if unset. Set via SET LOCAL app.current_user_id by auth middleware. VOLATILE — must not be STABLE or IMMUTABLE, as generic prepared statement plans would evaluate it at plan time rather than execution time, breaking RLS with Prisma''s Extended Query Protocol.';
