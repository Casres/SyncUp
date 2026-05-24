# ATTENDEES SHEET R15 HANDOFF — R15-1 through R15-6

**Completed:** 2026-05-24  
**Rules:** R15-1 · R15-2 · R15-3 · R15-4 · R15-5 · R15-6

---

## Modified files

| File | Change |
|------|--------|
| `src/components/social/AttendeesSheet.tsx` | Full R15-1..R15-6 rewrite (see below) |
| `src/components/social/AttendeeRow.tsx` | Added `isHost` prop (HOST chip) + self-row tap no-op (R15-1) |
| `src/components/social/QuickProfileSheet.tsx` | Added `isFriend` + `friendTypeName` props for R15-2 friend variant |

## New files

| File | Purpose |
|------|---------|
| `src/components/social/SearchInputBar.tsx` | R15-4 reusable search pill (pill · radius 12 · bgSunken · hair border · auto-focus · clear ×) |

---

## R15-1 — Row tap → QuickProfileSheet (terminal)

`AttendeesSheet` now mounts `QuickProfileSheet` internally (stacked above via Modal layering). State: `quickProfileTargetId: string | null`. When a row is tapped (not armed, not self-row), sets `quickProfileTargetId`. `AttendeeRow.onRowPress()` guards against self-row: early returns before haptic when `isOwnRow=true` (no haptic, no navigation per spec).

## R15-2 — QuickProfileSheet friend variant

`QuickProfileSheet` now accepts `isFriend?: boolean` and `friendTypeName?: string | null`.
- Friend variant: `RingAvatar` shows `availState` status ring (non-friend shows `status={null}`). CTA block replaced by centered FriendType chip (10/600 mono · accentSoft fill · accent text · radius 999 · 6×10 padding). If no type assigned, chip slot is blank.
- Non-friend variant: unchanged.

Friend resolution in `AttendeesSheet`: builds `friendMemberSet` from all `friendTypes[].members`. `getFriendTypeName(id)` finds the matching FriendType label.

## R15-3 — RSVP grouping with HOSTS pinned

`listItems` is now a `ListItem[]` discriminated union of `section-header` and `row` items. Section order: HOSTS → GOING → MAYBE → NOT GOING → NO RESPONSE. Empty sections omitted. HOSTS section omitted if no host/co-host passes the active chip filter.

Hosts and co-hosts appear in HOSTS section AND their RSVP section. `keyExtractor` combines section name + id (`HOSTS-{id}`, `GOING-{id}`, etc.) to prevent React key collisions.

`AttendeeRow` receives `isHost={attendee.id === event.hostId}` — shows HOST chip (10/600 mono · accentSoft fill · accent text · radius 999 · 6×10 padding) in trailing area to the left of RSVPBadge.

## R15-4 — Search reveal from header magnifier

Header layout: title block (left, flex 1) + trailing cluster (right). When `searchActive=false`: title visible + magnifier icon-btn. When `searchActive=true`: title collapses upward via `withTiming(200ms, easeStd)` opacity + translateY; `SearchInputBar` fades in over the title area; magnifier swaps to "Cancel" text link (13/500 accent); "Invite more" hidden.

Clearing the query restores the grouped view but keeps search mode active. "Cancel" clears query AND exits search mode (restores title).

Search composes with chip filters: `searchFiltered = chipFiltered.filter(query match)`.

## R15-5 — Chip filter bar sticky

Chip rows are rendered as sibling `View`s outside `FlatList` in the `sheetInner` container. Since FlatList only scrolls its own content, the chips are inherently sticky above the list. Header + chips remain pinned at all scroll positions. No additional implementation needed beyond the structural layout.

## R15-6 — Offline state

`AttendeesSheet` accepts `offline?: boolean` and `lastSyncedAt?: string`. When offline:
- `OfflineBar` renders between header and chip filter bar.
- "SYNCED {T} AGO" mono 10/600 ink3 sub-line renders below OfflineBar (omitted if `lastSyncedAt` absent). `formatSyncedAgo()` helper formats relative time in uppercase.
- "Invite more" pill hidden (`showInviteMore = !offline`).
- Any armed row auto-cancels via `useEffect([offline, armedRowId])`.
- Host ⋯ menu: offline suppression is handled by `viewerRole === 'host' && !isOwnRow && !armed && !offline` guard on `showOverflow` — no-op tap behavior.

On reconnect: `offline=false` → `OfflineBar` slides out; React Query cache invalidation is the caller's responsibility (same pattern as NotifSheet R13-2).

---

## Stub notes

- `QuickProfileSheet` within `AttendeesSheet` is passed `mutualFriends=[]` and `stats=null` (stub). The caller must wire a real fetch once the backend `/users/:id/quick-profile` endpoint exists.
- `friendRequestStatus` is hardcoded to `'none'` in the friend variant (per R15-2: friend variant shows FriendType chip, not Add/Requested controls — `friendRequestStatus` is unused in that path).
- SearchOverlay PEOPLE row → QuickProfileSheet was already wired in a prior session (`handlePeopleRowBodyPress` + `QuickProfileSheet` mount in `SearchOverlay.tsx`). No changes needed there.
