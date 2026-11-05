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
  description = "VPC network ID for private service access"
  type        = string
}

variable "tier" {
  description = "BASIC (dev single instance) or STANDARD_HA (prod high availability)"
  type        = string
  default     = "BASIC"
}

variable "memory_size_gb" {
  description = "Redis memory capacity in GiB (e.g. 1 for dev, 5 for prod)"
  type        = number
  default     = 1
}

