resource "google_compute_security_policy" "cloud_armor_policy" {
  name        = "${var.environment}-security-policy"
  description = "Cloud Armor security policy with rate limiting and WAF for ${var.environment}"
  project     = var.project_id

  # Default rule: allow all legitimate traffic
  rule {
    action   = "allow"
    priority = 2147483647
    match {
      versioned_expr = "SRC_IPS_V1"
      config {
        src_ip_ranges = ["*"]
      }
    }
    description = "Default allow rule"
  }

  # Rate limiting rule: throttle abusive clients
  rule {
    action   = "rate_based_ban"
    priority = 1000
    match {
      versioned_expr = "SRC_IPS_V1"
      config {
        src_ip_ranges = ["*"]
      }
    }
    rate_limit_options {
      conform_action = "allow"
      exceed_action  = "deny(429)"
      enforce_on_key = "IP"
      rate_limit_threshold {
        count        = var.rate_limit_count
        interval_sec = 60
      }
      ban_duration_sec = 300
    }
    description = "Throttle abusive requests exceeding threshold"
  }
}
