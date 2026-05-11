/**
 * Create Event modal — transient draft store.
 *
 * The CreateEventStackParamList types Step2/Step3 as `undefined`, so the draft
 * cannot ride on navigation params. Per the Screens Agent prompt:
 *   "Do NOT store the draft in React Query or Zustand — it is transient
 *    navigation state."
 *
 * This module holds the draft in a process-singleton ref while the modal is
 * open. Step1 calls `resetDraft()` on mount to clear stale state from any
 * prior modal instance, then `updateDraft(...)` as fields are edited.
 * Step2/Step3 read via `getDraft()` and React-subscribe via `useDraft()` for
 * re-renders when fields change. The whole store is wiped when the modal
 * tears down (Step1 unmount) so re-opening the modal lands on a clean slate.
 */
import { useEffect, useState } from 'react';

import type { Draft } from '../../../../TYPES';

const EMPTY_DRAFT: Draft = {
  title: '',
  inviteeIds: [],
};

let currentDraft: Draft = { ...EMPTY_DRAFT };
let listeners: Array<(d: Draft) => void> = [];

function notify(): void {
  for (const fn of listeners) fn(currentDraft);
}

export function getDraft(): Draft {
  return currentDraft;
}

export function setDraft(next: Draft): void {
  currentDraft = next;
  notify();
}

export function updateDraft(patch: Partial<Draft>): void {
  currentDraft = { ...currentDraft, ...patch };
  notify();
}

export function resetDraft(): void {
  currentDraft = { ...EMPTY_DRAFT, inviteeIds: [] };
  notify();
}

/**
 * Subscribe-on-mount hook — returns the live draft and re-renders consumers
 * when any field changes.
 */
export function useDraft(): Draft {
  const [draft, setLocal] = useState<Draft>(currentDraft);
  useEffect(() => {
    const sub = (next: Draft): void => setLocal(next);
    listeners.push(sub);
    return () => {
      listeners = listeners.filter((l) => l !== sub);
    };
  }, []);
  return draft;
}
