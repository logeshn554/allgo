variable "project_id" {
  description = "GCP Project ID for production"
  type        = string
  default     = "allgo-prod"
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
  description = "Monthly budget ceiling in INR for production environment"
  type        = number
  default     = 100000
}

variable "db_password" {
  description = "Database administrator password for production environment (must be securely sourced)"
  type        = string
  sensitive   = true
}

