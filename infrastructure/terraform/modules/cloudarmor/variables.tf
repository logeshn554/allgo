variable "project_id" {
  description = "GCP Project ID"
  type        = string
}

variable "environment" {
  description = "Deployment environment (dev, staging, prod)"
  type        = string
}

variable "rate_limit_count" {
  description = "Allowed requests per minute per IP before 429 throttling"
  type        = number
  default     = 1000
}
