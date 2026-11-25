import assert from 'node:assert';
import { describe, it } from 'node:test';
import { StandaloneDispatchEngine } from '../../services/dispatch/dist/dispatch-engine.js';
import { createDispatchServer } from '../../services/dispatch/dist/server.js';

describe('1. Standalone Dispatch Engine & Cloud Run HTTP/Health Service', () => {
  it('should match candidates with highest score and shortest distance', () => {
    const engine = new StandaloneDispatchEngine();
    const offer = engine.requestDispatch(
      {
        jobId: 'job_101',
        vertical: 'FOOD',
        pickupLat: 13.0827,
        pickupLng: 80.2707,
        dropoffLat: 13.085,
        dropoffLng: 80.275,
      },
      [
        { partnerId: 'prt_low', distanceKm: 2.5, estimatedArrivalMinutes: 8, score: 70 },
        { partnerId: 'prt_high', distanceKm: 1.2, estimatedArrivalMinutes: 4, score: 95 },
      ],
    );

    assert.ok(offer, 'Offer should be generated');
    assert.strictEqual(offer?.partnerId, 'prt_high');
    assert.strictEqual(offer?.status, 'PENDING');
    assert.strictEqual(engine.getPendingOffersCount(), 1);

    const accepted = engine.acceptOffer(offer.attemptId, 'prt_high');
    assert.strictEqual(accepted.status, 'ACCEPTED');
    assert.strictEqual(engine.getPendingOffersCount(), 0);
  });

  it('should serve /health and dispatch requests via server request handler', async () => {
    const engine = new StandaloneDispatchEngine();
    const { server } = createDispatchServer(engine);

    const reqListeners = server.listeners('request');
    assert.ok(reqListeners.length > 0, 'Server should have request listener');
    const handler = reqListeners[0] as (req: any, res: any) => void;

    // 1. /health
    let healthBody = '';
    let healthStatus = 0;
    handler(
      { url: '/health', method: 'GET', headers: { host: 'localhost:3001' } },
      {
        writeHead: (s: number) => {
          healthStatus = s;
        },
        end: (d: string) => {
          healthBody = d;
        },
      },
    );
    assert.strictEqual(healthStatus, 200);
    assert.strictEqual(JSON.parse(healthBody).service, 'allgo-dispatch');

    // 2. /pubsub/dispatch-request
    let dispStatus = 0;
    let dispBody = '';
    handler(
      {
        url: '/pubsub/dispatch-request',
        method: 'POST',
        headers: { host: 'localhost:3001' },
        on(event: string, cb: any) {
          if (event === 'data')
            cb(
              JSON.stringify({
                request: {
                  jobId: 'job_ps_001',
                  vertical: 'FOOD',
                  pickupLat: 13.0,
                  pickupLng: 80.0,
                  dropoffLat: 13.1,
                  dropoffLng: 80.1,
                },
                candidates: [
                  { partnerId: 'prt_ps_1', distanceKm: 1.0, estimatedArrivalMinutes: 3, score: 90 },
                ],
              }),
            );
          if (event === 'end') cb();
        },
      },
      {
        writeHead: (s: number) => {
          dispStatus = s;
        },
        end: (d: string) => {
          dispBody = d;
        },
      },
    );
    assert.strictEqual(dispStatus, 200);
    const parsedDisp = JSON.parse(dispBody);
    assert.strictEqual(parsedDisp.offer.partnerId, 'prt_ps_1');

    // 3. /offers/accept
    let acceptStatus = 0;
    handler(
      {
        url: '/offers/accept',
        method: 'POST',
        headers: { host: 'localhost:3001' },
        on(event: string, cb: any) {
          if (event === 'data')
            cb(JSON.stringify({ attemptId: parsedDisp.offer.attemptId, partnerId: 'prt_ps_1' }));
          if (event === 'end') cb();
        },
      },
      {
        writeHead: (s: number) => {
          acceptStatus = s;
        },
        end: () => {},
      },
    );
    assert.strictEqual(acceptStatus, 200);
  });
});
