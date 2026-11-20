output "queue_ids" {
  description = "IDs of the created Cloud Tasks queues"
  value       = { for k, v in google_cloud_tasks_queue.queues : k => v.id }
}
