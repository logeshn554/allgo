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

variable "queues" {
  description = "Map of Cloud Tasks queues"
  type = map(object({
    max_dispatches_per_second = optional(number, 50)
    max_concurrent_dispatches = optional(number, 100)
    max_attempts              = optional(number, 5)
    max_retry_duration        = optional(string, "3600s")
    min_backoff               = optional(string, "1s")
    max_backoff               = optional(string, "30s")
  }))
  default = {
    merchant-timeouts = {
      max_dispatches_per_second = 100
      max_concurrent_dispatches = 200
    }
    partner-offer-timeouts = {
      max_dispatches_per_second = 200
      max_concurrent_dispatches = 500
    }
    scheduled-bookings = {
      max_dispatches_per_second = 50
      max_concurrent_dispatches = 100
    }
  }
}
