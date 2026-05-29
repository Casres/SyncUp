/**
 * Sign-up avatar — transient local store.
 *
 * The avatar chosen on SignUpStep5 cannot be uploaded yet: the Clerk session
 * isn't active until YoureIn calls setActive(). The chosen asset URI therefore
 * has to survive several intermediate onboarding screens (Step6, push gate,
 * friend-find) whose navigation params don't carry it.
 *
 * This URI is local-only state — it never touches the network until after the
 * session is live — so per the project rules it does NOT belong in React Query.
 * It is also not Zustand. It is a process-singleton ref, mirroring the
 * create-event draftStore pattern: a transient holder wiped once consumed.
 *
 * SignUpStep5 calls `setSignupAvatarUri(uri)` on pick.
 * YoureIn reads it via `getSignupAvatarUri()` after setActive, uploads, then
 * calls `clearSignupAvatarUri()`.
 */

let currentUri: string | null = null;

export function getSignupAvatarUri(): string | null {
  return currentUri;
}

export function setSignupAvatarUri(uri: string | null): void {
  currentUri = uri;
}

export function clearSignupAvatarUri(): void {
  currentUri = null;
}
