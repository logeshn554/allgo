import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 50 },  // Ramp up to 50 VUs
    { duration: '1m', target: 200 },  // Ramp up to 200 VUs
    { duration: '2m', target: 200 },  // Stay at 200 VUs
    { duration: '30s', target: 500 },  // Spike to 500 VUs
    { duration: '1m', target: 500 },  // Sustain 500 VUs
    { duration: '30s', target: 0 },    // Cooldown to 0
  ],
  thresholds: {
    http_req_duration: ['p(95)<250', 'p(99)<400'], // 95% of requests under 250ms
    http_req_failed: ['rate<0.01'],                 // Under 1% errors
  },
};

const BASE_URL = __ENV.API_BASE_URL || 'http://localhost:3000';
const AUTH_TOKEN = __ENV.AUTH_TOKEN || 'mock_bearer_token';

const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${AUTH_TOKEN}`,
  'X-AllGo-Role': 'PARTNER',
};

export default function () {
  // 1. Driver Location Ping (High Frequency)
  const pingPayload = JSON.stringify({
    latitude: 13.0418 + (Math.random() - 0.5) * 0.05,
    longitude: 80.2341 + (Math.random() - 0.5) * 0.05,
    heading: Math.floor(Math.random() * 360),
    speedMps: Math.random() * 15,
    timestamp: new Date().toISOString(),
  });

  const pingRes = http.post(`${BASE_URL}/v1/partner/location`, pingPayload, { headers });
  check(pingRes, {
    'ping status is 200 or 201': (r) => r.status === 200 || r.status === 201,
  });

  sleep(1);

  // 2. Dispatch Feed Query (Partner Radar)
  const feedRes = http.get(`${BASE_URL}/v1/partner/jobs/feed`, { headers });
  check(feedRes, {
    'feed status is 200': (r) => r.status === 200,
  });

  sleep(2);

  // 3. Customer Tracking Query
  const customerHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${AUTH_TOKEN}`,
    'X-AllGo-Role': 'CUSTOMER',
  };

  const sampleJobId = 'job_test_sample_123';
  const trackRes = http.get(`${BASE_URL}/v1/delivery/jobs/${sampleJobId}/track`, {
    headers: customerHeaders,
  });
  check(trackRes, {
    'tracking response status acceptable': (r) =>
      r.status === 200 || r.status === 404,
  });

  sleep(2);
}
