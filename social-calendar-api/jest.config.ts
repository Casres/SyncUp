import type { Config } from 'jest';

/**
 * Jest configuration for the SyncUp backend integration tests.
 *
 * Architecture notes:
 * - The backend source uses NodeNext ESM (`"type": "module"` + `.js`
 *   extensions on every relative import). ESM Jest support is still
 *   experimental and `jest.mock()` does not work for native ESM modules
 *   without `unstable_mockModule` + dynamic imports. To keep the Clerk
 *   mock simple and reliable, we transpile the ESM source to CJS for the
 *   test run. The `moduleNameMapper` below rewrites the `.js` import
 *   specifiers to their `.ts` source so Jest can resolve them.
 * - No code in `src/` uses `import.meta` or top-level `await`, so the
 *   CJS transpile is lossless. (Verified at handoff time.)
 * - `maxWorkers: 1` because integration tests share a single Postgres
 *   database. Parallel workers would produce non-deterministic state
 *   races between truncates and inserts.
 * - `globalSetup` / `globalTeardown` run once per process in a separate
 *   Node context — Jest globals are NOT available in those files.
 * - `setupFilesAfterEnv` runs in the test environment before every file
 *   (Jest globals ARE available — that's where the Clerk mock lives).
 *
 * tsconfig.json has no `paths` aliases, so the only `moduleNameMapper`
 * entry is the `.js` → source rewrite for NodeNext-style imports.
 */
const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  testMatch: ['**/__tests__/**/*.test.ts'],
  // Strip the trailing `.js` from relative imports so Jest can resolve
  // the `.ts` source. Mirrors the NodeNext convention used in src/.
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        // Override tsconfig's `module: NodeNext` for the test transpile so
        // `jest.mock()` hoisting and CommonJS interop work without ESM.
        // Source code stays unchanged — this only affects the test build.
        tsconfig: {
          module: 'CommonJS',
          moduleResolution: 'Node',
          target: 'ES2022',
          esModuleInterop: true,
          isolatedModules: true,
          verbatimModuleSyntax: false,
        },
      },
    ],
  },
  globalSetup: './__tests__/setup/global-setup.ts',
  globalTeardown: './__tests__/setup/global-teardown.ts',
  setupFilesAfterEnv: ['./__tests__/setup/jest-setup.ts'],
  testTimeout: 15_000,
  maxWorkers: 1,
  // Ignore the `dist/` build output if the developer ran `npm run build`.
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
};

export default config;
