resource "random_id" "db_suffix" {
  byte_length = 4
}

resource "google_sql_database_instance" "instance" {
  name                = "${var.environment}-allgo-pg-${random_id.db_suffix.hex}"
  database_version    = "POSTGRES_15"
  region              = var.region
  project             = var.project_id
  deletion_protection = var.deletion_protection

  depends_on = [var.network_connection_dependency]

  settings {
    tier              = var.tier
    availability_type = var.availability_type
    disk_type         = "PD_SSD"
    disk_size         = var.disk_size_gb
    disk_autoresize   = true

    ip_configuration {
      ipv4_enabled                                  = false
      private_network                               = var.network_id
      enable_private_path_for_google_cloud_services = true
    }

    backup_configuration {
      enabled                        = true
      start_time                     = "22:00"
      point_in_time_recovery_enabled = var.pitr_enabled
      transaction_log_retention_days = var.pitr_retention_days
    }

    database_flags {
      name  = "cloudsql.enable_pg_bigm"
      value = "on"
    }

    database_flags {
      name  = "max_connections"
      value = "100"
    }
  }
}

resource "google_sql_database" "database" {
  name     = var.database_name
  instance = google_sql_database_instance.instance.name
  project  = var.project_id
}

resource "google_sql_user" "user" {
  name     = var.db_user
  instance = google_sql_database_instance.instance.name
  password = var.db_password
  project  = var.project_id
}
