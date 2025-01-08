/**
 * Core TypeScript interfaces and types for API requests, responses, and error handling
 * @version 1.0.0
 */

/**
 * Generic interface for all API responses with type-safe data handling
 * @template T Type of the response data
 */
export interface APIResponse<T = unknown> {
  /** Indicates if the API request was successful */
  success: boolean;
  /** Response data of type T if successful, null otherwise */
  data: T | null;
  /** Error information if request failed, null otherwise */
  error: APIError | null;
  /** Additional metadata about the request/response */
  metadata: APIMetadata | null;
}

/**
 * Standardized error structure for API responses
 */
export interface APIError {
  /** Standardized error code */
  code: APIErrorCode;
  /** Human-readable error message */
  message: string;
  /** Additional error details as key-value pairs */
  details: Record<string, unknown> | null;
  /** Error stack trace (only included in development) */
  stack: string | null;
}

/**
 * Metadata structure for API responses including timing and tracing information
 */
export interface APIMetadata {
  /** Timestamp when the response was generated */
  timestamp: Date;
  /** Unique identifier for the request for tracing */
  requestId: string;
  /** Time taken to process the request in milliseconds */
  processingTime: number;
  /** API version used for the request */
  version: string;
}

/**
 * Generic interface for paginated API responses
 * @template T Type of items in the paginated response
 */
export interface PaginatedResponse<T = unknown> {
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
 * Type-safe enumeration of supported HTTP methods
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
 * Comprehensive enumeration of API error codes mapped to HTTP status codes
 */
export enum APIErrorCode {
  /** 400 Bad Request - Invalid request parameters or body */
  BAD_REQUEST = 'BAD_REQUEST',
  /** 401 Unauthorized - Missing or invalid authentication */
  UNAUTHORIZED = 'UNAUTHORIZED',
  /** 403 Forbidden - Valid auth but insufficient permissions */
  FORBIDDEN = 'FORBIDDEN',
  /** 404 Not Found - Requested resource does not exist */
  NOT_FOUND = 'NOT_FOUND',
  /** 422 Unprocessable Entity - Request validation failed */
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  /** 429 Too Many Requests - Rate limit exceeded */
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  /** 500 Internal Server Error - Unhandled server error */
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  /** 503 Service Unavailable - Service temporarily unavailable */
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  /** 504 Gateway Timeout - Upstream service timeout */
  GATEWAY_TIMEOUT = 'GATEWAY_TIMEOUT'
}