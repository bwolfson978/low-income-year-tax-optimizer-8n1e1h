import express from 'express'; // ^4.18.2
import helmet from 'helmet'; // ^7.0.0
import cors from 'cors'; // ^2.8.5
import { CalculationController } from '../controllers/calculation.controller';
import { authenticateRequest } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import { rateLimitMiddleware } from '../middleware/rate-limit.middleware';
import { calculationParametersSchema } from '../utils/validators/calculation.validator';
import { errorHandler } from '../middleware/error.middleware';
import { requestLogger } from '../middleware/logging.middleware';

/**
 * Router configuration for tax optimization calculation endpoints
 * Implements secure, rate-limited routes with comprehensive validation
 * @version 1.0.0
 */
const router = express.Router();

// Initialize controller
const calculationController = new CalculationController();

/**
 * POST /api/v1/calculate
 * Endpoint for initiating tax optimization calculations
 * Rate limit: 50 requests per hour
 * Requires authentication and request validation
 */
router.post(
  '/api/v1/calculate',
  requestLogger,
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'"],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"]
      }
    },
    crossOriginEmbedderPolicy: true,
    crossOriginOpenerPolicy: true,
    crossOriginResourcePolicy: { policy: "same-site" },
    dnsPrefetchControl: true,
    frameguard: { action: 'deny' },
    hidePoweredBy: true,
    hsts: true,
    ieNoOpen: true,
    noSniff: true,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    xssFilter: true
  }),
  cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || 'http://localhost:3000',
    methods: ['POST'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining'],
    credentials: true,
    maxAge: 600 // 10 minutes
  }),
  authenticateRequest,
  rateLimitMiddleware,
  validateRequest(calculationParametersSchema),
  errorHandler,
  calculationController.calculateOptimalStrategy
);

/**
 * GET /api/v1/calculate/:id/status
 * Endpoint for checking calculation status
 * Rate limit: 50 requests per hour
 * Requires authentication
 */
router.get(
  '/api/v1/calculate/:id/status',
  requestLogger,
  helmet(),
  cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || 'http://localhost:3000',
    methods: ['GET'],
    allowedHeaders: ['Authorization'],
    exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining'],
    credentials: true,
    maxAge: 600
  }),
  authenticateRequest,
  rateLimitMiddleware,
  errorHandler,
  calculationController.getCalculationStatus
);

/**
 * Health check endpoint for monitoring
 * No authentication required, but rate limited
 */
router.get(
  '/api/v1/calculate/health',
  requestLogger,
  helmet(),
  cors(),
  rateLimitMiddleware,
  (req, res) => {
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.API_VERSION || '1.0.0'
    });
  }
);

export default router;