output "secret_ids" {
  description = "IDs of the created secrets"
  value       = { for k, v in google_secret_manager_secret.secrets : k => v.id }
}
