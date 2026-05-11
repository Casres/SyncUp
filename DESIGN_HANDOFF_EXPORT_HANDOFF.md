# Design Handoff Export — HANDOFF

**Date:** 2026-05-04
**Source:** `ANCHOR.pdf` v2.5 (2026-04-27, Round 5 Polish Pass complete).

## What Was Built

| File | Purpose |
|------|---------|
| `ANCHOR.md` | Full Anchor v2.5 in Markdown — canonical design reference |
| `TOKENS.ts` | All design tokens as typed TypeScript exports (zero `any`) |
| `TYPES.ts` | All data shape type definitions (field names match ANCHOR) |
| `COMPONENTS.md` | Component inventory with props, specs, and rules — every component from R1–R5 |
| `SCREENS.md` | Screen-by-screen implementation guide — both Step 3 variants documented |
| `NAVIGATION.md` | Navigation structure, route param types, and transition specs |
| `COWORK_INSTRUCTIONS.md` | Bundle orientation, non-negotiable rules, and build order |

All 7 files written to monorepo root: `/Users/christiancasillas/Documents/Claude/Projects/SyncUp/`.

## Assumptions

- **Source:** `ANCHOR.pdf` (v2.5, 2026-04-27). All design content was sourced from the Anchor; no design decisions were invented.
- **`SyncUp Prototype.html` was 0 bytes** at the time of export (empty file at the monorepo root). All visual-behaviour cross-checks therefore relied on `ANCHOR.pdf` alone. Where the Anchor was unambiguous, this had no impact; where the Anchor was silent on micro-detail (e.g. exact tab-bar hide-on-push behaviour) the documents pick a sensible default and flag it.
- **`Event` type in `TYPES.ts` was inferred** from the Create Event Flow screen specs and component props — the Anchor does not have a standalone `Event` shape definition. Backend agent should reconcile against `schema.prisma` once it exists.
- **`Cover`, `Suggestion`, `Poll`, `PollOption`, `SocialGroup`, `GroupMember`, `SharedHistory`** field shapes were inferred from component prop usage in the Anchor (the Anchor lists these data shapes by name as Round 3 unchanged but does not enumerate every field). Field names follow consistent conventions and component prop signatures.
- **`Draft.glyph`, `.price`, `.geo`** are optional and inferred from Round 2 component existence (`EventGlyph`, `PriceSelector`, `MiniMap`).
- **Dark-mode colour values** for tokens not explicitly redefined (`pop`, `popInk`, `popSoft`, `lime` family, `availFree`/`availMaybe`/`availBusy`, `danger`, `dangerSoft`, `accentInk`, `shadowAccent`) reuse the light values, since the Anchor only enumerates light-vs-dark deltas for `bg`/`ink`/`hair`/`accent` families. If dark-mode designers later define separate values, update `TOKENS.ts > COLORS.dark`.
- **`dangerSoft`** is documented as "popSoft equivalent for danger fills" in the Anchor but no separate hex was given; both `popSoft` and `dangerSoft` are mapped to `#FFE4D9` in `TOKENS.ts`.
- **`Spinner` size token names** (XS / SM / MD / LG) and the `EmptyStateName` enum string ids are local conventions (the Anchor lists the size px values and the empty inventory by display name only).
- **Route names** in `NAVIGATION.md` follow React Navigation conventions (PascalCase). Param shapes are derived from screen needs documented in `SCREENS.md`.
- **Tab-bar hide behaviour** during deep-stack screens is set to "keep visible" by default in `NAVIGATION.md` — this is an implementation choice not specified in the Anchor.
- **Quickset overwrites >5 days threshold** (warning haptic) is taken verbatim from the Anchor haptics canonical mapping; no implementation tweak.
- **Open Design Question #5** ("Stale notifications: auto-purge at 30 days, or keep forever in EARLIER bucket?") is included per the prompt's instruction to capture all 6 open questions in `COWORK_INSTRUCTIONS.md`. The notifications screen itself is in the Anchor's open-questions block (not yet designed); the auto-purge question is captured against that future screen.

## Open Items for Downstream Agents

- The 6 open design questions in `COWORK_INSTRUCTIONS.md` must be resolved by Christian before the Availability, Notifications, and Friend Types screens are built.
- `Event` type in `TYPES.ts` is inferred — the Backend agent should confirm the canonical shape from `schema.prisma` and the Screens agent should reconcile if needed.
- Dark-mode colour deltas beyond what the Anchor enumerates should be confirmed by Design before final theme switch is shipped.
- `Spinner` rendering uses `T.accent` on light surfaces and `#fff` on ink/danger surfaces — confirm with Component Library agent that the `onInk` prop is the right ergonomic vs. inferring from theme.

## Suggested Next Agents

All four of these can start immediately in parallel:
- Frontend: Theme / Tokens
- Frontend: Component Library
- Frontend: Navigation Setup
- Frontend: Mock Data Layer
