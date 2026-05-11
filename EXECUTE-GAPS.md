# SyncUp — Execute Remaining GAPs
# Paste this file into Claude Code once. It will run all remaining
# GAPs sequentially, commit each one, and update GAP-PROGRESS.md
# automatically. You do not need to intervene.
================================================================

## AUTONOMOUS EXECUTION INSTRUCTIONS

You are executing the remaining SyncUp feature build queue.
Run every pending GAP in order, start to finish, without stopping
to ask for confirmation or clarification at any step.

After each GAP:
  1. Run `cd social-calendar-mobile && npx tsc --noEmit`. Fix all
     errors before moving on. Do not proceed with a dirty TypeScript.
  2. Commit all changes with a descriptive message.
  3. Update GAP-PROGRESS.md (mark the GAP ✅ complete + commit hash).
  4. Move to the next GAP immediately.

Do not stop between GAPs. Do not summarize mid-build.
Deliver one final handoff summary after ALL GAPs are complete.

================================================================
## PRE-FLIGHT — READ BEFORE ANYTHING ELSE

Read these files in full before starting any GAP:
  CLAUDE.md              (repo root — hard rules, non-negotiables)
  GAP-PROGRESS.md        (repo root — current status)
  ANCHOR-DESIGN.txt      (repo root — full spec)
  FRONTEND-HANDOFF.txt   (repo root — gap details + file paths)

================================================================
## EXECUTION QUEUE

Run the GAPs below in this exact order. For each one:
  1. Read the full prompt file from the gaps/ folder
  2. Execute it completely
  3. tsc check → fix errors → commit → update GAP-PROGRESS.md
  4. Move to next

─────────────────────────────────────────────
FIRST — commit any uncommitted work before starting
─────────────────────────────────────────────

Before running any GAP, check `git status`. If there are
uncommitted changes (GAP 4 and 5 work may be sitting unstaged),
commit them now with an appropriate message before proceeding.

  git add -A
  git commit -m "feat(mobile): GAP 4 + GAP 5 — QuickProfileSheet, QuicksetNameSheet (R12-2 through R12-6)"

Then push: git push origin main

─────────────────────────────────────────────
GAP 9 — BroadcastToast queued prop
─────────────────────────────────────────────
File: gaps/GAP-09-broadcast-toast-queued.md

Read it. Execute it. Fix tsc. Then commit:
  git add -A
  git commit -m "feat(mobile): GAP 9 — BroadcastToast queued prop (R13-3)"
  git push origin main

Update GAP-PROGRESS.md: mark GAP 9 ✅ with commit hash.

─────────────────────────────────────────────
GAP 10 — AudiencePickerSheet zero-friend state
─────────────────────────────────────────────
File: gaps/GAP-10-audience-picker-zero-state.md

Read it. Execute it. Fix tsc. Then commit:
  git add -A
  git commit -m "feat(mobile): GAP 10 — AudiencePickerSheet zero-friend state (R13-4)"
  git push origin main

Update GAP-PROGRESS.md: mark GAP 10 ✅ with commit hash.

─────────────────────────────────────────────
GAP 2 — Search overlay
─────────────────────────────────────────────
File: gaps/GAP-02-search-overlay.md

Read it. Execute it. Fix tsc. Then commit:
  git add -A
  git commit -m "feat(mobile): GAP 2 — Search overlay (R8-1 through R8-7)"
  git push origin main

Update GAP-PROGRESS.md: mark GAP 2 ✅ with commit hash.

─────────────────────────────────────────────
GAP 1 — Onboarding stack (LAST — lowest priority)
─────────────────────────────────────────────
File: gaps/GAP-01-onboarding.md

Read it. Execute it. Fix tsc. Then commit:
  git add -A
  git commit -m "feat(mobile): GAP 1 — Onboarding stack (R9-1 through R9-10)"
  git push origin main

Update GAP-PROGRESS.md: mark GAP 1 ✅ with commit hash.

================================================================
## WHEN ALL GAPS ARE DONE

Write a final handoff summary covering:
  - All GAPs completed with commit hashes
  - Any deviations from spec (with reasons)
  - Any TODOs left for future passes
  - TypeScript status (must be exit 0)
  - Pre-production reminders:
      · Delete src/mocks/ seed files before shipping
      · Wire Clerk getToken() across all query functions
      · Discuss Explore API scaling (Eventbrite + Google Places)

================================================================
## NON-NEGOTIABLE RULES (apply to ALL GAPs)

These override everything. Do not deviate.

  - Design tokens only — never hardcode hex values. Use src/theme/colors.ts
  - Haptics via useHaptic() only — never call expo-haptics directly
  - Only 6 haptic types: light · medium · heavy · success · warning · error
  - Destructive actions: TwoTapDestructive or inline arm pattern only
  - No Zustand — API data in React Query, UI state in useState/useReducer
  - No confirmation modals for destructive actions
  - Loading states: Spinner only — no skeletons, no shimmer
  - Tab bar order is locked — never change it
  - TweaksPanel is prototype HTML only — never ship it
  - Delete src/mocks/ is a pre-production step — do NOT delete it now
