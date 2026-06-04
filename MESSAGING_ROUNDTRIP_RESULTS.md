# MESSAGING_ROUNDTRIP_RESULTS

**Date:** 2026-06-04  
**Commit:** `9ec2519`  
**API base:** http://localhost:3000

---

## Summary

- Total checks: 31
- Passed: 31
- Failed: 0

## Coverage

- `POST /conversations/direct/:friendId` (get-or-create, idempotent)
- `POST /conversations/:id/messages` (send)
- `GET /conversations/:id/messages` (thread)
- `GET /conversations` (inbox + unread counts)
- `POST /conversations/:id/read` (read cursor / D1 unread)
- `POST /friend-groups` → auto-created GROUP chat (R18 D4)
- `POST /friend-groups/:id/members` → group-chat participant join
- `POST /events/:id/chat` (host enable, organiser-only, idempotent)
- Participant gating: non-participant thread read → 403
- Non-organiser event-chat enable → 403
- Archived EVENT conversation excluded from inbox

## Not covered by this run (manual / follow-up)

- Socket events (`chat:message:new`, `chat:conversation:new`,
  `chat:typing`) — need a socket client; verify in-app or with websocat.
- The real archival worker tick (this run stamps archivedAt directly to
  exercise the inbox filter; runEventChatArchivalSweep() is unit-testable
  separately).
