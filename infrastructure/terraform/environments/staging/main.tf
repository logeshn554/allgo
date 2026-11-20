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
  region  = var.region
}

# 1. VPC & Networking
module "vpc" {
  source      = "../../modules/vpc"
  project_id  = var.project_id
  environment = "staging"
  region      = var.region
  subnet_cidr = "10.5.0.0/20"
}

# 2. Least-Privilege IAM Service Accounts
module "iam" {
  source      = "../../modules/iam"
  project_id  = var.project_id
  environment = "staging"
}

# 3. Cloud SQL PostgreSQL 15 (Staging: Single-Zone, PITR enabled)
module "cloudsql" {
  source                        = "../../modules/cloudsql"
  depends_on                    = [module.vpc]
  project_id                    = var.project_id
  environment                   = "staging"
  region                        = var.region
  network_id                    = module.vpc.network_id
  network_connection_dependency = module.vpc.google_service_networking_connection_id
  tier                          = "db-custom-2-4096"
  availability_type             = "ZONAL"
  pitr_enabled                  = true
  deletion_protection           = false
  database_name                 = "allgo_staging"
  db_user                       = "allgo_admin"
  db_password                   = var.db_password
}

# 4. Memorystore Redis 7.0 (Staging: Basic Tier, 2 GB)
module "redis" {
  source         = "../../modules/redis"
  project_id     = var.project_id
  environment    = "staging"
  region         = var.region
  network_id     = module.vpc.network_id
  tier           = "BASIC"
  memory_size_gb = 2
}

# 5. Cloud Run Consolidated Services
module "cloudrun" {
  source           = "../../modules/cloudrun"
  project_id       = var.project_id
  environment      = "staging"
  region           = var.region
  network_id       = module.vpc.network_id
  subnet_id        = module.vpc.subnet_id
  vpc_connector_id = module.vpc.vpc_connector_id

  services = {
    api = {
      min_instances   = 0
      max_instances   = 10
      cpu             = "1000m"
      memory          = "1Gi"
      container_image = "gcr.io/${var.project_id}/api:latest"
    }
    dispatch = {
      min_instances   = 0
      max_instances   = 10
      cpu             = "1000m"
      memory          = "1Gi"
      container_image = "gcr.io/${var.project_id}/dispatch:latest"
    }
    webhooks = {
      min_instances   = 0
      max_instances   = 5
      cpu             = "1000m"
      memory          = "512Mi"
      container_image = "gcr.io/${var.project_id}/webhooks:latest"
    }
  }

  service_accounts = {
    api      = module.iam.sa_api_email
    dispatch = module.iam.sa_dispatch_email
    webhooks = module.iam.sa_webhooks_email
  }
}

# 6. Monitoring, Budget Alerts & Overnight Scheduler
module "monitoring" {
  source                    = "../../modules/monitoring"
  project_id                = var.project_id
  environment               = "staging"
  region                    = var.region
  billing_account_id        = var.billing_account_id
  budget_amount_inr         = var.budget_amount_inr
  enable_overnight_shutdown = true
}

# 7. Cloud Plumbing Modules (Phase G)
module "pubsub" {
  source      = "../../modules/pubsub"
  project_id  = var.project_id
  environment = "staging"
}

module "cloudtasks" {
  source      = "../../modules/cloudtasks"
  project_id  = var.project_id
  environment = "staging"
  region      = var.region
}

module "scheduler" {
  source      = "../../modules/scheduler"
  project_id  = var.project_id
  environment = "staging"
  region      = var.region
}

module "bigquery" {
  source              = "../../modules/bigquery"
  project_id          = var.project_id
  environment         = "staging"
  region              = var.region
  deletion_protection = false
}

module "secretmanager" {
  source      = "../../modules/secretmanager"
  project_id  = var.project_id
  environment = "staging"
}

module "cloudarmor" {
  source      = "../../modules/cloudarmor"
  project_id  = var.project_id
  environment = "staging"
}

module "loadbalancer" {
  source             = "../../modules/loadbalancer"
  project_id         = var.project_id
  environment        = "staging"
  security_policy_id = module.cloudarmor.policy_id
}

module "storage" {
  source        = "../../modules/storage"
  project_id    = var.project_id
  environment   = "staging"
  region        = var.region
  force_destroy = true
}

module "kms" {
  source      = "../../modules/kms"
  project_id  = var.project_id
  environment = "staging"
  region      = var.region
}
