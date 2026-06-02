# Wave 3 Finisher — Handoff (CLOSED 2026-06-02)

**Status:** All host steps below were run successfully. Round-trip script printed **26 pass / 0 fail**. This file is preserved as the session audit trail; for the authoritative current state see `BUILD-CHECKLIST.md` and `PROJECT_TRACKER.md`.

**Branch:** `feat/wave-3-finisher` — merged into `main` at `d52c9d3`, pushed to `origin`.

**Base:** `main` at `736217b` (Merge `fix/backend-roundtrip-bugs`)

## Commits (oldest → newest)

| SHA | Subject |
|---|---|
| `c6ee094` | refactor(api): extract publicProfileSelect to shared module |
| `50046f4` | chore(mobile): mocks tombstone — document 17 remaining consumers |
| `5489a29` | docs(infra): add GCP billing alerts runbook |
| `f71d9fd` | docs: BUILD-CHECKLIST — final state after Wave 3 finisher |

`tsc --noEmit` clean on both subprojects after every commit.

---

## Host-only commands — STATUS

### 1. Apply the two new bug-fix migrations — DONE 2026-06-02

```bash
docker compose exec api npx prisma migrate deploy
```

Applied `20260601000001_fix_notification_insert_rls` and `20260601000002_fix_invitee_event_visibility` to the local Postgres.

### 2. Re-run the round-trip script — DONE 2026-06-02, 26/0 PASS

```bash
./scripts/notif-avail-invites-roundtrip.sh
```

Final run printed `Total: 26 · Passed: 26 · Failed: 0`. `NOTIF_AVAIL_INVITES_ROUNDTRIP_RESULTS.md` was regenerated as the green snapshot and committed (`5e523b4`). Re-run after any backend change touching notifications, availability, or invites.

### 3. (Optional) Apply GCP billing alerts — STILL PENDING

```bash
cd social-calendar-api/src/infra
terraform init
terraform apply \
  -var "project_id=$GCP_PROJECT_ID" \
  -var "billing_account_id=$GCP_BILLING_ACCOUNT_ID"
```

What it does: provisions three notify-only budget alerts ($25 / $50 / $100 monthly) on the Places API. Success looks like: `Apply complete! Resources: 3 added`. Full procedure (prereqs, verification, teardown, Path B gcloud fallback) is in `social-calendar-api/src/infra/GCP_BILLING_ALERTS_RUNBOOK.md`. Safe to defer — Places API is not on the critical path until EXPLORE goes live.

---

## Items I couldn't complete

None. All four tasks landed cleanly with both `tsc --noEmit` passes green.

## Notable findings

- **Mocks decision:** keep the tombstone, don't delete. 17 consumers still import from `../mocks` (7 api stubs + 10 screens/components). `MOCK_FRIEND_LABELS` and `MOCK_FRIEND_TYPES` are the long pole — 6 of the 10 screen consumers read them because no React Query hook exists yet. Adding `useFriendTypes()` + `useFriendLabels()` unlocks half the deletions in one PR. Full consumer table in `BUILD-CHECKLIST.md` under "Mocks tombstone — remaining consumers".
- **`publicProfileSelect` placement:** put it at `social-calendar-api/src/repositories/_userSelects.ts` (sibling of the existing `_types.ts` shared module) rather than creating a new `_shared/` directory. Matches the existing project convention.
- **`NOTIF_AVAIL_INVITES_ROUNDTRIP_RESULTS.md`** was overwritten by the 26/0 re-run and committed at `5e523b4` as the current green snapshot.

---

## Final state

Branch `feat/wave-3-finisher` was merged into `main` (`d52c9d3`) and `origin/main` is up to date. The session is closed; future work picks up against the post-merge `main`. See `PROJECT_TRACKER.md` "Step 5" for the next open queue.
