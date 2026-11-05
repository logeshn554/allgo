output "host" {
  description = "IP address of the Redis instance"
  value       = google_redis_instance.cache.host
}

output "port" {
  description = "Port number of the Redis instance"
  value       = google_redis_instance.cache.port
}

output "instance_id" {
  description = "ID of the Redis instance"
  value       = google_redis_instance.cache.id
}

output "auth_string" {
  description = "AUTH string for Redis authentication"
  value       = google_redis_instance.cache.auth_string
  sensitive   = true
}

