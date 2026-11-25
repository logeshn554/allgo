import assert from 'node:assert';
import { beforeEach, describe, it } from 'node:test';
import { validate } from 'class-validator';
import { UserRepository } from '../../services/api/dist/users/data/user.repository.js';
import { UpdateProfileDto } from '../../services/api/dist/users/dto/update-profile.dto.js';
import { UsersController } from '../../services/api/dist/users/users.controller.js';
import { UsersService } from '../../services/api/dist/users/users.service.js';
import { InMemoryRedisTestDouble, MockDatabaseService } from '../helpers/test-doubles.ts';

describe('Customer Profile Self-Service Update API & IDOR Security Suite', () => {
  let dbService: MockDatabaseService;
  let redisService: InMemoryRedisTestDouble;
  let userRepo: UserRepository;
  let usersService: UsersService;
  let controller: UsersController;

  const testUserId = 'usr_customer_456';

  beforeEach(() => {
    dbService = new MockDatabaseService();
    redisService = new InMemoryRedisTestDouble();

    // Seed mock database with a customer user
    dbService.users.set(testUserId, {
      id: testUserId,
      phone: '+919876543210',
      email: 'customer@allgo.in',
      full_name: 'Priya Sharma',
      status: 'ACTIVE',
      default_language: 'en',
      created_at: new Date().toISOString(),
    });
    dbService.userRoles.set(testUserId, new Set(['CUSTOMER']));

    userRepo = new UserRepository(dbService as any);
    usersService = new UsersService(dbService as any, redisService as any, userRepo);
    controller = new UsersController(usersService);
  });

  describe('1. UserRepository Persistence', () => {
    it('should persist fullName and defaultLanguage via updateUserProfile query', async () => {
      const updated = await userRepo.updateUserProfile(testUserId, {
        fullName: 'Priya Sundaram',
        defaultLanguage: 'ta',
      });

      assert.strictEqual(updated.fullName, 'Priya Sundaram');
      assert.strictEqual(updated.defaultLanguage, 'ta');

      // Verify authoritative lookup reflects changes
      const found = await userRepo.findUserById(testUserId);
      assert.strictEqual(found?.fullName, 'Priya Sundaram');
      assert.strictEqual(found?.defaultLanguage, 'ta');
    });

    it('should update only defaultLanguage when fullName is omitted', async () => {
      const updated = await userRepo.updateUserProfile(testUserId, {
        defaultLanguage: 'hi',
      });

      assert.strictEqual(updated.defaultLanguage, 'hi');
      assert.strictEqual(updated.fullName, 'Priya Sharma');
    });

    it('should update email when provided', async () => {
      const updated = await userRepo.updateUserProfile(testUserId, {
        email: 'priya.new@allgo.in',
      });

      assert.strictEqual(updated.email, 'priya.new@allgo.in');
    });
  });

  describe('2. UsersController Self-Service Profile Update (PATCH /v1/users/profile & /v1/users/me)', () => {
    it('should update profile using authenticated user context (PATCH /v1/users/profile)', async () => {
      const req = { user: { userId: testUserId, roles: ['CUSTOMER'] } };
      const dto: UpdateProfileDto = {
        fullName: 'Priya S.',
        defaultLanguage: 'ta',
      };

      const result = await controller.updateProfile(req, dto);
      assert.strictEqual(result.fullName, 'Priya S.');
      assert.strictEqual(result.defaultLanguage, 'ta');
    });

    it('should support /v1/users/me alias route (PATCH /v1/users/me)', async () => {
      const req = { user: { userId: testUserId, roles: ['CUSTOMER'] } };
      const dto: UpdateProfileDto = {
        fullName: 'Priya Sharma Devi',
      };

      const result = await controller.updateMe(req, dto);
      assert.strictEqual(result.fullName, 'Priya Sharma Devi');
    });

    it('should retrieve own profile via GET /v1/users/profile and GET /v1/users/me', async () => {
      const req = { user: { userId: testUserId, roles: ['CUSTOMER'] } };

      const profile1 = await controller.getProfile(req);
      assert.strictEqual(profile1.id, testUserId);
      assert.strictEqual(profile1.phone, '+919876543210');

      const profile2 = await controller.getMe(req);
      assert.strictEqual(profile2.id, testUserId);
    });
  });

  describe('3. Strict IDOR Safety & Authorization Controls', () => {
    it('should strictly bind update to req.user.userId and prevent updating arbitrary users', async () => {
      const victimId = 'usr_victim_789';
      dbService.users.set(victimId, {
        id: victimId,
        phone: '+919111222333',
        full_name: 'Victim User',
        status: 'ACTIVE',
        default_language: 'en',
      });

      // Attacker is logged in as testUserId, attempting to modify victim
      const attackerReq = {
        user: { userId: testUserId, roles: ['CUSTOMER'] },
        body: { userId: victimId, fullName: 'Hacked Name' },
      };

      // updateProfile derives target solely from req.user.userId
      const res = await controller.updateProfile(attackerReq, { fullName: 'Hacked Name' });
      assert.strictEqual(res.id, testUserId, 'Must only update authenticated user');

      // Victim remains completely untouched
      const victim = await usersService.getUserById(victimId);
      assert.strictEqual(victim.fullName, 'Victim User', 'Victim profile must NOT be modified');
    });

    it('should reject profile update with ForbiddenException when user context is missing', async () => {
      const unauthReq = { user: null };
      await assert.rejects(
        async () => {
          await controller.updateProfile(unauthReq, { fullName: 'Anonymous' });
        },
        {
          name: 'ForbiddenException',
          message: 'User context is missing',
        },
      );
    });
  });

  describe('4. UpdateProfileDto Validation Schema', () => {
    it('should pass validation for valid full name and supported language', async () => {
      const dto = new UpdateProfileDto();
      dto.fullName = 'Rahul Dravid';
      dto.defaultLanguage = 'ta';
      dto.email = 'rahul@example.com';

      const errors = await validate(dto);
      assert.strictEqual(errors.length, 0);
    });

    it('should reject unsupported language codes', async () => {
      const dto = new UpdateProfileDto();
      dto.defaultLanguage = 'fr'; // French not in ['en', 'ta', 'hi']

      const errors = await validate(dto);
      assert.ok(errors.length > 0);
      assert.ok(errors.some((e) => e.property === 'defaultLanguage'));
    });

    it('should reject invalid email format', async () => {
      const dto = new UpdateProfileDto();
      dto.email = 'not-an-email';

      const errors = await validate(dto);
      assert.ok(errors.length > 0);
      assert.ok(errors.some((e) => e.property === 'email'));
    });

    it('should reject empty fullName', async () => {
      const dto = new UpdateProfileDto();
      dto.fullName = '';

      const errors = await validate(dto);
      assert.ok(errors.length > 0);
      assert.ok(errors.some((e) => e.property === 'fullName'));
    });
  });
});
