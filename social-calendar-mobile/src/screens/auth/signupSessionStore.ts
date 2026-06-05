/**
 * Sign-up session id — transient local store.
 *
 * The Clerk sign-up COMPLETES at SignUpStep4 (`signUp.update({ password })`),
 * which is where Clerk mints the session (`signUp.createdSessionId`). But
 * `setActive()` isn't called until YoureIn — several screens later (Step5,
 * Step6, push gate, friend-find) — and by then Clerk has dropped
 * `createdSessionId` from the client `signUp` resource, so YoureIn would see
 * null and silently fail to activate (the session stays orphaned-but-active on
 * the server). See issue #4.
 *
 * We therefore capture the session id at the moment of completion and hold it
 * here until YoureIn consumes it. Same rationale + lifetime as
 * `signupAvatarStore`: local-only, never hits the network, a process-singleton
 * ref wiped once consumed — not React Query, not Zustand.
 *
 * SignUpStep4 calls `setSignupSessionId(signUp.createdSessionId)` on completion.
 * YoureIn reads it via `getSignupSessionId()`, calls setActive, then
 * `clearSignupSessionId()`.
 */

let currentSessionId: string | null = null;

export function getSignupSessionId(): string | null {
  return currentSessionId;
}

export function setSignupSessionId(sessionId: string | null): void {
  currentSessionId = sessionId;
}

export function clearSignupSessionId(): void {
  currentSessionId = null;
}
