import { FilingStatus, TaxBracket, TaxCalculationResult } from './tax.types';

/**
 * Core parameters required for tax optimization calculations
 * @version 1.0.0
 */
export interface CalculationParameters {
    /** Traditional IRA balance in dollars */
    traditionalIRABalance: number;
    /** Roth IRA balance in dollars */
    rothIRABalance: number;
    /** Total capital gains eligible for harvesting in dollars */
    capitalGains: number;
    /** Two-letter state code for tax calculations (e.g., "CA", "NY") */
    taxState: string;
    /** Tax filing status of the individual */
    filingStatus: FilingStatus;
}

/**
 * Configuration options for the optimization algorithm
 * Based on technical specifications A.1.2
 * @version 1.0.0
 */
export interface OptimizationConfig {
    /** Analysis period in years (range: 1-40, default: 20) */
    timeHorizon: number;
    /** Rate for future value calculations (range: 0.01-0.10, default: 0.07) */
    discountRate: number;
    /** Impact on recommendation aggressiveness (range: 1-5, default: 3) */
    riskTolerance: number;
    /** Consideration of state tax impact (range: 0-1, default: 1) */
    stateTaxWeight: number;
}

/**
 * Structure for individual optimization recommendations
 * Supports 99.9% calculation accuracy requirement
 * @version 1.0.0
 */
export interface OptimizationResult {
    /** Recommended amount for conversion or realization in dollars */
    recommendedAmount: number;
    /** Projected tax savings from the recommendation in dollars */
    taxSavings: number;
    /** Confidence score for the recommendation (range: 0-1) */
    confidenceScore: number;
}

/**
 * Comprehensive calculation results including all optimizations
 * Implements multi-variable analysis requirements
 * @version 1.0.0
 */
export interface CalculationResult {
    /** Roth conversion optimization results */
    rothConversion: OptimizationResult;
    /** Capital gains harvesting optimization results */
    capitalGainsHarvesting: OptimizationResult;
    /** Detailed tax impact calculations */
    taxImpact: TaxCalculationResult;
    /** Net present value of total optimization strategy */
    npv: number;
}

/**
 * API response structure for calculation operations
 * Includes enhanced error handling for 99.9% accuracy requirement
 * @version 1.0.0
 */
export interface CalculationResponse {
    /** Indicates if the calculation was successful */
    success: boolean;
    /** Calculation results when successful */
    data: CalculationResult | null;
    /** Error message when calculation fails */
    error: string | null;
}