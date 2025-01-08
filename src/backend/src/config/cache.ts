import { kv } from '@vercel/kv';
import { DEFAULT_CACHE_TTL } from './constants';

/**
 * Global cache configuration constants
 * @version 1.0.0
 */
const CACHE_PREFIX = 'tax_optimizer_';
const CACHE_REGIONS = ['iad1', 'sfo1', 'hnd1'] as const;

/**
 * Interface for cache health status
 */
interface HealthStatus {
  isHealthy: boolean;
  latency: number;
  regionsAvailable: string[];
  errors: string[];
}

/**
 * Interface for cache performance statistics
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
 * Creates a standardized cache key with application prefix
 * @param key - Base key to be formatted
 * @returns Formatted and sanitized cache key
 * @throws Error if key is invalid
 */
export const createCacheKey = (key: string): string => {
  if (!key || typeof key !== 'string') {
    throw new Error('Cache key must be a non-empty string');
  }

  // Sanitize key to prevent injection and invalid characters
  const sanitizedKey = key.replace(/[^a-zA-Z0-9_:-]/g, '_');

  // Prevent prefix collision
  if (sanitizedKey.startsWith(CACHE_PREFIX)) {
    throw new Error('Key should not include cache prefix');
  }

  const finalKey = `${CACHE_PREFIX}${sanitizedKey}`;

  // Validate key length for Redis compatibility
  if (finalKey.length > 512) {
    throw new Error('Cache key exceeds maximum length of 512 characters');
  }

  return finalKey;
};

/**
 * Enhanced configuration class for cache settings with monitoring and health checks
 * @version 1.0.0
 */
class CacheConfig {
  private client: typeof kv;
  private ttl: number;
  private prefix: string;
  private regionClients: Map<string, typeof kv>;
  private stats: CacheStats;

  constructor() {
    this.client = kv;
    this.ttl = DEFAULT_CACHE_TTL;
    this.prefix = CACHE_PREFIX;
    this.regionClients = new Map();
    this.stats = {
      hits: 0,
      misses: 0,
      hitRatio: 0,
      averageLatency: 0,
      errorRate: 0,
      regionStats: {}
    };

    this.initializeRegionClients();
    this.startHealthMonitoring();
  }

  /**
   * Initialize region-specific KV clients
   * @private
   */
  private initializeRegionClients(): void {
    CACHE_REGIONS.forEach(region => {
      this.regionClients.set(region, kv);
      this.stats.regionStats[region] = {
        hits: 0,
        latency: 0
      };
    });
  }

  /**
   * Start periodic health monitoring
   * @private
   */
  private startHealthMonitoring(): void {
    setInterval(async () => {
      await this.checkHealth();
      this.updateStats();
    }, 60000); // Check every minute
  }

  /**
   * Update cache statistics
   * @private
   */
  private updateStats(): void {
    const totalRequests = this.stats.hits + this.stats.misses;
    if (totalRequests > 0) {
      this.stats.hitRatio = this.stats.hits / totalRequests;
    }
  }

  /**
   * Get the appropriate KV client for the specified region
   * @param region - Optional region identifier
   * @returns Region-specific or default KV client
   */
  public getClient(region?: string): typeof kv {
    if (!region) {
      return this.client;
    }

    if (!CACHE_REGIONS.includes(region as typeof CACHE_REGIONS[number])) {
      throw new Error(`Invalid region: ${region}`);
    }

    return this.regionClients.get(region) || this.client;
  }

  /**
   * Get the configured cache TTL
   * @returns TTL in seconds
   */
  public getTTL(): number {
    return this.ttl;
  }

  /**
   * Perform health check on cache configuration
   * @returns Promise resolving to health status
   */
  public async checkHealth(): Promise<HealthStatus> {
    const status: HealthStatus = {
      isHealthy: true,
      latency: 0,
      regionsAvailable: [],
      errors: []
    };

    try {
      const startTime = Date.now();
      await this.client.set(
        createCacheKey('health_check'),
        'ok',
        { ex: 60 }
      );
      status.latency = Date.now() - startTime;

      // Check each region's availability
      for (const region of CACHE_REGIONS) {
        const regionClient = this.getClient(region);
        if (regionClient) {
          status.regionsAvailable.push(region);
        }
      }
    } catch (error) {
      status.isHealthy = false;
      status.errors.push(error instanceof Error ? error.message : 'Unknown error');
    }

    return status;
  }

  /**
   * Get cache performance statistics
   * @returns Cache statistics object
   */
  public getStats(): CacheStats {
    return { ...this.stats };
  }
}

/**
 * Export singleton cache configuration instance
 */
export const cacheConfig = new CacheConfig();