/**
 * Express middleware for request validation using Yup schemas
 * Provides centralized validation with enhanced security features
 * @version 1.0.0
 */

import { Request, Response, NextFunction } from 'express'; // v4.18+
import { ValidationError } from 'yup'; // v1.3+
import { userAuthSchema, userRegistrationSchema } from '../utils/validators/user.validator';
import { scenarioCreationSchema, scenarioUpdateSchema } from '../utils/validators/scenario.validator';
import { calculationParametersSchema, optimizationConfigSchema } from '../utils/validators/calculation.validator';
import { APIErrorCode } from '../types/api.types';

// Constants for validation and security
const VALIDATION_ERROR_STATUS = 400;
const DEFAULT_ERROR_MESSAGE = 'Validation failed';
const MAX_REQUEST_SIZE = 1048576; // 1MB
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 100;

/**
 * Interface for structured validation error responses
 */
interface ValidationErrorResponse {
  status: number;
  message: string;
  errors: string[];
  code: APIErrorCode;
  timestamp: Date;
  path: string;
}

/**
 * Factory function that creates validation middleware with enhanced security features
 * @param schema - Yup validation schema
 * @param location - Request location to validate (body, query, params)
 * @returns Express middleware function
 */
export const validateRequest = (
  schema: any,
  location: 'body' | 'query' | 'params' = 'body'
) => {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      // Check request size
      const contentLength = parseInt(req.headers['content-length'] || '0');
      if (contentLength > MAX_REQUEST_SIZE) {
        throw new Error('Request size exceeds maximum allowed size');
      }

      // Get data to validate based on location
      const dataToValidate = req[location];

      // Input sanitization
      const sanitizedData = Object.keys(dataToValidate).reduce((acc, key) => {
        if (typeof dataToValidate[key] === 'string') {
          acc[key] = dataToValidate[key].trim();
        } else {
          acc[key] = dataToValidate[key];
        }
        return acc;
      }, {} as any);

      // Validate against schema
      await schema.validate(sanitizedData, {
        abortEarly: false,
        stripUnknown: true
      });

      // Update request with validated and sanitized data
      req[location] = sanitizedData;

      next();
    } catch (error) {
      // Handle validation errors
      if (error instanceof ValidationError) {
        const validationError: ValidationErrorResponse = {
          status: VALIDATION_ERROR_STATUS,
          message: DEFAULT_ERROR_MESSAGE,
          errors: error.errors,
          code: APIErrorCode.VALIDATION_ERROR,
          timestamp: new Date(),
          path: req.path
        };

        // Log validation failure for monitoring
        console.error('[Validation Error]', {
          path: req.path,
          method: req.method,
          errors: error.errors,
          timestamp: validationError.timestamp
        });

        res.status(VALIDATION_ERROR_STATUS).json(validationError);
        return;
      }

      // Handle other errors
      const errorResponse: ValidationErrorResponse = {
        status: VALIDATION_ERROR_STATUS,
        message: error instanceof Error ? error.message : DEFAULT_ERROR_MESSAGE,
        errors: [error instanceof Error ? error.message : DEFAULT_ERROR_MESSAGE],
        code: APIErrorCode.BAD_REQUEST,
        timestamp: new Date(),
        path: req.path
      };

      res.status(VALIDATION_ERROR_STATUS).json(errorResponse);
    }
  };
};

/**
 * Pre-configured validation middleware for common routes
 */
export const validateUserAuth = validateRequest(userAuthSchema);
export const validateUserRegistration = validateRequest(userRegistrationSchema);
export const validateScenarioCreation = validateRequest(scenarioCreationSchema);
export const validateScenarioUpdate = validateRequest(scenarioUpdateSchema);
export const validateCalculationParameters = validateRequest(calculationParametersSchema);
export const validateOptimizationConfig = validateRequest(optimizationConfigSchema);

/**
 * Middleware to validate request size
 */
export const validateRequestSize = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const contentLength = parseInt(req.headers['content-length'] || '0');
  if (contentLength > MAX_REQUEST_SIZE) {
    res.status(VALIDATION_ERROR_STATUS).json({
      status: VALIDATION_ERROR_STATUS,
      message: 'Request size exceeds maximum allowed size',
      errors: [`Maximum allowed size is ${MAX_REQUEST_SIZE} bytes`],
      code: APIErrorCode.BAD_REQUEST,
      timestamp: new Date(),
      path: req.path
    });
    return;
  }
  next();
};

/**
 * Rate limiting middleware
 */
const requestCounts = new Map<string, { count: number; resetTime: number }>();

export const rateLimitValidator = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const clientIp = req.ip;
  const now = Date.now();

  // Get or initialize request count for this IP
  let requestData = requestCounts.get(clientIp);
  if (!requestData || now > requestData.resetTime) {
    requestData = { count: 0, resetTime: now + RATE_LIMIT_WINDOW };
    requestCounts.set(clientIp, requestData);
  }

  // Check rate limit
  if (requestData.count >= RATE_LIMIT_MAX_REQUESTS) {
    res.status(429).json({
      status: 429,
      message: 'Too many requests',
      errors: ['Rate limit exceeded'],
      code: APIErrorCode.RATE_LIMIT_EXCEEDED,
      timestamp: new Date(),
      path: req.path
    });
    return;
  }

  // Increment request count
  requestData.count++;
  next();
};