/**
 * global-teardown.ts
 *
 * Runs once after all test suites in a separate Node.js process. Each test
 * file already calls `closeApp()` and `disconnectTestDb()` in its own
 * `afterAll`, so this hook only needs to log completion.
 */
export default async function globalTeardown(): Promise<void> {
  // eslint-disable-next-line no-console
  console.log('[test] global teardown complete');
}
