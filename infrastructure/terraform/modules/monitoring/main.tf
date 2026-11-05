# Cloud Billing Budget with alerts at 50%, 80%, and 100% of budget ceiling
resource "google_billing_budget" "budget" {
  billing_account = var.billing_account_id
  display_name    = "${var.environment}-allgo-monthly-budget"

  budget_filter {
    projects               = ["projects/${var.project_id}"]
    credit_types_treatment = "INCLUDE_ALL_CREDITS"
  }

  amount {
    specified_amount {
      currency_code = "INR"
      units         = tostring(var.budget_amount_inr)
    }
  }

  # 50% budget alert
  threshold_rules {
    threshold_percent = 0.5
    spend_basis       = "CURRENT_SPEND"
  }

  # 80% budget alert
  threshold_rules {
    threshold_percent = 0.8
    spend_basis       = "CURRENT_SPEND"
  }

  # 100% budget alert
  threshold_rules {
    threshold_percent = 1.0
    spend_basis       = "CURRENT_SPEND"
  }

  dynamic "all_updates_rule" {
    for_each = var.pubsub_budget_topic != null ? [var.pubsub_budget_topic] : []
    content {
      pubsub_topic                     = all_updates_rule.value
      monitoring_notification_channels = []
      disable_default_iam_recipients   = false
    }
  }
}

# Monitoring Alert Policy for Google Maps Routes & Places API usage quota
resource "google_monitoring_alert_policy" "maps_quota_alert" {
  display_name = "${var.environment}-allgo-maps-quota-alert"
  project      = var.project_id
  combiner     = "OR"

  conditions {
    display_name = "Google Maps API usage rate limit warning"

    condition_threshold {
      filter          = "metric.type=\"serviceruntime.googleapis.com/api/request_count\" resource.type=\"consumed_api\" resource.label.\"service\"=\"routes.googleapis.com\""
      duration        = "300s"
      comparison      = "COMPARISON_GT"
      threshold_value = var.maps_quota_threshold_requests

      aggregations {
        alignment_period   = "300s"
        per_series_aligner = "ALIGN_RATE"
      }
    }
  }

  alert_strategy {
    auto_close = "1800s"
  }
}

# Monitoring Alert Policy for Firebase Auth SMS quota
resource "google_monitoring_alert_policy" "firebase_sms_quota_alert" {
  display_name = "${var.environment}-allgo-firebase-sms-quota-alert"
  project      = var.project_id
  combiner     = "OR"

  conditions {
    display_name = "Firebase Auth SMS OTP volume warning"

    condition_threshold {
      filter          = "metric.type=\"identitytoolkit.googleapis.com/sms/request_count\" resource.type=\"identitytoolkit_project\""
      duration        = "300s"
      comparison      = "COMPARISON_GT"
      threshold_value = var.sms_quota_threshold_requests

      aggregations {
        alignment_period   = "300s"
        per_series_aligner = "ALIGN_RATE"
      }
    }
  }

  alert_strategy {
    auto_close = "1800s"
  }
}

# Cloud Scheduler job for dev overnight scale-to-zero compute shutdown
resource "google_cloud_scheduler_job" "overnight_shutdown" {
  count       = var.enable_overnight_shutdown ? 1 : 0
  name        = "${var.environment}-allgo-overnight-shutdown"
  description = "Overnight automated compute shutdown for dev environment idle cost optimization"
  schedule    = "0 18 * * *" # 18:00 UTC = 23:30 IST
  time_zone   = "Asia/Kolkata"
  region      = var.region
  project     = var.project_id

  http_target {
    http_method = "POST"
    uri         = "https://${var.region}-run.googleapis.com/apis/run.googleapis.com/v1/namespaces/${var.project_id}/jobs/dev-shutdown:run"

    oauth_token {
      service_account_email = "sa-worker@${var.project_id}.iam.gserviceaccount.com"
    }
  }
}

