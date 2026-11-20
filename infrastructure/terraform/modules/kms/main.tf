resource "google_kms_key_ring" "keyring" {
  name     = "${var.environment}-allgo-keyring"
  location = var.region
  project  = var.project_id
}

resource "google_kms_crypto_key" "keys" {
  for_each        = toset(var.key_names)
  name            = each.key
  key_ring        = google_kms_key_ring.keyring.id
  rotation_period = lookup(var.rotation_periods, each.key, "7776000s") # 90 days

  lifecycle {
    prevent_destroy = true
  }
}
