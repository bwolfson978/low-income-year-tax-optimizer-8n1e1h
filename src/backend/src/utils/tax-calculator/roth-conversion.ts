import Big from 'big.js';
import { FilingStatus, TaxCalculationResult, OptimizationResult } from '../../types/tax.types';
import { calculateFederalTax } from './federal';
import { calculateStateTax } from './state';

// Constants for optimization and calculations
const MINIMUM_CONVERSION = 1000;
const MAXIMUM_CONVERSION = 1000000;
const OPTIMIZATION_STEP_SIZE = 1000;
const DEFAULT_TIME_HORIZON = 20;
const DEFAULT_DISCOUNT_RATE = 0.07;
const DEFAULT_RISK_TOLERANCE = 3;
const DEFAULT_STATE_TAX_WEIGHT = 1.0;
const PRECISION_DECIMALS = 6;

/**
 * Calculates the comprehensive tax impact of a Roth conversion with high-precision arithmetic
 * 
 * @param currentIncome - Current year taxable income
 * @param conversionAmount - Amount to convert from Traditional to Roth IRA
 * @param filingStatus - Tax filing status
 * @param stateCode - Two-letter state code
 * @param timeHorizon - Years for future value projection
 * @param discountRate - Annual discount rate for NPV calculations
 * @returns Detailed tax calculation result
 * @throws Error if inputs are invalid
 * @version 1.0.0
 */
export function calculateRothConversionTax(
  currentIncome: number,
  conversionAmount: number,
  filingStatus: FilingStatus,
  stateCode: string,
  timeHorizon: number = DEFAULT_TIME_HORIZON,
  discountRate: number = DEFAULT_DISCOUNT_RATE
): TaxCalculationResult {
  // Input validation
  if (!isFinite(currentIncome) || currentIncome < 0) {
    throw new Error('Current income must be a positive finite number');
  }
  if (!isFinite(conversionAmount) || conversionAmount < MINIMUM_CONVERSION || conversionAmount > MAXIMUM_CONVERSION) {
    throw new Error(`Conversion amount must be between ${MINIMUM_CONVERSION} and ${MAXIMUM_CONVERSION}`);
  }

  // Use Big.js for precise calculations
  const totalIncome = new Big(currentIncome).plus(conversionAmount);

  // Calculate federal tax impact
  const withConversionFederal = calculateFederalTax(totalIncome.toNumber(), filingStatus);
  const baselineFederal = calculateFederalTax(currentIncome, filingStatus);
  const federalTaxImpact = new Big(withConversionFederal.federalTaxImpact)
    .minus(baselineFederal.federalTaxImpact)
    .round(PRECISION_DECIMALS)
    .toNumber();

  // Calculate state tax impact
  const withConversionState = calculateStateTax(totalIncome.toNumber(), stateCode, filingStatus);
  const baselineState = calculateStateTax(currentIncome, stateCode, filingStatus);
  const stateTaxImpact = new Big(withConversionState)
    .minus(baselineState)
    .round(PRECISION_DECIMALS)
    .toNumber();

  // Calculate effective and marginal rates
  const totalTaxImpact = new Big(federalTaxImpact).plus(stateTaxImpact);
  const effectiveTaxRate = totalTaxImpact.div(conversionAmount).round(PRECISION_DECIMALS).toNumber();
  const marginalTaxRate = withConversionFederal.marginalTaxRate;

  // Calculate future value and NPV
  const futureValue = calculateFutureValue(conversionAmount, timeHorizon);
  const npv = calculateNPV(futureValue, timeHorizon, discountRate);

  return {
    federalTaxImpact,
    stateTaxImpact,
    effectiveTaxRate,
    marginalTaxRate,
    futureValue: futureValue.toNumber(),
    npv: npv.toNumber()
  };
}

/**
 * Determines optimal Roth conversion amount using advanced optimization algorithm
 * 
 * @param currentIncome - Current year taxable income
 * @param traditionalBalance - Traditional IRA balance
 * @param filingStatus - Tax filing status
 * @param stateCode - Two-letter state code
 * @param timeHorizon - Years for future value projection
 * @param discountRate - Annual discount rate for NPV calculations
 * @param riskTolerance - Risk tolerance level (1-5)
 * @param stateTaxWeight - Weight given to state tax impact (0-1)
 * @returns Optimized conversion recommendation
 * @throws Error if inputs are invalid
 * @version 1.0.0
 */
export function optimizeRothConversion(
  currentIncome: number,
  traditionalBalance: number,
  filingStatus: FilingStatus,
  stateCode: string,
  timeHorizon: number = DEFAULT_TIME_HORIZON,
  discountRate: number = DEFAULT_DISCOUNT_RATE,
  riskTolerance: number = DEFAULT_RISK_TOLERANCE,
  stateTaxWeight: number = DEFAULT_STATE_TAX_WEIGHT
): OptimizationResult {
  // Input validation
  if (!isFinite(traditionalBalance) || traditionalBalance < 0) {
    throw new Error('Traditional IRA balance must be a positive finite number');
  }
  if (riskTolerance < 1 || riskTolerance > 5) {
    throw new Error('Risk tolerance must be between 1 and 5');
  }
  if (stateTaxWeight < 0 || stateTaxWeight > 1) {
    throw new Error('State tax weight must be between 0 and 1');
  }

  let optimalAmount = new Big(0);
  let minTaxImpact = new Big(Infinity);
  let optimalTaxResult: TaxCalculationResult | null = null;

  // Binary search for optimal conversion amount
  let left = new Big(MINIMUM_CONVERSION);
  let right = new Big(Math.min(traditionalBalance, MAXIMUM_CONVERSION));

  while (left.lte(right)) {
    const mid = left.plus(right).div(2).round(0);
    const taxResult = calculateRothConversionTax(
      currentIncome,
      mid.toNumber(),
      filingStatus,
      stateCode,
      timeHorizon,
      discountRate
    );

    // Calculate weighted tax impact based on risk tolerance and state weight
    const weightedTaxImpact = calculateWeightedTaxImpact(
      taxResult,
      riskTolerance,
      stateTaxWeight
    );

    if (weightedTaxImpact.lt(minTaxImpact)) {
      minTaxImpact = weightedTaxImpact;
      optimalAmount = mid;
      optimalTaxResult = taxResult;
    }

    // Adjust search range based on marginal rate changes
    const nextAmount = mid.plus(OPTIMIZATION_STEP_SIZE);
    const nextTaxResult = calculateRothConversionTax(
      currentIncome,
      nextAmount.toNumber(),
      filingStatus,
      stateCode,
      timeHorizon,
      discountRate
    );

    if (nextTaxResult.marginalTaxRate > taxResult.marginalTaxRate) {
      right = mid.minus(OPTIMIZATION_STEP_SIZE);
    } else {
      left = mid.plus(OPTIMIZATION_STEP_SIZE);
    }
  }

  if (!optimalTaxResult) {
    throw new Error('Failed to find optimal conversion amount');
  }

  return {
    recommendedAmount: optimalAmount.toNumber(),
    taxImpact: optimalTaxResult,
    potentialSavings: calculatePotentialSavings(optimalAmount.toNumber(), optimalTaxResult),
    timeHorizon,
    discountRate
  };
}

/**
 * Calculates the future value of a conversion amount
 * @private
 */
function calculateFutureValue(amount: number, years: number): Big {
  return new Big(amount).times(Math.pow(1 + DEFAULT_DISCOUNT_RATE, years));
}

/**
 * Calculates the net present value of a future amount
 * @private
 */
function calculateNPV(futureValue: Big, years: number, discountRate: number): Big {
  return futureValue.div(Math.pow(1 + discountRate, years));
}

/**
 * Calculates weighted tax impact based on risk tolerance and state weight
 * @private
 */
function calculateWeightedTaxImpact(
  taxResult: TaxCalculationResult,
  riskTolerance: number,
  stateTaxWeight: number
): Big {
  const federalImpact = new Big(taxResult.federalTaxImpact);
  const stateImpact = new Big(taxResult.stateTaxImpact).times(stateTaxWeight);
  const riskAdjustment = new Big(6 - riskTolerance).div(5); // Convert 1-5 scale to 0.2-1.0

  return federalImpact.plus(stateImpact).times(riskAdjustment);
}

/**
 * Calculates potential tax savings from conversion
 * @private
 */
function calculatePotentialSavings(amount: number, taxResult: TaxCalculationResult): number {
  const futureValue = calculateFutureValue(amount, DEFAULT_TIME_HORIZON);
  const taxSavings = futureValue.minus(
    new Big(taxResult.federalTaxImpact).plus(taxResult.stateTaxImpact)
  );
  return taxSavings.round(PRECISION_DECIMALS).toNumber();
}