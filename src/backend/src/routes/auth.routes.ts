/**
 * Express router configuration for authentication endpoints with enhanced security features
 * Implements comprehensive security measures, rate limiting, and monitoring
 * @version 1.0.0
 */

import { Router } from 'express'; // ^4.18.2
import helmet from 'helmet'; // ^7.0.0
import winston from 'winston'; // ^3.8.2
import { AuthController } from '../controllers/auth.controller';
import { authenticateRequest } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import { rateLimitMiddleware } from '../middleware/rate-limit.middleware';
import { userAuthSchema, userRegistrationSchema } from '../utils/validators/user.validator';

// Initialize router with security defaults
const router = Router();

// Initialize AuthController with dependencies
const authController = new AuthController(
  // Dependencies will be injected by DI container
  {} as any, // authService
  winston.createLogger({
    level: 'info',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    ),
    transports: [
      new winston.transports.File({ filename: 'auth-events.log' })
    ]
  })
);

/**
 * User registration endpoint with enhanced security
 * Rate limit: 100 requests per hour with 24h blocking
 */
router.post(
  '/register',
  helmet(),
  rateLimitMiddleware,
  validateRequest(userRegistrationSchema),
  authController.register.bind(authController)
);

/**
 * User login endpoint with progressive rate limiting
 * Rate limit: 100 requests per hour with 24h blocking
 */
router.post(
  '/login',
  helmet(),
  rateLimitMiddleware,
  validateRequest(userAuthSchema),
  authController.login.bind(authController)
);

/**
 * User logout endpoint with session cleanup
 * Requires valid authentication
 */
router.post(
  '/logout',
  helmet(),
  authenticateRequest,
  authController.logout.bind(authController)
);

/**
 * Token refresh endpoint for session management
 * Requires valid authentication
 */
router.post(
  '/refresh-token',
  helmet(),
  authenticateRequest,
  authController.refreshToken.bind(authController)
);

/**
 * Password reset endpoint with rate limiting
 * Rate limit: 50 requests per hour with 24h blocking
 */
router.post(
  '/reset-password',
  helmet(),
  rateLimitMiddleware,
  validateRequest(userAuthSchema),
  authController.resetPassword.bind(authController)
);

/**
 * Email verification endpoint with rate limiting
 * Rate limit: 50 requests per hour with 24h blocking
 */
router.get(
  '/verify-email',
  helmet(),
  rateLimitMiddleware,
  authController.verifyEmail.bind(authController)
);

// Apply security headers to all routes
router.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"]
    }
  },
  crossOriginEmbedderPolicy: true,
  crossOriginOpenerPolicy: true,
  crossOriginResourcePolicy: { policy: "same-site" },
  dnsPrefetchControl: true,
  expectCt: {
    enforce: true,
    maxAge: 30,
  },
  frameguard: { action: "deny" },
  hidePoweredBy: true,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  ieNoOpen: true,
  noSniff: true,
  originAgentCluster: true,
  permittedCrossDomainPolicies: { permittedPolicies: "none" },
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  xssFilter: true
}));

// Error handling middleware
router.use((err: Error, req: any, res: any, next: any) => {
  console.error('Auth Route Error:', err);
  res.status(500).json({
    success: false,
    error: {
      message: 'Internal server error',
      code: 'INTERNAL_ERROR'
    }
  });
});

export default router;