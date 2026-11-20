output "public_assets_bucket_name" {
  description = "Name of the public assets storage bucket"
  value       = google_storage_bucket.public_assets.name
}

output "private_documents_bucket_name" {
  description = "Name of the private documents storage bucket"
  value       = google_storage_bucket.private_documents.name
}
