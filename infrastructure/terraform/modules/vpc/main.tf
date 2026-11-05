resource "google_compute_network" "vpc" {
  name                    = "${var.environment}-allgo-vpc"
  auto_create_subnetworks = false
  description             = "VPC network for AllGo ${var.environment} environment"
  project                 = var.project_id
}

resource "google_compute_subnetwork" "subnet" {
  name                     = "${var.environment}-allgo-subnet"
  ip_cidr_range            = var.subnet_cidr
  region                   = var.region
  network                  = google_compute_network.vpc.id
  private_ip_google_access = true
  project                  = var.project_id
}

# Reserved internal IP address range for private service access (Cloud SQL, Memorystore)
resource "google_compute_global_address" "private_ip_alloc" {
  name          = "${var.environment}-allgo-private-ip"
  purpose       = "VPC_PEERING"
  address_type  = "INTERNAL"
  prefix_length = 16
  network       = google_compute_network.vpc.id
  project       = var.project_id
}

# Private Service Access connection for Google Services (Cloud SQL, Memorystore Redis)
resource "google_service_networking_connection" "private_vpc_connection" {
  network                 = google_compute_network.vpc.id
  service                 = "servicenetworking.googleapis.com"
  reserved_peering_ranges = [google_compute_global_address.private_ip_alloc.name]
}

# Serverless VPC Access connector for Cloud Run Direct / VPC connectivity
resource "google_vpc_access_connector" "connector" {
  name          = "${var.environment}-allgo-con"
  region        = var.region
  ip_cidr_range = var.connector_cidr
  network       = google_compute_network.vpc.name
  project       = var.project_id
  min_instances = 2
  max_instances = 3
}
