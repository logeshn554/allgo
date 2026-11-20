output "policy_id" {
  description = "Cloud Armor Security Policy ID"
  value       = google_compute_security_policy.cloud_armor_policy.id
}

output "policy_name" {
  description = "Cloud Armor Security Policy Name"
  value       = google_compute_security_policy.cloud_armor_policy.name
}
