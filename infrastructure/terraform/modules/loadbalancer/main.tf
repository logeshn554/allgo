resource "google_compute_global_address" "lb_ip" {
  name        = "${var.environment}-global-ip"
  project     = var.project_id
  description = "Global IP address for external HTTP(S) load balancer in ${var.environment}"
}

resource "google_compute_backend_service" "api_backend" {
  name                  = "${var.environment}-api-backend"
  project               = var.project_id
  protocol              = "HTTP"
  port_name             = "http"
  timeout_sec           = 30
  enable_cdn            = false
  security_policy       = var.security_policy_id
  load_balancing_scheme = "EXTERNAL_MANAGED"
}

resource "google_compute_url_map" "default" {
  name            = "${var.environment}-url-map"
  project         = var.project_id
  default_service = google_compute_backend_service.api_backend.id
}

resource "google_compute_target_http_proxy" "default" {
  name    = "${var.environment}-http-proxy"
  project = var.project_id
  url_map = google_compute_url_map.default.id
}

resource "google_compute_global_forwarding_rule" "http" {
  name                  = "${var.environment}-http-rule"
  project               = var.project_id
  target                = google_compute_target_http_proxy.default.id
  port_range            = "80"
  ip_address            = google_compute_global_address.lb_ip.address
  load_balancing_scheme = "EXTERNAL_MANAGED"
}
