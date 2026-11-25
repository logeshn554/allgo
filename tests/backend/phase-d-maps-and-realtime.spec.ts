import assert from 'node:assert';
import { after, before, describe, it } from 'node:test';
import { GoogleMapsGateway } from '../../services/api/dist/common/maps/google-maps.gateway.js';
import { MapsController } from '../../services/api/dist/common/maps/maps.controller.js';
import { ConfigService } from '../../services/api/dist/config/config.service.js';
import { CustomerDeliveryController } from '../../services/api/dist/delivery/controllers/customer-delivery.controller.js';
import { DispatchCandidateMatcherService } from '../../services/api/dist/delivery/dispatch-candidate-matcher.service.js';
import { PartnerAvailabilityService } from '../../services/api/dist/delivery/partner-availability.service.js';
import { InMemoryRedisTestDouble } from '../helpers/test-doubles.ts';

describe('Phase D: Maps, Location and Real-Time Systems Test Suite', () => {
  let config: ConfigService;
  let redis: any;
  let mapsGateway: GoogleMapsGateway;

  before(async () => {
    config = new ConfigService();
    redis = new InMemoryRedisTestDouble();
    mapsGateway = new GoogleMapsGateway(config, redis as any);
  });

  after(async () => {
    await redis.onModuleDestroy();
  });

  describe('1. Backend MapsGateway & Redis Caching', () => {
    it('computeRoute should return road route and cache result in Redis', async () => {
      const origin = { latitude: 13.0827, longitude: 80.2707 };
      const dest = { latitude: 13.05, longitude: 80.25 };

      const estimate = await mapsGateway.computeRoute(origin, dest, 'TWO_WHEELER');
      assert.ok(estimate.distanceMeters > 0);
      assert.ok(estimate.durationSeconds > 0);

      const cachedEstimate = await mapsGateway.computeRoute(origin, dest, 'TWO_WHEELER');
      assert.strictEqual(cachedEstimate.source, 'CACHE');
      assert.strictEqual(cachedEstimate.distanceMeters, estimate.distanceMeters);
      assert.strictEqual(cachedEstimate.durationSeconds, estimate.durationSeconds);
    });

    it('computeDistanceMatrix should compute batch matrix and cache items', async () => {
      const origins = [{ latitude: 13.0827, longitude: 80.2707 }];
      const dests = [
        { latitude: 13.06, longitude: 80.26 },
        { latitude: 13.04, longitude: 80.24 },
      ];

      const matrix = await mapsGateway.computeDistanceMatrix(origins, dests);
      assert.strictEqual(matrix.length, 2);
      assert.ok(matrix[0].distanceMeters > 0);
      assert.ok(matrix[1].distanceMeters > 0);
    });

    it('geocoding and reverse geocoding should resolve coordinates and cached addresses', async () => {
      const geocoded = await mapsGateway.geocodeAddress('T. Nagar, Chennai');
      assert.ok(geocoded.length > 0);
      assert.ok(geocoded[0].location.latitude > 0);

      const rev = await mapsGateway.reverseGeocode({ latitude: 13.0827, longitude: 80.2707 });
      assert.ok(rev != null);
      assert.ok(rev.formattedAddress.includes('Chennai'));
    });

    it('searchPlaces should return autocomplete place predictions', async () => {
      const predictions = await mapsGateway.searchPlaces('Marina Beach');
      assert.ok(predictions.length > 0);
      assert.ok(predictions[0].placeId.length > 0);
      assert.ok(predictions[0].description.includes('Marina Beach'));
    });

    it('MapsController should expose endpoints for places, geocoding and routes', async () => {
      const controller = new MapsController(mapsGateway);
      const places = await controller.searchPlaces('Anna Nagar', '13.08', '80.27');
      assert.ok(Array.isArray(places));
      assert.ok(places.length > 0);

      const rev = await controller.reverseGeocode('13.0827', '80.2707');
      assert.ok(rev.formattedAddress != null);

      const route = await controller.computeRoute({
        origin: { latitude: 13.0827, longitude: 80.2707 },
        destination: { latitude: 13.04, longitude: 80.25 },
        travelMode: 'TWO_WHEELER',
      });
      assert.ok(route.distanceMeters > 0);
      assert.ok(route.durationSeconds > 0);
    });
  });

  describe('2. Road ETA in Dispatch Ranking & Candidate Matcher', () => {
    it('matcher should utilize Road ETA from MapsGateway to rank eligible candidates', async () => {
      const mockAttemptRepo: any = {
        findSpatialCandidatePartnerIds: async () => ['partner_far', 'partner_near'],
        findPastRejectedPartnerIds: async () => [],
        isPartnerActiveOnJob: async () => false,
      };

      const mockPartnerAvailability: any = {
        checkEligibility: async () => ({ isEligible: true }),
        getPartnerLastPoint: async (pid: string) => {
          if (pid === 'partner_near') return { lat: 13.083, lon: 80.271 };
          return { lat: 13.15, lon: 80.35 };
        },
      };

      const matcher = new DispatchCandidateMatcherService(
        redis,
        mockAttemptRepo,
        mockPartnerAvailability,
        mapsGateway,
      );

      const result = await matcher.findEligibleCandidate('job_101', 80.2707, 13.0827, {
        max_search_radius_meters: 15000,
      });
      assert.strictEqual(result.selectedPartnerId, 'partner_near');
    });
  });

  describe('3. Partner Ingestion: Redis GEO, Telemetry Mirror & PostGIS Batching', () => {
    it('recordLocation should buffer points and batch-insert into PostGIS', async () => {
      let batchInsertedCount = 0;
      const mockRepo: any = {
        getPartnerByUserId: async () => ({ id: 'prt_live_99' }),
        getActiveJobId: async () => 'job_live_99',
        getLastRecordedPoint: async () => null,
        insertLocation: async () => 'loc_point_1',
        batchInsertLocations: async (batch: any[]) => {
          batchInsertedCount += batch.length;
          return batch.length;
        },
      };

      const mockGateway: any = { emitPartnerLocationUpdate: () => {} };

      const partnerService = new PartnerAvailabilityService(
        {} as any,
        redis,
        mockGateway,
        mockRepo,
      );

      const res = await partnerService.recordLocation('usr_prt_99', {
        latitude: 13.0827,
        longitude: 80.2707,
        heading: 90,
        speedMps: 10,
        accuracyMeters: 4,
      } as any);

      assert.strictEqual(res.success, true);

      const mirroredStr = await redis.get('partner:prt_live_99:latest_telemetry');
      assert.ok(mirroredStr != null);
      const mirrored = JSON.parse(mirroredStr!);
      assert.strictEqual(mirrored.partnerId, 'prt_live_99');
      assert.strictEqual(mirrored.latitude, 13.0827);

      const flushed = await partnerService.flushLocationBatch();
      assert.strictEqual(flushed, 1);
      assert.strictEqual(batchInsertedCount, 1);
    });
  });

  describe('4. Customer Tracking & Missed Event Sync Endpoint', () => {
    it('syncMissedEvents should return delta events and snapshot for reconnecting clients', async () => {
      const mockDb: any = {
        query: async (sql: string, params: any[]) => {
          if (sql.includes('SELECT id, customer_id')) {
            return {
              rows: [{ id: params[0], customer_id: 'cust_user_1', assigned_partner_id: 'prt_1' }],
            };
          }
          if (sql.includes('FROM delivery_status_events')) {
            return {
              rows: [
                {
                  id: 'evt_1',
                  delivery_job_id: params[0],
                  from_status: 'ASSIGNED',
                  to_status: 'IN_TRANSIT',
                  actor_role: 'PARTNER',
                  reason: 'Picked up',
                  created_at: new Date('2026-11-19T10:00:00Z'),
                },
              ],
            };
          }
          return { rows: [] };
        },
      };

      const mockDeliveryJobService: any = {
        getJobTrackingDetails: async () => ({
          id: 'job_active_1',
          status: 'IN_TRANSIT',
          assignedPartner: {
            id: 'prt_1',
            liveLocation: { latitude: 13.083, longitude: 80.271, heading: 45 },
          },
        }),
      };

      const controller = new CustomerDeliveryController(mockDeliveryJobService, mockDb);
      const result = await controller.syncMissedEvents(
        { user: { userId: 'cust_user_1' } },
        'job_active_1',
        '2026-11-19T09:50:00Z',
      );

      assert.strictEqual(result.jobId, 'job_active_1');
      assert.strictEqual(result.events.length, 1);
      assert.strictEqual(result.events[0].toStatus, 'IN_TRANSIT');
      assert.ok(result.currentSnapshot != null);
      assert.strictEqual(result.currentSnapshot.assignedPartner.liveLocation.latitude, 13.083);
    });
  });
});
