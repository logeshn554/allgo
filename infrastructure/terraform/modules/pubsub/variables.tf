variable "project_id" {
  description = "GCP Project ID"
  type        = string
}

variable "environment" {
  description = "Deployment environment (dev, staging, prod)"
  type        = string
}

variable "topics" {
  description = "List of Pub/Sub topic base names"
  type        = list(string)
  default     = ["allgo-events", "dispatch-events", "analytics-events", "dead-letter"]
}

variable "subscriptions" {
  description = "Map of subscription configurations"
  type = map(object({
    topic                 = string
    ack_deadline_seconds  = optional(number, 20)
    push_endpoint         = optional(string)
    service_account_email = optional(string)
    dead_letter_topic     = optional(string)
  }))
  default = {}
}
