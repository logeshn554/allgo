import assert from 'node:assert';
import { describe, it } from 'node:test';

process.env.OTP_PEPPER = 'allgo_dev_super_secret_pepper_2026';

import { AuthService } from '../../services/api/dist/auth/auth.service.js';
import { AuthRepository } from '../../services/api/dist/auth/data/auth.repository.js';
import { DpdpComplianceService } from '../../services/api/dist/users/dpdp-compliance.service.js';

describe('Priority 5: Device Sessions, Revocation & DPDP Compliance Workflows', () => {
  class MockDb {
    devices: any[] = [];
    consents: any[] = [];
    deletions: any[] = [];

    async query(sql: string, params: any[] = []): Promise<{ rows: any[] }> {
      const s = sql.trim();
      if (s.startsWith('INSERT INTO devices')) {
        const existing = this.devices.find(
          (d) => d.user_id === params[0] && d.device_id === params[1],
        );
        if (existing) {
          existing.refresh_token_hash = params[3];
          existing.fcm_token = params[4] || existing.fcm_token;
          existing.last_active_at = new Date();
          return { rows: [existing] };
        }
        const row = {
          id: `dev_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          user_id: params[0],
          device_id: params[1],
          platform: params[2],
          refresh_token_hash: params[3],
          fcm_token: params[4],
          last_active_at: new Date(),
          created_at: new Date(),
        };
        this.devices.push(row);
        return { rows: [row] };
      }
      if (
        s.startsWith(
          'SELECT id, device_id, platform, last_active_at, created_at FROM devices WHERE user_id = $1',
        )
      ) {
        const rows = this.devices.filter((d) => d.user_id === params[0]);
        return { rows };
      }
      if (s.startsWith('DELETE FROM devices WHERE user_id = $1 AND device_id = $2')) {
        this.devices = this.devices.filter(
          (d) => !(d.user_id === params[0] && d.device_id === params[1]),
        );
        return { rows: [] };
      }
      if (s.startsWith('DELETE FROM devices WHERE user_id = $1')) {
        this.devices = this.devices.filter((d) => d.user_id !== params[0]);
        return { rows: [] };
      }
      if (s.includes('INSERT INTO dpdp_consents')) {
        const row = {
          id: `con_${Date.now()}`,
          user_id: params[0],
          consent_purpose: params[1],
          is_granted: params[2],
          policy_version: params[5],
          recorded_at: new Date(),
        };
        this.consents.push(row);
        return { rows: [row] };
      }
      if (s.includes('FROM dpdp_consents WHERE user_id = $1')) {
        return { rows: this.consents.filter((c) => c.user_id === params[0]) };
      }
      if (s.includes('FROM order_groups WHERE customer_id = $1')) {
        return { rows: [] };
      }
      if (s.includes('INSERT INTO dpdp_deletion_requests')) {
        const row = {
          id: `del_${Date.now()}`,
          user_id: params[0],
          reason: params[1],
          scheduled_purge_at: params[2],
          status: 'PENDING',
        };
        this.deletions.push(row);
        return { rows: [row] };
      }
      if (s.startsWith("UPDATE users SET status = 'SUSPENDED'")) {
        return { rows: [{ id: params[0], status: 'SUSPENDED' }] };
      }
      return { rows: [] };
    }
  }

  it('1. should record device sessions and list active sessions for user', async () => {
    const mockDb = new MockDb();
    const authRepo = new AuthRepository(mockDb as any);
    const authService = new AuthService(
      {} as any,
      mockDb as any,
      {} as any,
      {} as any,
      authRepo,
      {} as any,
      {} as any,
    );

    await authRepo.recordDeviceSession('usr_100', 'dev_pixel_8', 'ANDROID', 'refresh_tok_1');
    await authRepo.recordDeviceSession('usr_100', 'dev_iphone_15', 'IOS', 'refresh_tok_2');

    const sessions = await authService.listSessions('usr_100');
    assert.strictEqual(sessions.length, 2);
    assert.strictEqual(sessions[0].device_id, 'dev_pixel_8');
    assert.strictEqual(sessions[1].device_id, 'dev_iphone_15');
  });

  it('2. should revoke a specific device session on user demand', async () => {
    const mockDb = new MockDb();
    const authRepo = new AuthRepository(mockDb as any);
    const authService = new AuthService(
      {} as any,
      mockDb as any,
      {} as any,
      {} as any,
      authRepo,
      {} as any,
      {} as any,
    );

    await authRepo.recordDeviceSession('usr_200', 'dev_laptop', 'WEB', 'refresh_tok_3');
    await authRepo.recordDeviceSession('usr_200', 'dev_tablet', 'ANDROID', 'refresh_tok_4');

    let sessions = await authService.listSessions('usr_200');
    assert.strictEqual(sessions.length, 2);

    await authService.revokeSession('usr_200', 'dev_laptop');
    sessions = await authService.listSessions('usr_200');
    assert.strictEqual(sessions.length, 1);
    assert.strictEqual(sessions[0].device_id, 'dev_tablet');
  });

  it('3. should revoke all device sessions on security reset or logout from all devices', async () => {
    const mockDb = new MockDb();
    const authRepo = new AuthRepository(mockDb as any);
    const authService = new AuthService(
      {} as any,
      mockDb as any,
      {} as any,
      {} as any,
      authRepo,
      {} as any,
      {} as any,
    );

    await authRepo.recordDeviceSession('usr_300', 'dev_1', 'ANDROID', 'tok_1');
    await authRepo.recordDeviceSession('usr_300', 'dev_2', 'IOS', 'tok_2');

    await authService.revokeSession('usr_300');
    const sessions = await authService.listSessions('usr_300');
    assert.strictEqual(sessions.length, 0);
  });

  it('4. should record and retrieve DPDP consent records with purpose and policy version', async () => {
    const mockDb = new MockDb();
    const mockRedis = { set: async () => 'OK' };
    const dpdp = new DpdpComplianceService(mockDb as any, mockRedis as any);

    const consent = await dpdp.recordConsent(
      'usr_dpdp_1',
      {
        purpose: 'LOCATION_TRACKING',
        granted: true,
        policyVersion: 'v1.0',
      },
      '10.0.0.1',
      'AllGoCustomerApp/1.0',
    );

    assert.ok(consent);
    assert.strictEqual(consent.consent_purpose, 'LOCATION_TRACKING');
    assert.strictEqual(consent.is_granted, true);

    const consents = await dpdp.getConsents('usr_dpdp_1');
    assert.strictEqual(consents.length, 1);
    assert.strictEqual(consents[0].consent_purpose, 'LOCATION_TRACKING');
  });

  it('5. should schedule account deletion with 30-day grace period per DPDP Section 12', async () => {
    const mockDb = new MockDb();
    const mockRedis = { set: async () => 'OK' };
    const dpdp = new DpdpComplianceService(mockDb as any, mockRedis as any);

    const res = await dpdp.requestAccountDeletion('usr_del_1', 'No longer using the service');
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.status, 'PENDING_PURGE');
    assert.ok(res.scheduledPurgeAt);

    // Scheduled purge date must be approximately 30 days in the future
    const purgeTime = new Date(res.scheduledPurgeAt).getTime();
    const expectedApprox = Date.now() + 30 * 24 * 60 * 60 * 1000;
    assert.ok(Math.abs(purgeTime - expectedApprox) < 60000);
  });
});
