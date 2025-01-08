import { FilingStatus } from '../types/tax.types';

/**
 * API version for all endpoints
 * @version 1.0.0
 */
export const API_VERSION = 'v1';

/**
 * Default cache TTL in seconds (1 hour)
 * @version 1.0.0
 */
export const DEFAULT_CACHE_TTL = 3600;

/**
 * Maximum number of scenarios per user
 * @version 1.0.0
 */
export const MAX_SCENARIO_COUNT = 100;

/**
 * 2024 Federal Tax Brackets by Filing Status
 * Source: IRS Revenue Procedure 2023-34
 * @version 1.0.0
 */
export const TAX_BRACKETS_2024: Record<FilingStatus, Array<{rate: number, minimumIncome: number, maximumIncome: number}>> = {
    [FilingStatus.SINGLE]: [
        { rate: 0.10, minimumIncome: 0, maximumIncome: 11600 },
        { rate: 0.12, minimumIncome: 11601, maximumIncome: 47150 },
        { rate: 0.22, minimumIncome: 47151, maximumIncome: 100525 },
        { rate: 0.24, minimumIncome: 100526, maximumIncome: 191950 },
        { rate: 0.32, minimumIncome: 191951, maximumIncome: 243725 },
        { rate: 0.35, minimumIncome: 243726, maximumIncome: 609350 },
        { rate: 0.37, minimumIncome: 609351, maximumIncome: Infinity }
    ],
    [FilingStatus.MARRIED_JOINT]: [
        { rate: 0.10, minimumIncome: 0, maximumIncome: 23200 },
        { rate: 0.12, minimumIncome: 23201, maximumIncome: 94300 },
        { rate: 0.22, minimumIncome: 94301, maximumIncome: 201050 },
        { rate: 0.24, minimumIncome: 201051, maximumIncome: 383900 },
        { rate: 0.32, minimumIncome: 383901, maximumIncome: 487450 },
        { rate: 0.35, minimumIncome: 487451, maximumIncome: 731200 },
        { rate: 0.37, minimumIncome: 731201, maximumIncome: Infinity }
    ],
    [FilingStatus.HEAD_OF_HOUSEHOLD]: [
        { rate: 0.10, minimumIncome: 0, maximumIncome: 16550 },
        { rate: 0.12, minimumIncome: 16551, maximumIncome: 63100 },
        { rate: 0.22, minimumIncome: 63101, maximumIncome: 100500 },
        { rate: 0.24, minimumIncome: 100501, maximumIncome: 191950 },
        { rate: 0.32, minimumIncome: 191951, maximumIncome: 243700 },
        { rate: 0.35, minimumIncome: 243701, maximumIncome: 609350 },
        { rate: 0.37, minimumIncome: 609351, maximumIncome: Infinity }
    ]
};

/**
 * State Tax Configuration
 * Includes brackets, special deductions, and capital gains rules
 * @version 1.0.0
 */
export const STATE_TAX_INFO: Record<string, {
    hasIncomeTax: boolean,
    brackets: Array<{rate: number, minimumIncome: number, maximumIncome: number}>,
    specialDeductions: Record<string, number>,
    capitalGainsRules: {
        longTermRate: number,
        shortTermRate: number,
        specialExemptions: Record<string, number>
    }
}> = {
    'CA': {
        hasIncomeTax: true,
        brackets: [
            { rate: 0.01, minimumIncome: 0, maximumIncome: 10099 },
            { rate: 0.02, minimumIncome: 10100, maximumIncome: 23942 },
            { rate: 0.04, minimumIncome: 23943, maximumIncome: 37788 },
            { rate: 0.06, minimumIncome: 37789, maximumIncome: 52455 },
            { rate: 0.08, minimumIncome: 52456, maximumIncome: 66295 },
            { rate: 0.093, minimumIncome: 66296, maximumIncome: 338639 },
            { rate: 0.103, minimumIncome: 338640, maximumIncome: 406364 },
            { rate: 0.113, minimumIncome: 406365, maximumIncome: 677275 },
            { rate: 0.123, minimumIncome: 677276, maximumIncome: Infinity }
        ],
        specialDeductions: {
            retirementIncome: 5000,
            dependentCare: 3000
        },
        capitalGainsRules: {
            longTermRate: 0.123,
            shortTermRate: 0.123,
            specialExemptions: {
                qualifiedSmallBusiness: 100000
            }
        }
    }
    // Additional states would be defined here
};

/**
 * API Rate Limits by Endpoint
 * Defined in requests per time window
 * @version 1.0.0
 */
export const API_RATE_LIMITS: Record<string, {
    requests: number,
    windowSeconds: number
}> = {
    'scenarios': {
        requests: 100,
        windowSeconds: 3600
    },
    'calculations': {
        requests: 50,
        windowSeconds: 3600
    },
    'chat': {
        requests: 200,
        windowSeconds: 3600
    },
    'export': {
        requests: 20,
        windowSeconds: 3600
    }
};

/**
 * Input Validation Rules
 * Defines minimum and maximum values for all inputs
 * @version 1.0.0
 */
export const VALIDATION_RULES = {
    MIN_INCOME: 0,
    MAX_INCOME: 10000000,
    MAX_ROTH_BALANCE: 5000000,
    MAX_TRAD_BALANCE: 5000000,
    MAX_CAPITAL_GAINS: 10000000,
    MIN_AGE: 18,
    MAX_AGE: 120,
    MIN_SCENARIO_NAME_LENGTH: 3,
    MAX_SCENARIO_NAME_LENGTH: 100,
    ALLOWED_FILE_TYPES: ['.pdf', '.csv', '.xlsx'],
    MAX_FILE_SIZE_MB: 10
};

/**
 * Optimization Algorithm Parameters
 * Defines default values for optimization calculations
 * @version 1.0.0
 */
export const OPTIMIZATION_PARAMS = {
    TIME_HORIZON: {
        DEFAULT: 20,
        MIN: 1,
        MAX: 40
    },
    DISCOUNT_RATE: {
        DEFAULT: 0.07,
        MIN: 0.01,
        MAX: 0.15
    },
    RISK_TOLERANCE: {
        DEFAULT: 3,
        MIN: 1,
        MAX: 5
    },
    STATE_TAX_WEIGHT: {
        DEFAULT: 1.0,
        MIN: 0.0,
        MAX: 1.0
    },
    INFLATION_RATE: {
        DEFAULT: 0.024,
        MIN: 0.0,
        MAX: 0.15
    },
    CAPITAL_GAINS_THRESHOLD: {
        LOW: 10000,
        MEDIUM: 50000,
        HIGH: 100000
    }
};

/**
 * System Configuration Constants
 * @version 1.0.0
 */
export const SYSTEM_CONFIG = {
    SESSION_TIMEOUT_MINUTES: 30,
    PASSWORD_MIN_LENGTH: 12,
    PASSWORD_REQUIRES_SPECIAL: true,
    MAX_LOGIN_ATTEMPTS: 5,
    LOCKOUT_DURATION_MINUTES: 30,
    CACHE_STRATEGIES: {
        SCENARIOS: 'stale-while-revalidate',
        CALCULATIONS: 'cache-first',
        STATIC_DATA: 'cache-only'
    },
    ERROR_RETRY_ATTEMPTS: 3,
    ERROR_RETRY_DELAY_MS: 1000,
    MAINTENANCE_WINDOW: {
        START_HOUR: 2, // 2 AM
        DURATION_HOURS: 2
    }
};