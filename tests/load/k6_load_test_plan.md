# k6 Load Testing Plan: Dispatch & Tracking Engine
**Platform**: AllGo India Monorepo  
**Subsystems Under Test**:
1. `/v1/partner/location` (High-frequency driver GPS ping ingestion)
2. `/v1/partner/jobs/feed` (Partner polling for dispatch offers)
3. `/v1/delivery/jobs/:id/track` (Customer real-time tracking polling)
4. `/v1/partner/jobs/:id/step` (Lifecycle state transition execution)

---

## 1. Objectives & Performance Baselines
- **P95 Latency Goal**: < 150ms for location pings, < 250ms for tracking reads.
- **P99 Latency Goal**: < 400ms under 500 concurrent virtual users.
- **Error Rate Tolerance**: < 0.5% at peak stress.
- **Concurrency Targets**:
  - Warm-up: 50 VUs for 1m
  - Normal Load: 200 VUs for 3m
  - Peak Spike: 500 VUs for 2m
  - Cooldown: 50 VUs to 0 over 1m

---

## 2. Test Scenarios
1. **Scenario A (Driver Fleet Tracking Ping)**: Drivers in Chennai pulsing coordinates every 3-5 seconds.
2. **Scenario B (Partner Dispatch Radar)**: Drivers querying matching available offers within a 5km radius.
3. **Scenario C (Customer Order Tracking)**: End users actively monitoring live delivery status and driver coordinates.

---

## 3. Running the Tests
```bash
# Set Target URL and Authentication Token
export API_BASE_URL="http://localhost:3000"
export AUTH_TOKEN="your_jwt_bearer_token"

# Execute Dispatch and Tracking Load Test
k6 run tests/load/dispatch_tracking_load_test.js
```
