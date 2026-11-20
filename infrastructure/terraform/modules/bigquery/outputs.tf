output "dataset_id" {
  description = "BigQuery dataset ID"
  value       = google_bigquery_dataset.analytics.dataset_id
}

output "raw_events_table_id" {
  description = "BigQuery raw events table ID"
  value       = google_bigquery_table.analytics_events.table_id
}
