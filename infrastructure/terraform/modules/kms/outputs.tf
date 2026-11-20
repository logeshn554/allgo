output "keyring_id" {
  description = "KMS Keyring ID"
  value       = google_kms_key_ring.keyring.id
}

output "key_ids" {
  description = "KMS Crypto Key IDs"
  value       = { for k, v in google_kms_crypto_key.keys : k => v.id }
}
