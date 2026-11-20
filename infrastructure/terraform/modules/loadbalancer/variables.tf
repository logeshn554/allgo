variable "project_id" {
  description = "GCP Project ID"
  type        = string
}

variable "environment" {
  description = "Deployment environment (dev, staging, prod)"
  type        = string
}

variable "security_policy_id" {
  description = "Cloud Armor security policy ID (optional)"
  type        = string
  default     = null
}
