resource "google_bigquery_dataset" "analytics" {
  dataset_id                  = "${replace(var.environment, "-", "_")}_allgo_analytics"
  friendly_name               = "AllGo Analytics (${var.environment})"
  description                 = "Analytics events and reporting dataset for ${var.environment}"
  location                    = var.region
  project                     = var.project_id
  default_table_expiration_ms = var.default_table_expiration_ms

  labels = {
    environment = var.environment
    managed_by  = "terraform"
  }
}

resource "google_bigquery_table" "analytics_events" {
  dataset_id          = google_bigquery_dataset.analytics.dataset_id
  table_id            = "raw_events"
  project             = var.project_id
  deletion_protection = var.deletion_protection

  time_partitioning {
    type  = "DAY"
    field = "event_time"
  }

  clustering = ["event_name", "user_id"]

  schema = jsonencode([
    { name = "event_id", type = "STRING", mode = "REQUIRED" },
    { name = "event_name", type = "STRING", mode = "REQUIRED" },
    { name = "event_time", type = "TIMESTAMP", mode = "REQUIRED" },
    { name = "user_id", type = "STRING", mode = "NULLABLE" },
    { name = "session_id", type = "STRING", mode = "NULLABLE" },
    { name = "payload", type = "JSON", mode = "NULLABLE" },
    { name = "received_at", type = "TIMESTAMP", mode = "REQUIRED" }
  ])
}
