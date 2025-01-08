/**
 * Core API response interface with generic type parameter for flexible response data typing
 * @template T Type of the response data
 */
export interface APIResponse<T = any> {
  /** Indicates if the API request was successful */
  success: boolean;
  /** Response data of type T, null if request failed */
  data: T | null;
  /** Error information, null if request succeeded */
  error: APIError | null;
  /** Additional metadata about the request/response */
  metadata: APIMetadata | null;
}

/**
 * Comprehensive error structure for API responses with detailed error information
 */
export interface APIError {
  /** Standardized error code */
  code: APIErrorCode;
  /** Human-readable error message */
  message: string;
  /** Additional error context and debugging information */
  details: Record<string, any> | null;
  /** Timestamp when the error occurred */
  timestamp: Date;
  /** API endpoint path where the error occurred */
  path: string;
}

/**
 * Enhanced metadata structure for API responses with performance tracking
 */
export interface APIMetadata {
  /** Timestamp of the API response */
  timestamp: Date;
  /** Unique identifier for the request for tracking */
  requestId: string;
  /** Request processing time in milliseconds */
  processingTime: number;
  /** API version used for the request */
  apiVersion: string;
  /** Server region that processed the request */
  serverRegion: string;
}

/**
 * Generic interface for paginated API responses with comprehensive pagination metadata
 * @template T Type of the items in the paginated response
 */
export interface PaginatedResponse<T = any> {
  /** Array of items for the current page */
  items: T[];
  /** Current page number (1-based) */
  page: number;
  /** Number of items per page */
  pageSize: number;
  /** Total number of items across all pages */
  totalItems: number;
  /** Total number of pages */
  totalPages: number;
  /** Indicates if there is a next page */
  hasNextPage: boolean;
  /** Indicates if there is a previous page */
  hasPreviousPage: boolean;
}

/**
 * Enumeration of supported HTTP methods for API requests
 */
export enum HTTPMethod {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  DELETE = 'DELETE',
  PATCH = 'PATCH',
  HEAD = 'HEAD',
  OPTIONS = 'OPTIONS'
}

/**
 * Comprehensive enumeration of API error codes with standard HTTP status mappings
 */
export enum APIErrorCode {
  BAD_REQUEST = 'BAD_REQUEST',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  GATEWAY_TIMEOUT = 'GATEWAY_TIMEOUT'
}

/**
 * Enhanced configuration interface for API requests with retry logic
 */
export interface RequestConfig {
  /** HTTP method for the request */
  method: HTTPMethod;
  /** Request URL */
  url: string;
  /** Request headers */
  headers: Record<string, string>;
  /** Request timeout in milliseconds */
  timeout: number;
  /** Retry configuration */
  retryConfig: {
    /** Maximum number of retry attempts */
    maxRetries: number;
    /** Base backoff time in milliseconds */
    backoffMs: number;
  };
  /** Custom status validation function */
  validateStatus: (status: number) => boolean;
}