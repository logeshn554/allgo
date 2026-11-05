# AllGo IAM & Service Accounts Security Architecture

## 1. Executive Summary & Principle of Least Privilege

AllGo enforces strict Principle of Least Privilege (PoLP) across all cloud components. No service account is granted broad administrative roles (e.g. `roles/editor` or `roles/owner`). Each Cloud Run microservice executes under a dedicated identity with access restricted to its required dependencies.

---

## 2. Service Account Inventory & Role Bindings

| Service Account | Microservice Scope | Required GCP IAM Roles | Resource Restrictions |
| :--- | :--- | :--- | :--- |
| `sa-api@allgo-*.iam.gserviceaccount.com` | `api` (Core REST Gateway) | • `roles/cloudsql.client`<br>• `roles/secretmanager.secretAccessor`<br>• `roles/pubsub.publisher` | Secret access restricted to database password, JWT pepper, Firebase credentials, and Razorpay API keys. |
| `sa-dispatch@allgo-*.iam.gserviceaccount.com` | `dispatch` (Socket.IO & Matching Engine) | • `roles/cloudsql.client`<br>• `roles/secretmanager.secretAccessor`<br>• `roles/pubsub.publisher`<br>• `roles/pubsub.subscriber` | Access to Redis connection secrets, Maps API key, and dispatch event topics. |
| `sa-webhooks@allgo-*.iam.gserviceaccount.com` | `webhooks` (Razorpay Ingest) | • `roles/cloudsql.client`<br>• `roles/secretmanager.secretAccessor`<br>• `roles/pubsub.publisher` | Access to Razorpay webhook secret and pubsub order event topic. |
| `sa-admin@allgo-*.iam.gserviceaccount.com` | `admin` (Back-office Operations) | • `roles/cloudsql.client`<br>• `roles/secretmanager.secretAccessor` | Access to admin DB connection and operational audit secrets. |
| `sa-cicd@allgo-*.iam.gserviceaccount.com` | Automated GitHub Actions CI/CD | • `roles/run.admin`<br>• `roles/iam.serviceAccountUser`<br>• `roles/artifactregistry.writer` | Used via Workload Identity Federation (Zero downloadable keys). |

---

## 3. Secret Manager Resource-Level Bindings

Rather than granting `roles/secretmanager.secretAccessor` at the project level, IAM policy bindings are attached directly to individual secret resources in Google Secret Manager:

```hcl
# Example Resource-Level Secret Access Binding (Terraform)
resource "google_secret_manager_secret_iam_member" "api_razorpay_key" {
  project   = var.project_id
  secret_id = "razorpay_key_secret"
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.api_sa.email}"
}
```

---

## 4. Keyless Deployment via Workload Identity Federation

To eliminate the critical security risk of long-lived service account JSON keys stored in developer environments or CI/CD pipelines:
1. GitHub Actions authenticates directly to Google Cloud using short-lived OpenID Connect (OIDC) tokens.
2. A GCP Workload Identity Pool validates the GitHub repository token (`repo:owner/allgo:ref:refs/heads/main`).
3. Google Cloud issues a short-lived (1-hour) federated access token for deployment execution.
4. Downloadable service account keys (`.json`) are disabled at the organization policy level (`constraints/iam.disableServiceAccountKeyCreation`).
