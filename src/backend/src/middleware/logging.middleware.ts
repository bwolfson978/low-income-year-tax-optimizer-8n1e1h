import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import pino from 'pino';
import { APIMetadata } from '../types/api.types';

// Initialize pino logger with ISO timestamps and custom level formatting
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => ({ level: label })
  },
  timestamp: pino.stdTimeFunctions.isoTime
});

/**
 * Sanitizes sensitive data from request objects before logging
 * @param obj Object to sanitize
 * @returns Sanitized object safe for logging
 */
const sanitizeRequest = (obj: Record<string, any>): Record<string, any> => {
  const sensitiveFields = ['password', 'token', 'authorization', 'cookie'];
  const sanitized = { ...obj };
  
  Object.keys(sanitized).forEach(key => {
    if (sensitiveFields.includes(key.toLowerCase())) {
      sanitized[key] = '[REDACTED]';
    }
  });
  
  return sanitized;
};

/**
 * Express middleware for comprehensive request/response logging with performance tracking
 * Implements request correlation, timing metrics, and security audit trails
 */
const loggingMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  try {
    // Generate unique request ID for correlation
    const requestId = uuidv4();
    
    // Capture request start time using high-resolution timer
    const startTime = process.hrtime.bigint();
    
    // Add correlation ID to response headers
    res.setHeader('X-Request-ID', requestId);
    
    // Log sanitized request details
    logger.info({
      type: 'request',
      requestId,
      method: req.method,
      path: req.path,
      query: sanitizeRequest(req.query),
      headers: sanitizeRequest(req.headers),
      ip: req.ip,
      userAgent: req.get('user-agent')
    }, 'Incoming request');
    
    // Capture original response end method
    const originalEnd = res.end;
    
    // Override response end method to intercept and log response details
    res.end = function(chunk?: any, encoding?: string | undefined, callback?: (() => void) | undefined): Response {
      try {
        // Calculate precise processing time
        const endTime = process.hrtime.bigint();
        const processingTime = Number(endTime - startTime) / 1e6; // Convert to milliseconds
        
        // Create response metadata
        const metadata: APIMetadata = {
          timestamp: new Date(),
          requestId,
          processingTime,
          version: process.env.API_VERSION || '1.0.0'
        };
        
        // Add metadata to response
        res.locals.metadata = metadata;
        
        // Log response details
        logger.info({
          type: 'response',
          requestId,
          statusCode: res.statusCode,
          processingTime,
          contentLength: res.get('content-length'),
          metadata
        }, 'Response completed');
        
        // Memory usage tracking for performance monitoring
        if (process.env.NODE_ENV === 'development') {
          const memoryUsage = process.memoryUsage();
          logger.debug({
            type: 'performance',
            requestId,
            heapUsed: memoryUsage.heapUsed,
            heapTotal: memoryUsage.heapTotal,
            external: memoryUsage.external,
            rss: memoryUsage.rss
          }, 'Memory usage stats');
        }
        
        // Restore original end method and complete response
        res.end = originalEnd;
        return originalEnd.call(this, chunk, encoding, callback);
        
      } catch (error) {
        // Log error but don't throw to prevent response corruption
        logger.error({
          type: 'error',
          requestId,
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined
        }, 'Error in response logging');
        
        // Restore original end method and complete response
        res.end = originalEnd;
        return originalEnd.call(this, chunk, encoding, callback);
      }
    };
    
    next();
    
  } catch (error) {
    // Log error but continue request processing
    logger.error({
      type: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, 'Error in logging middleware');
    
    next();
  }
};

export default loggingMiddleware;