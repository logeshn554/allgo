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
  count       = var.enable_prod ? 1 : 0
  source      = "../../modules/vpc"
  project_id  = var.project_id
  environment = "prod"
  region      = var.region
  subnet_cidr = "10.10.0.0/20"
}

# 2. Least-Privilege IAM Service Accounts
module "iam" {
  count       = var.enable_prod ? 1 : 0
  source      = "../../modules/iam"
  project_id  = var.project_id
  environment = "prod"
}

# 3. Cloud SQL PostgreSQL 15 (Prod: Regional HA, PITR enabled, db-custom-4-16384)
module "cloudsql" {
  count                         = var.enable_prod ? 1 : 0
  source                        = "../../modules/cloudsql"
  depends_on                    = [module.vpc]
  project_id                    = var.project_id
  environment                   = "prod"
  region                        = var.region
  network_id                    = module.vpc[0].network_id
  network_connection_dependency = module.vpc[0].google_service_networking_connection_id
  tier                          = "db-custom-4-16384"
  availability_type             = "REGIONAL"
  pitr_enabled                  = true
  pitr_retention_days           = 7
  deletion_protection           = true
  disk_size_gb                  = 100
  database_name                 = "allgo_prod"
  db_user                       = "allgo_admin"
  db_password                   = var.db_password
}

# 4. Memorystore Redis 7.0 (Prod: Standard Tier HA)
module "redis" {
  count          = var.enable_prod ? 1 : 0
  source         = "../../modules/redis"
  project_id     = var.project_id
  environment    = "prod"
  region         = var.region
  network_id     = module.vpc[0].network_id
  tier           = "STANDARD_HA"
  memory_size_gb = 5
}

# 5. Cloud Run Consolidated Services (Prod: min_instances = 1 for api and dispatch, 0 for webhooks)
module "cloudrun" {
  count            = var.enable_prod ? 1 : 0
  source           = "../../modules/cloudrun"
  project_id       = var.project_id
  environment      = "prod"
  region           = var.region
  network_id       = module.vpc[0].network_id
  subnet_id        = module.vpc[0].subnet_id
  vpc_connector_id = module.vpc[0].vpc_connector_id

  services = {
    api = {
      min_instances   = 1
      max_instances   = 50
      cpu             = "2000m"
      memory          = "2Gi"
      container_image = "gcr.io/${var.project_id}/api:latest"
    }
    dispatch = {
      min_instances   = 1
      max_instances   = 50
      cpu             = "2000m"
      memory          = "2Gi"
      container_image = "gcr.io/${var.project_id}/dispatch:latest"
    }
    webhooks = {
      min_instances   = 0
      max_instances   = 20
      cpu             = "1000m"
      memory          = "1Gi"
      container_image = "gcr.io/${var.project_id}/webhooks:latest"
    }
  }

  service_accounts = {
    api      = module.iam[0].sa_api_email
    dispatch = module.iam[0].sa_dispatch_email
    webhooks = module.iam[0].sa_webhooks_email
  }
}

# 6. Monitoring, Budget Alerts (50%, 80%, 100%) & Quotas (24x7 active)
module "monitoring" {
  count                     = var.enable_prod ? 1 : 0
  source                    = "../../modules/monitoring"
  project_id                = var.project_id
  environment               = "prod"
  region                    = var.region
  billing_account_id        = var.billing_account_id
  budget_amount_inr         = var.budget_amount_inr
  enable_overnight_shutdown = false
}
