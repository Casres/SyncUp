/**
 * API Stub Layer — barrel export.
 *
 * Screens import from `'../api'` (or `'../../api'`) — never reach into
 * individual stub files. Keeps the seam single-edge so swapping in the
 * real backend is one PR per resource.
 */

export * from './_utils';
export {
  apiFetch,
  apiMutate,
  isApiConfigured,
  useApiFetch,
  useApiMutate,
  type AuthedFetch,
  type AuthedMutate,
  type MutateMethod,
} from './_client';
export * from './queryKeys';
export { queryClient } from './queryClient';
export * from './events';
export * from './friends';
export * from './groups';
export * from './availability';
export * from './profile';
export * from './explore';
export * from './notifications';
