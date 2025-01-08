import { Request, Response, NextFunction } from 'express';
import { CircuitBreaker } from 'opossum';
import { metrics } from '@opentelemetry/metrics';
import { API_RATE_LIMITS } from '../config/constants';
import { cacheConfig, createCacheKey } from '../config/cache';
import { ApplicationError } from './error.middleware';
import { APIErrorCode } from '../types/api.types';

/**
 * Enhanced error class for rate limit violations with detailed context
 * @version 1.0.0
 */
@metrics.track('rateLimitErrors')
export class RateLimitError extends ApplicationError {
  constructor(
    public readonly retryAfter: number,
    public readonly limit: number,
    public readonly remaining: number,
    public readonly endpoint: string,
    public readonly context: Record<string, unknown>
  ) {
    super(
      'Rate limit exceeded',
      APIErrorCode.RATE_LIMIT_EXCEEDED,
      429,
      {
        retryAfter,
        limit,
        remaining,
        endpoint,
        ...context
      }
    );
  }
}

/**
 * Factory function to create rate limiter middleware with high availability
 * @version 1.0.0
 */
@metrics.monitor('rateLimiterFactory')
const createRateLimiter = (
  endpoint: string,
  limit: number,
  windowMs: number,
  options: {
    skipFailedRequests?: boolean;
    keyGenerator?: (req: Request) => string;
  } = {}
) => {
  // Circuit breaker for Redis operations
  const breaker = new CircuitBreaker(
    async (key: string) => {
      const client = cacheConfig.getClient();
      const result = await client.incr(key);
      if (result === 1) {
        await client.expire(key, windowMs);
      }
      return result;
    },
    {
      timeout: 1000,
      errorThresholdPercentage: 50,
      resetTimeout: 30000
    }
  );

  // Monitoring setup
  const hitCounter = metrics.createCounter('rateLimiter.hits');
  const limitExceededCounter = metrics.createCounter('rateLimiter.exceeded');
  const latencyHistogram = metrics.createHistogram('rateLimiter.latency');

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const startTime = Date.now();
    try {
      // Generate rate limit key
      const ip = req.ip || req.socket.remoteAddress || 'unknown';
      const userId = (req as any).user?.id || 'anonymous';
      const key = options.keyGenerator?.(req) || 
        createCacheKey(`ratelimit:${endpoint}:${userId}:${ip}`);

      // Check Redis connection
      if (!await cacheConfig.isConnected()) {
        // Fallback to local cache if Redis is unavailable
        const localCache = cacheConfig.getLocalCache();
        const localCount = (localCache.get(key) as number) || 0;
        
        if (localCount >= limit) {
          throw new RateLimitError(
            windowMs,
            limit,
            0,
            endpoint,
            { ip, userId }
          );
        }
        
        localCache.set(key, localCount + 1, windowMs);
        hitCounter.add(1);
      } else {
        // Use Redis for distributed rate limiting
        const count = await breaker.fire(key);
        
        if (count > limit) {
          limitExceededCounter.add(1);
          throw new RateLimitError(
            windowMs,
            limit,
            0,
            endpoint,
            { ip, userId }
          );
        }

        hitCounter.add(1);
        
        // Set rate limit headers
        res.setHeader('X-RateLimit-Limit', limit);
        res.setHeader('X-RateLimit-Remaining', Math.max(0, limit - count));
        res.setHeader('X-RateLimit-Reset', Math.ceil(Date.now() / 1000) + windowMs);
      }

      // Track request latency
      latencyHistogram.record(Date.now() - startTime);
      
      next();
    } catch (error) {
      if (error instanceof RateLimitError) {
        next(error);
      } else {
        next(new ApplicationError(
          'Rate limiting error',
          APIErrorCode.INTERNAL_ERROR,
          500,
          { error: error instanceof Error ? error.message : 'Unknown error' }
        ));
      }
    }
  };
};

/**
 * Express middleware for distributed rate limiting with monitoring
 * @version 1.0.0
 */
@metrics.monitor('rateLimitMiddleware')
const rateLimitMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const path = req.path.split('/')[2] || 'default';
  const rateLimit = API_RATE_LIMITS[path] || API_RATE_LIMITS['default'];

  if (!rateLimit) {
    next();
    return;
  }

  const limiter = createRateLimiter(
    path,
    rateLimit.requests,
    rateLimit.windowSeconds,
    {
      skipFailedRequests: true,
      keyGenerator: (req) => {
        const ip = req.ip || req.socket.remoteAddress || 'unknown';
        const userId = (req as any).user?.id || 'anonymous';
        return createCacheKey(`ratelimit:${path}:${userId}:${ip}`);
      }
    }
  );

  await limiter(req, res, next);
};

export default rateLimitMiddleware;