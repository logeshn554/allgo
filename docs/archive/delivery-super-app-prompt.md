You are a principal software architect and senior full-stack engineer. Build a production-grade, multi-vertical on-demand delivery and mobility platform for India (think Swiggy + Instamart + Rapido + Porter + driver-hire services in ONE ecosystem), deployed entirely on Google Cloud. Everything must be REAL: real auth, real database, real payments, real maps, real-time tracking, real push notifications. No mock data, no hardcoded users, no fake OTPs, no placeholder screens. Every feature must work end to end against real services configured through environment variables and Secret Manager.

## 1. PRODUCT SCOPE

Verticals (all inside the customer app, each with its own flow):
1. Food delivery (restaurants)
2. Cloud kitchens (delivery-only brands, multiple brands per kitchen)
3. Groceries / quick commerce (inventory-based, dark stores and local shops)
4. Parcel / courier delivery (any item, point-to-point, intra-city)
5. Ride booking (bike taxi, auto, cab, like Rapido/Ola)
6. Hire a driver (hourly, daily, outstation, for the customer's own vehicle)
7. Home-made products (home chefs, pickles, snacks, crafts; verified home sellers)

Apps to build (Android + iOS from one Flutter codebase):
- Customer App
- Delivery/Driver Partner App (one partner account can serve delivery, rides, and driver-hire depending on approved vehicle/skill types)
- Merchant App (restaurants, cloud kitchens, grocery stores, home sellers)
- Admin Web Panel (required for partner/merchant approvals, pricing, disputes, payouts)
- Backend API + real-time services

Super-app rule (core product behavior, applies to every section below):
- ONE customer app with ONE home screen, ONE cart and checkout, ONE wallet and ONE active-orders tray across all verticals. A customer can add food AND grocery (and home-made items) in the same checkout, pay once, and track everything together.
- ONE partner app with ONE online switch. After a partner finishes a delivery, they stay online and can continue straight into the next job of any approved type (another delivery, a parcel, a ride, a driver-hire booking), Rapido-style.
- Sections 5A and 5B define exactly how this must work. Treat them as mandatory architecture, not optional features.

## 2. TECH STACK (Google Cloud native, use exactly this)

Mobile (Android + iOS from one codebase each):
- Flutter (null-safe), clean architecture, Riverpod, shared design-system package
- Three flavors/entry points: customer, partner, merchant
- Firebase SDKs: Auth, Cloud Messaging, Crashlytics, Analytics, Remote Config, App Check, Performance Monitoring
- google_maps_flutter, geolocator, flutter_background_service (partner app)

Backend:
- NestJS (TypeScript) containerized on Cloud Run (REST + WebSocket via Socket.IO, session affinity enabled, min instances > 0 for the API and dispatch services)
- Split into services: api, dispatch, notifications, payments-webhooks, worker
- Cloud Pub/Sub for events between services, Cloud Tasks for delayed jobs (merchant accept timeout, partner offer timeout), Cloud Scheduler for cron (payouts, reconciliation)

Databases (each has one clear job):
- Cloud SQL for PostgreSQL + PostGIS = source of truth (users, orders, payments, ledger, KYC, catalogs). Private IP, HA enabled, automated backups, point-in-time recovery, read replica for reporting.
- Firestore = real-time layer only (live order status, partner live location for customer tracking, ride/trip state). Backend is the only writer; clients read through security rules. Never the source of truth for money.
- Memorystore for Redis = hot data (partner GEO index, dispatch queues, distributed locks, rate limits, OTP attempt counters)
- BigQuery = analytics and reporting (streamed via Pub/Sub)

Auth:
- Firebase Authentication phone/OTP ONLY (no email, no password). Backend verifies the Firebase ID token, then creates/links its own user record and role claims. Firebase App Check + Play Integrity (Android) / App Attest (iOS) + reCAPTCHA to block fake OTP abuse. Per-phone and per-IP limits and budget alerts.

Maps and location:
- Google Maps Platform: Maps SDK, Places, Routes API, Distance Matrix, Geocoding. API keys restricted by app signature and by service. Cache routes; never recalculate on every GPS ping.

Storage and files:
- Cloud Storage buckets (private) with signed URLs for KYC documents, proof-of-delivery photos, invoices. Cloud KMS encryption for KYC docs. Cloud CDN for public menu images.

Notifications:
- Firebase Cloud Messaging for push (high-priority channel for merchant new-order alerts and partner job offers). SMS for critical alerts via a provider with India DLT registration.

Payments (Google Cloud has no India payment gateway, so use):
- Razorpay (UPI including Google Pay, cards, wallets, COD, refunds, webhooks) + RazorpayX for payouts. Webhooks land on a dedicated Cloud Run service with signature verification and idempotency.

Admin panel:
- Next.js on Cloud Run (or Firebase Hosting), protected by Identity-Aware Proxy or Firebase Auth with admin custom claims, plus audit logging

Infra, security, DevOps:
- Terraform for all GCP resources (VPC, Cloud SQL, Memorystore, Cloud Run, Pub/Sub, buckets, IAM)
- Separate GCP projects/environments: dev, staging, prod
- Cloud Build + Artifact Registry for CI/CD, with automated tests before deploy and gradual (canary) Cloud Run rollouts
- Secret Manager for all keys, least-privilege service accounts, Cloud Armor (WAF + rate limiting) in front of a Global External Load Balancer, Cloud Run reaching Cloud SQL and Redis through Direct VPC egress with private service access
- Cloud Logging, Cloud Monitoring dashboards and alerts, Error Reporting, Cloud Trace, uptime checks
- Budget alerts and quota monitoring on Maps, SMS, and Firebase Auth

Region: asia-south1 (Mumbai) as primary, for low latency and data residency in India.

## 3. AUTHENTICATION (phone number only)

- Phone number OTP only via Firebase Authentication. No email/password anywhere. Login and signup are one flow: enter phone, receive OTP, verify. A new number auto-creates an account.
- Backend exchanges the verified Firebase ID token for its own session: access token (15 min) + rotating refresh token (stored hashed, device-bound).
- Abuse controls: App Check enforced, per-phone and per-IP rate limiting, resend cooldown (30s), max verification attempts, automatic temporary lockout, alerts on SMS-pumping patterns.
- One phone can hold multiple roles (customer + partner + merchant), but each app runs its own role-specific onboarding.
- Device management: store device ID and FCM token, support logout from all devices, detect and block suspicious abuse.
- Handle: app reinstall, SIM change, session expiry, token refresh, and forced logout when an account is blocked.

## 4. ONBOARDING FLOWS (detail every state)

Customer:
- Phone OTP, then name, optional email, location permission, saved addresses (home/work/other) with map pin and a Google Places-validated address, first-order offers (referral and promo codes with abuse checks).

Delivery/Driver Partner:
- Phone OTP, then profile, city, service types (delivery bike, rides, cab, hire-driver), document upload (Aadhaar/ID, driving licence, vehicle RC, insurance, profile selfie, bank/UPI for payouts), live selfie verification, background-check hook.
- Status machine: REGISTERED -> DOCS_SUBMITTED -> UNDER_REVIEW -> APPROVED / REJECTED (with reasons, re-upload allowed) -> ACTIVE / SUSPENDED / BLOCKED.
- Optional configurable training/quiz and kit/uniform step.
- Online/offline toggle, shift and zone selection, live background location tracking (foreground service on Android, proper background modes on iOS), battery-efficient.
- Earnings: per-order breakdown, incentives, weekly payouts, cash-in-hand (COD) reconciliation, wallet ledger.

Merchant:
- Phone OTP, then business type (restaurant / cloud kitchen / grocery / home seller), business details, GST/FSSAI (mandatory for food and home-made food, format-validated and admin-verified), PAN, bank details (penny-drop verification), store photos, address and geo-pin, operating hours, packaging/prep-time settings.
- Status machine: REGISTERED -> SUBMITTED -> UNDER_REVIEW -> APPROVED / REJECTED -> LIVE / PAUSED / SUSPENDED.
- Menu/catalog management: categories, items, variants, add-ons, images, veg/non-veg, stock, price, tax, availability schedules, CSV bulk upload, real-time stock toggle.
- Order management: incoming-order alert (loud sound + full-screen notification), accept/reject with reasons within a timeout (auto-reject on timeout), set prep time, mark ready, partner handover with OTP/QR, order history, settlements/invoices, ratings, store open/close, complaints.
- Multi-outlet and staff accounts (owner/manager roles, each identified by phone number).

## 5. CORE ORDER LIFECYCLE (build as explicit state machines)

Food / grocery / home-made:
CART -> PLACED -> PAYMENT_CONFIRMED -> MERCHANT_ACCEPTED -> PREPARING/PACKING -> READY -> PARTNER_ASSIGNED -> PARTNER_AT_STORE -> PICKED_UP -> OUT_FOR_DELIVERY -> ARRIVED -> DELIVERED (OTP verified) | CANCELLED | REFUNDED | FAILED.

Parcel:
BOOKED -> PARTNER_ASSIGNED -> AT_PICKUP -> PICKED_UP (photo + OTP) -> IN_TRANSIT -> AT_DROP -> DELIVERED (OTP + photo). Support size/weight categories, fragile flag, prohibited-items list, optional declared value, COD at drop.

Rides:
REQUESTED -> SEARCHING -> DRIVER_ASSIGNED -> DRIVER_ARRIVING -> ARRIVED -> TRIP_STARTED (OTP) -> COMPLETED -> PAID. Support fare estimate, surge, waiting charge, cancellation fee, SOS button, share-trip link.

Hire a driver:
Booking by hours/days/outstation, scheduled bookings, partner acceptance, start/end OTP, overtime billing.

Every transition must be validated server-side, logged in an immutable event table, idempotent, and pushed live to all parties.

## 5A. UNIFIED CART, CHECKOUT AND MULTI-VERTICAL ORDERS

Customer experience:
- Home screen with vertical tabs (Food, Grocery, Home-made, Parcel, Ride, Hire driver) and one persistent cart icon.
- The cart holds items from multiple merchants and multiple verticals at once (food + grocery + home-made), grouped by merchant, for example "From Restaurant A" and "From Dark Store B". Rides, parcels and driver-hire are booked services, not cart items, but they use the same payment methods, wallet, address book and order history.
- One checkout screen: delivery address, per-merchant ETA, per-merchant bill, combined fee summary, coupon, tip, wallet usage, payment method (UPI, card, wallet, COD), and a single Pay button producing one payment.
- One active-orders tray on the home screen showing every live order, ride and booking, each tappable into live tracking.

Backend model (build this from Phase 3, even while only food is live, so other verticals plug in without rewriting checkout):
- checkout_session (cart snapshot plus a server-calculated price quote locked for a short window, e.g. 10 minutes) -> order_group (parent: one payment, one customer-facing order number) -> sub_orders (one per merchant/outlet, each with its own state machine from section 5, its own merchant, its own delivery leg, its own invoice and GST, its own settlement) -> delivery_legs (one per physical delivery).
- At checkout the server re-validates serviceability, merchant open status, item availability, prices and fees. If anything changed, show the customer the change before charging. Pay requests carry an idempotency key so a double tap or retry never charges twice.
- Soft inventory reservation per sub_order during the payment window, released on payment failure or expiry.

Fulfilment strategy per order_group (configurable rules, decided by dispatch):
1. Default: a separate partner per sub_order, for speed.
2. Batching: one partner picks up from both stores when the stores are within a configurable distance and the added delay stays under a configurable limit.
3. If ETAs differ a lot, offer the customer a choice, "Deliver together" or "Fastest".
Show the customer how many deliveries are coming. Use one handover OTP per delivery leg.

Pricing and tax in a mixed order:
- Delivery fee is calculated per delivery leg. If legs are batched under one partner, never charge two full fees. Show one clear total.
- Platform fee is charged once per order_group. Packaging fee is charged per merchant.
- GST is calculated per sub_order by category (restaurant food, grocery, home-made) and by the merchant's GST status. Issue one invoice per sub_order, plus a combined summary for the customer.
- Coupons can be scoped to a vertical, a merchant, or the whole group. Validate on the server and store discount_allocations so every discount is split across sub_orders for correct refunds.

Payment:
- One Razorpay order for the group total. On a verified success webhook, all sub_orders move to PAYMENT_CONFIRMED atomically.
- COD can be allowed or blocked per group by rules (amount, customer history, vertical). Cash is collected per delivery leg.
- If the app is killed during payment, the app recovers by querying payment status when reopened.

Partial outcomes (must be handled explicitly):
- A merchant rejects or times out on one sub_order: auto-cancel only that sub_order, refund its items, its share of fees and tax to the original method or wallet, notify the customer, and offer to reorder from another merchant. The other sub_orders continue.
- Item out of stock: substitute or remove with customer approval and a timeout, then adjust the bill and refund the difference.
- Customer cancels one sub_order: allowed before the merchant accepts, and by cancellation policy afterwards. Record refund_allocations for every partial refund so the ledger always balances per sub_order.
- One sub_order is delayed or fails: the others are still delivered and settled independently.
- Other cases to cover: price change between cart and payment, address out of range for one merchant (block at cart with a clear message), different prep times, scheduled delivery, same item added twice, wallet plus UPI split payment, payment success but order creation failure (auto-refund or auto-recover).

Tracking, support, ratings:
- One order_group screen with a card per sub_order and a live map per delivery leg. Group push notifications so the customer is not spammed.
- Rate each merchant and each partner separately. A support ticket can reference the group or a single sub_order.

Settlement:
- Each merchant is paid only for its own sub_order, minus commission. Partner earnings are per delivery leg. The platform keeps its platform fee. Ledger entries must balance per sub_order.

## 5B. PARTNER CONTINUITY (RAPIDO-STYLE MULTI-JOB)

Assumption to confirm with me during brainstorming: the intent is that a delivery partner who finishes a food or grocery drop can immediately continue earning with ride, parcel or driver-hire jobs from the same app. The customer app also cross-sells rides and parcels after a delivery.

Partner behavior:
- One partner account, one online switch, one job feed that is job-type agnostic: delivery_leg, parcel, ride and hire booking all appear as partner_jobs.
- After a drop is completed, the partner stays ONLINE. Dispatch immediately considers them for the next nearest job of any approved type, based on their chosen mode: "Deliveries only", "Rides only" or "All jobs". The partner can switch modes at any time without logging out, and the app UI changes to the right flow (photo proof and handover OTP for deliveries, passenger trip flow with SOS for rides).
- Eligibility checks before every offer: service types approved for that vehicle (for example a bike can take bike-taxi, delivery and parcel; a cab driver can take rides and hire), documents valid, rating threshold, no blocking active job, cash-in-hand limit not exceeded, maximum continuous working hours and mandatory rest.
- Safety rules for current jobs: a partner carrying a food order never receives a ride request. A partner mid-ride never receives a delivery. Previewing the next job is allowed only after the last pickup is complete. Delivery batching follows the rules in section 5A.
- Next-job matching: after a drop at location X, prefer jobs starting near X to reduce empty travel. Show the partner "next job nearby" with distance and estimated earnings, plus a demand heat-map.
- Unified earnings: one dashboard across job types, per-job breakdown, incentives (peak hours, streaks, multi-vertical bonus), one wallet and ledger, weekly payout. Cash from COD is reconciled separately.
- Ride mode requires passenger-safety features (SOS, trip sharing, masked calling, verified driver identity) and a vehicle approved for passengers (insurance and permit documents).

Customer-side continuation:
- After a delivery completes, show next suggestions: rate the order, reorder, book a ride, send a parcel. Controlled by Remote Config and never intrusive.
- A customer with an active food order can still book a ride or parcel at the same time. Rides and parcels need no cart.

## 6. DISPATCH AND REAL-TIME

- Partner location every 3-5 seconds goes to Memorystore Redis GEO for dispatch, is mirrored to Firestore for customer live tracking, and is persisted in batches to PostGIS for history and disputes.
- Dispatch engine: find nearby online and eligible partners (vehicle type, rating, current load, road-distance ETA), send offers sequentially or in small batches with an accept timeout (e.g., 20s) enforced by Cloud Tasks, re-dispatch on decline/timeout, batch multiple orders for one partner when routes align, fairness and idle-time weighting, zone-based supply/demand handling.
- Live tracking for customers (map with moving partner, ETA recalculation).
- WebSocket reconnect handling, missed-event recovery via a sync endpoint, offline-safe queues on mobile.
- Handle real edge cases: merchant rejects, partner cancels after pickup, customer unreachable, wrong address, payment failure after order, partial refunds, item out of stock (substitute/remove with customer approval), partner accident/emergency, GPS-spoofing detection.

## 7. PRICING, PAYMENTS, WALLET

- Configurable per city and vertical: base fare, per-km, per-minute, surge multipliers, delivery-fee slabs, platform fee, packaging fee, GST, tips, coupons.
- The server calculates all amounts. The client never sends prices.
- For mixed carts, fee allocation, GST, coupon splitting and partial refunds follow section 5A exactly.
- Razorpay order creation, signature verification, idempotent webhook handling, refunds, COD flow with partner cash collection and deposit tracking.
- Double-entry ledger for customer wallet, partner earnings, merchant settlements, and platform commission. Scheduled payout jobs (Cloud Scheduler) with failure handling and reconciliation reports.

## 8. SUPPORTING SYSTEMS

Ratings and reviews (both directions), in-app support tickets, masked calling/chat between customer and partner (Exotel/Twilio proxy numbers), notification preferences, multi-language (English, Tamil, Hindi, extensible), referral system, promo engine, fraud checks, GST invoices (PDF), analytics events to BigQuery, feature flags (Remote Config), serviceability by city/zone polygons.

Admin panel: KYC review queues, approve/reject with reasons, live map of partners and orders, pricing and zone configuration, merchant management, order intervention (reassign/cancel/refund), payouts, support, reports, role-based admin access, audit logs.

## 9. DATA MODEL

Design a full normalized PostgreSQL schema: users, roles, devices, addresses, partners, partner_documents, vehicles, merchants, outlets, catalogs, items, inventory, carts, checkout_sessions, order_groups, sub_orders, order_items, order_events, delivery_legs, inventory_reservations, discount_allocations, refund_allocations, partner_modes, partner_jobs, deliveries, rides, bookings, payments, refunds, ledger_entries, payouts, ratings, coupons, zones, tickets, notifications, audit_logs. Provide migrations, indexes (including PostGIS GiST), and an ER diagram. Define the Firestore collections and security rules separately and keep them strictly read-only for clients.

## 10. SECURITY AND COMPLIANCE

Role-based access control on every endpoint, input validation, rate limiting, encrypted sensitive documents (Cloud KMS), PII minimization, secrets only through Secret Manager, HTTPS-only, certificate pinning on mobile, OWASP checklist, India DPDP Act-aware consent and data-deletion flow, FSSAI/GST handling, terms and privacy policy screens, Play Store / App Store policy compliance (background-location justification, permission rationale screens).

## 11. NON-FUNCTIONAL REQUIREMENTS

Horizontally scalable stateless API, graceful degradation on poor networks, crash-free and offline-aware mobile UX, accessibility, unit + integration + e2e tests (critical flows: OTP login, order placement, payment webhook, dispatch, refund), and a load-test plan for the dispatch and tracking path.

## 12. HOW TO WORK (strict rules)

Work in phases. After each phase, deliver complete runnable code, run the tests, and summarize what I should verify before continuing. Do not skip ahead.

- Phase 0: architecture doc, repo structure, GCP project structure, Terraform skeleton, IAM plan, schema, API spec (OpenAPI), environment variable and Secret Manager list, and a monthly cost estimate for dev and prod
- Phase 1: auth (Firebase phone OTP), users/roles, device sessions, base apps with design system
- Phase 2: partner and merchant onboarding with KYC and admin approvals
- Phase 3: catalog and food ordering end to end with payments, built on the checkout_session -> order_group -> sub_order -> delivery_leg model from section 5A from day one
- Phase 4: dispatch with a job-type-agnostic partner job feed, live tracking, delivery completion, partner earnings
- Phase 5: grocery, cloud kitchen, home-made verticals, plus mixed-cart checkout (food + grocery in one payment) with batching rules, partial cancellation and per-sub-order refunds
- Phase 6: parcel delivery
- Phase 7: rides and hire-a-driver, plus partner mode switching and next-job matching after drops (section 5B)
- Phase 8: wallet, payouts, settlements, support, ratings, promos
- Phase 9: hardening, load tests, store release checklist

Rules:
- Never use dummy data in app code. Seed data is allowed only in a separate, clearly labeled dev seed script.
- If a real third-party credential is required, list it exactly (name, where to get it, which env var or secret). Stub nothing silently, and build each integration behind an interface so it works the moment the key is added.
- State every assumption and ask me before any decision that affects cost, legal compliance, or architecture.
- Provide full file contents, folder structure, and run instructions every time. No "rest of the code here" shortcuts.

Start with Phase 0 now.
