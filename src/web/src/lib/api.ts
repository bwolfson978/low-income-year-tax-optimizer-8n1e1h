import axios, { AxiosInstance, AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';
import axiosRetry from 'axios-retry';
import {
  APIResponse,
  APIError,
  RequestConfig,
  HTTPMethod,
  APIErrorCode,
  PaginatedResponse
} from '../types/api.types';

// Constants for API client configuration
const DEFAULT_TIMEOUT = 10000;
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;
const CIRCUIT_BREAKER_THRESHOLD = 5;
const CIRCUIT_BREAKER_RESET_TIMEOUT = 30000;
const MAX_QUEUE_SIZE = 100;
const CACHE_TTL = 300000; // 5 minutes

// Circuit breaker state
interface CircuitBreakerState {
  failures: number;
  lastFailure: number;
  isOpen: boolean;
}

// Request queue interface
interface QueuedRequest {
  config: AxiosRequestConfig;
  resolve: (value: any) => void;
  reject: (error: any) => void;
  priority: number;
  timestamp: number;
}

// Cache interface
interface CacheEntry {
  data: any;
  timestamp: number;
}

class APIClient {
  private client: AxiosInstance;
  private circuitBreaker: CircuitBreakerState;
  private requestQueue: QueuedRequest[];
  private cache: Map<string, CacheEntry>;
  private processingQueue: boolean;

  constructor() {
    this.client = this.createAPIClient();
    this.circuitBreaker = { failures: 0, lastFailure: 0, isOpen: false };
    this.requestQueue = [];
    this.cache = new Map();
    this.processingQueue = false;
  }

  /**
   * Creates and configures an Axios instance with enhanced features
   */
  private createAPIClient(): AxiosInstance {
    const client = axios.create({
      timeout: DEFAULT_TIMEOUT,
      validateStatus: (status) => status >= 200 && status < 300,
    });

    // Configure retry logic
    axiosRetry(client, {
      retries: MAX_RETRIES,
      retryDelay: (retryCount) => {
        return retryCount * RETRY_DELAY; // Exponential backoff
      },
      retryCondition: (error: AxiosError) => {
        return axiosRetry.isNetworkOrIdempotentRequestError(error) &&
          !this.circuitBreaker.isOpen;
      }
    });

    // Request interceptor
    client.interceptors.request.use(
      async (config) => {
        if (this.circuitBreaker.isOpen) {
          throw new Error('Circuit breaker is open');
        }

        // Add request to queue if it's full
        if (this.requestQueue.length >= MAX_QUEUE_SIZE) {
          return new Promise((resolve, reject) => {
            this.requestQueue.push({
              config,
              resolve,
              reject,
              priority: config.headers?.['x-priority'] || 0,
              timestamp: Date.now()
            });
          });
        }

        return this.addAuthHeaders(config);
      },
      error => Promise.reject(error)
    );

    // Response interceptor
    client.interceptors.response.use(
      response => this.handleResponse(response),
      error => this.handleError(error)
    );

    return client;
  }

  /**
   * Adds authentication headers to requests
   */
  private async addAuthHeaders(config: AxiosRequestConfig): Promise<AxiosRequestConfig> {
    // Add any auth headers here
    return {
      ...config,
      headers: {
        ...config.headers,
        'Content-Type': 'application/json',
      }
    };
  }

  /**
   * Handles successful API responses
   */
  private handleResponse<T>(response: AxiosResponse): APIResponse<T> {
    const { data, config } = response;

    // Cache the response if caching is enabled
    if (config.method === 'GET' && config.headers?.['x-cache'] !== 'false') {
      this.cache.set(config.url!, {
        data,
        timestamp: Date.now()
      });
    }

    return {
      success: true,
      data,
      error: null,
      metadata: {
        timestamp: new Date(),
        requestId: response.headers['x-request-id'],
        processingTime: Number(response.headers['x-processing-time']),
        apiVersion: response.headers['x-api-version'],
        serverRegion: response.headers['x-server-region']
      }
    };
  }

  /**
   * Enhanced error handler with context enrichment
   */
  private handleError(error: AxiosError): Promise<APIError> {
    // Update circuit breaker state
    this.circuitBreaker.failures++;
    this.circuitBreaker.lastFailure = Date.now();

    if (this.circuitBreaker.failures >= CIRCUIT_BREAKER_THRESHOLD) {
      this.circuitBreaker.isOpen = true;
      setTimeout(() => this.resetCircuitBreaker(), CIRCUIT_BREAKER_RESET_TIMEOUT);
    }

    const apiError: APIError = {
      code: this.mapErrorCode(error.response?.status),
      message: error.response?.data?.message || error.message,
      details: {
        url: error.config?.url,
        method: error.config?.method,
        status: error.response?.status,
        timestamp: new Date(),
        requestId: error.response?.headers?.['x-request-id']
      },
      timestamp: new Date(),
      path: error.config?.url || ''
    };

    return Promise.reject(apiError);
  }

  /**
   * Maps HTTP status codes to API error codes
   */
  private mapErrorCode(status?: number): APIErrorCode {
    switch (status) {
      case 400: return APIErrorCode.BAD_REQUEST;
      case 401: return APIErrorCode.UNAUTHORIZED;
      case 403: return APIErrorCode.FORBIDDEN;
      case 404: return APIErrorCode.NOT_FOUND;
      case 429: return APIErrorCode.RATE_LIMIT_EXCEEDED;
      case 503: return APIErrorCode.SERVICE_UNAVAILABLE;
      case 504: return APIErrorCode.GATEWAY_TIMEOUT;
      default: return APIErrorCode.INTERNAL_ERROR;
    }
  }

  /**
   * Resets the circuit breaker state
   */
  private resetCircuitBreaker(): void {
    this.circuitBreaker = {
      failures: 0,
      lastFailure: 0,
      isOpen: false
    };
  }

  /**
   * Processes the request queue
   */
  private async processQueue(): Promise<void> {
    if (this.processingQueue || this.requestQueue.length === 0) return;

    this.processingQueue = true;

    try {
      // Sort queue by priority and timestamp
      this.requestQueue.sort((a, b) => {
        if (a.priority === b.priority) {
          return a.timestamp - b.timestamp;
        }
        return b.priority - a.priority;
      });

      while (this.requestQueue.length > 0) {
        const request = this.requestQueue.shift()!;
        try {
          const response = await this.client.request(request.config);
          request.resolve(response);
        } catch (error) {
          request.reject(error);
        }
      }
    } finally {
      this.processingQueue = false;
    }
  }

  // Public API methods
  
  /**
   * Performs a GET request
   */
  async get<T>(url: string, config?: Partial<RequestConfig>): Promise<APIResponse<T>> {
    // Check cache first
    if (config?.cache !== false) {
      const cached = this.cache.get(url);
      if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
        return this.handleResponse({ ...cached, config: { url } } as AxiosResponse);
      }
    }

    return this.client.get(url, config);
  }

  /**
   * Performs a POST request
   */
  async post<T>(url: string, data?: any, config?: Partial<RequestConfig>): Promise<APIResponse<T>> {
    return this.client.post(url, data, config);
  }

  /**
   * Performs a PUT request
   */
  async put<T>(url: string, data?: any, config?: Partial<RequestConfig>): Promise<APIResponse<T>> {
    return this.client.put(url, data, config);
  }

  /**
   * Performs a DELETE request
   */
  async delete<T>(url: string, config?: Partial<RequestConfig>): Promise<APIResponse<T>> {
    return this.client.delete(url, config);
  }

  /**
   * Returns the current circuit breaker status
   */
  getCircuitBreakerStatus(): CircuitBreakerState {
    return { ...this.circuitBreaker };
  }

  /**
   * Returns the current queue status
   */
  getQueueStatus(): { size: number; processing: boolean } {
    return {
      size: this.requestQueue.length,
      processing: this.processingQueue
    };
  }

  /**
   * Clears the response cache
   */
  clearCache(): void {
    this.cache.clear();
  }
}

// Export singleton instance
export const api = new APIClient();