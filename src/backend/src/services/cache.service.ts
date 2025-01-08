import { kv } from '@vercel/kv'; // v1.0.0
import { cacheConfig } from '../config/cache';
import { APIResponse } from '../types/api.types';

/**
 * Interface for cache operation options
 */
interface CacheOptions {
  ttl?: number;
  compress?: boolean;
  region?: string;
}

/**
 * Interface for cache monitoring statistics
 */
interface CacheStats {
  hits: number;
  misses: number;
  hitRatio: number;
  averageLatency: number;
  errorRate: number;
  regionStats: Record<string, {
    hits: number;
    latency: number;
  }>;
}

/**
 * Interface for cache warmup configuration
 */
interface WarmupConfig {
  keys: string[];
  dataFetcher: (key: string) => Promise<unknown>;
  region?: string;
}

/**
 * Service class implementing edge caching functionality using Vercel KV (Redis)
 * Provides region-aware caching with monitoring and performance optimization
 * @version 1.0.0
 */
export class CacheService {
  private client: typeof kv;
  private ttl: number;
  private region: string;
  private stats: CacheStats;
  private lastHealthCheck: Date;

  /**
   * Initialize cache service with region awareness and monitoring
   * @param region Optional region identifier for edge caching
   */
  constructor(region?: string) {
    this.client = cacheConfig.getClient(region);
    this.ttl = cacheConfig.getTTL();
    this.region = region || 'default';
    this.lastHealthCheck = new Date();
    this.stats = {
      hits: 0,
      misses: 0,
      hitRatio: 0,
      averageLatency: 0,
      errorRate: 0,
      regionStats: {
        [this.region]: {
          hits: 0,
          latency: 0
        }
      }
    };

    this.initializeMonitoring();
  }

  /**
   * Initialize cache monitoring and health checks
   * @private
   */
  private initializeMonitoring(): void {
    setInterval(() => {
      this.updateStats();
      this.performHealthCheck();
    }, 60000); // Run every minute
  }

  /**
   * Update cache performance statistics
   * @private
   */
  private updateStats(): void {
    const totalRequests = this.stats.hits + this.stats.misses;
    if (totalRequests > 0) {
      this.stats.hitRatio = this.stats.hits / totalRequests;
    }
  }

  /**
   * Perform cache health check
   * @private
   */
  private async performHealthCheck(): Promise<void> {
    try {
      const startTime = Date.now();
      await this.client.set(
        cacheConfig.createCacheKey('health_check'),
        'ok',
        { ex: 60 }
      );
      const latency = Date.now() - startTime;
      
      this.stats.regionStats[this.region].latency = 
        (this.stats.regionStats[this.region].latency + latency) / 2;
      this.lastHealthCheck = new Date();
    } catch (error) {
      this.stats.errorRate++;
      console.error('Cache health check failed:', error);
    }
  }

  /**
   * Retrieve value from cache with monitoring
   * @param key Cache key
   * @param options Cache operation options
   * @returns Promise resolving to cached value or null
   */
  public async get<T>(key: string, options?: CacheOptions): Promise<T | null> {
    const startTime = Date.now();
    try {
      const cacheKey = cacheConfig.createCacheKey(key);
      const value = await this.client.get(cacheKey);

      if (value !== null) {
        this.stats.hits++;
        this.stats.regionStats[this.region].hits++;
      } else {
        this.stats.misses++;
      }

      this.stats.averageLatency = 
        (this.stats.averageLatency + (Date.now() - startTime)) / 2;

      return value as T;
    } catch (error) {
      this.stats.errorRate++;
      console.error('Cache get operation failed:', error);
      return null;
    }
  }

  /**
   * Store value in cache with monitoring
   * @param key Cache key
   * @param value Value to cache
   * @param options Cache operation options
   */
  public async set<T>(key: string, value: T, options?: CacheOptions): Promise<void> {
    const startTime = Date.now();
    try {
      const cacheKey = cacheConfig.createCacheKey(key);
      const ttl = options?.ttl || this.ttl;

      await this.client.set(cacheKey, value, { ex: ttl });

      this.stats.averageLatency = 
        (this.stats.averageLatency + (Date.now() - startTime)) / 2;
    } catch (error) {
      this.stats.errorRate++;
      console.error('Cache set operation failed:', error);
    }
  }

  /**
   * Warm up cache with frequently accessed data
   * @param config Warmup configuration
   */
  public async warmCache(config: WarmupConfig): Promise<void> {
    try {
      const operations = config.keys.map(async (key) => {
        const value = await config.dataFetcher(key);
        if (value !== null) {
          await this.set(key, value, { region: config.region });
        }
      });

      await Promise.all(operations);
    } catch (error) {
      console.error('Cache warmup failed:', error);
      throw error;
    }
  }

  /**
   * Get cache performance statistics
   * @returns Current cache statistics
   */
  public getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Delete value from cache
   * @param key Cache key
   */
  public async delete(key: string): Promise<void> {
    try {
      const cacheKey = cacheConfig.createCacheKey(key);
      await this.client.del(cacheKey);
    } catch (error) {
      console.error('Cache delete operation failed:', error);
      throw error;
    }
  }

  /**
   * Clear all cache entries with monitoring
   */
  public async clear(): Promise<void> {
    try {
      // Use SCAN instead of FLUSHALL for production safety
      const pattern = cacheConfig.createCacheKey('*');
      let cursor = 0;
      do {
        const [nextCursor, keys] = await this.client.scan(cursor, {
          match: pattern,
          count: 100
        });
        cursor = nextCursor;

        if (keys.length > 0) {
          await this.client.del(...keys);
        }
      } while (cursor !== 0);

      // Reset statistics
      this.stats.hits = 0;
      this.stats.misses = 0;
      this.stats.hitRatio = 0;
      this.stats.averageLatency = 0;
      this.stats.errorRate = 0;
      this.stats.regionStats[this.region] = {
        hits: 0,
        latency: 0
      };
    } catch (error) {
      console.error('Cache clear operation failed:', error);
      throw error;
    }
  }
}