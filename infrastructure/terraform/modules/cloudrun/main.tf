resource "google_cloud_run_v2_service" "service" {
  for_each = var.services

  name     = "${var.environment}-allgo-${each.key}"
  location = var.region
  project  = var.project_id
  ingress  = "INGRESS_TRAFFIC_ALL"

  template {
    service_account = var.service_accounts[each.key]

    scaling {
      min_instance_count = each.value.min_instances
      max_instance_count = each.value.max_instances
    }

    vpc_access {
      connector = var.vpc_connector_id
      egress    = "ALL_TRAFFIC"
    }

    containers {
      image = each.value.container_image

      resources {
        limits = {
          cpu    = each.value.cpu
          memory = each.value.memory
        }
      }

      env {
        name  = "NODE_ENV"
        value = var.environment
      }

      env {
        name  = "SERVICE_NAME"
        value = each.key
      }

      env {
        name  = "PORT"
        value = "8080"
      }
    }
  }
}

resource "google_cloud_run_v2_service_iam_member" "public_access" {
  for_each = var.services

  project  = var.project_id
  location = var.region
  name     = google_cloud_run_v2_service.service[each.key].name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

