/**
 * Barrel export for the SyncUp mock data layer.
 *
 * Consumers (the API Stub Layer + tests) should import from this module
 * rather than reaching into the individual files. This keeps the seam
 * between mocks and stubs single-edge.
 */

export * from './users';
export * from './friendships';
export * from './friendTypes';
export * from './events';
export * from './groups';
export * from './availability';
export * from './notifications';
export * from './explore';
