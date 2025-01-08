import request from 'supertest';
import { describe, it, beforeEach, afterEach, jest } from 'jest';
import app from '../../src/app';
import { UserAuthRequest, UserRegistrationRequest } from '../../src/types/user.types';
import { APIErrorCode } from '../../src/types/api.types';
import { TestDatabase } from '@test/database';

// Test constants
const TEST_TIMEOUT = 30000;
const testUser: UserRegistrationRequest = {
  email: 'test@example.com',
  password: 'Test123!@#',
  name: 'Test User',
  phone_number: null,
  terms_accepted: true,
  marketing_consent: false
};

describe('Authentication API Integration Tests', () => {
  let testDb: TestDatabase;

  beforeEach(async () => {
    // Initialize test database
    testDb = new TestDatabase();
    await testDb.clearDatabase();

    // Reset rate limiters and cache
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await testDb.clearDatabase();
  });

  describe('POST /api/auth/register', () => {
    it('should successfully register a new user', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send(testUser)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toHaveProperty('id');
      expect(response.body.data.user.email).toBe(testUser.email);
      expect(response.body.data.token).toBeDefined();
      expect(response.headers['x-ratelimit-remaining']).toBeDefined();

      // Verify security headers
      expect(response.headers['strict-transport-security']).toBeDefined();
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBe('DENY');
      expect(response.headers['x-xss-protection']).toBe('1; mode=block');
    });

    it('should reject duplicate email registration', async () => {
      // Register first user
      await request(app)
        .post('/api/auth/register')
        .send(testUser)
        .expect(201);

      // Attempt duplicate registration
      const response = await request(app)
        .post('/api/auth/register')
        .send(testUser)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe(APIErrorCode.VALIDATION_ERROR);
      expect(response.body.error.message).toContain('email already exists');
    });

    it('should validate password requirements', async () => {
      const weakPassword = { ...testUser, password: 'weak' };
      const response = await request(app)
        .post('/api/auth/register')
        .send(weakPassword)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe(APIErrorCode.VALIDATION_ERROR);
      expect(response.body.error.message).toContain('password requirements');
    });

    it('should enforce rate limiting', async () => {
      // Make multiple rapid requests
      const requests = Array(101).fill(null).map(() => 
        request(app)
          .post('/api/auth/register')
          .send({ ...testUser, email: `test${Math.random()}@example.com` })
      );

      const responses = await Promise.all(requests);
      const rateLimited = responses.some(res => res.status === 429);
      expect(rateLimited).toBe(true);
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      // Create test user
      await request(app)
        .post('/api/auth/register')
        .send(testUser);
    });

    it('should successfully login with valid credentials', async () => {
      const loginData: UserAuthRequest = {
        email: testUser.email,
        password: testUser.password
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.user.email).toBe(testUser.email);
    });

    it('should reject invalid credentials', async () => {
      const invalidLogin: UserAuthRequest = {
        email: testUser.email,
        password: 'wrongpassword'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(invalidLogin)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe(APIErrorCode.UNAUTHORIZED);
    });

    it('should implement account lockout after failed attempts', async () => {
      const invalidLogin: UserAuthRequest = {
        email: testUser.email,
        password: 'wrongpassword'
      };

      // Make multiple failed login attempts
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/api/auth/login')
          .send(invalidLogin);
      }

      // Attempt with correct password
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        })
        .expect(429);

      expect(response.body.error.code).toBe(APIErrorCode.RATE_LIMIT_EXCEEDED);
      expect(response.body.error.message).toContain('account locked');
    });
  });

  describe('POST /api/auth/logout', () => {
    let authToken: string;

    beforeEach(async () => {
      // Create and login test user
      await request(app)
        .post('/api/auth/register')
        .send(testUser);

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        });

      authToken = loginResponse.body.data.token;
    });

    it('should successfully logout authenticated user', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should reject logout without authentication', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe(APIErrorCode.UNAUTHORIZED);
    });

    it('should invalidate token after logout', async () => {
      // Logout first
      await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Attempt to use same token
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(401);

      expect(response.body.error.code).toBe(APIErrorCode.UNAUTHORIZED);
    });
  });

  describe('POST /api/auth/reset-password', () => {
    beforeEach(async () => {
      await request(app)
        .post('/api/auth/register')
        .send(testUser);
    });

    it('should initiate password reset for valid email', async () => {
      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({ email: testUser.email })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should not reveal user existence for invalid email', async () => {
      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({ email: 'nonexistent@example.com' })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should enforce rate limiting for password reset requests', async () => {
      const requests = Array(51).fill(null).map(() =>
        request(app)
          .post('/api/auth/reset-password')
          .send({ email: testUser.email })
      );

      const responses = await Promise.all(requests);
      const rateLimited = responses.some(res => res.status === 429);
      expect(rateLimited).toBe(true);
    });
  });

  describe('GET /api/auth/verify-email', () => {
    it('should verify email with valid token', async () => {
      const response = await request(app)
        .get('/api/auth/verify-email')
        .query({ token: 'valid-verification-token' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.verified).toBe(true);
    });

    it('should reject invalid verification tokens', async () => {
      const response = await request(app)
        .get('/api/auth/verify-email')
        .query({ token: 'invalid-token' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe(APIErrorCode.VALIDATION_ERROR);
    });

    it('should enforce rate limiting for verification attempts', async () => {
      const requests = Array(51).fill(null).map(() =>
        request(app)
          .get('/api/auth/verify-email')
          .query({ token: 'test-token' })
      );

      const responses = await Promise.all(requests);
      const rateLimited = responses.some(res => res.status === 429);
      expect(rateLimited).toBe(true);
    });
  });
});