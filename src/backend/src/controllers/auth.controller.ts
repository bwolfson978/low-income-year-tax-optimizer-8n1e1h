import { Request, Response, NextFunction } from 'express'; // ^4.18.2
import helmet from 'helmet'; // ^7.0.0
import { RateLimiterMemory } from 'rate-limiter-flexible'; // ^6.7.0
import { Logger } from 'winston'; // ^3.8.2
import { AuthService } from '../services/auth.service';
import { APIError, APIErrorCode, APIResponse } from '../types/api.types';
import { UserProfile, UserRegistrationRequest } from '../types/user.types';
import { createRateLimiter, getRateLimitByEndpoint } from '../utils/security/rate-limiter';
import { verifyToken } from '../utils/security/jwt';

/**
 * Enhanced authentication controller with comprehensive security features
 * @version 1.0.0
 */
export class AuthController {
  private readonly authService: AuthService;
  private readonly logger: Logger;
  private readonly rateLimiters: Map<string, RateLimiterMemory>;

  constructor(authService: AuthService, logger: Logger) {
    this.authService = authService;
    this.logger = logger;
    this.rateLimiters = new Map();

    // Initialize rate limiters for each endpoint
    ['register', 'login', 'resetPassword'].forEach(endpoint => {
      const config = getRateLimitByEndpoint(endpoint);
      this.rateLimiters.set(endpoint, createRateLimiter(config));
    });
  }

  /**
   * Handles user registration with enhanced security measures
   * @param req Express request object
   * @param res Express response object
   */
  public async register(
    req: Request<{}, {}, UserRegistrationRequest>,
    res: Response
  ): Promise<void> {
    try {
      const clientIp = req.ip;
      const rateLimiter = this.rateLimiters.get('register')!;

      // Apply rate limiting
      await rateLimiter.consume(clientIp);

      // Apply security headers
      helmet()(req, res, () => {});

      // Log registration attempt
      this.logger.info('Registration attempt', {
        ip: clientIp,
        email: req.body.email,
        userAgent: req.headers['user-agent']
      });

      const result = await this.authService.signUp({
        email: req.body.email,
        password: req.body.password,
        userAgent: req.headers['user-agent'] || 'unknown'
      });

      const response: APIResponse<{ user: UserProfile; token: string }> = {
        success: true,
        data: result,
        error: null,
        metadata: {
          timestamp: new Date(),
          requestId: req.headers['x-request-id'] as string,
          processingTime: 0,
          version: '1.0.0'
        }
      };

      res.status(201).json(response);
    } catch (error) {
      this.handleError(error, res);
    }
  }

  /**
   * Handles user login with security measures and rate limiting
   * @param req Express request object
   * @param res Express response object
   */
  public async login(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const clientIp = req.ip;
      const rateLimiter = this.rateLimiters.get('login')!;

      // Apply rate limiting
      await rateLimiter.consume(clientIp);

      // Apply security headers
      helmet()(req, res, () => {});

      const result = await this.authService.signIn({
        email: req.body.email,
        password: req.body.password,
        userAgent: req.headers['user-agent'] || 'unknown'
      });

      const response: APIResponse<{ user: UserProfile; token: string }> = {
        success: true,
        data: result,
        error: null,
        metadata: {
          timestamp: new Date(),
          requestId: req.headers['x-request-id'] as string,
          processingTime: 0,
          version: '1.0.0'
        }
      };

      res.status(200).json(response);
    } catch (error) {
      this.handleError(error, res);
    }
  }

  /**
   * Handles user logout with token invalidation
   * @param req Express request object
   * @param res Express response object
   */
  public async logout(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const token = req.headers.authorization?.split(' ')[1];
      if (!token) {
        throw new APIError({
          code: APIErrorCode.UNAUTHORIZED,
          message: 'No token provided',
          details: null,
          stack: null
        });
      }

      await this.authService.signOut(token);

      const response: APIResponse<null> = {
        success: true,
        data: null,
        error: null,
        metadata: {
          timestamp: new Date(),
          requestId: req.headers['x-request-id'] as string,
          processingTime: 0,
          version: '1.0.0'
        }
      };

      res.status(200).json(response);
    } catch (error) {
      this.handleError(error, res);
    }
  }

  /**
   * Handles password reset requests with rate limiting
   * @param req Express request object
   * @param res Express response object
   */
  public async resetPassword(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const clientIp = req.ip;
      const rateLimiter = this.rateLimiters.get('resetPassword')!;

      // Apply rate limiting
      await rateLimiter.consume(clientIp);

      await this.authService.resetPassword(req.body.email);

      const response: APIResponse<null> = {
        success: true,
        data: null,
        error: null,
        metadata: {
          timestamp: new Date(),
          requestId: req.headers['x-request-id'] as string,
          processingTime: 0,
          version: '1.0.0'
        }
      };

      res.status(200).json(response);
    } catch (error) {
      this.handleError(error, res);
    }
  }

  /**
   * Handles email verification with token validation
   * @param req Express request object
   * @param res Express response object
   */
  public async verifyEmail(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const token = req.query.token as string;
      if (!token) {
        throw new APIError({
          code: APIErrorCode.BAD_REQUEST,
          message: 'Verification token is required',
          details: null,
          stack: null
        });
      }

      const verified = await this.authService.verifyEmail(token);

      const response: APIResponse<{ verified: boolean }> = {
        success: true,
        data: { verified },
        error: null,
        metadata: {
          timestamp: new Date(),
          requestId: req.headers['x-request-id'] as string,
          processingTime: 0,
          version: '1.0.0'
        }
      };

      res.status(200).json(response);
    } catch (error) {
      this.handleError(error, res);
    }
  }

  /**
   * Middleware to verify authentication token
   * @param req Express request object
   * @param res Express response object
   * @param next Next function
   */
  public async authenticateToken(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const token = req.headers.authorization?.split(' ')[1];
      if (!token) {
        throw new APIError({
          code: APIErrorCode.UNAUTHORIZED,
          message: 'No token provided',
          details: null,
          stack: null
        });
      }

      const userProfile = await verifyToken(token, req.headers['user-agent'] || 'unknown');
      req.user = userProfile;
      next();
    } catch (error) {
      this.handleError(error, res);
    }
  }

  /**
   * Standardized error handler for authentication endpoints
   * @param error Error object
   * @param res Express response object
   */
  private handleError(error: unknown, res: Response): void {
    this.logger.error('Authentication error', { error });

    if (error instanceof APIError) {
      const response: APIResponse<null> = {
        success: false,
        data: null,
        error,
        metadata: {
          timestamp: new Date(),
          requestId: res.req.headers['x-request-id'] as string,
          processingTime: 0,
          version: '1.0.0'
        }
      };

      res.status(this.getHttpStatus(error.code)).json(response);
      return;
    }

    const apiError = new APIError({
      code: APIErrorCode.INTERNAL_ERROR,
      message: 'An unexpected error occurred',
      details: { error: error instanceof Error ? error.message : 'Unknown error' },
      stack: error instanceof Error ? error.stack : null
    });

    const response: APIResponse<null> = {
      success: false,
      data: null,
      error: apiError,
      metadata: {
        timestamp: new Date(),
        requestId: res.req.headers['x-request-id'] as string,
        processingTime: 0,
        version: '1.0.0'
      }
    };

    res.status(500).json(response);
  }

  /**
   * Maps API error codes to HTTP status codes
   * @param code API error code
   * @returns HTTP status code
   */
  private getHttpStatus(code: APIErrorCode): number {
    const statusMap: Record<APIErrorCode, number> = {
      [APIErrorCode.BAD_REQUEST]: 400,
      [APIErrorCode.UNAUTHORIZED]: 401,
      [APIErrorCode.FORBIDDEN]: 403,
      [APIErrorCode.NOT_FOUND]: 404,
      [APIErrorCode.VALIDATION_ERROR]: 422,
      [APIErrorCode.RATE_LIMIT_EXCEEDED]: 429,
      [APIErrorCode.INTERNAL_ERROR]: 500,
      [APIErrorCode.SERVICE_UNAVAILABLE]: 503,
      [APIErrorCode.GATEWAY_TIMEOUT]: 504
    };

    return statusMap[code] || 500;
  }
}