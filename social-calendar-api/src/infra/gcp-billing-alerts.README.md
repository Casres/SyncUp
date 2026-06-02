> See **GCP_BILLING_ALERTS_RUNBOOK.md** for the full apply procedure (Terraform + gcloud paths, prereqs, verification, teardown). This file is kept as the standalone gcloud-only fallback reference.

# GCP Billing Alerts — Manual gcloud Fallback

Apply this if Terraform is not available in the deploy environment. Configures
three Places API spend alerts at $25 / $50 / $100 with notify-only behaviour.

## Prerequisites

- `gcloud` CLI authenticated with `roles/billing.admin` on the billing account
- `BILLING_ACCOUNT_ID` and `PROJECT_ID` set in your shell
- At least one notification channel created in the [Cloud Console](https://console.cloud.google.com/monitoring/alerting/notifications)

## Set env vars

```bash
export BILLING_ACCOUNT_ID="your-billing-account-id"   # e.g. 012345-ABCDEF-123456
export PROJECT_ID="your-gcp-project-id"
export NOTIFICATION_CHANNEL="projects/$PROJECT_ID/notificationChannels/YOUR_CHANNEL_ID"
```

## Create the three budget alerts

Run for each threshold ($25, $50, $100):

```bash
for THRESHOLD in 25 50 100; do
  gcloud billing budgets create \
    --billing-account="$BILLING_ACCOUNT_ID" \
    --display-name="EXPLORE Places - \$$THRESHOLD alert" \
    --budget-amount="${THRESHOLD}USD" \
    --threshold-rule=percent=100,basis=current-spend \
    --filter-projects="projects/$PROJECT_ID" \
    --filter-services="services/places.googleapis.com" \
    --notifications-rule-monitoring-notification-channels="$NOTIFICATION_CHANNEL" \
    --notifications-rule-disable-default-iam-recipients=false
done
```

## Verify

```bash
gcloud billing budgets list --billing-account="$BILLING_ACCOUNT_ID"
```

Expect three budgets named:
- `EXPLORE Places - $25 alert`
- `EXPLORE Places - $50 alert`
- `EXPLORE Places - $100 alert`

## Never

- **Never** set auto-disable behaviour — these alerts NOTIFY only. An auto-disable
  would take Explore offline for all users and is not acceptable.
- **Never** include Eventbrite in this budget filter. Eventbrite bills separately
  through its own dashboard at eventbrite.com — it has no GCP spend.

## Terraform alternative

See `gcp-billing-alerts.tf` in this directory for the equivalent IaC. Terraform is
preferred for production environments so alerts are tracked in version control.
