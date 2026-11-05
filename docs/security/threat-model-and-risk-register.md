# AllGo Security Threat Model & Risk Register

## 1. Executive Summary

This document presents a comprehensive STRIDE threat modeling analysis and operational risk register for the AllGo multi-vertical platform, addressing attack vectors unique to Indian hyperlocal commerce and mobility super-apps.

---

## 2. STRIDE Threat Model & Mitigations

### 2.1 Spoofing Identity
- **Threat Vector 1: SMS Toll Fraud / OTP Flooding:** Attackers trigger thousands of SMS verifications to deplete the platform's DLT SMS budget or exploit premium rate destination numbers.
  - *Mitigation:* Strict multi-tier rate limiting (1 OTP per 60 seconds per phone, 5 per hour per phone, 20 per hour per IP subnet). Firebase App Check enforcement with Play Integrity token validation.
- **Threat Vector 2: Replay of Intercepted OTP:**
  - *Mitigation:* Single-use cryptographic OTP verification enforced atomically via Redis Lua script (`ATOMIC_OTP_VERIFY_AND_CONSUME_LUA`). Challenge destroyed immediately upon first match.

### 2.2 Tampering With Data
- **Threat Vector 1: GPS Mock Location Spoofing:** Couriers use fake GPS apps to spoof presence at merchant outlets or simulate travel progress.
  - *Mitigation:* Flutter partner app utilizes Android `isFromMockProvider` detection and Play Integrity API. Backend validates speed and distance consistency across breadcrumb timestamps (velocity > 120 km/h flagged for manual review).
- **Threat Vector 2: Financial Ledger Modification:** Malicious internal actor or compromised service account attempts to alter wallet balances or payouts.
  - *Mitigation:* Native PostgreSQL immutable triggers (`trg_ledger_entries_immutable`) block all `UPDATE` and `DELETE` queries at the database engine level.

### 2.3 Repudiation
- **Threat Vector 1: Delivery Handover Disputes:** Customer claims an order was never delivered; courier claims customer accepted it.
  - *Mitigation:* Mandatory 6-digit delivery handover OTP provided only to customer and entered into courier app at physical exchange. Handover timestamp and GPS coordinates logged. For parcel courier, dual OTP (pickup and delivery) is enforced.

### 2.4 Information Disclosure
- **Threat Vector 1: Customer Phone Number Harvesting:** Couriers collect customer phone numbers for harassment or off-platform solicitation.
  - *Mitigation:* Number masking proxy (Virtual IVR bridge via Exotel/Twilio). Courier and customer communicate via masked bridge numbers. Plaintext customer phone numbers never exposed in courier UI.

### 2.5 Denial of Service (DoS)
- **Threat Vector 1: Dispatch Socket.IO Gateway Flooding:** Thousands of automated connections spamming location updates to overwhelm server memory.
  - *Mitigation:* Adaptive ping cadence (10s moving, 60s stationary). Connection rate limiting via Cloud Armor and Redis token bucket limiter.

### 2.6 Elevation of Privilege
- **Threat Vector 1: Stale Role Assertion:** Suspended courier continues taking jobs using a valid 1-hour Firebase ID token minted prior to suspension.
  - *Mitigation:* Two-Tier Revocation Architecture. Every privileged API call performs an authoritative sub-millisecond Redis status check (`status != 'ACTIVE'` -> immediate HTTP 403 Forbidden).

---

## 3. Operational Risk Register

| Risk ID | Threat Category | Likelihood | Impact | Severity | Primary Mitigation | Owner |
| :---: | :--- | :---: | :---: | :---: | :--- | :--- |
| **R-01** | SMS Toll Fraud Exhaustion | High | High | **P1** | Rate limits + Play Integrity App Check + 1-minute cooldown | SecOps |
| **R-02** | Fake GPS Spoofing by Drivers | High | Med | **P2** | Mock location detection + velocity validation pipeline | Dispatch Lead |
| **R-03** | Cloud SQL Single-Zone Outage | Low | Critical | **P1** | Regional HA Multi-Zone Failover + PITR | DevOps Lead |
| **R-04** | Google Maps Polling Cost Spike | Med | High | **P1** | Redis GEO proximity caching + WebSockets (Zero continuous polling) | Backend Lead |
| **R-05** | Unauthorized DB Deletion | Low | Critical | **P0** | `deletion_protection = true` + multi-party IAM sign-off | Tech Lead |
| **R-06** | Courier COD Cash Absconding | Med | Med | **P2** | ₹2,000 cash-in-hand ceiling + automated COD suspension | Finance Lead |
