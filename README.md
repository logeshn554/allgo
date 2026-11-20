# AllGo Super App Monorepo

AllGo is a multi-vertical on-demand super app platform serving India, uniting Food, Grocery, Courier Parcels, Passenger Mobility (Rides), and Designated Driver Hire into a single, modular microservice & mobile ecosystem.

---

## Architecture Overview

```text
                                 [ Flutter Mobile Apps / Next.js Admin ]
                                                   │
                                                   ▼
                                       [ Render / Cloud Run Gateway ]
                                                   │
                     ┌─────────────────────────────┼─────────────────────────────┐
                     ▼                             ▼                             ▼
              [ Core REST API ]           [ Dispatch Engine ]          [ Webhook Service ]
            apps/api (NestJS)          apps/dispatch (Node.js)       apps/webhooks (Express)
                     │                             │                             │
                     ├──────────────┬──────────────┴──────────────┬──────────────┤
                     ▼              ▼                             ▼              ▼
              [ PostgreSQL 16 ]  [ Redis 7.0 ]             [ Google Cloud ] [ Razorpay ]
                PostGIS Spatial    GEO / Caching / PubSub     Functions/RTDB   Payments
```

---

## Workspace Structure

- `apps/api`: NestJS REST microservice & WebSocket gateway (`/v1/*`, `/delivery`, `/tracking`).
- `apps/admin`: Next.js 16 administrator console for live ops, compliance, finance, and system status.
- `apps/dispatch`: Standalone spatial candidate matching and dispatch offer lifecycle engine.
- `apps/webhooks`: Secure inbound payment and refund webhook processor with replay protection.
- `apps/customer_mobile`: Flutter customer super app for food, grocery, mobility, and parcels.
- `apps/partner_mobile`: Flutter delivery partner & driver app with background telemetry tracking.
- `apps/merchant_mobile`: Flutter merchant dashboard for live orders, catalog stock, and operations.
- `packages/common`: Shared TypeScript schemas, contracts, enums, and Zod validators.
- `packages/mobile_shared`: Shared Flutter Riverpod providers, API client, models, and offline queue.
- `functions`: Firebase Cloud Functions for phone OTP authentication, session tokens, and RTDB mirrors.

---

## Local Development & Setup

### Prerequisites
- Node.js 20+ and npm 10+
- Flutter 3.16+
- Docker and Docker Compose (PostgreSQL 16 with PostGIS & Redis 7.0)

### Quick Start
```bash
# 1. Install Monorepo Dependencies
npm install

# 2. Start PostgreSQL 16 & Redis 7.0
docker compose up -d

# 3. Build Shared Packages & Core API
npm run build

# 4. Start Core API Service (Port 3000)
npm run start:dev --workspace=@allgo/api

# 5. Start Admin Web Console (Port 3003)
npm run dev --workspace=@allgo/admin
```

---

## Environment Variables

### Core API (`apps/api/.env`)
- `PORT`: REST HTTP port (default `3000` locally, `10000` on Render)
- `NODE_ENV`: Runtime mode (`development`, `staging`, `production`)
- `DATABASE_URL`: PostgreSQL connection string (`postgresql://postgres:postgres@localhost:5432/allgo_db`)
- `REDIS_URL`: Redis URI (`redis://localhost:6379`)
- `JWT_SECRET`: 32+ character HMAC secret for session authentication tokens
- `OTP_PEPPER`: Secret pepper for HMAC-SHA256 OTP hash verification
- `GOOGLE_MAPS_SERVER_API_KEY`: Google Routes & Distance Matrix API key
- `RAZORPAY_KEY_ID`: Razorpay payment gateway API key
- `RAZORPAY_KEY_SECRET`: Razorpay secret for payment captures

### Webhooks Service (`apps/webhooks/.env`)
- `PORT`: Service port (default `3002`)
- `RAZORPAY_WEBHOOK_SECRET`: Webhook signing secret verified via constant-time HMAC
- `REDIS_URL`: Redis instance for distributed idempotency store

### Admin Web Console (`apps/admin/.env`)
- `NEXT_PUBLIC_API_URL`: Base URL for Core API (`https://allgo-api.onrender.com` or `http://localhost:3000`)

---

## Testing & Quality Assurance

Run the comprehensive test suite across all subsystems:

```bash
# Run all unit, adversarial, stress, and integration tests
npm test

# Run contracts & workspace package validations
npm run test:workspace

# Build and verify all packages
npm run build
npm run build --workspace=@allgo/admin
npm run build --workspace=@allgo/dispatch
npm run build --workspace=@allgo/webhooks
```

---

## Production Deployment

- **Render (`render.yaml`)**: Infrastructure as code blueprint managing `allgo-api`, `allgo-admin`, `allgo-webhooks`, and `allgo-dispatch`.
- **Cloud Functions (`functions/`)**: Serverless Asia-South1 deployment for Firebase Auth bridging.
- **Fail-Fast Security**: Missing or weak secrets (`JWT_SECRET < 32 chars`, missing `RAZORPAY_WEBHOOK_SECRET`) trigger immediate process exit in production.
