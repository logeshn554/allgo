output "instance_name" {
  description = "Name of the Cloud SQL instance"
  value       = google_sql_database_instance.instance.name
}

output "instance_connection_name" {
  description = "Connection name for Cloud SQL instance (project:region:instance)"
  value       = google_sql_database_instance.instance.connection_name
}

output "private_ip_address" {
  description = "Private IP address of the Cloud SQL instance"
  value       = google_sql_database_instance.instance.private_ip_address
}

output "database_name" {
  description = "Name of the provisioned database"
  value       = google_sql_database.database.name
}

output "db_user" {
  description = "Username for application access"
  value       = google_sql_user.user.name
}
