# SyncUp — Design Handoff Bundle

This bundle contains 7 files that together constitute the complete design-to-implementation spec for SyncUp.

> Source of truth: `ANCHOR.pdf` v2.5 (2026-04-27, Round 5 Polish Pass complete).

---

## How to Use This Bundle

| File | Read it when... |
|------|-----------------|
| `ANCHOR.md` | You need to understand any design decision, constraint, or rule |
| `TOKENS.ts` | You are writing any TypeScript file that references colors, spacing, typography, motion, or haptics |
| `TYPES.ts` | You are defining data shapes, props, or API responses |
| `COMPONENTS.md` | You are building the component library |
| `SCREENS.md` | You are building a screen |
| `NAVIGATION.md` | You are setting up or extending the navigation structure |
| `COWORK_INSTRUCTIONS.md` | You are orienting yourself to the project (now) |

---

## Non-Negotiable Rules

Before writing any frontend code, internalize these rules from `ANCHOR.md`:

1. **No skeletons, no shimmer, no pulse.** Spinner only. (R5-2)
2. **Status is never communicated by color alone.** Always pair AvailDot + text label. (R5-1)
3. **No parallax, no scroll-bound transforms.** (R5-3)
4. **All icon-only buttons have aria-label.** (R5-4, A-7)
5. **SettingsRow renders as `<div>` when no onClick.** (Hard Rule 16)
6. **Haptics: 6 types only.** Never on scroll, drag-momentum, or render. (R5-8, H-1)
7. **TwoTapDestructive for all destructive actions.** No modals. (Hard Rule 7)
8. **Banded availability viz on Step 3 is locked.** (Hard Rule 1)
9. **BroadcastToast leading marker is always a state-colored dot.** No emoji, no icon. (Hard Rule 13)
10. **Minimum 44×44pt tap targets everywhere.** (Hard Rule 2, A-5)

---

## Agent Build Order

The following frontend agents depend on this bundle:

```
Design Handoff Export (this agent) → complete
  ├── Theme / Tokens agent      (reads: TOKENS.ts, ANCHOR.md)
  ├── Component Library agent   (reads: COMPONENTS.md, TOKENS.ts, TYPES.ts)
  ├── Navigation Setup agent    (reads: NAVIGATION.md, TYPES.ts)
  └── Mock Data Layer agent     (reads: TYPES.ts, ANCHOR.md data shapes)
        └── API Stub Layer agent (reads: TYPES.ts, src/mocks/)
              └── Screens agent  (reads: SCREENS.md, COMPONENTS.md, src/api/, src/theme/)
```

All four wave-1b agents (Theme/Tokens, Component Library, Navigation Setup, Mock Data Layer) can start in parallel immediately after this bundle ships.

---

## Resolved Design Decisions

All previously-open design questions are now Director-locked. Source of truth: `ANCHOR-DESIGN.txt` (R7-1 through R7-6) and `LEAD_MANAGER.md` Open Decisions Log (Decisions #6–#11).

| Q | Answer | Rule |
|---|---|---|
| Quicksets extensibility | User-extensible (4 built-ins permanent + custom save flow ships later) | R7-1 |
| BroadcastToast tap-to-review | No — toast stays simple, Broadcast Settings is the only editor | R7-2 |
| Friend Types nesting | No — disjoint membership, UNION semantics in multi-select | R7-3 |
| AdminBar scroll-collapse | No — pinned, binary on role only | R7-6 |
| Stale notifications | Auto-purge at 30 days + manual "Clear all" + per-card swipe | R7-4 |
| Push copy format | Push string = in-app copy verbatim, no prefix | R7-5 |
| Availability Hub layout | Option C — inline collapse | Decision #6 |

---

## File Inventory at the Monorepo Root

```
/Users/christiancasillas/Documents/Claude/Projects/SyncUp/
├── ANCHOR.pdf                            (canonical source — DO NOT MODIFY)
├── ANCHOR.md                             (Markdown reformat of ANCHOR.pdf)
├── TOKENS.ts                             (typed design tokens — zero `any`)
├── TYPES.ts                              (typed data shapes)
├── COMPONENTS.md                         (component inventory)
├── SCREENS.md                            (screen-by-screen guide)
├── NAVIGATION.md                         (navigation structure + transitions)
├── COWORK_INSTRUCTIONS.md                (this file)
└── DESIGN_HANDOFF_EXPORT_HANDOFF.md      (handoff doc)
```

---

## Working Convention for Wave-1b Agents

- **Token names match ANCHOR exactly.** Do not invent aliases. If a name is missing, escalate — do not invent.
- **Field names on data shapes match ANCHOR exactly.** Use the union types from `TYPES.ts`.
- **All visual specs reference token names.** No raw hex / px values in component code; pull from `TOKENS.ts`.
- **All hard rules apply.** When implementing a component or screen, verify it complies with the cross-component hard rules table at the bottom of `COMPONENTS.md`.
- **Reduced-motion fallbacks (A-11) are mandatory.** Implement them at the time you implement each animated component.
- **Haptics call `useHaptic()` once per gesture.** Never on render; never inside scroll/drag handlers (H-1).

If anything in these 7 files conflicts with `ANCHOR.pdf`, `ANCHOR.pdf` wins — flag the conflict for the Design Handoff Export agent to reconcile.
