/**
 * Express router configuration for tax optimization scenario endpoints
 * Implements secure RESTful routes with comprehensive middleware chains
 * @version 1.0.0
 */

import express, { Router } from 'express'; // v4.18.2
import helmet from 'helmet'; // v7.0.0
import rateLimit from 'express-rate-limit'; // v6.7.0
import winston from 'winston'; // v3.8.2
import { ScenarioController } from '../controllers/scenario.controller';
import { authenticateRequest } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import { scenarioCreationSchema, scenarioUpdateSchema } from '../utils/validators/scenario.validator';

// Constants for route configuration
const ROUTE_PREFIX = '/scenarios';

// Rate limiting configurations per endpoint
const RATE_LIMITS = {
  CREATE: '100/hour',
  READ: '1000/hour',
  UPDATE: '100/hour',
  DELETE: '50/hour'
};

// Initialize logger for audit logging
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'scenario-routes.log' })
  ]
});

/**
 * Configures and returns Express router with secured scenario endpoints
 * @param scenarioController Initialized scenario controller instance
 * @returns Configured Express router
 */
const router: Router = express.Router();

// Apply security headers
router.use(helmet());

// Create scenario endpoint with rate limiting and validation
router.post('/',
  rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 100,
    message: 'Too many scenario creation attempts, please try again later'
  }),
  authenticateRequest,
  validateRequest(scenarioCreationSchema),
  async (req, res, next) => {
    try {
      logger.info('Scenario creation attempt', {
        userId: req.user?.id,
        requestId: req.headers['x-request-id']
      });
      await scenarioController.createScenario(req, res);
    } catch (error) {
      next(error);
    }
  }
);

// Get all scenarios for user with rate limiting
router.get('/',
  rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 1000,
    message: 'Too many scenario list requests, please try again later'
  }),
  authenticateRequest,
  async (req, res, next) => {
    try {
      logger.info('Scenario list request', {
        userId: req.user?.id,
        requestId: req.headers['x-request-id']
      });
      await scenarioController.getUserScenarios(req, res);
    } catch (error) {
      next(error);
    }
  }
);

// Get specific scenario by ID with rate limiting
router.get('/:id',
  rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 1000,
    message: 'Too many scenario retrieval attempts, please try again later'
  }),
  authenticateRequest,
  async (req, res, next) => {
    try {
      logger.info('Scenario retrieval attempt', {
        userId: req.user?.id,
        scenarioId: req.params.id,
        requestId: req.headers['x-request-id']
      });
      await scenarioController.getScenario(req, res);
    } catch (error) {
      next(error);
    }
  }
);

// Update scenario with rate limiting and validation
router.put('/:id',
  rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 100,
    message: 'Too many scenario update attempts, please try again later'
  }),
  authenticateRequest,
  validateRequest(scenarioUpdateSchema),
  async (req, res, next) => {
    try {
      logger.info('Scenario update attempt', {
        userId: req.user?.id,
        scenarioId: req.params.id,
        requestId: req.headers['x-request-id']
      });
      await scenarioController.updateScenario(req, res);
    } catch (error) {
      next(error);
    }
  }
);

// Delete scenario with rate limiting
router.delete('/:id',
  rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 50,
    message: 'Too many scenario deletion attempts, please try again later'
  }),
  authenticateRequest,
  async (req, res, next) => {
    try {
      logger.info('Scenario deletion attempt', {
        userId: req.user?.id,
        scenarioId: req.params.id,
        requestId: req.headers['x-request-id']
      });
      await scenarioController.deleteScenario(req, res);
    } catch (error) {
      next(error);
    }
  }
);

export default router;