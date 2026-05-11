# Claude Code — GAP 5: QuicksetNameSheet
# SyncUp · Generated 2026-05-11
# Run this from the repo root.
# Complete all steps in order. Do not skip or mark done until tested.
================================================================

## AUTONOMOUS EXECUTION INSTRUCTIONS

Run this entire prompt start to finish without stopping to ask for
confirmation, clarification, or approval at any step. The spec is
complete. If you encounter a decision point not covered here, make
the choice most consistent with existing codebase patterns and keep
moving. Do not pause. Do not summarize mid-build.
Only stop if TypeScript exits non-zero — fix errors and continue.
Deliver a final handoff summary when done (same format as prior GAPs).

================================================================
## MANDATORY PRE-FLIGHT — READ EVERY FILE LISTED BEFORE WRITING CODE

Read these files in full before touching a single line of code.
No exceptions, no skipping.

  ANCHOR-DESIGN.txt                                                       (repo root)
  FRONTEND-HANDOFF.txt                                                    (repo root)
  TYPES.ts                                                                (repo root)
  social-calendar-mobile/src/theme/colors.ts
  social-calendar-mobile/src/theme/haptics.ts
  social-calendar-mobile/src/theme/motion.ts
  social-calendar-mobile/src/components/profile/QuicksetGrid.tsx
  social-calendar-mobile/src/components/social/TwoTapDestructive.tsx
  social-calendar-mobile/src/components/social/RowOverflowMenu.tsx
  social-calendar-mobile/src/components/polish/StaggerList.tsx
  social-calendar-mobile/src/components/foundation/PillBtn.tsx
  social-calendar-mobile/src/screens/profile/AvailabilityEditorScreen.tsx

Do not ask for clarification. Read silently and proceed.
If a file is missing, note it inline and continue.

================================================================
## WHAT YOU ARE BUILDING
================================================================

GAP 5 — QuicksetNameSheet + QuicksetGrid upgrades (R12-2 through R12-4).

Two distinct pieces of work:

  PIECE A — New component: QuicksetNameSheet
    The sheet for naming a new custom quickset or renaming an existing one.
    Triggered from AvailabilityEditorScreen ("Save as Quickset" pill)
    and from the ⋯ menu on custom QuicksetGrid tiles.

  PIECE B — Modify existing component: QuicksetGrid
    Add ⋯ icon-btn + arm/delete state to custom tiles.
    Grid already renders built-ins only; now must support custom tiles
    with overflow controls.

Files to create:
  social-calendar-mobile/src/components/profile/QuicksetNameSheet.tsx

Files to modify:
  social-calendar-mobile/src/components/profile/QuicksetGrid.tsx
  social-calendar-mobile/src/screens/profile/AvailabilityEditorScreen.tsx
  TYPES.ts  (extend Quickset — see Step 1)

Files to update (exports):
  social-calendar-mobile/src/components/profile/index.ts  (if exists)
  social-calendar-mobile/src/components/index.ts

================================================================
## BUILD ORDER
================================================================

  STEP 1 — Extend Quickset type in TYPES.ts
  STEP 2 — Build QuicksetNameSheet
  STEP 3 — Upgrade QuicksetGrid
  STEP 4 — Wire AvailabilityEditorScreen
  STEP 5 — TypeScript check
  STEP 6 — Exports

================================================================
## STEP 1 — EXTEND QUICKSET TYPE
================================================================

File: TYPES.ts (repo root)

The existing Quickset interface uses a fixed QuicksetId enum for id.
Custom quicksets need arbitrary string ids. Extend as follows:

  Current:
    export interface Quickset {
      id: QuicksetId;
      label: string;
      detail: string;
      status: QuicksetStatus;
    }

  Add an optional isCustom flag:
    export interface Quickset {
      id: QuicksetId | string;  // built-ins use QuicksetId; custom use any string
      label: string;
      detail: string;
      status: QuicksetStatus;
      isCustom?: boolean;       // true for user-saved quicksets (R12-4)
    }

This is backward-compatible — all existing BUILTIN_QUICKSETS still type-check
because QuicksetId is still valid, and isCustom is optional.

================================================================
## STEP 2 — QuicksetNameSheet
================================================================

File: social-calendar-mobile/src/components/profile/QuicksetNameSheet.tsx

─────────────────────────────────────────────
PROPS:
─────────────────────────────────────────────

  interface QuicksetNameSheetProps {
    T?: Theme;
    open: boolean;
    mode: 'new' | 'rename';
    initialName?: string;        // used in 'rename' mode only
    existingNames: string[];     // all current custom quickset names (case-insensitive check)
    onSave: (name: string) => void;
    onClose: () => void;
  }

─────────────────────────────────────────────
SHEET SHELL:
─────────────────────────────────────────────

  Bottom sheet · radius 22 22 0 0 · max-height 50% of screen.
  38×4 grab handle centered at top (bgSunken · radius 999).
  Backdrop: Modal transparent + full-screen Pressable ·
    backgroundColor rgba(0,0,0,0.42).
  Drag-down >80px → onClose() + light haptic.
  Animation: flow-sheet-up 280ms spring on open ·
    flow-sheet-down 240ms easeStd on close. Use Reanimated.
    Check motion.ts for token values — do not hardcode spring params.
  A11y: accessibilityViewIsModal on sheet container.

─────────────────────────────────────────────
HEADER:
─────────────────────────────────────────────

  mode='new'    → "Name your Quickset"
  mode='rename' → "Rename Quickset"
  17px · weight 800 · color T.ink · left-aligned.
  Close X icon-btn (Ionicons "close") · top-right · 44pt ·
    light haptic → onClose().

─────────────────────────────────────────────
BODY:
─────────────────────────────────────────────

Internal state:
  nameValue: string  (initialized to initialName when mode='rename', else '')
  validationError: string | null  (null = no error)

Text input:
  Label above input: "Quickset name" · 12/500 ink2.
  TextInput: bgSunken fill · radius 12 · 16px horizontal padding ·
    48px height · 15/500 T.ink · placeholder "e.g. Morning free" ink3.
  maxLength={24}.
  autoFocus={true} — opens keyboard immediately on sheet open.
  onChange: setNameValue(text) + clear validationError.

Validation (checked on "Save" tap, not on every keystroke):
  FAIL if trimmed value is empty → show "Name cannot be empty".
  FAIL if trimmed value matches any name in existingNames
    (case-insensitive) EXCLUDING the initialName when mode='rename'
    (so you can "save" the current name unchanged).
  Error display: "Name already in use" · 12/500 · color T.danger ·
    Ionicons "warning" leading icon 14px · 6px below input.
    Use A-16 format from ANCHOR (icon + text inline, not a banner).

Detail hint (static, always shown · 8px below input or error):
  "Applied over the next 30 days" · 12/500 · color T.ink3.

─────────────────────────────────────────────
FOOTER (pinned above safe-area · not scrollable):
─────────────────────────────────────────────

  "Save" accent PillBtn · full-width.
    Disabled (opacity 0.4, non-interactive) when:
      nameValue.trim() is empty OR validationError is non-null.
    On tap: run validation. If passes → call onSave(nameValue.trim())
    then onClose(). If fails → show error, do NOT close.
    No haptic on tap — success haptic fires after onSave resolves
    (caller handles it — see AvailabilityEditorScreen wiring in Step 4).

  "Cancel" ghost PillBtn · full-width · 12px below "Save".
    Tap → onClose() + light haptic.

─────────────────────────────────────────────
HAPTICS:
─────────────────────────────────────────────

  Sheet close X              light
  Drag-down dismiss          light
  "Cancel" tap               light
  "Save" success             (caller fires success after save — not here)

================================================================
## STEP 3 — UPGRADE QuicksetGrid
================================================================

File: social-calendar-mobile/src/components/profile/QuicksetGrid.tsx

READ THE EXISTING FILE IN FULL before modifying. It already has:
  - BUILTIN_QUICKSETS (frozen, non-deletable)
  - 2-column flexWrap grid
  - Applied state (1600ms confirm)
  - onApply callback

Changes required (R12-3, R12-4):

─────────────────────────────────────────────
NEW PROPS (add to QuicksetGridProps, keep all existing props):
─────────────────────────────────────────────

  onRename?: (q: Quickset) => void;   // opens QuicksetNameSheet in rename mode
  onDelete?: (id: string) => void;    // removes custom tile from grid

─────────────────────────────────────────────
GRID LAYOUT (R12-3):
─────────────────────────────────────────────

  The existing grid already uses flexWrap: 'row' with width: '48%'
  cells — this naturally wraps beyond 4. No layout change needed.
  Just confirm it works with 5+ tiles and note it in a comment.

─────────────────────────────────────────────
CUSTOM TILE ADDITIONS (R12-4):
─────────────────────────────────────────────

Per tile, determine: const isCustom = q.isCustom === true.

For custom tiles only — add ⋯ icon-btn:
  Ionicons "ellipsis-horizontal" · 18px · color T.ink3.
  Positioned top-right of the tile (position: 'absolute', top: 6, right: 6).
  44pt hit target (padding extends into tile corner).
  Tap → light haptic + open RowOverflowMenu for this tile.
  Built-in tiles (isCustom !== true): render nothing in that spot.

RowOverflowMenu items for custom tile:
  { label: 'Rename',  icon: 'pencil-outline',   onPress: () => { closeMenu(); onRename?.(q); } }
  { label: 'Delete',  icon: 'trash-outline',     onPress: () => { closeMenu(); armTile(q.id); }, destructive: true }

─────────────────────────────────────────────
ARMED / DELETE STATE (R12-4):
─────────────────────────────────────────────

This is NOT TwoTapDestructive component — it's an inline tile arm
state, similar to how AttendeeRow handles swipe-to-arm. Implement it
directly in QuicksetGrid.

Internal state to add:
  armedId: string | null  (which custom tile is armed for delete)

Armed tile appearance:
  backgroundColor: T.dangerSoft
  borderColor: T.danger (1.5px)
  ⋯ btn hidden (do not render while armed)
  Normal tile content (label, detail, dot) replaced by:
    "Delete?" · 13/600 · color T.popInk · centered.
  Entire tile is tappable to commit delete (second tap).

Arm flow:
  "Delete" in RowOverflowMenu → menu closes → setArmedId(q.id) +
  heavy haptic.

Auto-dismiss armed after 4s:
  useEffect watching armedId. When non-null, start 4s timer →
  setArmedId(null) + light haptic. Clear timer on change or unmount.

Commit delete (second tap on armed tile):
  setArmedId(null) + success haptic + call onDelete?.(q.id).
  Tile animates out: Reanimated opacity 1→0 + scale 1→0.95 ·
  320ms withTiming easeStd. After animation, parent removes it from
  the quicksets array (onDelete handles state).

NEVER use a modal for delete. This armed pattern IS the confirmation.

─────────────────────────────────────────────
RowOverflowMenu management in QuicksetGrid:
─────────────────────────────────────────────

Add state: menuOpenForId: string | null + anchorPosition state.
When ⋯ btn pressed: measure btn position, set anchorPosition,
set menuOpenForId = q.id.
Render RowOverflowMenu conditionally when menuOpenForId !== null.
onClose: setMenuOpenForId(null) + light haptic.

================================================================
## STEP 4 — WIRE AvailabilityEditorScreen
================================================================

File: social-calendar-mobile/src/screens/profile/AvailabilityEditorScreen.tsx

READ THE EXISTING FILE IN FULL before modifying. Understand the
existing QUICKSETS constant and handleQuicksetApply before touching it.

─────────────────────────────────────────────
STATE TO ADD:
─────────────────────────────────────────────

  const [customQuicksets, setCustomQuicksets] = useState<Quickset[]>([]);
  const [nameSheetOpen, setNameSheetOpen] = useState(false);
  const [nameSheetMode, setNameSheetMode] = useState<'new' | 'rename'>('new');
  const [renamingQuickset, setRenamingQuickset] = useState<Quickset | null>(null);

─────────────────────────────────────────────
QUICKSETS ARRAY:
─────────────────────────────────────────────

  Replace the existing local QUICKSETS constant with:
    const allQuicksets = [...BUILTIN_QUICKSETS, ...customQuicksets];
  Pass allQuicksets to QuicksetGrid instead of the old constant.

─────────────────────────────────────────────
"SAVE AS QUICKSET" PILL (R12-2):
─────────────────────────────────────────────

  Add below the QuicksetGrid section (section 6), before section 7.

  The pill is enabled only when the availability entry map is non-empty
  (≥1 day set). You need to check the current AvailabilityEntry map
  state. Find where the availability entry map lives in this screen
  (likely a state variable like `entries` or `entryMap`) — read the
  file to find the correct variable name. Do NOT guess.

  PillBtn:
    label="Save as Quickset"
    variant="ghost"   (or equivalent ghost style)
    fullWidth
    disabled={availabilityMapIsEmpty}
    style={{ opacity: availabilityMapIsEmpty ? 0.4 : 1 }}
    onPress={() => {
      fire('medium');
      setNameSheetMode('new');
      setRenamingQuickset(null);
      setNameSheetOpen(true);
    }}

  availabilityMapIsEmpty: derive from whichever state variable holds
  the AvailabilityEntry map. A map is empty when it has 0 keys set,
  or all values are cleared.

─────────────────────────────────────────────
QUICKSETGRID CALLBACK WIRING:
─────────────────────────────────────────────

  onRename={(q) => {
    setRenamingQuickset(q);
    setNameSheetMode('rename');
    setNameSheetOpen(true);
  }}

  onDelete={(id) => {
    setCustomQuicksets(prev => prev.filter(q => q.id !== id));
  }}

─────────────────────────────────────────────
QuicksetNameSheet WIRING:
─────────────────────────────────────────────

  Mount QuicksetNameSheet at the bottom of the screen's return
  (below the ScrollView, as a sibling — not inside the scroll).

  <QuicksetNameSheet
    T={T}
    open={nameSheetOpen}
    mode={nameSheetMode}
    initialName={renamingQuickset?.label}
    existingNames={customQuicksets.map(q => q.label)}
    onSave={(name) => {
      if (nameSheetMode === 'new') {
        const newQuickset: Quickset = {
          id: `custom-${Date.now()}`,
          label: name,
          detail: 'Custom quickset',
          status: 'free',
          isCustom: true,
        };
        setCustomQuicksets(prev => [...prev, newQuickset]);
        fire('success');
      } else if (renamingQuickset) {
        setCustomQuicksets(prev =>
          prev.map(q =>
            q.id === renamingQuickset.id ? { ...q, label: name } : q
          )
        );
        fire('success');
      }
      setNameSheetOpen(false);
    }}
    onClose={() => setNameSheetOpen(false)}
  />

================================================================
## STEP 5 — TypeScript CHECK
================================================================

From the repo root, run:

  cd social-calendar-mobile && npx tsc --noEmit

Fix all errors before proceeding. Exit 0 required.
Common issues to watch for:
  - Quickset.id now accepts string — ensure BUILTIN_QUICKSETS still
    satisfies the type (QuicksetId extends string so it should).
  - QuicksetGridProps new optional props — make sure callers that
    don't pass onRename/onDelete don't break (they're optional).
  - AvailabilityEditorScreen — find the correct entry map variable
    name; don't assume it's called entryMap.

================================================================
## STEP 6 — EXPORTS
================================================================

Add to social-calendar-mobile/src/components/index.ts:
  Export QuicksetNameSheet and QuicksetNameSheetProps.

Update QuicksetGrid export if any new types were added.

================================================================
## HARD RULES — NEVER VIOLATE
================================================================

1. Design tokens only. Never hardcode hex values. Use T.* from colors.ts.
2. Haptics via useHaptic() only. Never call expo-haptics directly.
3. Destructive tile delete: inline arm state only — NO TwoTapDestructive
   component, NO modal. The tile itself becomes the confirmation UI.
4. No Zustand. All new state is local useState in the screen/component.
5. BUILTIN_QUICKSETS are PERMANENT — never deletable, never show ⋯ btn.
   isCustom !== true = built-in = no controls.
6. "Save as Quickset" entry point is ONLY in AvailabilityEditorScreen
   below QuicksetGrid. Never inside the grid itself (R12-2).
7. Spinner only for loading if needed. No skeletons.
8. New custom quickset StaggerList entrance: the QuicksetGrid already
   uses a flat map — the new tile entering should animate in. If
   StaggerList wraps the whole grid, only the new tile needs the
   animation; existing tiles should not re-animate. Simplest correct
   approach: animate only the new tile using Reanimated entering prop
   or a simple opacity/scale withSpring on mount.

================================================================
## DEFINITION OF DONE
================================================================

  ✓ npx tsc --noEmit exits 0
  ✓ QuicksetNameSheet opens with spring, closes with ease
  ✓ mode='new': header "Name your Quickset", empty input, autoFocus
  ✓ mode='rename': header "Rename Quickset", input pre-filled
  ✓ Validation: empty name blocked, duplicate name blocked (case-insensitive)
  ✓ Rename: current name excluded from collision check
  ✓ "Save" disabled when input empty or error present
  ✓ "Applied over the next 30 days" hint always visible below input
  ✓ QuicksetGrid: built-in tiles have NO ⋯ btn
  ✓ QuicksetGrid: custom tiles show ⋯ top-right, 44pt hit target
  ✓ ⋯ menu: "Rename" + "Delete" (destructive) items
  ✓ Armed tile: dangerSoft fill, danger border, "Delete?" label, no ⋯
  ✓ Armed auto-dismisses after 4s with light haptic
  ✓ Delete commit: tile animates out, grid reflows, success haptic
  ✓ "Save as Quickset" pill below QuicksetGrid in AvailabilityEditorScreen
  ✓ Pill disabled (opacity 0.4) when availability map is empty
  ✓ New custom tile appears in grid after save (success haptic)
  ✓ Rename updates tile label in grid (success haptic)
  ✓ All haptics match spec exactly
  ✓ QuicksetNameSheet exported from components/index.ts
