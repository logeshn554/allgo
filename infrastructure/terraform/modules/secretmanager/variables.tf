variable "project_id" {
  description = "GCP Project ID"
  type        = string
}

variable "environment" {
  description = "Deployment environment (dev, staging, prod)"
  type        = string
}

variable "secrets" {
  description = "List of secret IDs to manage"
  type        = list(string)
  default = [
    "DATABASE_URL",
    "REDIS_URL",
    "JWT_SECRET",
    "OTP_PEPPER",
    "RAZORPAY_KEY_SECRET",
    "RAZORPAY_WEBHOOK_SECRET",
    "GOOGLE_MAPS_API_KEY",
    "FIREBASE_SERVICE_ACCOUNT_KEY"
  ]
}

variable "secret_accessors" {
  description = "Map of secret accessor IAM bindings"
  type = map(object({
    secret = string
    member = string
  }))
  default = {}
}
