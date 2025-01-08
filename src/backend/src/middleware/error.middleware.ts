import { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import { APIResponse, APIError, APIErrorCode } from '../types/api.types';

/**
 * Custom application error class for handling operational errors
 * with proper typing and status code mapping
 */
export class ApplicationError extends Error {
  public readonly code: APIErrorCode;
  public readonly statusCode: number;
  public readonly details: Record<string, unknown>;

  constructor(
    message: string,
    code: APIErrorCode = APIErrorCode.INTERNAL_ERROR,
    statusCode: number = 500,
    details: Record<string, unknown> = {}
  ) {
    super(message);
    this.name = 'ApplicationError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = this.sanitizeErrorDetails(details);
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Sanitizes error details to prevent sensitive information exposure
   */
  private sanitizeErrorDetails(details: Record<string, unknown>): Record<string, unknown> {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(details)) {
      // Remove sensitive fields and stringify complex objects
      if (!this.isSensitiveField(key)) {
        sanitized[key] = typeof value === 'object' ? JSON.stringify(value) : value;
      }
    }
    return sanitized;
  }

  /**
   * Checks if a field name indicates sensitive information
   */
  private isSensitiveField(field: string): boolean {
    const sensitiveFields = ['password', 'token', 'secret', 'key', 'auth'];
    return sensitiveFields.some(sensitive => field.toLowerCase().includes(sensitive));
  }
}

/**
 * Maps API error codes to HTTP status codes
 */
const errorCodeToStatusMap: Record<APIErrorCode, number> = {
  [APIErrorCode.BAD_REQUEST]: 400,
  [APIErrorCode.UNAUTHORIZED]: 401,
  [APIErrorCode.FORBIDDEN]: 403,
  [APIErrorCode.NOT_FOUND]: 404,
  [APIErrorCode.VALIDATION_ERROR]: 422,
  [APIErrorCode.RATE_LIMIT_EXCEEDED]: 429,
  [APIErrorCode.INTERNAL_ERROR]: 500,
  [APIErrorCode.SERVICE_UNAVAILABLE]: 503,
  [APIErrorCode.GATEWAY_TIMEOUT]: 504,
};

/**
 * Global error handling middleware for standardized error responses
 * Processes both operational and programming errors into consistent API responses
 */
const errorMiddleware: ErrorRequestHandler = (
  err: Error | ApplicationError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Log error with context for monitoring
  console.error({
    timestamp: new Date().toISOString(),
    path: req.path,
    method: req.method,
    error: {
      name: err.name,
      message: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    },
    requestId: req.headers['x-request-id'],
    userId: (req as any).user?.id,
  });

  // Determine if error is operational (ApplicationError) or programming (unhandled)
  const isOperationalError = err instanceof ApplicationError;

  // Format error response
  const apiError: APIError = {
    code: isOperationalError ? (err as ApplicationError).code : APIErrorCode.INTERNAL_ERROR,
    message: isOperationalError ? err.message : 'An unexpected error occurred',
    details: isOperationalError ? (err as ApplicationError).details : null,
    stack: process.env.NODE_ENV === 'development' ? err.stack || null : null,
  };

  // Determine HTTP status code
  const statusCode = isOperationalError
    ? (err as ApplicationError).statusCode
    : errorCodeToStatusMap[apiError.code];

  // Construct API response
  const response: APIResponse = {
    success: false,
    data: null,
    error: apiError,
    metadata: {
      timestamp: new Date(),
      requestId: req.headers['x-request-id'] as string || 'unknown',
      processingTime: Date.now() - (req as any).startTime || 0,
      version: process.env.API_VERSION || '1.0.0',
    },
  };

  // Send response
  res.status(statusCode).json(response);

  // Ensure express knows we've handled the error
  next();
};

export default errorMiddleware;