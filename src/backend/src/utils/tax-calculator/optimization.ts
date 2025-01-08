import Big from 'big.js';
import { FilingStatus, TaxCalculationResult } from '../../types/tax.types';
import { calculateRothConversionTax } from './roth-conversion';
import { calculateCapitalGainsTax } from './capital-gains';

// Configure Big.js for financial calculations
Big.DP = 9; // Set precision to 9 decimal places
Big.RM = Big.roundDown; // Use banker's rounding

// Optimization parameters with high precision
const OPTIMIZATION_PARAMS = {
    TIME_HORIZON_YEARS: 20,
    DISCOUNT_RATE: new Big(0.07),
    RISK_TOLERANCE: 3,
    STATE_TAX_WEIGHT: new Big(1.0),
    PRECISION_DECIMALS: 9
};

// Optimization constraints
const MINIMUM_OPTIMIZATION_AMOUNT = new Big(1000);
const MAXIMUM_OPTIMIZATION_AMOUNT = new Big(1000000);
const OPTIMIZATION_STEP_SIZE = new Big(1000);

// Cache configuration
const CALCULATION_CACHE_TTL = 3600; // 1 hour in seconds

/**
 * Interface for optimization parameters
 * @version 1.0.0
 */
interface OptimizationParams {
    timeHorizon?: number;
    discountRate?: number;
    riskTolerance?: number;
    stateTaxWeight?: number;
}

/**
 * Interface for optimization results with high precision calculations
 * @version 1.0.0
 */
interface OptimizationResult {
    rothConversion: {
        amount: Big;
        taxImpact: TaxCalculationResult;
        npv: Big;
    };
    capitalGains: {
        amount: Big;
        taxImpact: TaxCalculationResult;
        npv: Big;
    };
    combinedSavings: Big;
    riskAdjustedScore: Big;
}

/**
 * Advanced tax optimization algorithm using high-precision calculations and NPV analysis
 * 
 * @param currentIncome - Current year taxable income
 * @param traditionalBalance - Traditional IRA balance
 * @param capitalGains - Available capital gains
 * @param filingStatus - Tax filing status
 * @param stateCode - Two-letter state code
 * @param optimizationParams - Optional optimization parameters
 * @returns Comprehensive optimization result with high-precision calculations
 * @throws Error if inputs are invalid
 * @version 1.0.0
 */
export function optimizeTaxStrategy(
    currentIncome: Big,
    traditionalBalance: Big,
    capitalGains: Big,
    filingStatus: FilingStatus,
    stateCode: string,
    optimizationParams: OptimizationParams = {}
): OptimizationResult {
    // Validate inputs
    validateInputs(currentIncome, traditionalBalance, capitalGains);

    // Initialize optimization parameters with defaults
    const params = initializeParams(optimizationParams);

    // Optimize Roth conversion strategy
    const rothOptimization = optimizeRothConversion(
        currentIncome,
        traditionalBalance,
        filingStatus,
        stateCode,
        params
    );

    // Optimize capital gains realization
    const gainsOptimization = optimizeCapitalGains(
        currentIncome.plus(rothOptimization.amount),
        capitalGains,
        filingStatus,
        stateCode,
        params
    );

    // Calculate combined optimization metrics
    const combinedSavings = calculateCombinedSavings(rothOptimization, gainsOptimization);
    const riskAdjustedScore = calculateRiskAdjustedScore(combinedSavings, params.riskTolerance);

    return {
        rothConversion: rothOptimization,
        capitalGains: gainsOptimization,
        combinedSavings,
        riskAdjustedScore
    };
}

/**
 * Validates all input parameters with high-precision checks
 * @private
 */
function validateInputs(
    currentIncome: Big,
    traditionalBalance: Big,
    capitalGains: Big
): void {
    if (!currentIncome.gte(0)) {
        throw new Error('Current income must be non-negative');
    }
    if (!traditionalBalance.gte(0)) {
        throw new Error('Traditional IRA balance must be non-negative');
    }
    if (!capitalGains.gte(0)) {
        throw new Error('Capital gains must be non-negative');
    }
}

/**
 * Initializes optimization parameters with defaults
 * @private
 */
function initializeParams(params: OptimizationParams): Required<OptimizationParams> {
    return {
        timeHorizon: params.timeHorizon ?? OPTIMIZATION_PARAMS.TIME_HORIZON_YEARS,
        discountRate: params.discountRate ?? OPTIMIZATION_PARAMS.DISCOUNT_RATE.toNumber(),
        riskTolerance: params.riskTolerance ?? OPTIMIZATION_PARAMS.RISK_TOLERANCE,
        stateTaxWeight: params.stateTaxWeight ?? OPTIMIZATION_PARAMS.STATE_TAX_WEIGHT.toNumber()
    };
}

/**
 * Optimizes Roth conversion amount using binary search
 * @private
 */
function optimizeRothConversion(
    currentIncome: Big,
    traditionalBalance: Big,
    filingStatus: FilingStatus,
    stateCode: string,
    params: Required<OptimizationParams>
): { amount: Big; taxImpact: TaxCalculationResult; npv: Big } {
    let left = MINIMUM_OPTIMIZATION_AMOUNT;
    let right = Big.min(traditionalBalance, MAXIMUM_OPTIMIZATION_AMOUNT);
    let optimalAmount = new Big(0);
    let optimalTaxImpact: TaxCalculationResult | null = null;
    let optimalNPV = new Big(0);

    while (left.lte(right)) {
        const amount = left.plus(right).div(2).round(0);
        const taxImpact = calculateRothConversionTax(
            currentIncome.toNumber(),
            amount.toNumber(),
            filingStatus,
            stateCode,
            params.timeHorizon,
            params.discountRate
        );

        const npv = calculateNPV(amount, taxImpact, params);

        if (!optimalTaxImpact || npv.gt(optimalNPV)) {
            optimalAmount = amount;
            optimalTaxImpact = taxImpact;
            optimalNPV = npv;
        }

        // Binary search adjustment
        if (shouldIncreaseAmount(taxImpact, params)) {
            left = amount.plus(OPTIMIZATION_STEP_SIZE);
        } else {
            right = amount.minus(OPTIMIZATION_STEP_SIZE);
        }
    }

    return {
        amount: optimalAmount,
        taxImpact: optimalTaxImpact!,
        npv: optimalNPV
    };
}

/**
 * Optimizes capital gains realization with tax bracket consideration
 * @private
 */
function optimizeCapitalGains(
    adjustedIncome: Big,
    availableGains: Big,
    filingStatus: FilingStatus,
    stateCode: string,
    params: Required<OptimizationParams>
): { amount: Big; taxImpact: TaxCalculationResult; npv: Big } {
    let optimalAmount = new Big(0);
    let optimalTaxImpact: TaxCalculationResult | null = null;
    let optimalNPV = new Big(0);

    for (let amount = MINIMUM_OPTIMIZATION_AMOUNT; amount.lte(availableGains); amount = amount.plus(OPTIMIZATION_STEP_SIZE)) {
        const taxImpact = calculateCapitalGainsTax(
            amount.toNumber(),
            adjustedIncome.toNumber(),
            filingStatus,
            stateCode
        );

        const npv = calculateNPV(amount, taxImpact, params);

        if (!optimalTaxImpact || npv.gt(optimalNPV)) {
            optimalAmount = amount;
            optimalTaxImpact = taxImpact;
            optimalNPV = npv;
        }

        // Break if tax impact becomes unfavorable
        if (shouldStopGainsOptimization(taxImpact, params)) {
            break;
        }
    }

    return {
        amount: optimalAmount,
        taxImpact: optimalTaxImpact!,
        npv: optimalNPV
    };
}

/**
 * Calculates NPV of tax savings with high precision
 * @private
 */
function calculateNPV(
    amount: Big,
    taxImpact: TaxCalculationResult,
    params: Required<OptimizationParams>
): Big {
    const totalTax = new Big(taxImpact.federalTaxImpact)
        .plus(new Big(taxImpact.stateTaxImpact).times(params.stateTaxWeight));
    
    const futureValue = amount.times(
        new Big(1).plus(OPTIMIZATION_PARAMS.DISCOUNT_RATE).pow(params.timeHorizon)
    );

    return futureValue.minus(totalTax).div(
        new Big(1).plus(params.discountRate).pow(params.timeHorizon)
    );
}

/**
 * Calculates combined savings from both optimization strategies
 * @private
 */
function calculateCombinedSavings(
    rothOptimization: { npv: Big },
    gainsOptimization: { npv: Big }
): Big {
    return rothOptimization.npv.plus(gainsOptimization.npv);
}

/**
 * Calculates risk-adjusted optimization score
 * @private
 */
function calculateRiskAdjustedScore(
    combinedSavings: Big,
    riskTolerance: number
): Big {
    const riskFactor = new Big(6 - riskTolerance).div(5); // Convert 1-5 scale to 0.2-1.0
    return combinedSavings.times(riskFactor);
}

/**
 * Determines if optimization amount should be increased based on tax impact
 * @private
 */
function shouldIncreaseAmount(
    taxImpact: TaxCalculationResult,
    params: Required<OptimizationParams>
): boolean {
    return new Big(taxImpact.marginalTaxRate)
        .times(new Big(1).minus(params.stateTaxWeight))
        .lt(OPTIMIZATION_PARAMS.DISCOUNT_RATE);
}

/**
 * Determines if capital gains optimization should stop
 * @private
 */
function shouldStopGainsOptimization(
    taxImpact: TaxCalculationResult,
    params: Required<OptimizationParams>
): boolean {
    return new Big(taxImpact.marginalTaxRate).gt(
        OPTIMIZATION_PARAMS.DISCOUNT_RATE.times(new Big(1).plus(params.riskTolerance).div(5))
    );
}