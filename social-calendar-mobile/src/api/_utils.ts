/**
 * API Stub Layer — shared utilities.
 *
 * - `simulateLatency()` randomises 200–500ms before every stub resolves so
 *   loading states in screens are exercised exactly as they would be in
 *   production.
 * - `ApiError` is the typed failure surface every stub throws. The `code`
 *   field discriminates the failure mode and feeds `toastPreset()`, which
 *   maps it back to the `ErrorToast` preset key the screen layer renders.
 *
 * When the real backend lands, only the function bodies of stubs change —
 * the `ApiError` shape and these helpers stay identical so React Query
 * hooks and screens are untouched.
 */
import type { ErrorToastKind } from '../../../TYPES';

/** All possible failure modes a stub can raise. */
export type ApiErrorCode =
  | 'NOT_FOUND'
  | 'FORBIDDEN'
  | 'CONFLICT'
  | 'OFFLINE'
  | 'SERVER_ERROR';

/**
 * Typed error thrown by API stubs. React Query's `onError` handler in
 * screens narrows on `err instanceof ApiError` to map the code to a toast
 * preset.
 */
export class ApiError extends Error {
  public readonly code: ApiErrorCode;

  constructor(code: ApiErrorCode, message: string) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    // Preserve prototype chain when transpiled to ES5-ish targets.
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

/**
 * Randomised network-latency simulation used by every stub. Range 200–500ms
 * matches the design spec's "feels real, doesn't drag" target.
 */
export async function simulateLatency(): Promise<void> {
  const ms = 200 + Math.floor(Math.random() * 300);
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Roll a probability check against the simulated failure rate. Used by
 * stubs that have a non-zero chance of failing on otherwise valid input
 * (e.g. RSVP submit at 10%).
 */
export function shouldSimulateFailure(probability: number): boolean {
  return Math.random() < probability;
}

/**
 * Map an `ApiError` to one of the four `ErrorToast` presets defined in
 * TYPES (`ErrorToastKind`). The screen layer reads this and renders the
 * matching ErrorToast preset.
 *
 * Mapping rules:
 *  - CONFLICT  → 'friend'  (used by add-friend / already-a-friend)
 *  - default   → 'generic'
 *
 * Callers can still override (e.g. wrap a SERVER_ERROR from `submitRSVP`
 * in the 'rsvp' preset) — this is the safe default.
 */
export function toastPreset(err: ApiError): ErrorToastKind {
  if (err.code === 'CONFLICT') return 'friend';
  return 'generic';
}
