resource "google_service_account" "api" {
  account_id   = "sa-api"
  display_name = "AllGo API Service Account (${var.environment})"
  description  = "Least-privilege service account for AllGo core REST API"
  project      = var.project_id
}

resource "google_service_account" "dispatch" {
  account_id   = "sa-dispatch"
  display_name = "AllGo Dispatch Service Account (${var.environment})"
  description  = "Least-privilege service account for AllGo real-time dispatch service"
  project      = var.project_id
}

resource "google_service_account" "webhooks" {
  account_id   = "sa-webhooks"
  display_name = "AllGo Webhooks Service Account (${var.environment})"
  description  = "Least-privilege service account for AllGo inbound webhooks service"
  project      = var.project_id
}

resource "google_service_account" "worker" {
  account_id   = "sa-worker"
  display_name = "AllGo Background Worker Service Account (${var.environment})"
  description  = "Least-privilege service account for PostGIS batch location flusher and background tasks"
  project      = var.project_id
}

# IAM Role bindings for sa-api
locals {
  api_roles = [
    "roles/cloudsql.client",
    "roles/secretmanager.secretAccessor",
    "roles/pubsub.publisher",
    "roles/cloudtasks.enqueuer",
  ]

  dispatch_roles = [
    "roles/cloudsql.client",
    "roles/secretmanager.secretAccessor",
    "roles/pubsub.publisher",
    "roles/pubsub.subscriber",
  ]

  webhooks_roles = [
    "roles/secretmanager.secretAccessor",
    "roles/pubsub.publisher",
  ]

  worker_roles = [
    "roles/cloudsql.client",
    "roles/secretmanager.secretAccessor",
    "roles/pubsub.subscriber",
  ]
}

resource "google_project_iam_member" "api_roles" {
  for_each = toset(locals.api_roles)

  project = var.project_id
  role    = each.value
  member  = "serviceAccount:${google_service_account.api.email}"
}

resource "google_project_iam_member" "dispatch_roles" {
  for_each = toset(locals.dispatch_roles)

  project = var.project_id
  role    = each.value
  member  = "serviceAccount:${google_service_account.dispatch.email}"
}

resource "google_project_iam_member" "webhooks_roles" {
  for_each = toset(locals.webhooks_roles)

  project = var.project_id
  role    = each.value
  member  = "serviceAccount:${google_service_account.webhooks.email}"
}

resource "google_project_iam_member" "worker_roles" {
  for_each = toset(locals.worker_roles)

  project = var.project_id
  role    = each.value
  member  = "serviceAccount:${google_service_account.worker.email}"
}
