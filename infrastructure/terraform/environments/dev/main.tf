terraform {
  required_version = ">= 1.5.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.5"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region # Primary region: asia-south1 (Mumbai)
}

# 1. VPC & Networking
module "vpc" {
  source      = "../../modules/vpc"
  project_id  = var.project_id
  environment = "dev"
  region      = var.region
  subnet_cidr = "10.0.0.0/20"
}

# 2. Least-Privilege IAM Service Accounts
module "iam" {
  source      = "../../modules/iam"
  project_id  = var.project_id
  environment = "dev"
}

# 3. Cloud SQL PostgreSQL 15 (Dev: Single-Zone, PITR disabled, db-custom-2-4096)
module "cloudsql" {
  source                        = "../../modules/cloudsql"
  project_id                    = var.project_id
  environment                   = "dev"
  region                        = var.region
  network_id                    = module.vpc.network_id
  network_connection_dependency = module.vpc.google_service_networking_connection_id
  tier                          = "db-custom-2-4096"
  availability_type             = "ZONAL"
  pitr_enabled                  = false
  deletion_protection           = false
  database_name                 = "allgo_dev"
  db_user                       = "allgo_admin"
  db_password                   = var.db_password
}

# 4. Memorystore Redis 7.0 (Dev: Basic Tier, 1 GB)
module "redis" {
  source         = "../../modules/redis"
  project_id     = var.project_id
  environment    = "dev"
  region         = var.region
  network_id     = module.vpc.network_id
  tier           = "BASIC"
  memory_size_gb = 1
}

# 5. Cloud Run Consolidated Services (Dev: min_instances = 0 scale-to-zero)
module "cloudrun" {
  source           = "../../modules/cloudrun"
  project_id       = var.project_id
  environment      = "dev"
  region           = var.region
  network_id       = module.vpc.network_id
  subnet_id        = module.vpc.subnet_id
  vpc_connector_id = module.vpc.vpc_connector_id

  services = {
    api = {
      min_instances   = 0
      max_instances   = 5
      cpu             = "1000m"
      memory          = "512Mi"
      container_image = "gcr.io/${var.project_id}/api:latest"
    }
    dispatch = {
      min_instances   = 0
      max_instances   = 5
      cpu             = "1000m"
      memory          = "512Mi"
      container_image = "gcr.io/${var.project_id}/dispatch:latest"
    }
    webhooks = {
      min_instances   = 0
      max_instances   = 3
      cpu             = "1000m"
      memory          = "256Mi"
      container_image = "gcr.io/${var.project_id}/webhooks:latest"
    }
  }

  service_accounts = {
    api      = module.iam.sa_api_email
    dispatch = module.iam.sa_dispatch_email
    webhooks = module.iam.sa_webhooks_email
  }
}

# 6. Monitoring, Budget Alerts & Overnight Shutdown
module "monitoring" {
  source                    = "../../modules/monitoring"
  project_id                = var.project_id
  environment               = "dev"
  region                    = var.region
  billing_account_id        = var.billing_account_id
  budget_amount_inr         = var.budget_amount_inr
  enable_overnight_shutdown = true
}
