import supertest from 'supertest';
import { describe, beforeAll, afterAll, beforeEach, afterEach, it, expect } from '@jest/globals';
import jwt from 'jsonwebtoken';
import { faker } from '@faker-js/faker';
import { DataSource } from 'typeorm';
import app from '../../src/app';
import { ScenarioService } from '../../src/services/scenario.service';
import { FilingStatus } from '../../types/tax.types';
import { APIErrorCode } from '../../types/api.types';
import { VALIDATION_RULES } from '../../config/constants';

describe('Scenario API Integration Tests', () => {
  let testDataSource: DataSource;
  let authToken: string;
  let testUserId: string;

  // Test scenario data generator
  const createTestScenarioData = () => ({
    trad_ira_balance: faker.number.float({ min: 0, max: VALIDATION_RULES.MAX_TRAD_BALANCE }),
    roth_ira_balance: faker.number.float({ min: 0, max: VALIDATION_RULES.MAX_ROTH_BALANCE }),
    capital_gains: faker.number.float({ min: 0, max: VALIDATION_RULES.MAX_CAPITAL_GAINS }),
    tax_state: faker.helpers.arrayElement(['CA', 'NY', 'TX', 'FL']),
    filing_status: faker.helpers.arrayElement(Object.values(FilingStatus)),
    time_horizon: faker.number.int({ min: 1, max: 40 }),
    risk_tolerance: faker.number.int({ min: 1, max: 5 })
  });

  beforeAll(async () => {
    // Initialize test database connection
    testDataSource = new DataSource({
      type: 'postgres',
      url: process.env.TEST_DATABASE_URL,
      synchronize: true,
      logging: false
    });
    await testDataSource.initialize();

    // Create test user and generate auth token
    testUserId = faker.string.uuid();
    authToken = jwt.sign(
      { sub: testUserId, email: 'test@example.com' },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );
  });

  afterAll(async () => {
    await testDataSource.destroy();
  });

  beforeEach(async () => {
    // Start transaction for test isolation
    await testDataSource.query('BEGIN');
  });

  afterEach(async () => {
    // Rollback transaction after each test
    await testDataSource.query('ROLLBACK');
  });

  describe('Authentication and Authorization', () => {
    it('should reject requests without valid JWT token', async () => {
      const response = await supertest(app)
        .post('/api/v1/scenarios')
        .send(createTestScenarioData());

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe(APIErrorCode.UNAUTHORIZED);
    });

    it('should reject expired tokens', async () => {
      const expiredToken = jwt.sign(
        { sub: testUserId, email: 'test@example.com' },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '0s' }
      );

      const response = await supertest(app)
        .post('/api/v1/scenarios')
        .set('Authorization', `Bearer ${expiredToken}`)
        .send(createTestScenarioData());

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe(APIErrorCode.UNAUTHORIZED);
    });

    it('should enforce rate limits', async () => {
      const requests = Array(101).fill(null).map(() => 
        supertest(app)
          .post('/api/v1/scenarios')
          .set('Authorization', `Bearer ${authToken}`)
          .send(createTestScenarioData())
      );

      const responses = await Promise.all(requests);
      const rateLimitedResponse = responses[responses.length - 1];

      expect(rateLimitedResponse.status).toBe(429);
      expect(rateLimitedResponse.body.error.code).toBe(APIErrorCode.RATE_LIMIT_EXCEEDED);
    });
  });

  describe('Scenario Creation', () => {
    it('should create valid scenario', async () => {
      const scenarioData = createTestScenarioData();
      const response = await supertest(app)
        .post('/api/v1/scenarios')
        .set('Authorization', `Bearer ${authToken}`)
        .send(scenarioData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        user_id: testUserId,
        ...scenarioData
      });
    });

    it('should validate all required fields', async () => {
      const invalidData = {
        trad_ira_balance: -1000,
        roth_ira_balance: VALIDATION_RULES.MAX_ROTH_BALANCE + 1,
        tax_state: 'INVALID'
      };

      const response = await supertest(app)
        .post('/api/v1/scenarios')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData);

      expect(response.status).toBe(422);
      expect(response.body.error.code).toBe(APIErrorCode.VALIDATION_ERROR);
      expect(response.body.error.details).toBeTruthy();
    });

    it('should handle concurrent creations', async () => {
      const requests = Array(5).fill(null).map(() =>
        supertest(app)
          .post('/api/v1/scenarios')
          .set('Authorization', `Bearer ${authToken}`)
          .send(createTestScenarioData())
      );

      const responses = await Promise.all(requests);
      const successfulResponses = responses.filter(r => r.status === 201);

      expect(successfulResponses.length).toBe(5);
      expect(new Set(successfulResponses.map(r => r.body.data.id)).size).toBe(5);
    });
  });

  describe('Scenario Retrieval', () => {
    let testScenarioId: string;

    beforeEach(async () => {
      // Create test scenario
      const response = await supertest(app)
        .post('/api/v1/scenarios')
        .set('Authorization', `Bearer ${authToken}`)
        .send(createTestScenarioData());

      testScenarioId = response.body.data.id;
    });

    it('should retrieve existing scenario', async () => {
      const response = await supertest(app)
        .get(`/api/v1/scenarios/${testScenarioId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(testScenarioId);
    });

    it('should handle non-existent scenarios', async () => {
      const response = await supertest(app)
        .get(`/api/v1/scenarios/${faker.string.uuid()}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe(APIErrorCode.NOT_FOUND);
    });

    it('should enforce access control', async () => {
      const otherUserToken = jwt.sign(
        { sub: faker.string.uuid(), email: 'other@example.com' },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '1h' }
      );

      const response = await supertest(app)
        .get(`/api/v1/scenarios/${testScenarioId}`)
        .set('Authorization', `Bearer ${otherUserToken}`);

      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe(APIErrorCode.FORBIDDEN);
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors', async () => {
      await testDataSource.destroy();

      const response = await supertest(app)
        .post('/api/v1/scenarios')
        .set('Authorization', `Bearer ${authToken}`)
        .send(createTestScenarioData());

      expect(response.status).toBe(500);
      expect(response.body.error.code).toBe(APIErrorCode.INTERNAL_ERROR);

      // Reconnect database for subsequent tests
      await testDataSource.initialize();
    });

    it('should handle validation errors', async () => {
      const invalidData = {
        trad_ira_balance: 'invalid',
        roth_ira_balance: null,
        tax_state: 123
      };

      const response = await supertest(app)
        .post('/api/v1/scenarios')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData);

      expect(response.status).toBe(422);
      expect(response.body.error.code).toBe(APIErrorCode.VALIDATION_ERROR);
    });

    it('should handle concurrent modifications', async () => {
      const scenarioResponse = await supertest(app)
        .post('/api/v1/scenarios')
        .set('Authorization', `Bearer ${authToken}`)
        .send(createTestScenarioData());

      const scenarioId = scenarioResponse.body.data.id;

      const updateRequests = Array(5).fill(null).map(() =>
        supertest(app)
          .put(`/api/v1/scenarios/${scenarioId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ trad_ira_balance: faker.number.float({ min: 0, max: 1000000 }) })
      );

      const responses = await Promise.all(updateRequests);
      const successfulUpdates = responses.filter(r => r.status === 200);
      const conflictErrors = responses.filter(r => r.status === 409);

      expect(successfulUpdates.length).toBeGreaterThan(0);
      expect(conflictErrors.length).toBeGreaterThan(0);
    });
  });
});