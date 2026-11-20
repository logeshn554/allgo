variable "project_id" {
  description = "GCP Project ID for staging"
  type        = string
  default     = "allgo-staging"
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
  description = "Monthly budget ceiling in INR for staging environment"
  type        = number
  default     = 25000
}

variable "db_password" {
  description = "Database administrator password for staging environment"
  type        = string
  sensitive   = true
  default     = "staging-db-password-replace-via-secretmanager"
}
