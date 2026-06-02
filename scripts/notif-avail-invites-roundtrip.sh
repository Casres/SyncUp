#!/usr/bin/env bash
#
# notif-avail-invites-roundtrip.sh
#
# Wave 2 round-trip extension: exercises the new /notifications,
# /availability, and EventInvite endpoints landed in commit d8f18af.
# Mirrors the AUTH_DOCKER_ROUNDTRIP_RESULTS.md pattern that was used
# for the 5f30e3a auth-side round-trip.
#
# PREREQS (you do these once, before running):
#   1. npx prisma generate     # from social-calendar-api/  (picks up new models)
#   2. docker compose up -d --build   # from repo root
#   3. Wait for `docker compose ps` to show api/postgres/redis healthy
#   4. Two test Clerk users provisioned in your Clerk dev instance.
#      Get their clerk user_ids and put them in env (see below).
#
# USAGE:
#   export CLERK_SECRET_KEY=sk_test_...       # from Clerk dashboard
#   export TEST_USER_A_CLERK_ID=user_xxx      # primary actor
#   export TEST_USER_B_CLERK_ID=user_yyy      # second user for friend/invite tests
#   export API_BASE=http://localhost:3000     # optional override
#   ./scripts/notif-avail-invites-roundtrip.sh
#
# OUTPUT:
#   Writes NOTIF_AVAIL_INVITES_ROUNDTRIP_RESULTS.md at repo root.
#   Prints PASS/FAIL per check to stdout.
#   Exits non-zero if any check fails.

set -uo pipefail

API_BASE="${API_BASE:-http://localhost:3000}"
RESULTS_FILE="NOTIF_AVAIL_INVITES_ROUNDTRIP_RESULTS.md"
PASS_COUNT=0
FAIL_COUNT=0
FAIL_DETAILS=()

# ── Pretty printers ──────────────────────────────────────────────────────────
red()   { printf '\033[31m%s\033[0m' "$1"; }
green() { printf '\033[32m%s\033[0m' "$1"; }
yellow(){ printf '\033[33m%s\033[0m' "$1"; }
section() { echo ""; echo "── $1 ──"; }
pass()  { PASS_COUNT=$((PASS_COUNT+1)); echo "  $(green PASS) $1"; }
fail()  { FAIL_COUNT=$((FAIL_COUNT+1)); FAIL_DETAILS+=("$1"); echo "  $(red FAIL) $1"; }
info()  { echo "  $(yellow '...') $1"; }

# ── Env sanity ────────────────────────────────────────────────────────────────
section "Env sanity"
[ -n "${CLERK_SECRET_KEY:-}" ] || { fail "CLERK_SECRET_KEY missing"; exit 1; }
[ -n "${TEST_USER_A_CLERK_ID:-}" ] || { fail "TEST_USER_A_CLERK_ID missing"; exit 1; }
[ -n "${TEST_USER_B_CLERK_ID:-}" ] || { fail "TEST_USER_B_CLERK_ID missing"; exit 1; }
pass "all required env vars present"

# ── Stack health ─────────────────────────────────────────────────────────────
section "Stack health"
HEALTH=$(curl -s -o /dev/null -w '%{http_code}' "$API_BASE/health")
[ "$HEALTH" = "200" ] && pass "/health returned 200" || fail "/health returned $HEALTH (is docker compose up?)"

# ── JWT minting helper (Clerk BAPI) ──────────────────────────────────────────
mint_jwt() {
  local clerk_user_id="$1"
  local session_id
  session_id=$(curl -s -X POST "https://api.clerk.com/v1/sessions" \
    -H "Authorization: Bearer $CLERK_SECRET_KEY" \
    -H "Content-Type: application/json" \
    -d "{\"user_id\":\"$clerk_user_id\"}" | jq -r .id)
  [ -n "$session_id" ] && [ "$session_id" != "null" ] || { echo ""; return 1; }
  # NOTE: Content-Type required even with no body — Clerk's BAPI rejects
  # POSTs without it as "unsupported_content_type".
  local jwt
  jwt=$(curl -s -X POST "https://api.clerk.com/v1/sessions/$session_id/tokens" \
    -H "Authorization: Bearer $CLERK_SECRET_KEY" \
    -H "Content-Type: application/json" | jq -r .jwt)
  [ -n "$jwt" ] && [ "$jwt" != "null" ] || { echo ""; return 1; }
  echo "$jwt"
}

section "Mint JWTs for both test users"
JWT_A=$(mint_jwt "$TEST_USER_A_CLERK_ID")
JWT_B=$(mint_jwt "$TEST_USER_B_CLERK_ID")
[ -n "$JWT_A" ] && pass "JWT for user A minted" || { fail "JWT_A mint failed"; exit 1; }
[ -n "$JWT_B" ] && pass "JWT for user B minted" || { fail "JWT_B mint failed"; exit 1; }

# Reusable curl helpers. CODE_<name> and BODY_<name> get set as side effects.
hit_auth() {
  # hit_auth <jwt> <method> <path> [data]  → echo "<HTTP_CODE> <body>"
  # Only sets Content-Type when there's actually a body — Fastify
  # rejects empty-body requests that declare Content-Type: application/json
  # with FST_ERR_CTP_EMPTY_JSON_BODY (400).
  local jwt="$1"; local method="$2"; local path="$3"; local data="${4:-}"
  local args=(-s -o /tmp/rt_body -w '%{http_code}' -X "$method"
              -H "Authorization: Bearer $jwt"
              "$API_BASE$path")
  if [ -n "$data" ]; then
    args+=(-H "Content-Type: application/json" -d "$data")
  fi
  local code; code=$(curl "${args[@]}")
  local body; body=$(cat /tmp/rt_body)
  echo "$code|$body"
}

expect_code() {
  # expect_code <label> <expected> <actual> [body_for_log]
  local label="$1"; local expected="$2"; local actual="$3"; local body="${4:-}"
  if [ "$actual" = "$expected" ]; then
    pass "$label → $actual"
  else
    fail "$label → expected $expected, got $actual ${body:+(body: ${body:0:160})}"
  fi
}

# ── Notifications ────────────────────────────────────────────────────────────
section "Notifications"
RESP=$(hit_auth "$JWT_A" GET "/notifications"); CODE="${RESP%%|*}"; BODY="${RESP#*|}"
expect_code "GET /notifications" "200" "$CODE" "$BODY"
LIST_BEFORE="$BODY"
info "before-trigger count: $(echo "$BODY" | jq -r 'length // (.items|length // "?")')"

# Trigger a notification by sending an invite from A→B (requires an event).
# API expects startsAt + endsAt as ISO timestamps (createEventBodySchema is .strict()).
START_AT="2026-06-15T18:00:00Z"
END_AT="2026-06-15T20:00:00Z"
RESP=$(hit_auth "$JWT_A" POST "/events" \
  "{\"title\":\"RoundTrip event\",\"location\":\"Anywhere\",\"startsAt\":\"$START_AT\",\"endsAt\":\"$END_AT\"}")
EV_CODE="${RESP%%|*}"; EV_BODY="${RESP#*|}"
expect_code "POST /events (trigger event for invite)" "201" "$EV_CODE" "$EV_BODY"
EVENT_ID=$(echo "$EV_BODY" | jq -r '.id // empty')
info "event_id=$EVENT_ID"

# Warm up B so the auth middleware upserts B's User row if it isn't there yet.
RESP=$(hit_auth "$JWT_B" GET "/friends"); CODE="${RESP%%|*}"; BODY="${RESP#*|}"
expect_code "GET /friends (warmup B)" "200" "$CODE" "$BODY"

# recipientIds wants APP user UUIDs (User.id), NOT Clerk user_ids. No /me
# endpoint exists yet, so query Postgres directly. docker-compose.yml
# provisions the syncup_migrate role with full read access.
B_APP_ID=$(docker compose exec -T postgres psql -U syncup_migrate -d syncup -tAc \
  "SELECT id FROM \"User\" WHERE \"clerkId\" = '$TEST_USER_B_CLERK_ID'" 2>/dev/null | tr -d '[:space:]')
if [ -z "$B_APP_ID" ]; then
  fail "could not resolve B's app user id from clerkId — is B's User row provisioned?"
fi
info "B's app user id: $B_APP_ID"

# Send the invite using B's APP id.
RESP=$(hit_auth "$JWT_A" POST "/events/$EVENT_ID/invites" \
  "{\"recipientIds\":[\"$B_APP_ID\"]}")
INV_CODE="${RESP%%|*}"; INV_BODY="${RESP#*|}"
expect_code "POST /events/:id/invites" "201" "$INV_CODE" "$INV_BODY"
# Controller returns { invites: [...] } per events.controller.ts:195.
INVITE_ID=$(echo "$INV_BODY" | jq -r '.invites[0].id // empty')

# Now B should have a notification.
sleep 1
RESP=$(hit_auth "$JWT_B" GET "/notifications"); CODE="${RESP%%|*}"; BODY="${RESP#*|}"
expect_code "GET /notifications (after trigger, as B)" "200" "$CODE" "$BODY"
# Controller returns { notifications: [...], unreadCount: n } per
# notifications.controller.ts:57.
NOTIF_ID=$(echo "$BODY" | jq -r '.notifications[0].id // empty')
[ -n "$NOTIF_ID" ] && pass "B received a notification (id=$NOTIF_ID)" \
  || fail "B did not receive a notification after invite from A"

# Read-mute-dismiss chain (only if we got a notif_id)
if [ -n "$NOTIF_ID" ]; then
  RESP=$(hit_auth "$JWT_B" POST "/notifications/$NOTIF_ID/read" "")
  expect_code "POST /notifications/:id/read" "204" "${RESP%%|*}" "${RESP#*|}"

  RESP=$(hit_auth "$JWT_B" POST "/notifications/$NOTIF_ID/mute" "")
  expect_code "POST /notifications/:id/mute" "204" "${RESP%%|*}" "${RESP#*|}"

  # read-all returns 200 with {"count": N} where N is how many got marked
  # read. Not 204 — there IS a useful body.
  RESP=$(hit_auth "$JWT_B" POST "/notifications/read-all" "")
  expect_code "POST /notifications/read-all" "200" "${RESP%%|*}" "${RESP#*|}"

  RESP=$(hit_auth "$JWT_B" DELETE "/notifications/$NOTIF_ID" "")
  expect_code "DELETE /notifications/:id" "204" "${RESP%%|*}" "${RESP#*|}"
fi

# ── Availability ─────────────────────────────────────────────────────────────
section "Availability"
RESP=$(hit_auth "$JWT_A" GET "/availability/me"); CODE="${RESP%%|*}"; BODY="${RESP#*|}"
expect_code "GET /availability/me" "200" "$CODE" "$BODY"

TODAY=$(date -u +%Y-%m-%d)
RESP=$(hit_auth "$JWT_A" PUT "/availability/me/$TODAY" '{"state":"free"}')
expect_code "PUT /availability/me/:date (set today=free)" "204" "${RESP%%|*}" "${RESP#*|}"

# Read back, confirm today is free
RESP=$(hit_auth "$JWT_A" GET "/availability/me"); CODE="${RESP%%|*}"; BODY="${RESP#*|}"
TODAY_STATE=$(echo "$BODY" | jq -r --arg d "$TODAY" '.[$d] // .map[$d] // empty')
[ "$TODAY_STATE" = "free" ] && pass "read-back: today=free confirmed" \
  || fail "read-back: today expected 'free', got '$TODAY_STATE' (body shape may differ — check)"

# Bulk patch (returns 204 on success — no body)
RESP=$(hit_auth "$JWT_A" PATCH "/availability/me" \
  "{\"$TODAY\":\"busy\"}")
expect_code "PATCH /availability/me (bulk)" "204" "${RESP%%|*}" "${RESP#*|}"

# Friend availability — B has not shared with A → expect FORBIDDEN.
# NOTE: the API currently returns 200 here. That is a PRIVACY BUG:
# getFriend only checks for blocks, not for friend+share relationship.
# Tracked separately; we still assert 403 so this surfaces as long as
# the bug exists.
RESP=$(hit_auth "$JWT_A" GET "/availability/$B_APP_ID"); CODE="${RESP%%|*}"; BODY="${RESP#*|}"
if [ "$CODE" = "403" ]; then
  pass "GET /availability/:userId (non-shared) → 403 FORBIDDEN (contract honored)"
elif [ "$CODE" = "200" ]; then
  fail "GET /availability/:userId returned 200 — PRIVACY BUG: any user can read any other user's availability (see availability.service.ts getFriend)"
else
  expect_code "GET /availability/:userId" "403" "$CODE" "$BODY"
fi

# Broadcast settings
RESP=$(hit_auth "$JWT_A" GET "/availability/broadcasts"); CODE="${RESP%%|*}"; BODY="${RESP#*|}"
expect_code "GET /availability/broadcasts" "200" "$CODE" "$BODY"

# PUT broadcasts returns 204 on success
RESP=$(hit_auth "$JWT_A" PUT "/availability/broadcasts" \
  '{"free":{"on":true,"audience":"everyone","targets":[]},"maybe":{"on":false,"audience":"everyone","targets":[]},"busy":{"on":false,"audience":"everyone","targets":[]}}')
expect_code "PUT /availability/broadcasts" "204" "${RESP%%|*}" "${RESP#*|}"

# ── Invites (event-scoped) ───────────────────────────────────────────────────
section "Invites — already exercised in Notifications block above"
if [ -n "$INVITE_ID" ]; then
  # B responds to the invite
  RESP=$(hit_auth "$JWT_B" PATCH "/events/$EVENT_ID/invites/$INVITE_ID" \
    '{"status":"ACCEPTED"}')
  expect_code "PATCH /events/:id/invites/:inviteId (B accepts)" "200" "${RESP%%|*}" "${RESP#*|}"

  # A rescinds (after B already accepted — should still work or return idempotent OK)
  RESP=$(hit_auth "$JWT_A" DELETE "/events/$EVENT_ID/invites/$INVITE_ID" "")
  expect_code "DELETE /events/:id/invites/:inviteId (A rescinds)" "204" "${RESP%%|*}" "${RESP#*|}"
else
  fail "skipped invite respond/rescind — INVITE_ID empty (POST /events/:id/invites response shape may differ)"
fi

# ── Existing endpoints regression smoke ──────────────────────────────────────
section "Regression smoke on previously-passing endpoints"
RESP=$(hit_auth "$JWT_A" GET "/events"); expect_code "GET /events" "200" "${RESP%%|*}" "${RESP#*|}"
RESP=$(hit_auth "$JWT_A" GET "/friends"); expect_code "GET /friends" "200" "${RESP%%|*}" "${RESP#*|}"
RESP=$(hit_auth "$JWT_A" GET "/groups"); expect_code "GET /groups" "200" "${RESP%%|*}" "${RESP#*|}"

# ── Results file ─────────────────────────────────────────────────────────────
COMMIT=$(git -C "$(dirname "$0")/.." rev-parse --short HEAD 2>/dev/null || echo "unknown")
DATE=$(date -u +%Y-%m-%d)
TOTAL=$((PASS_COUNT + FAIL_COUNT))

{
  echo "# NOTIF_AVAIL_INVITES_ROUNDTRIP_RESULTS"
  echo ""
  echo "**Date:** $DATE  "
  echo "**Commit:** \`$COMMIT\`  "
  echo "**API base:** $API_BASE"
  echo ""
  echo "---"
  echo ""
  echo "## Summary"
  echo ""
  echo "- Total checks: $TOTAL"
  echo "- Passed: $PASS_COUNT"
  echo "- Failed: $FAIL_COUNT"
  echo ""
  if [ "$FAIL_COUNT" -gt 0 ]; then
    echo "## Failures"
    echo ""
    for f in "${FAIL_DETAILS[@]}"; do echo "- $f"; done
    echo ""
  fi
  echo "## Coverage"
  echo ""
  echo "Endpoints exercised by this run:"
  echo ""
  echo "**Notifications:**"
  echo "- \`GET /notifications\`"
  echo "- \`POST /notifications/:id/read\`"
  echo "- \`POST /notifications/:id/mute\`"
  echo "- \`POST /notifications/read-all\`"
  echo "- \`DELETE /notifications/:id\`"
  echo ""
  echo "**Availability:**"
  echo "- \`GET /availability/me\`"
  echo "- \`PUT /availability/me/:date\`"
  echo "- \`PATCH /availability/me\`"
  echo "- \`GET /availability/:userId\` (expect 403 unless friended+shared)"
  echo "- \`GET /availability/broadcasts\`"
  echo "- \`PUT /availability/broadcasts\`"
  echo ""
  echo "**Invites (event-scoped):**"
  echo "- \`POST /events/:id/invites\`"
  echo "- \`PATCH /events/:id/invites/:inviteId\`"
  echo "- \`DELETE /events/:id/invites/:inviteId\`"
  echo ""
  echo "## Not covered by this run (manual / follow-up)"
  echo ""
  echo "- Socket emission of \`notif:new\` / \`notif:dismissed\` — requires a"
  echo "  socket client to observe; verify in the mobile app or with"
  echo "  \`websocat\` against the running server."
  echo "- AvailabilityBlock RLS edge case (backend agent flagged this)."
  echo "- Friend-shared availability path (200 case) — needs A and B to be"
  echo "  friends with shared availability set up first."
} > "$RESULTS_FILE"

# ── Final ────────────────────────────────────────────────────────────────────
section "Summary"
echo "  Total: $TOTAL · $(green Passed): $PASS_COUNT · $(red Failed): $FAIL_COUNT"
echo "  Results written to: $RESULTS_FILE"
[ "$FAIL_COUNT" -eq 0 ] && exit 0 || exit 1
