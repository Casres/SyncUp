#!/usr/bin/env bash
#
# messaging-roundtrip.sh
#
# R18 round-trip: exercises the messaging domain (/conversations, the
# /events/:id/chat enable, the auto-created group chat) end-to-end across two
# users. Mirrors notif-avail-invites-roundtrip.sh.
#
# Covers:
#   - DIRECT (1:1) get-or-create, send, receive, unread count, mark-read
#   - Notification collapse (PR #3): N messages in one conversation → ONE
#     recipient notif row, count bumps by N, re-surfaces unread
#   - GROUP chat auto-created by FriendGroup creation (R18 D4), member join
#   - EVENT chat host-enable (organiser-only), idempotency, non-organiser 403
#   - Participant gating: a non-participant GET → 403 FORBIDDEN
#   - Archived exclusion: an archived EVENT conversation is hidden from inbox
#
# PREREQS (once, before running):
#   1. cd social-calendar-api && npx prisma generate
#   2. From repo root: apply the new migration + (re)build:
#        docker compose up -d --build
#      Ensure migration 20260603000001_messaging is applied (prisma migrate
#      deploy runs in the api container entrypoint / Dockerfile).
#   3. docker compose ps shows api/postgres/redis healthy
#   4. Two test Clerk users provisioned in your Clerk dev instance.
#
# USAGE:
#   export CLERK_SECRET_KEY=sk_test_...
#   export TEST_USER_A_CLERK_ID=user_xxx     # organiser / DM initiator / group owner
#   export TEST_USER_B_CLERK_ID=user_yyy     # friend / invitee / group member
#   export API_BASE=http://localhost:3000    # optional override
#   ./scripts/messaging-roundtrip.sh
#
# OUTPUT:
#   Writes MESSAGING_ROUNDTRIP_RESULTS.md at repo root.
#   Prints PASS/FAIL per check; exits non-zero if any check fails.

set -uo pipefail

API_BASE="${API_BASE:-http://localhost:3000}"
RESULTS_FILE="MESSAGING_ROUNDTRIP_RESULTS.md"
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

# ── Curl helper ──────────────────────────────────────────────────────────────
hit_auth() {
  local jwt="$1"; local method="$2"; local path="$3"; local data="${4:-}"
  local args=(-s -o /tmp/msg_body -w '%{http_code}' -X "$method"
              -H "Authorization: Bearer $jwt"
              "$API_BASE$path")
  if [ -n "$data" ]; then
    args+=(-H "Content-Type: application/json" -d "$data")
  fi
  local code; code=$(curl "${args[@]}")
  local body; body=$(cat /tmp/msg_body)
  echo "$code|$body"
}

expect_code() {
  local label="$1"; local expected="$2"; local actual="$3"; local body="${4:-}"
  if [ "$actual" = "$expected" ]; then
    pass "$label → $actual"
  else
    fail "$label → expected $expected, got $actual ${body:+(body: ${body:0:160})}"
  fi
}

psql_q() {
  docker compose exec -T postgres psql -U syncup_migrate -d syncup -tAc "$1" 2>/dev/null | tr -d '[:space:]'
}

# ── Warmup: provision both User rows, resolve app ids ────────────────────────
section "Warmup + id resolution"
RESP=$(hit_auth "$JWT_A" GET "/friends"); expect_code "GET /friends (warmup A)" "200" "${RESP%%|*}" "${RESP#*|}"
RESP=$(hit_auth "$JWT_B" GET "/friends"); expect_code "GET /friends (warmup B)" "200" "${RESP%%|*}" "${RESP#*|}"

A_APP_ID=$(psql_q "SELECT id FROM \"User\" WHERE \"clerkId\" = '$TEST_USER_A_CLERK_ID'")
B_APP_ID=$(psql_q "SELECT id FROM \"User\" WHERE \"clerkId\" = '$TEST_USER_B_CLERK_ID'")
[ -n "$A_APP_ID" ] && pass "resolved A app id" || fail "could not resolve A app id"
[ -n "$B_APP_ID" ] && pass "resolved B app id" || fail "could not resolve B app id"
info "A=$A_APP_ID  B=$B_APP_ID"

# ── Ensure accepted friendship A↔B (DM requires it) ──────────────────────────
section "Friendship setup (DM precondition)"
RESP=$(hit_auth "$JWT_A" POST "/friends/requests" "{\"recipientId\":\"$B_APP_ID\"}")
FR_CODE="${RESP%%|*}"; FR_BODY="${RESP#*|}"
if [ "$FR_CODE" = "201" ]; then
  FRIENDSHIP_ID=$(echo "$FR_BODY" | jq -r '.id // empty')
  info "friend request sent (id=$FRIENDSHIP_ID)"
  if [ -n "$FRIENDSHIP_ID" ]; then
    RESP=$(hit_auth "$JWT_B" PATCH "/friends/requests/$FRIENDSHIP_ID" '{"action":"accept"}')
    expect_code "PATCH /friends/requests/:id (B accepts)" "200" "${RESP%%|*}" "${RESP#*|}"
  fi
elif [ "$FR_CODE" = "409" ]; then
  info "friendship already exists (409) — reusing"
else
  fail "POST /friends/requests → unexpected $FR_CODE (${FR_BODY:0:120})"
fi
# Real gate: B must appear in A's friends list.
# GET /friends returns { friends: [ { friend: {...}, ... } ] } — iterate the
# `friends` array, not the top-level object.
RESP=$(hit_auth "$JWT_A" GET "/friends"); BODY="${RESP#*|}"
if echo "$BODY" | jq -e --arg b "$B_APP_ID" 'any(.friends[]?; (.friend.id // .id) == $b)' >/dev/null 2>&1; then
  pass "A and B are accepted friends"
else
  fail "A and B are not friends after setup — DM tests will 403"
fi

# ── DIRECT (1:1) conversation ────────────────────────────────────────────────
section "Direct messaging (1:1)"
RESP=$(hit_auth "$JWT_A" POST "/conversations/direct/$B_APP_ID")
DM_CODE="${RESP%%|*}"; DM_BODY="${RESP#*|}"
expect_code "POST /conversations/direct/:friendId (get-or-create)" "200" "$DM_CODE" "$DM_BODY"
DM_CONV_ID=$(echo "$DM_BODY" | jq -r '.conversation.id // empty')
[ -n "$DM_CONV_ID" ] && pass "DM conversation id resolved ($DM_CONV_ID)" || fail "no DM conversation id in response"

# Idempotency: second call returns the same conversation.
RESP=$(hit_auth "$JWT_A" POST "/conversations/direct/$B_APP_ID")
DM_CONV_ID2=$(echo "${RESP#*|}" | jq -r '.conversation.id // empty')
[ "$DM_CONV_ID" = "$DM_CONV_ID2" ] && pass "DM get-or-create is idempotent" \
  || fail "DM get-or-create not idempotent ($DM_CONV_ID vs $DM_CONV_ID2)"

# A sends a message.
RESP=$(hit_auth "$JWT_A" POST "/conversations/$DM_CONV_ID/messages" '{"content":"hello from A"}')
SEND_CODE="${RESP%%|*}"; SEND_BODY="${RESP#*|}"
expect_code "POST /conversations/:id/messages (A sends)" "201" "$SEND_CODE" "$SEND_BODY"
DM_MSG_ID=$(echo "$SEND_BODY" | jq -r '.message.id // empty')

# B sees it in the thread.
RESP=$(hit_auth "$JWT_B" GET "/conversations/$DM_CONV_ID/messages")
TH_CODE="${RESP%%|*}"; TH_BODY="${RESP#*|}"
expect_code "GET /conversations/:id/messages (B reads thread)" "200" "$TH_CODE" "$TH_BODY"
if echo "$TH_BODY" | jq -e '.messages | any(.content == "hello from A")' >/dev/null 2>&1; then
  pass "B sees A's message in the thread"
else
  fail "B did not see A's message (${TH_BODY:0:160})"
fi

# B's inbox shows the DM with unread >= 1.
RESP=$(hit_auth "$JWT_B" GET "/conversations"); INBOX_B="${RESP#*|}"
UNREAD_B=$(echo "$INBOX_B" | jq -r --arg c "$DM_CONV_ID" '.conversations[]? | select(.id==$c) | .unreadCount // 0')
[ "${UNREAD_B:-0}" -ge 1 ] 2>/dev/null && pass "B inbox unreadCount ≥ 1 (got ${UNREAD_B})" \
  || fail "B inbox unreadCount expected ≥1, got '${UNREAD_B}'"

# B marks read up to the message → unread resets to 0.
if [ -n "$DM_MSG_ID" ]; then
  RESP=$(hit_auth "$JWT_B" POST "/conversations/$DM_CONV_ID/read" "{\"messageId\":\"$DM_MSG_ID\"}")
  expect_code "POST /conversations/:id/read (B marks read)" "204" "${RESP%%|*}" "${RESP#*|}"
  RESP=$(hit_auth "$JWT_B" GET "/conversations"); INBOX_B2="${RESP#*|}"
  UNREAD_B2=$(echo "$INBOX_B2" | jq -r --arg c "$DM_CONV_ID" '.conversations[]? | select(.id==$c) | .unreadCount // 0')
  [ "${UNREAD_B2:-x}" = "0" ] && pass "B inbox unreadCount reset to 0 after read" \
    || fail "B inbox unreadCount expected 0 after read, got '${UNREAD_B2}'"
fi

# ── Notification collapse (per-conversation, PR #3) ──────────────────────────
# Many messages in one conversation must collapse into ONE self-updating
# notification row for the recipient (refreshed in place, re-surfaced unread,
# running `count` in the payload) — NOT one card per message.
#
# Collapse keys on the recipient's ACTIVE (undismissed) row for
# groupKey=conversation:<id>, and `count` accumulates until that row is
# dismissed. So across re-runs the absolute count drifts — we assert the DELTA
# (send N more → exactly one row, count up by N, read=false) rather than an
# absolute value. The "hello from A" send above already created B's first row.
section "Notification collapse (per-conversation, PR #3)"

# jq helpers over GET /notifications → { notifications: [...] }; each row spreads
# its payload, so conversationId/count/read are top-level on the row.
notif_rows()  { echo "$1" | jq -r --arg c "$DM_CONV_ID" '[.notifications[]? | select(.conversationId==$c)] | length'; }
notif_count() { echo "$1" | jq -r --arg c "$DM_CONV_ID" 'first(.notifications[]? | select(.conversationId==$c)) | .count // 0'; }
notif_read()  { echo "$1" | jq -r --arg c "$DM_CONV_ID" 'first(.notifications[]? | select(.conversationId==$c)) | .read'; }

# Baseline (after "hello from A"): expect exactly one row, count ≥ 1.
RESP=$(hit_auth "$JWT_B" GET "/notifications"); NOTIF_B0="${RESP#*|}"
BASE_ROWS=$(notif_rows "$NOTIF_B0"); BASE_COUNT=$(notif_count "$NOTIF_B0")
[ "${BASE_ROWS:-0}" = "1" ] && pass "B has exactly 1 notif row for the DM (baseline)" \
  || fail "B baseline DM notif rows expected 1, got '${BASE_ROWS}' (collapse may be off)"
[ "${BASE_COUNT:-0}" -ge 1 ] 2>/dev/null && info "baseline count=${BASE_COUNT}" \
  || fail "B baseline DM notif count expected ≥1, got '${BASE_COUNT}'"

# A sends two more messages → these must collapse into the SAME row.
hit_auth "$JWT_A" POST "/conversations/$DM_CONV_ID/messages" '{"content":"second"}' >/dev/null
hit_auth "$JWT_A" POST "/conversations/$DM_CONV_ID/messages" '{"content":"third"}'  >/dev/null

RESP=$(hit_auth "$JWT_B" GET "/notifications"); NOTIF_B1="${RESP#*|}"
NEW_ROWS=$(notif_rows "$NOTIF_B1"); NEW_COUNT=$(notif_count "$NOTIF_B1"); NEW_READ=$(notif_read "$NOTIF_B1")

# Headline: still exactly ONE row after 2 more messages (no per-message flurry).
[ "${NEW_ROWS:-0}" = "1" ] && pass "2 more messages collapse into ONE notif row (got 1 row)" \
  || fail "collapse failed — expected 1 DM notif row, got '${NEW_ROWS}' (flurry?)"

# count bumped by exactly 2 (delta, not absolute — robust to re-runs).
EXPECT_COUNT=$((BASE_COUNT + 2))
[ "${NEW_COUNT:-0}" = "$EXPECT_COUNT" ] && pass "collapse count bumped by 2 (${BASE_COUNT}→${NEW_COUNT})" \
  || fail "collapse count expected ${EXPECT_COUNT} (${BASE_COUNT}+2), got '${NEW_COUNT}'"

# Re-surfaced as unread (refreshOwner marks read=false).
[ "${NEW_READ}" = "false" ] && pass "collapsed notif re-surfaced as unread (read=false)" \
  || fail "collapsed notif expected read=false, got '${NEW_READ}'"

# ── GROUP chat (auto-created by FriendGroup creation, R18 D4) ─────────────────
section "Group chat (auto-created via FriendGroup)"
RESP=$(hit_auth "$JWT_A" POST "/friend-groups" '{"name":"RoundTrip Crew"}')
FG_CODE="${RESP%%|*}"; FG_BODY="${RESP#*|}"
expect_code "POST /friend-groups (auto-creates GROUP chat)" "201" "$FG_CODE" "$FG_BODY"
FG_ID=$(echo "$FG_BODY" | jq -r '.id // empty')

# A's inbox now has a GROUP conversation. Select it deterministically by the
# friend group we just created (linkedGroupId) — NOT "the newest GROUP
# conversation", which is non-deterministic and breaks re-runs once prior runs
# have left other group chats (with B already a participant) in the inbox.
RESP=$(hit_auth "$JWT_A" GET "/conversations"); INBOX_A="${RESP#*|}"
GROUP_CONV_ID=$(echo "$INBOX_A" | jq -r --arg g "$FG_ID" 'first(.conversations[]? | select(.type=="GROUP" and .linkedGroupId==$g) | .id) // empty')
[ -n "$GROUP_CONV_ID" ] && pass "GROUP conversation auto-created ($GROUP_CONV_ID)" \
  || fail "no GROUP conversation in A's inbox after FriendGroup create"

# Participant gating: B is NOT a participant yet → 403 on the thread.
if [ -n "$GROUP_CONV_ID" ]; then
  RESP=$(hit_auth "$JWT_B" GET "/conversations/$GROUP_CONV_ID/messages")
  expect_code "GET group thread as NON-participant (B) → FORBIDDEN" "403" "${RESP%%|*}" "${RESP#*|}"
fi

# A adds B to the friend group → B joins the group chat.
if [ -n "$FG_ID" ]; then
  RESP=$(hit_auth "$JWT_A" POST "/friend-groups/$FG_ID/members" "{\"userId\":\"$B_APP_ID\"}")
  expect_code "POST /friend-groups/:id/members (B joins → chat participant)" "201" "${RESP%%|*}" "${RESP#*|}"
fi

# Now B can read the group thread.
if [ -n "$GROUP_CONV_ID" ]; then
  RESP=$(hit_auth "$JWT_B" GET "/conversations/$GROUP_CONV_ID/messages")
  expect_code "GET group thread as participant (B, after join) → 200" "200" "${RESP%%|*}" "${RESP#*|}"
fi

# ── EVENT chat (host-enabled) ────────────────────────────────────────────────
section "Event chat (host enable)"
START_AT="2026-07-01T18:00:00Z"
END_AT="2026-07-01T20:00:00Z"
RESP=$(hit_auth "$JWT_A" POST "/events" \
  "{\"title\":\"RoundTrip party\",\"location\":\"Anywhere\",\"startsAt\":\"$START_AT\",\"endsAt\":\"$END_AT\"}")
expect_code "POST /events (host A)" "201" "${RESP%%|*}" "${RESP#*|}"
EVENT_ID=$(echo "${RESP#*|}" | jq -r '.id // empty')

# Invite B so they are seeded into the event chat.
RESP=$(hit_auth "$JWT_A" POST "/events/$EVENT_ID/invites" "{\"recipientIds\":[\"$B_APP_ID\"]}")
expect_code "POST /events/:id/invites (invite B)" "201" "${RESP%%|*}" "${RESP#*|}"

# Non-organiser cannot enable chat.
RESP=$(hit_auth "$JWT_B" POST "/events/$EVENT_ID/chat")
expect_code "POST /events/:id/chat as NON-organiser (B) → FORBIDDEN" "403" "${RESP%%|*}" "${RESP#*|}"

# Host enables chat.
RESP=$(hit_auth "$JWT_A" POST "/events/$EVENT_ID/chat")
EC_CODE="${RESP%%|*}"; EC_BODY="${RESP#*|}"
expect_code "POST /events/:id/chat (host A enables)" "200" "$EC_CODE" "$EC_BODY"
EVENT_CONV_ID=$(echo "$EC_BODY" | jq -r '.conversation.id // empty')
[ -n "$EVENT_CONV_ID" ] && pass "EVENT conversation created ($EVENT_CONV_ID)" || fail "no EVENT conversation id"

# Idempotent: enabling again returns the same conversation.
RESP=$(hit_auth "$JWT_A" POST "/events/$EVENT_ID/chat")
EVENT_CONV_ID2=$(echo "${RESP#*|}" | jq -r '.conversation.id // empty')
[ "$EVENT_CONV_ID" = "$EVENT_CONV_ID2" ] && pass "event-chat enable is idempotent" \
  || fail "event-chat enable not idempotent ($EVENT_CONV_ID vs $EVENT_CONV_ID2)"

# B (invitee) is a participant and can post.
if [ -n "$EVENT_CONV_ID" ]; then
  RESP=$(hit_auth "$JWT_B" POST "/conversations/$EVENT_CONV_ID/messages" '{"content":"see you there"}')
  expect_code "POST event-chat message as invitee (B)" "201" "${RESP%%|*}" "${RESP#*|}"
fi

# ── Archived exclusion (R18 D3) ──────────────────────────────────────────────
section "Archived exclusion"
if [ -n "$EVENT_CONV_ID" ]; then
  # Simulate the archival worker by stamping archivedAt directly (the worker
  # sets endsAt+48h; the inbox filter only cares that it is non-null).
  psql_q "UPDATE \"Conversation\" SET \"archivedAt\" = now() WHERE id = '$EVENT_CONV_ID'" >/dev/null
  RESP=$(hit_auth "$JWT_A" GET "/conversations"); INBOX_A2="${RESP#*|}"
  if echo "$INBOX_A2" | jq -e --arg c "$EVENT_CONV_ID" '.conversations | any(.id == $c)' >/dev/null 2>&1; then
    fail "archived EVENT conversation STILL appears in inbox (archivedAt filter broken)"
  else
    pass "archived EVENT conversation excluded from inbox"
  fi
fi

# ── Results file ─────────────────────────────────────────────────────────────
COMMIT=$(git -C "$(dirname "$0")/.." rev-parse --short HEAD 2>/dev/null || echo "unknown")
DATE=$(date -u +%Y-%m-%d)
TOTAL=$((PASS_COUNT + FAIL_COUNT))

{
  echo "# MESSAGING_ROUNDTRIP_RESULTS"
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
  echo "- \`POST /conversations/direct/:friendId\` (get-or-create, idempotent)"
  echo "- \`POST /conversations/:id/messages\` (send)"
  echo "- \`GET /conversations/:id/messages\` (thread)"
  echo "- \`GET /conversations\` (inbox + unread counts)"
  echo "- \`POST /conversations/:id/read\` (read cursor / D1 unread)"
  echo "- \`POST /friend-groups\` → auto-created GROUP chat (R18 D4)"
  echo "- \`POST /friend-groups/:id/members\` → group-chat participant join"
  echo "- \`POST /events/:id/chat\` (host enable, organiser-only, idempotent)"
  echo "- Participant gating: non-participant thread read → 403"
  echo "- Non-organiser event-chat enable → 403"
  echo "- Archived EVENT conversation excluded from inbox"
  echo ""
  echo "## Not covered by this run (manual / follow-up)"
  echo ""
  echo "- Socket events (\`chat:message:new\`, \`chat:conversation:new\`,"
  echo "  \`chat:typing\`) — need a socket client; verify in-app or with websocat."
  echo "- The real archival worker tick (this run stamps archivedAt directly to"
  echo "  exercise the inbox filter; runEventChatArchivalSweep() is unit-testable"
  echo "  separately)."
} > "$RESULTS_FILE"

# ── Final ────────────────────────────────────────────────────────────────────
section "Summary"
echo "  Total: $TOTAL · $(green Passed): $PASS_COUNT · $(red Failed): $FAIL_COUNT"
echo "  Results written to: $RESULTS_FILE"
[ "$FAIL_COUNT" -eq 0 ] && exit 0 || exit 1
