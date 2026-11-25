# AllGo Super-App Missing Features & Production Parity Master Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close all missing screens, stubbed flows, and vertical-specific UX gaps across `customer_mobile`, `merchant_mobile`, `partner_mobile`, `customer-web`, `merchant-web`, and `admin` so AllGo operates as a unified, real-world multi-vertical delivery and mobility super app (**AllGo Food**, **AllGo Quick Mart**, **AllGo Rides**, **AllGo Parcel**, **AllGo Chauffeur**).

**Architecture:** All domain contracts, state transitions, and RBAC rules stay centralized in `packages/common` (`@allgo/common`) and `services/api`, shared web primitives/clients live in `packages/ui` and `packages/api-client`, and shared Flutter models/API/realtime clients live in `packages/mobile_shared`. Role-specific UI stays strictly isolated per app (`apps/admin`, `apps/customer-web`, `apps/merchant-web`, `apps/customer_mobile`, `apps/merchant_mobile`, `apps/partner_mobile`).

**Tech Stack:** Next.js 16 (App Router, `@allgo/ui`, `@allgo/api-client`), NestJS + PostgreSQL/PostGIS + Redis + Socket.IO (`/delivery`), Flutter (`flutter_riverpod`, `go_router`, `google_maps_flutter`, `geolocator`), Node.js (`node --experimental-transform-types --test`), Biome, Turborepo.

**Spec / Source Audit:** Based on direct inspection of `apps/*`, `packages/*`, `services/api/src/*`, `docs/design-decisions.md`, and `docs/api/openapi.yaml`.

---

## Global Constraints

- **Zero Third-Party Brand Names:** Never use external/competitor brand names (`Swiggy`, `Blinkit`, `BlinkGrocery`, `Rapido`, `Porter`, `Zomato`, `Zepto`, `Uber`, `Ola`, `Dunzo`) anywhere in UI strings, mock data, comments, docs, identifiers, or filenames. Always use AllGo naming: **AllGo Food**, **AllGo Quick Mart** (Grocery), **AllGo Rides**, **AllGo Parcel**, **AllGo Chauffeur**.
- **Server-Authoritative State & Security:** Never verify OTPs, prices, permissions, or payment capture client-side. All mutations must go through REST endpoints protected by `JwtAuthGuard`, `RolesGuard`, and `OwnershipGuard`, using `Idempotency-Key` on checkout/bookings.
- **No Unwired Placeholders:** Every visible button, download action, or status trigger must execute a real API call or navigation action.
- **Role Isolation:** Web apps (`admin`, `customer-web`, `merchant-web`) must never import components or routes from each other; shared logic goes in `packages/*`.
- **Environment Verification Scope:** Local host has Node.js `v24.14.1` and `pnpm 11.25.0`; Flutter/Dart SDK is not installed in the current terminal environment, so web/Node tests run directly locally and Flutter analyzer/tests run in CI or once Flutter SDK is on `PATH`.

## Review Focus

- **Offline / Reconnect State Drift:** If a driver or customer loses connectivity during pickup, ride start, or out-of-stock substitution, reconnecting must replay/resync `syncMissedDeliveryEvents` or `GET /v1/orders/:id` without duplicating mutations.
- **Hardcoded Fallback Leakage:** Remove all hardcoded coordinates (`13.0827, 80.2707`), hardcoded OTPs (`'1234'`, `'5678'`), hardcoded metrics (`8`, `1420`), hardcoded wallet defaults (`250.0`), and dummy JPEG bytes so empty/ungranted states fail safely with explicit prompts instead of silently faking success.
- **Permission Denial Handling:** If GPS or Camera permission is denied in `partner_mobile` or `customer_mobile`, show a clear recovery prompt to open app settings rather than crashing or sending empty coordinates.
- **Substitution Financial Integrity:** When a merchant proposes an out-of-stock substitution or removal and the customer rejects or accepts a lower-priced item, the customer's wallet/refund delta and order total must reflect server-calculated amounts only.
- **Single-Merchant Cart vs Multi-Vertical Concurrency:** Switching between **AllGo Food** and **AllGo Quick Mart** stores must confirm replacing an existing store cart cleanly, while an active **AllGo Ride** and an active **AllGo Food** order can track concurrently in `UnifiedActiveBookingsTray`.

---

## Phase 1: Brand Sanitization & Partner App Core Blockers

### Task 1.1: Remove Third-Party Brand Names & Add Automated Brand Guardrail

**Files:**
- Modify: `apps/customer_mobile/lib/src/components/customer_home_tab.dart`
- Modify: `apps/customer_mobile/lib/src/components/parcel_spec_and_address_cards.dart`
- Modify: `apps/customer_mobile/lib/src/screens/parcel_send_screen.dart`
- Create: `tests/workspace/brand-naming.spec.ts`

**Interfaces:**
- Produces: Automated Node test `tests/workspace/brand-naming.spec.ts` asserting zero banned third-party brand tokens across `apps/`, `packages/`, and `services/`.

- [ ] **Step 1: Write the failing brand-naming guardrail test**
  Create `tests/workspace/brand-naming.spec.ts` using `node:test` and `node:assert/strict` that scans `apps/`, `packages/`, and `services/` (excluding `node_modules`, `.next`, `dist`, `build`) for case-insensitive matches of banned competitor names and fails listing file + line number.
- [ ] **Step 2: Run test to verify it fails on the 4 existing matches**
  Run: `node --experimental-transform-types --test tests/workspace/brand-naming.spec.ts`
  Expected: FAIL listing `customer_home_tab.dart`, `parcel_spec_and_address_cards.dart`, and `parcel_send_screen.dart`.
- [ ] **Step 3: Replace third-party brand strings in `apps/customer_mobile`**
  - `customer_home_tab.dart:121-122`: replace `'BlinkGrocery Super Mart'` / `'BlinkGrocery'` with `'AllGo Fresh Mart'` / `'AllGo Quick Mart'`.
  - `customer_home_tab.dart:256`: replace `'Porter-style cargo'` with `'Instant local courier'`.
  - `parcel_spec_and_address_cards.dart:71`: replace comment `// Vehicle Category Selector (Porter-style)` with `// Vehicle Category Selector (AllGo Parcel)`.
  - `parcel_send_screen.dart:319`: replace `'Confirm & Dispatch Porter'` with `'Confirm & Dispatch Parcel'`.
- [ ] **Step 4: Run test to verify it passes**
  Run: `node --experimental-transform-types --test tests/workspace/brand-naming.spec.ts`
  Expected: PASS (0 matches).

### Task 1.2: Wire Real GPS Stream & Live Partner Metrics in `partner_mobile`

**Files:**
- Modify: `apps/partner_mobile/lib/src/pages/partner_home_page.dart:60-145`
- Modify: `apps/partner_mobile/lib/src/components/partner_duty_tab_content.dart:118`
- Modify: `packages/mobile_shared/lib/src/data/api/partner_delivery_api.dart`

**Interfaces:**
- Consumes: `Geolocator.getCurrentPosition`, `Geolocator.getPositionStream`, `client.getPartnerMetrics()` (or earnings summary endpoint).
- Produces: Live GPS coordinates on `partnerGoOnline`, `partnerHeartbeat`, and `partnerUpdateLocation`, plus real `completedJobsCount` and `totalEarnings` on `PartnerDutyTabContent`.

- [ ] **Step 1: Add GPS permission + live stream helper in `PartnerHomePage`**
  Check `Geolocator.checkPermission()` / `requestPermission()` before `partnerGoOnline`; cancel toggle with a clear rationale dialog if denied. Stream live `Position` (`latitude`, `longitude`, `heading`, `speed`) into state and send real coordinates in `partnerGoOnline`, `partnerHeartbeat`, and `partnerUpdateLocation` (4s throttle when online).
- [ ] **Step 2: Replace hardcoded `PartnerMetricsCard(completedJobsCount: 8, totalEarnings: 1420)`**
  Fetch today's completed jobs and earnings from `partner_delivery_api` / `finance_and_support_api` inside `_pollAll()` and pass dynamic values to `PartnerDutyTabContent`.
- [ ] **Step 3: Verify via static check & Flutter analyzer (when Flutter SDK available)**
  Run: `Select-String` check confirming `13.0827` and `80.2707` no longer appear in `partner_home_page.dart`, and `flutter analyze` in `apps/partner_mobile`.

### Task 1.3: Real OTP Input Modals & Real Camera Proof-of-Delivery in `partner_mobile`

**Files:**
- Create: `apps/partner_mobile/lib/src/components/otp_verification_dialog.dart`
- Modify: `apps/partner_mobile/lib/src/components/partner_duty_tab_content.dart:70-92`
- Modify: `apps/partner_mobile/lib/src/components/proof_of_delivery_modal.dart:37-80`
- Modify: `apps/partner_mobile/pubspec.yaml` (add `image_picker`)

**Interfaces:**
- Produces: `OtpVerificationDialog.show(context, title:, subtitle:, length:)` returning `Future<String?>`.

- [ ] **Step 1: Build reusable `OtpVerificationDialog`**
  Numeric 4-digit/6-digit OTP input modal using `AllGoOtpInput` from `mobile_shared` with loading/error feedback.
- [ ] **Step 2: Replace all hardcoded OTPs in `partner_duty_tab_content.dart`**
  - Line 74 (`verifyParcelPickupOtp`): prompt user with 4-digit Pickup OTP dialog instead of `'1234'`.
  - Line 77 (`verifyParcelDeliveryOtp`): prompt user with 4-digit Delivery OTP dialog instead of `'5678'`.
  - Line 88 (`driverStartTrip`): prompt user with 4-digit Passenger Start Ride OTP dialog instead of `'1234'`.
- [ ] **Step 3: Replace dummy JPEG bytes in `ProofOfDeliveryModal`**
  Use `ImagePicker().pickImage(source: ImageSource.camera, imageQuality: 75)` to read actual JPEG bytes from the device camera, show an image thumbnail preview, and upload via `createUploadTicket('PROOF_OF_DELIVERY', ...)` + `uploadDocumentBinary`.

### Task 1.4: External Turn-by-Turn Navigation, Call/Chat & Driver Incentives/COD Views (`partner_mobile`)

**Files:**
- Modify: `apps/partner_mobile/pubspec.yaml` (add `url_launcher`)
- Modify: `apps/partner_mobile/lib/src/components/active_delivery_card.dart`
- Modify: `apps/partner_mobile/lib/src/components/active_ride_card.dart`
- Modify: `apps/partner_mobile/lib/src/components/active_parcel_card.dart`
- Create: `apps/partner_mobile/lib/src/screens/partner_cod_ledger_screen.dart`

- [ ] **Step 1: Add "Navigate" + "Call" actions to active job cards**
  Add a `Navigate` button launching `https://www.google.com/maps/dir/?api=1&destination={lat},{lng}&travelmode=driving` (pickup coords before pickup, dropoff coords after pickup) via `url_launcher`, plus a masked call trigger.
- [ ] **Step 2: Add COD Cash-in-Hand & Daily Incentive Milestone view**
  Add a COD balance card + deposit/reconciliation status section in `PartnerEarningsScreen` / `partner_cod_ledger_screen.dart` backed by `finance_and_support_api`.

---

## Phase 2: Real-Time Socket.IO, Payments & Live Discovery (`mobile_shared` + `customer_mobile`)

### Task 2.1: Shared Socket.IO Real-Time Client (`mobile_shared`)

**Files:**
- Modify: `packages/mobile_shared/pubspec.yaml` (add `socket_io_client`)
- Create: `packages/mobile_shared/lib/src/realtime/realtime_socket_service.dart`
- Modify: `packages/mobile_shared/lib/allgo_mobile_shared.dart`
- Modify: `apps/customer_mobile/lib/src/screens/delivery_tracking_screen.dart`
- Modify: `apps/customer_mobile/lib/src/screens/ride_booking_screen.dart`
- Modify: `apps/partner_mobile/lib/src/pages/partner_home_page.dart`

**Interfaces:**
- Produces: `RealtimeSocketService` connecting to `${baseUrl}/delivery` with `auth: {'token': accessToken}`, exposing `subscribeJob(jobId)`, `onLocationUpdate`, `onStatusChanged`, `onOfferReceived`.

- [ ] **Step 1: Implement `RealtimeSocketService` in `packages/mobile_shared`**
  Connect to NestJS `DeliveryGateway` (`/delivery`), handle token refresh on `connect_error`, emit `job:subscribe`, and stream typed events.
- [ ] **Step 2: Wire Socket.IO into `DeliveryTrackingScreen`, `RideBookingScreen`, and `PartnerHomePage`**
  Use real-time socket events as the primary push stream; fall back to `syncMissedDeliveryEvents` / REST refresh on reconnect or socket disconnect (removing aggressive continuous polling loops when socket is connected).

### Task 2.2: Live Customer Discovery & Food / Quick Mart Separation (`customer_mobile`)

**Files:**
- Modify: `apps/customer_mobile/lib/src/components/customer_home_tab.dart`
- Create: `apps/customer_mobile/lib/src/screens/food_home_screen.dart`
- Create: `apps/customer_mobile/lib/src/screens/quick_mart_screen.dart`

- [ ] **Step 1: Remove `mockOutlets` from `CustomerHomeTab`**
  Pass live `state.outlets` from `CustomerHomeNotifier` into `CustomerHomeTab` with proper empty/loading/serviceability states (e.g., "Not yet deliverable in this area" using `checkServiceability`).
- [ ] **Step 2: Route "Food Delivery" and "Quick Grocery" cards to dedicated vertical views**
  - **AllGo Food** (`food_home_screen.dart`): restaurant cards, prep ETA, veg/non-veg filter, ratings, offers.
  - **AllGo Quick Mart** (`quick_mart_screen.dart`): 15-min express banner, category tile grid, aisle browser.

### Task 2.3: Real Payment Checkout Gateway & PDF Tax Invoice (`customer_mobile`)

**Files:**
- Modify: `apps/customer_mobile/pubspec.yaml` (add `razorpay_flutter` or `url_launcher` web checkout + `open_filex`/`path_provider`)
- Modify: `apps/customer_mobile/lib/src/components/checkout_payment_selector.dart`
- Modify: `apps/customer_mobile/lib/src/screens/checkout_screen.dart`
- Modify: `apps/customer_mobile/lib/src/screens/wallet_screen.dart`
- Modify: `apps/customer_mobile/lib/src/screens/order_detail_screen.dart:134-141`
- Modify: `packages/mobile_shared/lib/src/data/api/customer_ordering_api.dart`

- [ ] **Step 1: Wire real online payment initiation & verification**
  On `placeOrder` with `UPI` or `CARD`, obtain gateway order ID from backend, launch Razorpay/UPI checkout sheet, verify signature on backend before navigating to `OrderSuccessScreen`, and remove hardcoded `walletBalance = 250.0` default.
- [ ] **Step 2: Wire real GST Invoice PDF download**
  Replace the Snackbar stub in `OrderDetailScreen._downloadInvoice()` with fetching the invoice endpoint from `services/api` (`gst-invoice.service.ts`), saving to app temp directory, and opening/sharing the PDF.

---

## Phase 3: Express Rides Experience (`customer_mobile`)

### Task 3.1: Live Map, Places Autocomplete & Multi-Category Fare Comparison

**Files:**
- Modify: `apps/customer_mobile/lib/src/screens/ride_booking_screen.dart`
- Modify: `apps/customer_mobile/lib/src/components/ride_booking_form.dart`
- Modify: `packages/mobile_shared/lib/src/data/api/customer_mobility_api.dart`

- [ ] **Step 1: Embed `GoogleMap` on `RideBookingScreen`**
  Show pickup pin, destination pin, route polyline, and nearby vehicle markers; update camera bounds when pickup/drop change.
- [ ] **Step 2: Add inline Places Autocomplete & saved address shortcuts**
  Allow typing directly into Pickup and Destination fields (using `client.searchPlaces` + `geocodeAddress`) plus one-tap chips for `Home` / `Work` from `listCustomerAddresses()`.
- [ ] **Step 3: Parallel Fare & ETA Matrix for all ride tiers**
  Fetch fare estimates for `BIKE`, `AUTO`, `CAB_ECONOMY`, and `CAB_PREMIUM` in parallel so all 4 options display price + ETA side by side, plus payment method (`CASH` / `UPI` / `WALLET`) and promo code selector before booking.

### Task 3.2: Captain Details Card, Live Map Tracking, Trip Share & Post-Ride Rating

**Files:**
- Modify: `apps/customer_mobile/lib/src/components/active_ride_tracking_view.dart`
- Create: `apps/customer_mobile/lib/src/components/ride_completion_rating_sheet.dart`

- [ ] **Step 1: Upgrade `ActiveRideTrackingView` with live `GoogleMap` + Captain card**
  Render live driver location & route polyline on `GoogleMap`, plus a Captain card showing driver name, photo, star rating, vehicle model, registration plate, `Call`, `Chat`, `Share Ride`, and `SOS` actions alongside the Start Ride OTP badge.
- [ ] **Step 2: Add post-ride receipt & rating sheet**
  When `ride.status == 'COMPLETED'`, show total fare breakdown (base, distance, surge, discount) and a 5-star + tag rating sheet connected to `ratings` API.

---

## Phase 4: Food & Quick Grocery Storefronts + Out-of-Stock Substitutions

### Task 4.1: AllGo Food Enhancements (`customer_mobile`)

**Files:**
- Modify: `apps/customer_mobile/lib/src/components/customer_explore_tab.dart`
- Modify: `apps/customer_mobile/lib/src/components/product_customizer_modal.dart`
- Modify: `apps/customer_mobile/lib/src/screens/cart_screen.dart`
- Modify: `apps/customer_mobile/lib/src/screens/rate_review_screen.dart`

- [ ] **Step 1: Wire backend dish & store search (`discovery_api`)**
  Call backend search endpoints in `CustomerExploreTab` so queries match dishes as well as restaurant names, with Pure Veg, Rating 4+, Fast Delivery, and Vertical filter chips.
- [ ] **Step 2: Enforce Single-Select Radio vs Multi-Select Checkbox + Min/Max Rules in `ProductCustomizerModal`**
  Respect `minSelections` / `maxSelections` on each `OptionGroup` (radio buttons when `maxSelections == 1`, checkboxes when `> 1`, disable "Add to Cart" until required groups are satisfied).
- [ ] **Step 3: Add "Don't send cutlery" toggle in `CartScreen` & split Merchant/Partner rating in `RateReviewScreen`**.

### Task 4.2: AllGo Quick Mart (Grocery) Storefront (`customer_mobile`)

**Files:**
- Modify: `apps/customer_mobile/lib/src/screens/quick_mart_screen.dart`
- Modify: `apps/customer_mobile/lib/src/components/customer_product_card.dart`
- Modify: `apps/customer_mobile/lib/src/screens/cart_screen.dart`

- [ ] **Step 1: Build Aisle Sidebar + Product Grid & Variant Selector**
  Render left category/aisle rail + compact multi-column product cards with pack-size/weight variant pills (`500g`, `1kg`) and low-stock badges (`Only X left`).
- [ ] **Step 2: Add Free-Delivery Progress Bar & Last-Minute Add-ons in `CartScreen`**
  Show progress toward minimum free-delivery threshold and a horizontal quick-add carousel for essentials from the same outlet.

### Task 4.3: End-to-End Out-of-Stock Substitution Flow (`mobile_shared` + `merchant_mobile` + `customer_mobile`)

**Files:**
- Modify: `packages/mobile_shared/lib/src/data/api/merchant_orders_api.dart`
- Modify: `packages/mobile_shared/lib/src/data/api/customer_ordering_api.dart`
- Create: `apps/merchant_mobile/lib/src/components/propose_substitution_modal.dart`
- Modify: `apps/merchant_mobile/lib/src/components/merchant_live_orders_tab.dart`
- Create: `apps/customer_mobile/lib/src/components/substitution_decision_sheet.dart`
- Modify: `apps/customer_mobile/lib/src/screens/order_detail_screen.dart`
- Modify: `apps/customer_mobile/lib/src/screens/delivery_tracking_screen.dart`

**Interfaces:**
- Consumes backend `POST /v1/orders/sub-orders/:subOrderId/substitutions` and `POST /v1/orders/substitutions/:substitutionId/decision` (`OrderSubstitutionController`).

- [ ] **Step 1: Add `proposeSubstitution` & `respondToSubstitution` methods to `mobile_shared` APIs**
- [ ] **Step 2: Add "Item Unavailable / Propose Substitute" action per line item in `MerchantLiveOrdersTab`**
  Allows merchant/picker to pick an in-stock replacement product or mark item removed with partial refund.
- [ ] **Step 3: Add real-time `SubstitutionDecisionSheet` in `customer_mobile`**
  Opens when a `SUBSTITUTION_PROPOSED` socket/push/order event arrives, showing original vs replacement item, price delta/refund amount, and `Approve` / `Reject & Refund` buttons.

### Task 4.4: Merchant Catalog Editor, CSV Bulk Import & KOT Actions (`merchant_mobile`)

**Files:**
- Modify: `apps/merchant_mobile/lib/src/components/merchant_menu_catalog_tab.dart`
- Create: `apps/merchant_mobile/lib/src/screens/merchant_product_editor_screen.dart`
- Create: `apps/merchant_mobile/lib/src/screens/merchant_csv_import_screen.dart`
- Modify: `apps/merchant_mobile/lib/src/components/merchant_live_orders_tab.dart`

- [ ] **Step 1: Build `MerchantProductEditorScreen` (Create/Edit/Delete + Option Groups + Variants + Image Upload)**
- [ ] **Step 2: Build `MerchantCsvImportScreen`** wired to `MerchantCsvMenuController` for bulk menu/grocery SKU upload.
- [ ] **Step 3: Add Prep-Time Extension (`+5/+10 min`) & Order Ticket Print/Share in `MerchantLiveOrdersTab`**.

---

## Phase 5: Web Portals (`customer-web` & `merchant-web`) & Admin Depth

### Task 5.1: Build Functional `apps/customer-web` Next.js App

**Files:**
- Modify: `apps/customer-web/package.json` & `apps/customer-web/app/layout.tsx`
- Create: `apps/customer-web/lib/api.ts` & `apps/customer-web/lib/auth-context.tsx`
- Create: `apps/customer-web/app/(auth)/login/page.tsx`
- Modify: `apps/customer-web/app/page.tsx` (Live discovery: AllGo Food, AllGo Quick Mart, AllGo Rides, AllGo Parcel)
- Create: `apps/customer-web/app/store/[outletId]/page.tsx`
- Create: `apps/customer-web/app/checkout/page.tsx`
- Create: `apps/customer-web/app/orders/page.tsx`
- Create: `apps/customer-web/app/orders/[id]/page.tsx`
- Create: `apps/customer-web/app/rides/page.tsx`

- [ ] **Step 1: Wire AuthProvider & `@allgo/api-client` (`role: 'CUSTOMER'`, `client: 'web'`)**
- [ ] **Step 2: Implement Home Discovery + Storefront Menu/Aisle Page + Persistent Cart Drawer**
- [ ] **Step 3: Implement Checkout, Live Order Tracking, Order History, and Rides Booking pages**
- [ ] **Step 4: Verify Next.js typecheck, lint, and dev server compilation**
  Run: `pnpm --filter @allgo/customer-web typecheck && pnpm --filter @allgo/customer-web lint`
  Expected: Exit 0 with no TypeScript or Biome errors.

### Task 5.2: Build Functional `apps/merchant-web` Next.js Portal

**Files:**
- Modify: `apps/merchant-web/package.json` & `apps/merchant-web/app/layout.tsx`
- Create: `apps/merchant-web/lib/api.ts` & `apps/merchant-web/lib/auth-context.tsx`
- Create: `apps/merchant-web/app/(auth)/login/page.tsx`
- Modify: `apps/merchant-web/app/page.tsx` (Live KDS Order Queue with sound alert + Accept/Reject/Ready)
- Create: `apps/merchant-web/app/catalog/page.tsx` (Menu, variants, stock toggles, CSV import)
- Create: `apps/merchant-web/app/hours/page.tsx` (Weekly schedule + special closures)
- Create: `apps/merchant-web/app/finance/page.tsx` (Settlements, payouts, GST invoices)

- [ ] **Step 1: Wire AuthProvider & `@allgo/api-client` (`role: 'MERCHANT'`, `client: 'web'`)**
- [ ] **Step 2: Implement Live KDS Queue, Catalog + CSV Manager, Hours, and Finance pages**
- [ ] **Step 3: Verify Next.js typecheck & lint**
  Run: `pnpm --filter @allgo/merchant-web typecheck && pnpm --filter @allgo/merchant-web lint`
  Expected: Exit 0.

### Task 5.3: Admin Analytics, Live Fleet Map & Promo Campaigns (`apps/admin`)

**Files:**
- Modify: `apps/admin/components/app-sidebar.tsx`
- Create: `apps/admin/app/(admin)/admin/analytics/page.tsx`
- Create: `apps/admin/app/(admin)/admin/promos/page.tsx`
- Modify: `apps/admin/app/(admin)/admin/dispatch/page.tsx`
- Modify: `apps/admin/app/(admin)/admin/zones/page.tsx`
- Modify: `apps/admin/lib/api-client.ts`

- [ ] **Step 1: Add `/admin/analytics` page** using `recharts` (already in `@allgo/ui`) for GMV over time, Food vs Quick Mart vs Rides split, conversion funnel, and SLA breach metrics.
- [ ] **Step 2: Add `/admin/promos` campaign manager** (promo banners, coupon targeting by vertical/first-order, budget & redemption caps).
- [ ] **Step 3: Add Live Fleet & Zone Map view** to `/admin/dispatch` and `/admin/zones` plotting online drivers, active orders, and surge zones.
- [ ] **Step 4: Verify Admin typecheck, lint & tests**
  Run: `pnpm --filter @allgo/admin typecheck && pnpm --filter @allgo/admin lint && pnpm test:admin`
  Expected: All checks PASS.

---

## Verification Gate (Per Phase)

- **Workspace & Security Tests:** `pnpm lint && pnpm typecheck && pnpm test:fast`
- **Brand Guardrail:** `node --experimental-transform-types --test tests/workspace/brand-naming.spec.ts`
- **Flutter Checks (on workstation/CI with Flutter SDK):** `melos run analyze && melos run test`
