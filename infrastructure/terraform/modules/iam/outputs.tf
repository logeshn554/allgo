output "service_account_emails" {
  description = "Map of all service account emails"
  value = {
    api      = google_service_account.api.email
    dispatch = google_service_account.dispatch.email
    webhooks = google_service_account.webhooks.email
    worker   = google_service_account.worker.email
  }
}

output "sa_api_email" {
  description = "Email of sa-api service account"
  value       = google_service_account.api.email
}

output "sa_dispatch_email" {
  description = "Email of sa-dispatch service account"
  value       = google_service_account.dispatch.email
}

output "sa_webhooks_email" {
  description = "Email of sa-webhooks service account"
  value       = google_service_account.webhooks.email
}

output "sa_worker_email" {
  description = "Email of sa-worker service account"
  value       = google_service_account.worker.email
}

