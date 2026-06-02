# NOTIF_AVAIL_INVITES_ROUNDTRIP_RESULTS

**Date:** 2026-06-02  
**Commit:** `6a35299`  
**API base:** http://localhost:3000

---

## Summary

- Total checks: 26
- Passed: 26
- Failed: 0

## Coverage

Endpoints exercised by this run:

**Notifications:**
- `GET /notifications`
- `POST /notifications/:id/read`
- `POST /notifications/:id/mute`
- `POST /notifications/read-all`
- `DELETE /notifications/:id`

**Availability:**
- `GET /availability/me`
- `PUT /availability/me/:date`
- `PATCH /availability/me`
- `GET /availability/:userId` (expect 403 unless friended+shared)
- `GET /availability/broadcasts`
- `PUT /availability/broadcasts`

**Invites (event-scoped):**
- `POST /events/:id/invites`
- `PATCH /events/:id/invites/:inviteId`
- `DELETE /events/:id/invites/:inviteId`

## Not covered by this run (manual / follow-up)

- Socket emission of `notif:new` / `notif:dismissed` — requires a
  socket client to observe; verify in the mobile app or with
  `websocat` against the running server.
- AvailabilityBlock RLS edge case (backend agent flagged this).
- Friend-shared availability path (200 case) — needs A and B to be
  friends with shared availability set up first.
