output "network_id" {
  description = "ID of the VPC network"
  value       = google_compute_network.vpc.id
}

output "network_name" {
  description = "Name of the VPC network"
  value       = google_compute_network.vpc.name
}

output "network_self_link" {
  description = "Self-link of the VPC network"
  value       = google_compute_network.vpc.self_link
}

output "subnet_id" {
  description = "ID of the primary subnetwork"
  value       = google_compute_subnetwork.subnet.id
}

output "subnet_name" {
  description = "Name of the primary subnetwork"
  value       = google_compute_subnetwork.subnet.name
}

output "vpc_connector_id" {
  description = "ID of the Serverless VPC Access connector"
  value       = google_vpc_access_connector.connector.id
}

output "google_service_networking_connection_id" {
  description = "ID of the Service Networking connection"
  value       = google_service_networking_connection.private_vpc_connection.id
}

