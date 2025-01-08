import { inject, track } from '@vercel/analytics';
import type { APIResponse } from '../types/api.types';

// Configuration constants
const ANALYTICS_ENABLED = process.env.NEXT_PUBLIC_ANALYTICS_ENABLED === 'true';
const DEBUG_MODE = process.env.NODE_ENV === 'development';
const RETRY_ATTEMPTS = 3;
const BATCH_INTERVAL = 1000;
const ERROR_THRESHOLD = 0.1;

// Event name validation regex
const EVENT_NAME_REGEX = /^[a-zA-Z][a-zA-Z0-9_]{2,49}$/;

// Performance metric thresholds
const PERFORMANCE_THRESHOLDS = {
  FCP: 2000, // First Contentful Paint
  LCP: 2500, // Largest Contentful Paint
  FID: 100,  // First Input Delay
  CLS: 0.1,  // Cumulative Layout Shift
  TTFB: 600  // Time to First Byte
};

/**
 * Initializes Vercel Analytics with enhanced configuration
 * @version @vercel/analytics@1.1.1
 */
const initializeAnalytics = (): void => {
  if (!ANALYTICS_ENABLED) return;

  try {
    inject({
      debug: DEBUG_MODE,
      beforeSend: (event) => {
        // Remove PII from events
        const sanitizedEvent = sanitizeEventData(event);
        // Add environment context
        return {
          ...sanitizedEvent,
          environment: process.env.NEXT_PUBLIC_VERCEL_ENV,
          timestamp: new Date().toISOString()
        };
      }
    });

    if (DEBUG_MODE) {
      console.log('Analytics initialized with debug mode');
    }
  } catch (error) {
    console.error('Failed to initialize analytics:', error);
  }
};

/**
 * Tracks a custom event with enhanced validation and privacy controls
 * @param eventName Name of the event to track
 * @param properties Additional properties for the event
 */
const trackEvent = (eventName: string, properties: Record<string, any> = {}): void => {
  if (!ANALYTICS_ENABLED) return;

  try {
    // Validate event name
    if (!EVENT_NAME_REGEX.test(eventName)) {
      throw new Error(`Invalid event name: ${eventName}`);
    }

    // Sanitize properties
    const sanitizedProps = sanitizeEventData(properties);

    // Add standard metadata
    const enrichedProps = {
      ...sanitizedProps,
      timestamp: new Date().toISOString(),
      sessionId: getSessionId(),
      userAgent: navigator.userAgent,
      screenResolution: `${window.screen.width}x${window.screen.height}`
    };

    track(eventName, enrichedProps);

    if (DEBUG_MODE) {
      console.log(`Event tracked: ${eventName}`, enrichedProps);
    }
  } catch (error) {
    console.error(`Failed to track event ${eventName}:`, error);
  }
};

/**
 * Tracks page view events with enhanced metadata
 * @param path Page path to track
 */
const trackPageView = (path: string): void => {
  if (!ANALYTICS_ENABLED) return;

  try {
    const performanceMetrics = collectPerformanceMetrics();
    
    trackEvent('page_view', {
      path,
      referrer: document.referrer,
      performanceMetrics,
      language: navigator.language,
      viewportSize: `${window.innerWidth}x${window.innerHeight}`
    });
  } catch (error) {
    console.error('Failed to track page view:', error);
  }
};

/**
 * Tracks API response metrics with detailed error tracking
 * @param response API response object
 * @param endpoint API endpoint path
 */
const trackAPIResponse = (response: APIResponse<any>, endpoint: string): void => {
  if (!ANALYTICS_ENABLED) return;

  try {
    const { success, error, metadata } = response;
    
    trackEvent('api_response', {
      endpoint,
      success,
      errorCode: error?.code,
      errorMessage: error?.message,
      processingTime: metadata?.processingTime,
      timestamp: metadata?.timestamp,
      region: metadata?.serverRegion
    });

    // Track error patterns if threshold exceeded
    if (!success && error) {
      trackErrorPattern(error, endpoint);
    }
  } catch (error) {
    console.error('Failed to track API response:', error);
  }
};

/**
 * Tracks web vitals and performance metrics
 * @param metricName Name of the performance metric
 * @param value Metric value
 */
const trackPerformanceMetric = (metricName: string, value: number): void => {
  if (!ANALYTICS_ENABLED) return;

  try {
    const threshold = PERFORMANCE_THRESHOLDS[metricName as keyof typeof PERFORMANCE_THRESHOLDS];
    const exceedsThreshold = threshold && value > threshold;

    trackEvent('performance_metric', {
      metricName,
      value,
      exceedsThreshold,
      threshold,
      navigationEntry: getNavigationTiming(),
      deviceMemory: (navigator as any).deviceMemory,
      connectionType: (navigator as any).connection?.effectiveType
    });
  } catch (error) {
    console.error('Failed to track performance metric:', error);
  }
};

// Helper functions
const sanitizeEventData = (data: Record<string, any>): Record<string, any> => {
  const sanitized: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(data)) {
    // Remove potential PII fields
    if (['email', 'phone', 'address', 'name', 'ssn'].includes(key.toLowerCase())) {
      continue;
    }
    sanitized[key] = value;
  }
  
  return sanitized;
};

const getSessionId = (): string => {
  let sessionId = sessionStorage.getItem('analytics_session_id');
  if (!sessionId) {
    sessionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem('analytics_session_id', sessionId);
  }
  return sessionId;
};

const collectPerformanceMetrics = (): Record<string, number> => {
  const metrics: Record<string, number> = {};
  
  if (window.performance && window.performance.timing) {
    const timing = window.performance.timing;
    metrics.loadTime = timing.loadEventEnd - timing.navigationStart;
    metrics.domInteractive = timing.domInteractive - timing.navigationStart;
    metrics.firstByte = timing.responseStart - timing.navigationStart;
  }
  
  return metrics;
};

const getNavigationTiming = (): Record<string, number> => {
  const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
  return navigation ? {
    dnsLookup: navigation.domainLookupEnd - navigation.domainLookupStart,
    tcpConnection: navigation.connectEnd - navigation.connectStart,
    serverResponse: navigation.responseEnd - navigation.requestStart,
    domProcessing: navigation.domComplete - navigation.responseEnd
  } : {};
};

const trackErrorPattern = (error: any, endpoint: string): void => {
  const errorKey = `${endpoint}:${error.code}`;
  const errorCount = parseInt(sessionStorage.getItem(errorKey) || '0') + 1;
  sessionStorage.setItem(errorKey, errorCount.toString());
  
  if (errorCount / parseInt(sessionStorage.getItem('total_requests') || '1') > ERROR_THRESHOLD) {
    trackEvent('error_threshold_exceeded', {
      endpoint,
      errorCode: error.code,
      errorCount,
      threshold: ERROR_THRESHOLD
    });
  }
};

// Initialize analytics on module load
initializeAnalytics();

// Export analytics interface
export const analytics = {
  trackEvent,
  trackPageView,
  trackAPIResponse,
  trackPerformanceMetric
};