variable "project_id" {
  description = "GCP Project ID"
  type        = string
}

variable "environment" {
  description = "Deployment environment (dev or prod)"
  type        = string
}

variable "region" {
  description = "GCP region (primary: asia-south1 Mumbai)"
  type        = string
  default     = "asia-south1"
}

variable "subnet_cidr" {
  description = "Primary subnetwork CIDR range for compute and services"
  type        = string
  default     = "10.0.0.0/20"
}

variable "connector_cidr" {
  description = "CIDR range (/28) for Serverless VPC Access connector"
  type        = string
  default     = "10.8.0.0/28"
}
