import request from 'supertest';
import { expect } from 'jest';
import jwt from 'jsonwebtoken';
import app from '../../src/app';
import { CalculationParameters, CalculationResponse } from '../../src/types/calculation.types';
import { FilingStatus } from '../../src/types/tax.types';

// Test constants
const TEST_TIMEOUT = 30000;
const VALID_SCENARIO_ID = 'test-scenario-id';
const TEST_AUTH_TOKEN = 'test-auth-token';
const PERFORMANCE_THRESHOLD_MS = 500;

describe('Calculation API Integration Tests', () => {
  let authToken: string;

  beforeAll(async () => {
    // Generate valid JWT token for testing
    authToken = jwt.sign(
      { id: 'test-user-id', email: 'test@example.com' },
      process.env.JWT_PRIVATE_KEY || 'test-key',
      { algorithm: 'RS256' }
    );
  });

  describe('POST /api/calculate', () => {
    const validParams: CalculationParameters = {
      traditionalIRABalance: 100000,
      rothIRABalance: 50000,
      capitalGains: 25000,
      taxState: 'CA',
      filingStatus: FilingStatus.SINGLE
    };

    test('should return 200 and valid calculation results for valid input', async () => {
      const startTime = Date.now();

      const response = await request(app)
        .post('/api/calculate')
        .set('Authorization', `Bearer ${authToken}`)
        .send(validParams);

      const processingTime = Date.now() - startTime;

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();

      // Validate calculation accuracy
      const result = response.body.data;
      expect(result.rothConversion).toBeDefined();
      expect(result.capitalGainsHarvesting).toBeDefined();
      expect(result.taxImpact).toBeDefined();
      expect(result.npv).toBeDefined();

      // Verify calculation precision (99.9% accuracy requirement)
      expect(Number.isFinite(result.rothConversion.recommendedAmount)).toBe(true);
      expect(Number.isFinite(result.rothConversion.taxSavings)).toBe(true);
      expect(result.rothConversion.confidenceScore).toBeGreaterThanOrEqual(0.999);

      // Verify performance requirement (<500ms)
      expect(processingTime).toBeLessThan(PERFORMANCE_THRESHOLD_MS);
    }, TEST_TIMEOUT);

    test('should return 400 for invalid parameters', async () => {
      const invalidParams = {
        ...validParams,
        traditionalIRABalance: -1000 // Invalid negative balance
      };

      const response = await request(app)
        .post('/api/calculate')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidParams);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    test('should return 401 for unauthorized request', async () => {
      const response = await request(app)
        .post('/api/calculate')
        .send(validParams);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });

    test('should complete calculation within performance SLA', async () => {
      const startTime = Date.now();

      const response = await request(app)
        .post('/api/calculate')
        .set('Authorization', `Bearer ${authToken}`)
        .send(validParams);

      const processingTime = Date.now() - startTime;

      expect(response.status).toBe(200);
      expect(processingTime).toBeLessThan(PERFORMANCE_THRESHOLD_MS);
      expect(response.body.metadata.processingTime).toBeLessThan(PERFORMANCE_THRESHOLD_MS);
    });

    test('should handle rate limiting correctly', async () => {
      // Send multiple requests to trigger rate limit
      const requests = Array(60).fill(null).map(() => 
        request(app)
          .post('/api/calculate')
          .set('Authorization', `Bearer ${authToken}`)
          .send(validParams)
      );

      const responses = await Promise.all(requests);
      const rateLimitedResponse = responses[responses.length - 1];

      expect(rateLimitedResponse.status).toBe(429);
      expect(rateLimitedResponse.body.error.code).toBe('RATE_LIMIT_EXCEEDED');
      expect(rateLimitedResponse.headers['retry-after']).toBeDefined();
    });

    test('should validate all required parameters', async () => {
      const incompleteParams = {
        traditionalIRABalance: 100000,
        rothIRABalance: 50000
        // Missing required parameters
      };

      const response = await request(app)
        .post('/api/calculate')
        .set('Authorization', `Bearer ${authToken}`)
        .send(incompleteParams);

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.details).toBeDefined();
    });

    test('should handle edge case calculations accurately', async () => {
      const edgeCaseParams = {
        ...validParams,
        traditionalIRABalance: 5000000, // Maximum allowed balance
        rothIRABalance: 0,
        capitalGains: 5000000 // Maximum allowed gains
      };

      const response = await request(app)
        .post('/api/calculate')
        .set('Authorization', `Bearer ${authToken}`)
        .send(edgeCaseParams);

      expect(response.status).toBe(200);
      expect(response.body.data.rothConversion).toBeDefined();
      expect(response.body.data.capitalGainsHarvesting).toBeDefined();
      expect(Number.isFinite(response.body.data.npv)).toBe(true);
    });
  });

  describe('GET /api/calculate/:id/status', () => {
    test('should return current calculation status', async () => {
      const response = await request(app)
        .get(`/api/calculate/${VALID_SCENARIO_ID}/status`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.status).toBeDefined();
      expect(response.body.data.progress).toBeDefined();
      expect(response.body.data.estimatedCompletionTime).toBeDefined();
    });

    test('should return 404 for non-existent calculation', async () => {
      const response = await request(app)
        .get('/api/calculate/invalid-id/status')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });
  });
});