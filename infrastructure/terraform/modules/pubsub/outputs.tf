output "topic_ids" {
  description = "IDs of the created Pub/Sub topics"
  value       = { for k, v in google_pubsub_topic.topics : k => v.id }
}

output "subscription_ids" {
  description = "IDs of the created Pub/Sub subscriptions"
  value       = { for k, v in google_pubsub_subscription.subscriptions : k => v.id }
}
