import { FilingStatus, CapitalGainsType, TaxCalculationResult } from '../../types/tax.types';
import { calculateFederalTax } from './federal';
import { calculateStateTax } from './state';
import { formatCurrency } from '../formatters/currency';
import { OPTIMIZATION_PARAMS, STATE_TAX_INFO } from '../../config/constants';

/**
 * Cache for optimization calculations to improve performance
 * @version 1.0.0
 */
const optimizationCache = new Map<string, {
    result: number;
    timestamp: number;
}>();

/**
 * Cache TTL in milliseconds (1 hour)
 */
const CACHE_TTL = 3600000;

/**
 * Validates capital gains calculation inputs
 * @throws Error if inputs are invalid
 */
function validateInputs(
    gainsAmount: number,
    gainsType: CapitalGainsType,
    baseIncome: number,
    filingStatus: FilingStatus,
    stateCode: string
): void {
    if (!isFinite(gainsAmount) || gainsAmount < 0) {
        throw new Error(`Invalid gains amount: ${formatCurrency(gainsAmount)}`);
    }

    if (!Object.values(CapitalGainsType).includes(gainsType)) {
        throw new Error('Invalid capital gains type');
    }

    if (!isFinite(baseIncome) || baseIncome < 0) {
        throw new Error(`Invalid base income: ${formatCurrency(baseIncome)}`);
    }

    if (!Object.values(FilingStatus).includes(filingStatus)) {
        throw new Error('Invalid filing status');
    }

    if (!stateCode || !STATE_TAX_INFO[stateCode.toUpperCase()]) {
        throw new Error(`Invalid state code: ${stateCode}`);
    }
}

/**
 * Calculates the total tax impact for capital gains realization with comprehensive validation
 * and error handling
 * 
 * @param gainsAmount - Amount of capital gains to realize
 * @param gainsType - Type of capital gains (short-term or long-term)
 * @param baseIncome - Base income before capital gains
 * @param filingStatus - Tax filing status
 * @param stateCode - Two-letter state code
 * @returns Comprehensive tax calculation result
 * @throws Error if calculation fails or inputs are invalid
 * @version 1.0.0
 */
export function calculateCapitalGainsTax(
    gainsAmount: number,
    gainsType: CapitalGainsType,
    baseIncome: number,
    filingStatus: FilingStatus,
    stateCode: string
): TaxCalculationResult {
    // Validate all inputs
    validateInputs(gainsAmount, gainsType, baseIncome, filingStatus, stateCode);

    // Calculate federal tax impact
    const totalIncome = baseIncome + gainsAmount;
    const baseFederalTax = calculateFederalTax(baseIncome, filingStatus);
    const totalFederalTax = calculateFederalTax(totalIncome, filingStatus);
    const federalTaxImpact = totalFederalTax.federalTaxImpact - baseFederalTax.federalTaxImpact;

    // Calculate state tax impact
    const baseStateTax = calculateStateTax(baseIncome, stateCode, filingStatus);
    const totalStateTax = calculateStateTax(totalIncome, stateCode, filingStatus);
    const stateTaxImpact = totalStateTax - baseStateTax;

    // Calculate effective and marginal rates
    const totalTaxImpact = federalTaxImpact + stateTaxImpact;
    const effectiveTaxRate = gainsAmount > 0 ? totalTaxImpact / gainsAmount : 0;
    const marginalTaxRate = totalFederalTax.marginalTaxRate;

    return {
        federalTaxImpact: Number(federalTaxImpact.toFixed(2)),
        stateTaxImpact: Number(stateTaxImpact.toFixed(2)),
        effectiveTaxRate: Number(effectiveTaxRate.toFixed(4)),
        marginalTaxRate: Number(marginalTaxRate.toFixed(4)),
        deductions: {},
        taxableIncome: totalIncome,
        applicableBrackets: totalFederalTax.applicableBrackets
    };
}

/**
 * Determines the optimal amount of capital gains to realize using advanced optimization
 * algorithms with configurable parameters
 * 
 * @param totalGainsAvailable - Total amount of gains available to realize
 * @param baseIncome - Base income before capital gains
 * @param filingStatus - Tax filing status
 * @param stateCode - Two-letter state code
 * @returns Optimization result with recommended amount and tax impact
 * @throws Error if optimization fails or inputs are invalid
 * @version 1.0.0
 */
export function calculateOptimalGainsRealization(
    totalGainsAvailable: number,
    baseIncome: number,
    filingStatus: FilingStatus,
    stateCode: string
): {
    recommendedAmount: number;
    taxImpact: TaxCalculationResult;
    potentialSavings: number;
} {
    // Validate inputs
    if (!isFinite(totalGainsAvailable) || totalGainsAvailable < 0) {
        throw new Error(`Invalid total gains amount: ${formatCurrency(totalGainsAvailable)}`);
    }

    // Check cache
    const cacheKey = `${totalGainsAvailable}-${baseIncome}-${filingStatus}-${stateCode}`;
    const cachedResult = optimizationCache.get(cacheKey);
    if (cachedResult && (Date.now() - cachedResult.timestamp) < CACHE_TTL) {
        return calculateOptimizationResult(cachedResult.result, totalGainsAvailable, baseIncome, filingStatus, stateCode);
    }

    // Initialize optimization parameters
    const { CAPITAL_GAINS_THRESHOLD, RISK_TOLERANCE } = OPTIMIZATION_PARAMS;
    let optimalAmount = 0;
    let minTaxRate = Infinity;

    // Analyze tax impact at different thresholds
    const thresholds = [
        CAPITAL_GAINS_THRESHOLD.LOW,
        CAPITAL_GAINS_THRESHOLD.MEDIUM,
        CAPITAL_GAINS_THRESHOLD.HIGH,
        totalGainsAvailable
    ];

    for (const threshold of thresholds) {
        const amount = Math.min(threshold, totalGainsAvailable);
        const taxImpact = calculateCapitalGainsTax(
            amount,
            CapitalGainsType.LONG_TERM,
            baseIncome,
            filingStatus,
            stateCode
        );

        if (taxImpact.effectiveTaxRate < minTaxRate) {
            minTaxRate = taxImpact.effectiveTaxRate;
            optimalAmount = amount;
        }
    }

    // Cache the result
    optimizationCache.set(cacheKey, {
        result: optimalAmount,
        timestamp: Date.now()
    });

    return calculateOptimizationResult(optimalAmount, totalGainsAvailable, baseIncome, filingStatus, stateCode);
}

/**
 * Helper function to calculate detailed optimization result
 */
function calculateOptimizationResult(
    recommendedAmount: number,
    totalGainsAvailable: number,
    baseIncome: number,
    filingStatus: FilingStatus,
    stateCode: string
): {
    recommendedAmount: number;
    taxImpact: TaxCalculationResult;
    potentialSavings: number;
} {
    const taxImpact = calculateCapitalGainsTax(
        recommendedAmount,
        CapitalGainsType.LONG_TERM,
        baseIncome,
        filingStatus,
        stateCode
    );

    const fullRealizationImpact = calculateCapitalGainsTax(
        totalGainsAvailable,
        CapitalGainsType.LONG_TERM,
        baseIncome,
        filingStatus,
        stateCode
    );

    const potentialSavings = fullRealizationImpact.effectiveTaxRate > taxImpact.effectiveTaxRate
        ? (fullRealizationImpact.effectiveTaxRate - taxImpact.effectiveTaxRate) * recommendedAmount
        : 0;

    return {
        recommendedAmount: Number(recommendedAmount.toFixed(2)),
        taxImpact,
        potentialSavings: Number(potentialSavings.toFixed(2))
    };
}