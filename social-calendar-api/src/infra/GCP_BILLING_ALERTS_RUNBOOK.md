# GCP Billing Alerts — Apply Runbook

End-to-end procedure for applying (or skipping) the EXPLORE Places API
spend alerts defined in `gcp-billing-alerts.tf`. Three thresholds — **$25
/ $50 / $100 monthly spend** — all **notify-only**. They never
auto-disable the project or revoke the API key. EXPLORE staying online is
non-negotiable; these alerts exist so the on-call human gets paged before
the bill becomes interesting.

> Path A (Terraform) is the recommended path. Path B (gcloud) is the
> fallback for environments where Terraform isn't installed.

---

## Prerequisites

### Environment variables

| Var | Example | Source |
|---|---|---|
| `GCP_PROJECT_ID` | `syncup-prod-414000` | GCP Console → project picker → "ID" column |
| `GCP_BILLING_ACCOUNT_ID` | `012345-ABCDEF-123456` | `gcloud billing accounts list` |

Optional, but you will want one:

| Var | Purpose |
|---|---|
| `GCP_NOTIFICATION_CHANNEL_ID` | A pre-created monitoring notification channel (email / Slack / Pub/Sub) to receive the alerts. Without it, GCP falls back to billing-admin email — fine to start, but Slack or PagerDuty is better. |

```bash
export GCP_PROJECT_ID="syncup-prod-414000"
export GCP_BILLING_ACCOUNT_ID="012345-ABCDEF-123456"
# Optional — fully-qualified channel ID, NOT the bare numeric id
export GCP_NOTIFICATION_CHANNEL_ID="projects/$GCP_PROJECT_ID/notificationChannels/1234567890"
```

### Local tools

| Tool | Min version | Install |
|---|---|---|
| `gcloud` | 460+ | <https://cloud.google.com/sdk/docs/install> |
| `terraform` (Path A only) | 1.5+ | <https://developer.hashicorp.com/terraform/install> |

### GCP permissions

The principal running `terraform apply` (or the gcloud commands) needs:

- `roles/billing.admin` on the billing account, OR `roles/billing.costsManager` (sufficient for budgets only)
- `roles/monitoring.notificationChannelEditor` on the project IF you want the runbook to create the notification channel for you (it doesn't — wire that separately in the Cloud Console)

Authenticate once:

```bash
gcloud auth application-default login
gcloud config set project "$GCP_PROJECT_ID"
```

### Create a notification channel (one-time, manual)

Before applying alerts you should have somewhere to send them. In the
[Cloud Console → Monitoring → Notification channels](https://console.cloud.google.com/monitoring/alerting/notifications)
create an Email, Slack, or Pub/Sub channel. Copy the resulting fully-qualified
ID (`projects/<project>/notificationChannels/<numeric-id>`) into
`GCP_NOTIFICATION_CHANNEL_ID`.

> Skipping this step? GCP still emails the billing administrators by
> default (`disable_default_iam_recipients = false` is set in the
> Terraform), so you won't be flying blind — but you'll be reading
> billing emails instead of getting paged.

---

## Path A — Terraform apply (recommended)

```bash
cd social-calendar-api/src/infra
```

### 1. Initialise

```bash
terraform init
```

Expected output ends with:

```
Terraform has been successfully initialized!
```

### 2. Plan

```bash
terraform plan \
  -var "project_id=$GCP_PROJECT_ID" \
  -var "billing_account_id=$GCP_BILLING_ACCOUNT_ID" \
  -var "notification_channel_ids=[\"$GCP_NOTIFICATION_CHANNEL_ID\"]"
```

Expected: `Plan: 3 to add, 0 to change, 0 to destroy.` — one
`google_billing_budget` per threshold. If you see more than 3 resources,
something else has been added to the .tf — stop and investigate before
applying.

If you skipped the notification channel, drop the third `-var` and pass
an empty list implicitly (defaulted in the .tf):

```bash
terraform plan \
  -var "project_id=$GCP_PROJECT_ID" \
  -var "billing_account_id=$GCP_BILLING_ACCOUNT_ID"
```

### 3. Apply

```bash
terraform apply \
  -var "project_id=$GCP_PROJECT_ID" \
  -var "billing_account_id=$GCP_BILLING_ACCOUNT_ID" \
  -var "notification_channel_ids=[\"$GCP_NOTIFICATION_CHANNEL_ID\"]"
```

Terraform prompts for `yes`. Expected final line:

```
Apply complete! Resources: 3 added, 0 changed, 0 destroyed.
```

Skip to [Verification](#verification).

---

## Path B — Manual gcloud fallback

Use this when Terraform isn't installed in the deploy environment. Same
end-state, no state file.

### 1. Confirm env vars

```bash
echo "$GCP_BILLING_ACCOUNT_ID" "$GCP_PROJECT_ID" "$GCP_NOTIFICATION_CHANNEL_ID"
```

All three should print non-empty.

### 2. Create the three budgets

```bash
for THRESHOLD in 25 50 100; do
  gcloud billing budgets create \
    --billing-account="$GCP_BILLING_ACCOUNT_ID" \
    --display-name="EXPLORE Places - \$$THRESHOLD alert" \
    --budget-amount="${THRESHOLD}USD" \
    --threshold-rule=percent=100,basis=current-spend \
    --filter-projects="projects/$GCP_PROJECT_ID" \
    --filter-services="services/places.googleapis.com" \
    --notifications-rule-monitoring-notification-channels="$GCP_NOTIFICATION_CHANNEL_ID" \
    --notifications-rule-disable-default-iam-recipients=false
done
```

Each iteration prints a `name: billingAccounts/.../budgets/<uuid>` line on success.

---

## Verification

### List the three budgets

```bash
gcloud billing budgets list --billing-account="$GCP_BILLING_ACCOUNT_ID" \
  --format="table(displayName, amount.specifiedAmount.units)"
```

Expected output:

```
DISPLAY_NAME                        UNITS
EXPLORE Places - $25 alert          25
EXPLORE Places - $50 alert          50
EXPLORE Places - $100 alert         100
```

### Confirm in the Console

Open the budgets dashboard:

```
https://console.cloud.google.com/billing/$GCP_BILLING_ACCOUNT_ID/budgets
```

(Replace the billing account ID in the URL.) All three rows should show:

- Filter: project = `$GCP_PROJECT_ID`, services = `places.googleapis.com`
- Threshold: 100% of budget amount
- Status: Active

### Smoke-test the notification channel

In the same Console, open any one budget → Edit → "Send test
notification" on the channel. You should receive the test alert wherever
the channel points.

---

## Teardown

### Path A (Terraform)

```bash
cd social-calendar-api/src/infra
terraform destroy \
  -var "project_id=$GCP_PROJECT_ID" \
  -var "billing_account_id=$GCP_BILLING_ACCOUNT_ID"
```

### Path B (gcloud)

```bash
gcloud billing budgets list --billing-account="$GCP_BILLING_ACCOUNT_ID" \
  --filter="displayName~'^EXPLORE Places'" \
  --format="value(name)" \
| while read BUDGET; do
    gcloud billing budgets delete "$BUDGET" \
      --billing-account="$GCP_BILLING_ACCOUNT_ID" --quiet
  done
```

---

## Cost expectation

The Terraform defines three budgets at **$25 / $50 / $100 USD per
calendar month**, scoped to the Places API service
(`services/places.googleapis.com`) on a single project. Triggering each
alert costs nothing — the budgets themselves are free GCP resources. The
only "cost" of having them enabled is your inbox / Slack channel
receiving notifications.

Thresholds are intentionally low for a pre-launch deployment so the
on-call human sees the curve early. Raise them in `gcp-billing-alerts.tf`
(edit `locals.thresholds_usd`) and re-apply once production traffic shape
is known.

---

## Hard rules

- **Never** add `auto-disable` behaviour. EXPLORE going dark is worse than the bill.
- **Never** include Eventbrite spend in this filter — Eventbrite bills outside GCP.
- **Never** edit the `services` filter without confirming the new service ID is correct (`gcloud services list --enabled`).
