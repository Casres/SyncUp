# GCP Billing Alerts for EXPLORE (Google Places API consumption)
#
# Three thresholds: $25, $50, $100 monthly spend.
# All three NOTIFY ONLY — they never auto-disable the project or revoke the key.
# Wire notification channels (email, Pub/Sub, Slack) separately in the Cloud Console.
#
# Apply from social-calendar-api/src/infra/ when GCP credentials are available:
#   terraform init
#   terraform apply \
#     -var="billing_account_id=$GCP_BILLING_ACCOUNT_ID" \
#     -var="project_id=$GCP_PROJECT_ID"
#
# See gcp-billing-alerts.README.md for the manual gcloud fallback.

terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}

# The billingbudgets API requires a "quota project" on every request. Without
# this, Terraform routes the call through the gcloud SDK's default client
# project (which you can't enable APIs on) and the apply fails with a 403
# SERVICE_DISABLED. user_project_override + billing_project send the
# X-Goog-User-Project header so the call is billed/quota'd against the SyncUp
# project, where billingbudgets.googleapis.com is enabled.
provider "google" {
  user_project_override = true
  billing_project       = var.project_id
}

variable "billing_account_id" {
  description = "GCP billing account ID hosting the Places API key"
  type        = string
}

variable "project_id" {
  description = "GCP project ID for the Places API key"
  type        = string
}

variable "notification_channel_ids" {
  description = "Notification channel IDs (email / Pub/Sub) to receive alerts. Configure separately in the Cloud Console."
  type        = list(string)
  default     = []
}

locals {
  thresholds_usd = [25, 50, 100]
}

resource "google_billing_budget" "explore_places" {
  for_each        = toset([for t in local.thresholds_usd : tostring(t)])
  billing_account = var.billing_account_id
  display_name    = "EXPLORE Places - $${each.value} alert"

  budget_filter {
    projects = ["projects/${var.project_id}"]
    services = ["services/places.googleapis.com"]
  }

  amount {
    specified_amount {
      currency_code = "USD"
      units         = each.value
    }
  }

  threshold_rules {
    threshold_percent = 1.0
    spend_basis       = "CURRENT_SPEND"
  }

  all_updates_rule {
    monitoring_notification_channels = var.notification_channel_ids
    # Keep GCP's built-in billing email alerts as a backstop.
    disable_default_iam_recipients = false
  }
}
