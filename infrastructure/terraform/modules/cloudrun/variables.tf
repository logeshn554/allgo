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
  description = "VPC network ID"
  type        = string
}

variable "subnet_id" {
  description = "VPC subnetwork ID for Direct VPC Egress"
  type        = string
}

variable "vpc_connector_id" {
  description = "Serverless VPC Access connector ID"
  type        = string
}

variable "services" {
  description = "Consolidated map of Cloud Run services configuration (api, dispatch, webhooks)"
  type = map(object({
    min_instances   = number
    max_instances   = number
    cpu             = string
    memory          = string
    container_image = string
  }))
}

variable "service_accounts" {
  description = "Map of service account emails keyed by service name (api, dispatch, webhooks)"
  type        = map(string)
}

