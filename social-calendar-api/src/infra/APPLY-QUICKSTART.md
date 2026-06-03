# GCP Billing Alerts — First-Timer Quickstart (run on your Mac)

A tailored, copy-paste path for applying the three Places API spend alerts
($25 / $50 / $100, notify-only) on macOS when you've never used `gcloud` or
`terraform` before. This is the condensed version of
`GCP_BILLING_ALERTS_RUNBOOK.md` — read that for the full reference, teardown,
and the manual gcloud fallback.

Everything here runs on YOUR Mac because it needs your Google login. Nothing
leaves your machine.

---

## Step 0 — Install the two tools (one time)

If you don't already have Homebrew, install it from <https://brew.sh>, then:

```bash
brew install --cask google-cloud-sdk     # the `gcloud` CLI
brew install terraform                   # Terraform
```

Verify:

```bash
gcloud version        # expect 460 or higher
terraform version     # expect 1.5 or higher
```

---

## Step 1 — Log in to Google Cloud

```bash
gcloud auth login                        # opens a browser; pick your Google account
gcloud auth application-default login    # second browser login — this is what Terraform uses
```

Both open a browser window. Approve with the Google account that has access to
the SyncUp billing.

---

## Step 2 — Find your two IDs

You need a **project ID** and a **billing account ID**.

```bash
# Project ID — look at the PROJECT_ID column for SyncUp
gcloud projects list

# Billing account ID — looks like 012345-ABCDEF-123456
gcloud billing accounts list
```

Set them as variables in your shell (paste your real values in place):

```bash
export GCP_PROJECT_ID="paste-project-id-here"
export GCP_BILLING_ACCOUNT_ID="paste-billing-account-id-here"
```

> Optional — if you confirmed you have a notification channel at
> <https://console.cloud.google.com/monitoring/alerting/notifications>,
> grab its fully-qualified ID and set it too. If you're not sure, skip this —
> Google will email the billing admins by default.
>
> ```bash
> export GCP_NOTIFICATION_CHANNEL_ID="projects/$GCP_PROJECT_ID/notificationChannels/NUMERIC_ID"
> ```

---

## Step 3 — Go to the infra folder

```bash
cd "/Users/christiancasillas/Documents/Claude/Projects/SyncUp/social-calendar-api/src/infra"
```

---

## Step 4 — Initialise Terraform

```bash
terraform init
```

Expect it to end with: `Terraform has been successfully initialized!`

---

## Step 5 — Preview the changes (safe, makes nothing)

**Without a notification channel:**

```bash
terraform plan \
  -var "project_id=$GCP_PROJECT_ID" \
  -var "billing_account_id=$GCP_BILLING_ACCOUNT_ID"
```

**With a notification channel:**

```bash
terraform plan \
  -var "project_id=$GCP_PROJECT_ID" \
  -var "billing_account_id=$GCP_BILLING_ACCOUNT_ID" \
  -var "notification_channel_ids=[\"$GCP_NOTIFICATION_CHANNEL_ID\"]"
```

✅ You MUST see exactly: `Plan: 3 to add, 0 to change, 0 to destroy.`
If the number is anything other than 3, STOP and tell me — something changed.

---

## Step 6 — Apply (this is the real one)

Same command as Step 5 but `apply` instead of `plan`. Use whichever variant
matches your channel choice.

```bash
terraform apply \
  -var "project_id=$GCP_PROJECT_ID" \
  -var "billing_account_id=$GCP_BILLING_ACCOUNT_ID"
```

(add the `notification_channel_ids` line if you set a channel)

Terraform prints the plan again and asks to confirm — type `yes` and press
Enter. Expect the final line:

```
Apply complete! Resources: 3 added, 0 changed, 0 destroyed.
```

---

## Step 7 — Verify

```bash
gcloud billing budgets list --billing-account="$GCP_BILLING_ACCOUNT_ID" \
  --format="table(displayName, amount.specifiedAmount.units)"
```

Expect three rows:

```
DISPLAY_NAME                        UNITS
EXPLORE Places - $25 alert          25
EXPLORE Places - $50 alert          50
EXPLORE Places - $100 alert         100
```

That's it — you're done. The alerts are live and notify-only; they will never
take Explore offline.

---

## If something goes wrong

- **`Permission denied` / `403`** — the logged-in account lacks
  `roles/billing.admin` on the billing account. Use an account that has it, or
  ask whoever owns GCP billing to grant it.
- **Plan shows more or fewer than 3 resources** — stop and ping me before
  applying.
- **Want to undo everything** — `terraform destroy` with the same `-var`
  flags (see the runbook's Teardown section). The budgets are free, so leaving
  them in place costs nothing.

> ⚠️ A `terraform.tfstate` file will appear in this folder after apply. It
> records what Terraform created. Keep it — don't delete or commit secrets
> from it. (It contains no GCP keys, just resource IDs.)
