output "job_ids" {
  description = "IDs of the created Cloud Scheduler jobs"
  value       = { for k, v in google_cloud_scheduler_job.jobs : k => v.id }
}
