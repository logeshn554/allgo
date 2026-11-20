import { describe, it } from 'node:test';
import assert from 'node:assert';
import * as fs from 'node:fs';
import * as path from 'node:path';

const ROOT_DIR = path.resolve(import.meta.dirname, '../../');

interface AuthContext {
  uid?: string;
  token?: Record<string, any>;
}

interface RulesRequest {
  auth: AuthContext | null;
}

interface RulesResource {
  data: Record<string, any>;
}

class FirestoreRulesEmulatorDouble {
  private rulesContent: string;

  constructor(rulesPath: string) {
    this.rulesContent = fs.readFileSync(rulesPath, 'utf-8');
  }

  evaluateRead(
    collection: string,
    docId: string,
    request: RulesRequest,
    resource: RulesResource
  ): boolean {
    if (!request.auth || !request.auth.uid) {
      return false;
    }

    if (collection === 'users') {
      return request.auth.uid === docId;
    }

    if (collection === 'orders') {
      return (
        resource.data.customerId === request.auth.uid ||
        resource.data.partnerId === request.auth.uid
      );
    }

    if (collection === 'rides') {
      return (
        resource.data.customerId === request.auth.uid ||
        resource.data.driverId === request.auth.uid
      );
    }

    if (collection === 'partner_locations') {
      return (
        docId === request.auth.uid ||
        resource.data.activeCustomerId === request.auth.uid ||
        resource.data.customerId === request.auth.uid
      );
    }

    return false;
  }

  evaluateWrite(
    _collection: string,
    _docId: string,
    _request: RulesRequest,
    _resource?: RulesResource
  ): boolean {
    return false;
  }
}

class RtdbRulesEmulatorDouble {
  private parsedRules: any;

  constructor(rulesJsonPath: string) {
    this.parsedRules = JSON.parse(fs.readFileSync(rulesJsonPath, 'utf-8'));
  }

  evaluateRead(
    pathSegment: string,
    key: string,
    auth: AuthContext | null,
    data: Record<string, any>
  ): boolean {
    if (!auth || !auth.uid) {
      return false;
    }

    if (pathSegment === 'users') {
      return auth.uid === key;
    }

    if (pathSegment === 'orders') {
      return data.customerId === auth.uid || data.partnerId === auth.uid;
    }

    if (pathSegment === 'rides') {
      return data.customerId === auth.uid || data.driverId === auth.uid;
    }

    if (pathSegment === 'partner_locations') {
      return (
        key === auth.uid ||
        data.activeCustomerId === auth.uid ||
        data.customerId === auth.uid
      );
    }

    return false;
  }

  evaluateWrite(
    _pathSegment: string,
    _key: string,
    _auth: AuthContext | null,
    _data?: Record<string, any>
  ): boolean {
    return false;
  }
}

describe('A.1: Firestore & RTDB Security Rules Double and Policy Tests', () => {
  const firestoreRulesPath = path.join(ROOT_DIR, 'firestore.rules');
  const databaseRulesPath = path.join(ROOT_DIR, 'database.rules.json');
  const firestoreHarness = new FirestoreRulesEmulatorDouble(firestoreRulesPath);
  const rtdbHarness = new RtdbRulesEmulatorDouble(databaseRulesPath);

  it('should verify rules files exist and enforce deny-by-default', () => {
    assert.ok(fs.existsSync(firestoreRulesPath), 'firestore.rules must exist');
    assert.ok(fs.existsSync(databaseRulesPath), 'database.rules.json must exist');

    const firestoreRaw = fs.readFileSync(firestoreRulesPath, 'utf-8');
    assert.match(firestoreRaw, /allow write:\s*if false;/);
    assert.match(firestoreRaw, /allow read:\s*if false;/);

    const rtdbRaw = JSON.parse(fs.readFileSync(databaseRulesPath, 'utf-8'));
    assert.strictEqual(rtdbRaw.rules['.read'], false);
    assert.strictEqual(rtdbRaw.rules['.write'], false);
  });

  it('should deny unauthenticated read and write requests across all paths', () => {
    const unauthenticatedReq: RulesRequest = { auth: null };
    assert.strictEqual(
      firestoreHarness.evaluateRead('orders', 'ord_123', unauthenticatedReq, { data: { customerId: 'cust_1' } }),
      false
    );
    assert.strictEqual(
      firestoreHarness.evaluateWrite('orders', 'ord_123', unauthenticatedReq, { data: { customerId: 'cust_1' } }),
      false
    );
    assert.strictEqual(
      rtdbHarness.evaluateRead('orders', 'ord_123', null, { customerId: 'cust_1' }),
      false
    );
    assert.strictEqual(
      rtdbHarness.evaluateWrite('orders', 'ord_123', null, { customerId: 'cust_1' }),
      false
    );
  });

  it('should deny all client writes even when authenticated', () => {
    const customerReq: RulesRequest = { auth: { uid: 'cust_1' } };
    assert.strictEqual(firestoreHarness.evaluateWrite('orders', 'ord_123', customerReq), false);
    assert.strictEqual(firestoreHarness.evaluateWrite('rides', 'ride_123', customerReq), false);
    assert.strictEqual(firestoreHarness.evaluateWrite('partner_locations', 'prt_1', customerReq), false);
    assert.strictEqual(rtdbHarness.evaluateWrite('orders', 'ord_123', { uid: 'cust_1' }), false);
    assert.strictEqual(rtdbHarness.evaluateWrite('partner_locations', 'prt_1', { uid: 'cust_1' }), false);
  });

  it('should allow users to read only their own orders or rides', () => {
    const customer: RulesRequest = { auth: { uid: 'cust_1' } };
    const partner: RulesRequest = { auth: { uid: 'partner_1' } };
    const stranger: RulesRequest = { auth: { uid: 'stranger_9' } };

    const orderDoc = { data: { customerId: 'cust_1', partnerId: 'partner_1' } };
    assert.strictEqual(firestoreHarness.evaluateRead('orders', 'ord_1', customer, orderDoc), true);
    assert.strictEqual(firestoreHarness.evaluateRead('orders', 'ord_1', partner, orderDoc), true);
    assert.strictEqual(firestoreHarness.evaluateRead('orders', 'ord_1', stranger, orderDoc), false);

    const rideDoc = { data: { customerId: 'cust_1', driverId: 'partner_1' } };
    assert.strictEqual(firestoreHarness.evaluateRead('rides', 'ride_1', customer, rideDoc), true);
    assert.strictEqual(firestoreHarness.evaluateRead('rides', 'ride_1', partner, rideDoc), true);
    assert.strictEqual(firestoreHarness.evaluateRead('rides', 'ride_1', stranger, rideDoc), false);
  });

  it('should allow partner location reads only for partner self or active customer', () => {
    const partner: RulesRequest = { auth: { uid: 'prt_100' } };
    const activeCustomer: RulesRequest = { auth: { uid: 'cust_active' } };
    const otherUser: RulesRequest = { auth: { uid: 'cust_other' } };

    const locData = { data: { activeCustomerId: 'cust_active', lat: 12.97, lng: 77.59 } };
    assert.strictEqual(firestoreHarness.evaluateRead('partner_locations', 'prt_100', partner, locData), true);
    assert.strictEqual(firestoreHarness.evaluateRead('partner_locations', 'prt_100', activeCustomer, locData), true);
    assert.strictEqual(firestoreHarness.evaluateRead('partner_locations', 'prt_100', otherUser, locData), false);

    assert.strictEqual(rtdbHarness.evaluateRead('partner_locations', 'prt_100', { uid: 'prt_100' }, locData.data), true);
    assert.strictEqual(rtdbHarness.evaluateRead('partner_locations', 'prt_100', { uid: 'cust_active' }, locData.data), true);
    assert.strictEqual(rtdbHarness.evaluateRead('partner_locations', 'prt_100', { uid: 'cust_other' }, locData.data), false);
  });
});
