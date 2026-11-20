variable "project_id" {
  description = "GCP Project ID"
  type        = string
}

variable "environment" {
  description = "Deployment environment (dev, staging, prod)"
  type        = string
}

variable "region" {
  description = "GCP Region"
  type        = string
  default     = "asia-south1"
}

variable "key_names" {
  description = "List of KMS key names to manage"
  type        = list(string)
  default     = ["pii-envelope-key", "kyc-document-key", "database-backup-key"]
}

variable "rotation_periods" {
  description = "Map of key rotation periods"
  type        = map(string)
  default     = {}
}
