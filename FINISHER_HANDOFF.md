# Wave 3 Finisher — Handoff

**Branch:** `feat/wave-3-finisher` (NOT pushed)

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

## Host-only commands to run next

Run these in order. The first two together verify the 22/0 round-trip; the third is optional pre-launch hardening.

### 1. Apply the two new bug-fix migrations

```bash
docker compose exec api npx prisma migrate deploy
```

What it does: applies `20260601000001_fix_notification_insert_rls` and `20260601000002_fix_invitee_event_visibility` to the local Postgres. Both came in with the `fix/backend-roundtrip-bugs` merge and are not yet on disk in your local DB. Success looks like: `2 migrations applied` (or `Database is in sync` if you already ran them).

### 2. Re-run the round-trip script

```bash
./scripts/notif-avail-invites-roundtrip.sh
```

What it does: exercises `/notifications`, `/availability`, and `/events/:id/invites` against the running API. Success looks like: `22 passed, 0 failed`. If you see any failures, capture the output — the four pre-fix failures (cross-user notification delivery, availability privacy 403, invitee PATCH 404, invitee DELETE 400) are all expected to be GREEN now. Once green, delete `NOTIF_AVAIL_INVITES_ROUNDTRIP_RESULTS.md` (it's the pre-fix snapshot and will mislead).

### 3. (Optional) Apply GCP billing alerts

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
- **Pre-existing untracked file:** `NOTIF_AVAIL_INVITES_ROUNDTRIP_RESULTS.md` at the repo root is the stale pre-fix snapshot. Not committed by this branch. Delete it after step 2 above shows 22/0 green.

---

## Branch is on disk, NOT pushed

Working tree is back on `main` (the next agent or you starts clean). To inspect: `git checkout feat/wave-3-finisher`. To ship: `git push -u origin feat/wave-3-finisher` then open a PR, or `git checkout main && git merge feat/wave-3-finisher` for a fast-forward merge.
