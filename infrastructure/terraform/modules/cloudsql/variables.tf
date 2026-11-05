variable "project_id" {
  description = "GCP Project ID"
  type        = string
}

variable "environment" {
  description = "Deployment environment (dev or prod)"
  type        = string
}

variable "region" {
  description = "GCP region (asia-south1)"
  type        = string
  default     = "asia-south1"
}

variable "network_id" {
  description = "VPC network ID for private IP attachment"
  type        = string
}

variable "network_connection_dependency" {
  description = "Explicit dependency on the VPC private service connection"
  type        = any
  default     = null
}

variable "tier" {
  description = "Cloud SQL machine tier (e.g. db-custom-2-4096 for dev, db-custom-4-16384 for prod)"
  type        = string
  default     = "db-custom-2-4096"
}

variable "availability_type" {
  description = "ZONAL (single-zone dev) or REGIONAL (high-availability prod)"
  type        = string
  default     = "ZONAL"
}

variable "pitr_enabled" {
  description = "Whether Point-In-Time Recovery (PITR) is enabled"
  type        = bool
  default     = false
}

variable "pitr_retention_days" {
  description = "Days of transaction logs retained for Point-in-Time Recovery"
  type        = number
  default     = 7
}

variable "disk_size_gb" {
  description = "Storage disk size in GB"
  type        = number
  default     = 20
}

variable "database_name" {
  description = "Name of the initial PostgreSQL database"
  type        = string
  default     = "allgo"
}

variable "db_user" {
  description = "PostgreSQL application user"
  type        = string
  default     = "allgo_admin"
}

variable "db_password" {
  description = "Password for PostgreSQL application user"
  type        = string
  sensitive   = true
}

variable "deletion_protection" {
  description = "Enable deletion protection on the Cloud SQL instance"
  type        = bool
  default     = false
}
