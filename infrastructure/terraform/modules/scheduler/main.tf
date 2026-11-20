resource "google_cloud_scheduler_job" "jobs" {
  for_each         = var.jobs
  name             = "${var.environment}-${each.key}"
  description      = lookup(each.value, "description", "Scheduled recurring job")
  schedule         = each.value.schedule
  time_zone        = lookup(each.value, "time_zone", "Asia/Kolkata")
  attempt_deadline = lookup(each.value, "attempt_deadline", "320s")
  region           = var.region
  project          = var.project_id

  dynamic "http_target" {
    for_each = lookup(each.value, "http_target", null) != null ? [each.value.http_target] : []
    content {
      http_method = lookup(http_target.value, "http_method", "POST")
      uri         = http_target.value.uri
      body        = lookup(http_target.value, "body", null) != null ? base64encode(http_target.value.body) : null

      dynamic "oidc_token" {
        for_each = lookup(http_target.value, "service_account_email", null) != null ? [1] : []
        content {
          service_account_email = http_target.value.service_account_email
        }
      }
    }
  }

  dynamic "pubsub_target" {
    for_each = lookup(each.value, "pubsub_target", null) != null ? [each.value.pubsub_target] : []
    content {
      topic_name = pubsub_target.value.topic_name
      data       = lookup(pubsub_target.value, "data", null) != null ? base64encode(pubsub_target.value.data) : null
    }
  }
}
