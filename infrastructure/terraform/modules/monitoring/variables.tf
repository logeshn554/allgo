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

variable "billing_account_id" {
  description = "GCP Billing Account ID for budget alerts"
  type        = string
}

variable "budget_amount_inr" {
  description = "Monthly budget ceiling in INR"
  type        = number
}

variable "pubsub_budget_topic" {
  description = "PubSub topic ID for budget notifications (optional)"
  type        = string
  default     = null
}

variable "enable_overnight_shutdown" {
  description = "Whether to enable Cloud Scheduler overnight compute shutdown (dev=true, prod=false)"
  type        = bool
  default     = false
}

variable "maps_quota_threshold_requests" {
  description = "Monthly requests threshold for Google Maps API quota alert"
  type        = number
  default     = 50000
}

variable "sms_quota_threshold_requests" {
  description = "Monthly requests threshold for Firebase Auth SMS quota alert"
  type        = number
  default     = 10000
}
