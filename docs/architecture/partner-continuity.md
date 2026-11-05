# Section 5B: Partner Continuity & Multi-Job Architecture

## 1. Overview & Unified Partner Experience

To maximize partner utilization, daily earnings, and platform driver retention (similar to Rapido's unified driver network), AllGo operates a **single partner mobile application** backed by a unified dispatch feed across delivery legs, parcel deliveries, passenger rides, and driver-hire bookings.

### Core Objectives:
1. **Single Online Switch:** A delivery partner or driver toggles online once to receive eligible jobs across verticals based on vehicle type and verified credentials.
2. **Reduced Deadhead Miles:** Intelligent proximity chaining routes couriers finishing drops directly to nearby pickups.
3. **Safety & Regulatory Compliance:** Gated mobility toggles and strict operational mutual exclusion prevent incompatible simultaneous jobs.

---

## 2. Partner Modes & Dispatch Feed

In the Partner App, partners can toggle their operational preference:

```
┌────────────────────────────────────────────────────────┐
│                   PARTNER MODE SWITCHER                │
│                                                        │
│  [1] DELIVERIES ONLY (Food, Grocery, Parcel)           │
│  [2] RIDES ONLY      (Bike-Taxi, Auto, Cab)            │
│  [3] ALL JOBS        (Max Earnings — Deliveries + Rides)│
└────────────────────────────────────────────────────────┘
```

### Eligibility & Regulatory Gating:
- **Vehicle Type Validation:** Two-wheeler partners can accept food, grocery, parcel, and bike-taxi (where legally permitted). Four-wheeler partners can accept parcel, passenger cabs, and driver-for-hire.
- **State-by-State Regulatory Gating:** Per Section 1.1 of design decisions, mobility verticals (`RIDE`, `HIRE_DRIVER`) remain disabled by default behind per-state database feature flags (`states.mobility_enabled = false`). In Pilot zones (e.g. Tamil Nadu dev seed), only delivery verticals are active until formal transport department clearance is documented.
- **Document Verification:** Passenger rides strictly require background check clearance, commercial driving badge, and passenger transit insurance before "Rides Only" or "All Jobs" modes can be selected.

---

## 3. Strict Safety Mutual Exclusion Guard

Under no circumstances may a partner concurrently carry human passengers and commercial freight/hot food. The dispatch engine enforces a strict mutual exclusion invariant at the database query level:

```sql
-- Mutual exclusion query guard in apps/dispatch
SELECT partner_id FROM active_partner_locks
WHERE partner_id = :partnerId
  AND (
    (:incomingJobType = 'RIDE' AND active_vertical IN ('FOOD', 'GROCERY', 'PARCEL'))
    OR
    (:incomingJobType IN ('FOOD', 'GROCERY', 'PARCEL') AND active_vertical = 'RIDE')
  );
```

```mermaid
stateDiagram-v2
    [*] --> Idle_Online: Partner Toggles Online (Mode: ALL_JOBS)

    state "Mutual Exclusion Dispatch Guard" as Guard {
        Idle_Online --> Delivery_Assigned: Food/Grocery/Parcel Job Accepted
        Idle_Online --> Ride_Assigned: Passenger Ride Job Accepted

        state Delivery_Assigned {
            [*] --> Carrying_Goods: Pickup Complete
            Carrying_Goods --> Out_For_Delivery
            note right of Carrying_Goods: INVARIANT: Passenger rides STRICTLY BLOCKED.<br/>Zero ride offers injected into partner feed.
        }

        state Ride_Assigned {
            [*] --> Passenger_Onboard: OTP Verified
            Passenger_Onboard --> In_Transit
            note left of Passenger_Onboard: INVARIANT: Delivery jobs STRICTLY BLOCKED.<br/>Zero food/grocery offers injected into partner feed.
        }

        Delivery_Assigned --> Dropoff_Delivery: Delivery Handover Verified
        Ride_Assigned --> Dropoff_Ride: Trip Ended & Paid
    }

    Dropoff_Delivery --> Idle_Online: Clear Active Vertical Lock
    Dropoff_Ride --> Idle_Online: Clear Active Vertical Lock
    Idle_Online --> [*]: Partner Toggles Offline
```

### Previewing Next Job (Chaining):
- A partner currently executing a delivery or ride is permitted to receive a "Next Job" preview **only after** the current pickup step is complete (i.e. status is `OUT_FOR_DELIVERY` or `TRIP_STARTED`).
- The queued next job must strictly align with the mutual exclusion invariant: if the active job is a food delivery, the chained job cannot begin pickup until the delivery leg is marked `DELIVERED`.

---

## 4. Proximity Next-Job Chaining & Deadhead Reduction

Empty miles (deadheading) reduce partner net hourly earnings and inflate platform carbon emissions.
- When a courier is within 500 meters or 3 minutes of the destination drop-off location $X$:
  1. The dispatch engine triggers a proximity scan centered at $X$ with a radius of $r \le 2.0$ km.
  2. High-priority dispatch offers originating near $X$ are pre-allocated to the partner.
  3. The offer is accepted with a single tap, seamlessly routing the partner from drop-off to the next pickup.

---

## 5. Post-Delivery Customer Cross-Sell

To boost platform gross merchandise value (GMV) across verticals without aggressive push marketing:
- **Contextual Post-Delivery Screen:** Immediately after food or grocery handover is confirmed via OTP, the Customer App tracking sheet transitions into a non-intrusive cross-vertical discovery card:
  - *"Need to send a package or run an errand? Book an AllGo Parcel courier with 10% off."*
  - *"Heading out soon? Schedule a driver or check ride availability in your area."*
- **Remote Config Control:** Cross-sell cards, banners, and coupon promotions are controlled via database-backed remote config per city/zone, ensuring zero promotional clutter in unlaunched verticals.

---

## 6. Configurable Parameters (Admin-Editable Per-City)

All job distribution, proximity chaining, and dispatch timers are configured in `city_settings` rather than fixed constants.

| Parameter Key | Setting Description | Default Value | Unit | Admin Editable Scope |
| :--- | :--- | :--- | :--- | :--- |
| `next_job_chaining_proximity_radius_km` | Search radius for chaining upcoming offers around the partner's destination drop-off | `2.0` | km | Per-city (`city_settings`) |
| `next_job_chaining_trigger_distance_meters` | Remaining distance to drop-off point that triggers proximity scan for next job | `500` | meters | Per-city (`city_settings`) |
| `next_job_chaining_trigger_eta_minutes` | Remaining estimated arrival time to drop-off that triggers proximity scan for next job | `3` | minutes | Per-city (`city_settings`) |
| `partner_idle_auto_offline_minutes` | Inactivity timeout before an idle partner without GPS updates is automatically placed offline | `45` | minutes | Per-city (`city_settings`) |
| `partner_offer_accept_timeout_seconds` | Timeout for a partner to accept a dispatched job offer before auto-rejection | `20` | seconds | Per-city (`city_settings`) |
| `partner_cash_in_hand_limit_inr` | Accumulated cash-on-delivery threshold held by partner before blocking further COD job offers | `2500.00 [Placeholder, owner to decide]` | INR | Per-city (`city_settings`) |
| `max_continuous_duty_hours` | Maximum allowable continuous active shift hours before mandatory rest lockout is enforced | `8.0 [Placeholder, owner to decide]` | hours | Per-city (`city_settings`) |
| `mandatory_rest_period_minutes` | Compulsory offline cooldown period after reaching maximum continuous duty threshold | `30 [Placeholder, owner to decide]` | minutes | Per-city (`city_settings`) |
| `partner_min_rating_threshold` | Minimum average customer rating required for automatic dispatch eligibility | `4.2 [Placeholder, owner to decide]` | stars | Per-city (`city_settings`) |


