/**
 * global-setup.ts
 *
 * Runs once before all test suites in a separate Node.js process.
 * Jest globals (`jest`, `expect`, etc.) are NOT available here — this is a
 * stand-alone process that exits before the test workers spin up.
 *
 * In CI: `prisma migrate deploy` runs in `.github/workflows/ci.yml` before
 * the test step, and the two-role Postgres provisioning happens in the
 * `Provision syncup_app role` step. Nothing to do here.
 *
 * Locally: the developer is expected to have run `prisma migrate dev`
 * against the docker-compose Postgres. See `social-calendar-api/JEST_HANDOFF.md`.
 */
export default async function globalSetup(): Promise<void> {
  // Intentionally minimal. Migrations are out of scope for the test runner —
  // they are owned by the CI workflow and the local docker-compose stack.
  // eslint-disable-next-line no-console
  console.log('[test] global setup ready');
}
