output "service_urls" {
  description = "Map of Cloud Run direct service URLs"
  value = {
    for k, v in google_cloud_run_v2_service.service : k => v.uri
  }
}

output "service_names" {
  description = "Map of Cloud Run service names"
  value = {
    for k, v in google_cloud_run_v2_service.service : k => v.name
  }
}

