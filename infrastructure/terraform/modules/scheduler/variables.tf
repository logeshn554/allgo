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

variable "jobs" {
  description = "Map of Cloud Scheduler jobs"
  type = map(object({
    description      = optional(string)
    schedule         = string
    time_zone        = optional(string, "Asia/Kolkata")
    attempt_deadline = optional(string, "320s")
    http_target = optional(object({
      uri                   = string
      http_method           = optional(string, "POST")
      body                  = optional(string)
      service_account_email = optional(string)
    }))
    pubsub_target = optional(object({
      topic_name = string
      data       = optional(string)
    }))
  }))
  default = {}
}
