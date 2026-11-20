resource "google_secret_manager_secret" "secrets" {
  for_each  = toset(var.secrets)
  secret_id = "${var.environment}_${each.key}"
  project   = var.project_id

  replication {
    auto {}
  }

  labels = {
    environment = var.environment
    managed_by  = "terraform"
  }
}

resource "google_secret_manager_secret_iam_member" "accessors" {
  for_each  = var.secret_accessors
  secret_id = google_secret_manager_secret.secrets[each.value.secret].secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = each.value.member
  project   = var.project_id
}
