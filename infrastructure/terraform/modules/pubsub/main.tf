resource "google_pubsub_topic" "topics" {
  for_each = toset(var.topics)
  name     = "${var.environment}-${each.key}"
  project  = var.project_id

  labels = {
    environment = var.environment
    managed_by  = "terraform"
  }
}

resource "google_pubsub_subscription" "subscriptions" {
  for_each = var.subscriptions
  name     = "${var.environment}-${each.key}"
  topic    = google_pubsub_topic.topics[each.value.topic].id
  project  = var.project_id

  ack_deadline_seconds       = lookup(each.value, "ack_deadline_seconds", 20)
  retain_acked_messages      = false
  message_retention_duration = lookup(each.value, "message_retention_duration", "604800s")

  dynamic "dead_letter_policy" {
    for_each = lookup(each.value, "dead_letter_topic", null) != null ? [1] : []
    content {
      dead_letter_topic     = google_pubsub_topic.topics[each.value.dead_letter_topic].id
      max_delivery_attempts = lookup(each.value, "max_delivery_attempts", 5)
    }
  }

  dynamic "push_config" {
    for_each = lookup(each.value, "push_endpoint", null) != null ? [1] : []
    content {
      push_endpoint = each.value.push_endpoint

      dynamic "oidc_token" {
        for_each = lookup(each.value, "service_account_email", null) != null ? [1] : []
        content {
          service_account_email = each.value.service_account_email
        }
      }
    }
  }
}
