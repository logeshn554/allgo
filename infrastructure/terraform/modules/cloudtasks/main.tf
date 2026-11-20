resource "google_cloud_tasks_queue" "queues" {
  for_each = var.queues
  name     = "${var.environment}-${each.key}"
  location = var.region
  project  = var.project_id

  rate_limits {
    max_dispatches_per_second = lookup(each.value, "max_dispatches_per_second", 50)
    max_concurrent_dispatches = lookup(each.value, "max_concurrent_dispatches", 100)
  }

  retry_config {
    max_attempts       = lookup(each.value, "max_attempts", 5)
    max_retry_duration = lookup(each.value, "max_retry_duration", "3600s")
    min_backoff        = lookup(each.value, "min_backoff", "1s")
    max_backoff        = lookup(each.value, "max_backoff", "30s")
    max_doublings      = 4
  }
}
