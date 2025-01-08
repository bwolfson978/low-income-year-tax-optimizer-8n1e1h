import { RateLimiterMemory } from 'rate-limiter-flexible'; // v3.0.0
import { API_RATE_LIMITS } from '../../config/constants';

// Global constants for rate limiting configuration
const DEFAULT_POINTS = 1;
const DEFAULT_DURATION = 3600; // 1 hour in seconds
const DEFAULT_BLOCK_DURATION = 3600; // 1 hour in seconds
const MAX_POINTS = 1000;
const MAX_DURATION = 86400; // 24 hours in seconds

/**
 * Configuration class for rate limiter settings with validation and serialization support
 */
export class RateLimiterConfig {
    private points: number;
    private duration: number;
    private blockDuration: number;
    private allowlist: string[];
    private errorMessage: string;

    /**
     * Creates a new rate limiter configuration with validation
     * @param options Configuration options
     */
    constructor(options: {
        points?: number;
        duration?: number;
        blockDuration?: number;
        allowlist?: string[];
        errorMessage?: string;
    } = {}) {
        // Validate and set points
        if (options.points && (options.points <= 0 || options.points > MAX_POINTS)) {
            throw new Error(`Points must be between 1 and ${MAX_POINTS}`);
        }
        this.points = options.points || DEFAULT_POINTS;

        // Validate and set duration
        if (options.duration && (options.duration <= 0 || options.duration > MAX_DURATION)) {
            throw new Error(`Duration must be between 1 and ${MAX_DURATION} seconds`);
        }
        this.duration = options.duration || DEFAULT_DURATION;

        // Validate and set block duration
        if (options.blockDuration && options.blockDuration <= 0) {
            throw new Error('Block duration must be positive');
        }
        this.blockDuration = options.blockDuration || DEFAULT_BLOCK_DURATION;

        // Initialize allowlist
        this.allowlist = options.allowlist || [];

        // Set custom error message
        this.errorMessage = options.errorMessage || 'Too many requests';
    }

    /**
     * Returns the current rate limiter configuration
     */
    public getConfig(): {
        points: number;
        duration: number;
        blockDuration: number;
        allowlist: string[];
        errorMessage: string;
    } {
        return {
            points: this.points,
            duration: this.duration,
            blockDuration: this.blockDuration,
            allowlist: [...this.allowlist],
            errorMessage: this.errorMessage,
        };
    }

    /**
     * Checks if an IP or user ID is in the allowlist
     * @param identifier IP address or user ID to check
     */
    public isAllowed(identifier: string): boolean {
        return this.allowlist.includes(identifier);
    }

    /**
     * Serializes configuration for storage or transmission
     */
    public serialize(): string {
        return JSON.stringify(this.getConfig());
    }
}

/**
 * Factory function that creates a new rate limiter instance with enhanced error handling and logging
 * @param options Rate limiter configuration options
 */
export function createRateLimiter(options: {
    points?: number;
    duration?: number;
    blockDuration?: number;
    allowlist?: string[];
    errorMessage?: string;
}): RateLimiterMemory {
    const config = new RateLimiterConfig(options);
    const { points, duration, blockDuration } = config.getConfig();

    const limiter = new RateLimiterMemory({
        points,
        duration,
        blockDuration,
        keyPrefix: 'rl',
        execEvenly: true,
        execEvenlyMinDelayMs: 50,
    });

    // Set up error handling
    limiter.on('error', (error) => {
        console.error('[RateLimiter] Error:', error);
    });

    // Configure automatic cleanup of expired records
    setInterval(() => {
        try {
            limiter.clearExpired();
        } catch (error) {
            console.error('[RateLimiter] Cleanup error:', error);
        }
    }, Math.min(duration * 1000, 3600000)); // Run cleanup at duration or max 1 hour

    return limiter;
}

/**
 * Returns rate limit configuration for specific endpoint with environment override support
 * @param endpoint API endpoint name
 */
export function getRateLimitByEndpoint(endpoint: string): {
    points: number;
    duration: number;
    blockDuration: number;
} {
    // Check for environment variable overrides
    const envPoints = process.env[`RATE_LIMIT_${endpoint.toUpperCase()}_POINTS`];
    const envDuration = process.env[`RATE_LIMIT_${endpoint.toUpperCase()}_DURATION`];

    // Get endpoint configuration from constants
    const endpointConfig = API_RATE_LIMITS[endpoint];
    if (!endpointConfig) {
        // Return default configuration if endpoint not specifically configured
        return {
            points: DEFAULT_POINTS,
            duration: DEFAULT_DURATION,
            blockDuration: DEFAULT_BLOCK_DURATION,
        };
    }

    return {
        points: envPoints ? parseInt(envPoints, 10) : endpointConfig.requests,
        duration: envDuration ? parseInt(envDuration, 10) : endpointConfig.windowSeconds,
        blockDuration: DEFAULT_BLOCK_DURATION,
    };
}