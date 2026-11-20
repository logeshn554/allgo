variable "project_id" {
  description = "GCP Project ID"
  type        = string
}

variable "environment" {
  description = "Deployment environment (dev, staging, prod)"
  type        = string
}

variable "region" {
  description = "BigQuery Region"
  type        = string
  default     = "asia-south1"
}

variable "default_table_expiration_ms" {
  description = "Default table expiration in milliseconds (null for none)"
  type        = number
  default     = null
}

variable "deletion_protection" {
  description = "Whether to protect the BigQuery table from accidental deletion"
  type        = bool
  default     = false
}
