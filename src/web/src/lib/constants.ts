import { FilingStatus } from '../types/calculation.types';

/**
 * Base API URL configuration with environment-based fallback
 */
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

/**
 * Comprehensive API endpoint configuration for all services
 */
export const API_ENDPOINTS = {
  AUTH: {
    SIGNUP: '/auth/signup',
    LOGIN: '/auth/login',
    LOGOUT: '/auth/logout',
    REFRESH: '/auth/refresh',
    VERIFY: '/auth/verify',
    RESET_PASSWORD: '/auth/reset-password',
  },
  SCENARIOS: {
    CREATE: '/scenarios',
    LIST: '/scenarios',
    GET: '/scenarios/:id',
    UPDATE: '/scenarios/:id',
    DELETE: '/scenarios/:id',
    COMPARE: '/scenarios/compare',
  },
  CALCULATIONS: {
    OPTIMIZE: '/calculate/optimize',
    PREVIEW: '/calculate/preview',
    HISTORY: '/calculate/history',
    EXPORT: '/calculate/export',
  },
  CHAT: {
    SEND: '/chat/message',
    HISTORY: '/chat/history',
    FEEDBACK: '/chat/feedback',
  },
  AI_EXPLANATIONS: {
    GENERATE: '/ai/explain',
    CLARIFY: '/ai/clarify',
    ALTERNATIVES: '/ai/alternatives',
  },
  WEBHOOKS: {
    CALCULATION_COMPLETE: '/webhooks/calculation-complete',
    EXPORT_READY: '/webhooks/export-ready',
  },
} as const;

/**
 * Comprehensive validation rules for form inputs
 */
export const VALIDATION_RULES = {
  IRA_BALANCE: {
    MIN: 0,
    MAX: 5000000,
    DECIMALS: 2,
    ERROR_MESSAGES: {
      MIN: 'Balance cannot be negative',
      MAX: 'Balance cannot exceed $5,000,000',
      TYPE: 'Please enter a valid number',
    },
  },
  CAPITAL_GAINS: {
    MIN: 0,
    MAX: 5000000,
    DECIMALS: 2,
    ERROR_MESSAGES: {
      MIN: 'Capital gains cannot be negative',
      MAX: 'Capital gains cannot exceed $5,000,000',
      TYPE: 'Please enter a valid number',
    },
  },
  SCENARIO_NAME: {
    MIN_LENGTH: 3,
    MAX_LENGTH: 50,
    PATTERN: /^[a-zA-Z0-9\s-_]+$/,
    ERROR_MESSAGES: {
      MIN: 'Name must be at least 3 characters',
      MAX: 'Name cannot exceed 50 characters',
      PATTERN: 'Name can only contain letters, numbers, spaces, hyphens, and underscores',
    },
  },
  RISK_TOLERANCE: {
    MIN: 1,
    MAX: 5,
    DEFAULT: 3,
    ERROR_MESSAGES: {
      RANGE: 'Risk tolerance must be between 1 and 5',
    },
  },
  TIME_HORIZON: {
    MIN: 1,
    MAX: 40,
    DEFAULT: 20,
    ERROR_MESSAGES: {
      RANGE: 'Time horizon must be between 1 and 40 years',
    },
  },
} as const;

/**
 * Tax-related constants and configuration values
 */
export const TAX_CONSTANTS = {
  SUPPORTED_STATES: [
    'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
    'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
    'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
    'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
    'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
  ],
  FILING_STATUS_LABELS: {
    [FilingStatus.SINGLE]: 'Single',
    [FilingStatus.MARRIED_JOINT]: 'Married Filing Jointly',
    [FilingStatus.HEAD_OF_HOUSEHOLD]: 'Head of Household',
  },
  DEFAULT_TAX_YEAR: new Date().getFullYear(),
  STATE_TAX_INFO: {
    NO_INCOME_TAX_STATES: ['AK', 'FL', 'NV', 'SD', 'TX', 'WA', 'WY'],
    SPECIAL_CASES: {
      NH: 'Only taxes dividend and interest income',
      TN: 'No income tax on wages, only certain investment income',
    },
  },
} as const;

/**
 * UI configuration constants including responsive breakpoints and accessibility settings
 */
export const UI_CONSTANTS = {
  BREAKPOINTS: {
    MOBILE: 640,
    TABLET: 768,
    DESKTOP: 1024,
    WIDE: 1280,
  },
  THEME_OPTIONS: ['light', 'dark', 'system'] as const,
  ANIMATION_DURATION: 200,
  ACCESSIBILITY: {
    MINIMUM_CONTRAST_RATIO: 4.5,
    FOCUS_RING_WIDTH: '3px',
    FOCUS_RING_COLOR: 'rgb(59, 130, 246)',
    MOTION_REDUCED: {
      ANIMATION_DURATION: 0,
      TRANSITION_DURATION: 0,
    },
    ARIA_LABELS: {
      CLOSE_BUTTON: 'Close',
      MENU_BUTTON: 'Open menu',
      LOADING: 'Loading',
      ERROR: 'Error',
      SUCCESS: 'Success',
    },
  },
} as const;

/**
 * Utility function to construct full API endpoint URLs
 * @param path - The API endpoint path
 * @returns The complete API endpoint URL
 */
export const getEndpoint = (path: string): string => {
  // Remove leading and trailing slashes
  const sanitizedPath = path.replace(/^\/+|\/+$/g, '');
  
  // Combine base URL with sanitized path
  return `${API_BASE_URL}/${sanitizedPath}`;
};