variable "project_id" {
  description = "GCP Project ID for development"
  type        = string
  default     = "allgo-dev"
}

variable "region" {
  description = "GCP region (asia-south1 Mumbai)"
  type        = string
  default     = "asia-south1"
}

variable "billing_account_id" {
  description = "GCP Billing Account ID"
  type        = string
  default     = "000000-000000-000000"
}

variable "budget_amount_inr" {
  description = "Monthly budget ceiling in INR for development environment"
  type        = number
  default     = 10000
}

variable "db_password" {
  description = "Database administrator password for development environment"
  type        = string
  sensitive   = true
  default     = "dev-insecure-db-password-replace-via-secretmanager"
}

