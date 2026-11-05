resource "google_redis_instance" "cache" {
  name               = "${var.environment}-allgo-redis"
  tier               = var.tier
  memory_size_gb     = var.memory_size_gb
  region             = var.region
  project            = var.project_id
  authorized_network = var.network_id
  connect_mode       = "PRIVATE_SERVICE_ACCESS"
  redis_version      = "REDIS_7_0"
  display_name       = "AllGo Redis Cache (${var.environment})"

  auth_enabled            = true
  transit_encryption_mode = "SERVER_AUTHENTICATION"
}

