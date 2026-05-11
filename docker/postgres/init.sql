-- Postgres initialisation for SyncUp local dev.
--
-- Runs once on first boot of the postgres container (when the data volume
-- is empty). If you need to re-run this against an existing dev database,
-- drop the named volume:
--
--     docker compose down -v
--
-- Two roles, per the RLS contract documented in
-- social-calendar-api/prisma/HANDOFF.md:
--
--   • syncup_migrate (POSTGRES_USER) — table owner. Bypasses RLS by default.
--     Used by the Prisma CLI for migrations.
--
--   • syncup_app — non-owner runtime role. RLS applies. Used by the
--     Fastify process at runtime via DATABASE_URL_APP.

CREATE ROLE syncup_app LOGIN PASSWORD 'syncup_app_dev';

GRANT CONNECT ON DATABASE syncup TO syncup_app;
GRANT USAGE   ON SCHEMA public   TO syncup_app;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES    IN SCHEMA public TO syncup_app;
GRANT USAGE,  SELECT                  ON ALL SEQUENCES IN SCHEMA public TO syncup_app;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES    TO syncup_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE,  SELECT                  ON SEQUENCES TO syncup_app;
