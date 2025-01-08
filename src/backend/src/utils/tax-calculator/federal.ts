import { FilingStatus, TaxBracket, TaxCalculationResult } from '../../types/tax.types';
import { TAX_BRACKETS_2024 } from '../../config/constants';
import { formatCurrency } from '../formatters/currency';

/**
 * Cache for marginal rate calculations to improve performance
 * @version 1.0.0
 */
const marginalRateCache = new Map<string, number>();

/**
 * Calculates federal tax impact for a given income and filing status with high precision
 * 
 * @param income - Taxable income amount
 * @param filingStatus - Tax filing status
 * @returns Comprehensive tax calculation result
 * @throws Error if inputs are invalid
 * @version 1.0.0
 */
export function calculateFederalTax(
  income: number,
  filingStatus: FilingStatus
): TaxCalculationResult {
  // Input validation
  if (!isFinite(income) || income < 0) {
    throw new Error('Income must be a positive finite number');
  }
  if (!Object.values(FilingStatus).includes(filingStatus)) {
    throw new Error('Invalid filing status');
  }

  // Get applicable tax brackets
  const brackets = TAX_BRACKETS_2024[filingStatus];
  if (!brackets || !brackets.length) {
    throw new Error('Tax brackets not found for filing status');
  }

  let totalTax = 0;
  let remainingIncome = income;
  const bracketBreakdown: Array<{
    rate: number;
    amount: number;
    tax: number;
  }> = [];

  // Calculate tax for each bracket
  for (const bracket of brackets) {
    if (remainingIncome <= 0) break;

    const bracketIncome = Math.min(
      remainingIncome,
      bracket.maximumIncome - bracket.minimumIncome
    );
    
    const bracketTax = bracketIncome * bracket.rate;
    totalTax += bracketTax;
    
    bracketBreakdown.push({
      rate: bracket.rate,
      amount: bracketIncome,
      tax: bracketTax
    });

    remainingIncome -= bracketIncome;
  }

  // Calculate rates
  const marginalRate = calculateMarginalRate(income, filingStatus);
  const effectiveRate = calculateEffectiveRate(totalTax, income);

  return {
    federalTaxImpact: Number(totalTax.toFixed(2)),
    effectiveTaxRate: effectiveRate,
    marginalTaxRate: marginalRate,
    stateTaxImpact: 0, // Set by state calculator
    deductions: {}, // Set by deduction calculator
    taxableIncome: income,
    applicableBrackets: brackets
  };
}

/**
 * Calculates the marginal tax rate for a given income level with caching
 * 
 * @param income - Taxable income amount
 * @param filingStatus - Tax filing status
 * @returns Marginal tax rate as a decimal
 * @throws Error if inputs are invalid
 * @version 1.0.0
 */
export function calculateMarginalRate(
  income: number,
  filingStatus: FilingStatus
): number {
  // Check cache first
  const cacheKey = `${income}-${filingStatus}`;
  const cachedRate = marginalRateCache.get(cacheKey);
  if (cachedRate !== undefined) {
    return cachedRate;
  }

  // Input validation
  if (!isFinite(income) || income < 0) {
    throw new Error('Income must be a positive finite number');
  }

  const brackets = TAX_BRACKETS_2024[filingStatus];
  if (!brackets || !brackets.length) {
    throw new Error('Tax brackets not found for filing status');
  }

  // Find applicable bracket
  const applicableBracket = brackets.find(
    bracket => income >= bracket.minimumIncome && income <= bracket.maximumIncome
  );

  if (!applicableBracket) {
    throw new Error('No applicable tax bracket found for income level');
  }

  // Cache and return result
  marginalRateCache.set(cacheKey, applicableBracket.rate);
  return applicableBracket.rate;
}

/**
 * Calculates the effective tax rate with enhanced precision
 * 
 * @param totalTax - Total tax amount
 * @param income - Taxable income amount
 * @returns Effective tax rate as a decimal
 * @throws Error if inputs are invalid
 * @version 1.0.0
 */
export function calculateEffectiveRate(
  totalTax: number,
  income: number
): number {
  // Input validation
  if (!isFinite(totalTax) || totalTax < 0) {
    throw new Error('Total tax must be a positive finite number');
  }
  if (!isFinite(income) || income <= 0) {
    throw new Error('Income must be a positive finite number');
  }
  if (totalTax > income) {
    throw new Error('Total tax cannot exceed income');
  }

  // Calculate with 4 decimal precision
  const effectiveRate = Number((totalTax / income).toFixed(4));

  // Validate result
  if (effectiveRate < 0 || effectiveRate > 1) {
    throw new Error('Calculated effective rate is outside valid range');
  }

  return effectiveRate;
}

/**
 * Validates a tax bracket structure
 * 
 * @param bracket - Tax bracket to validate
 * @returns True if bracket is valid
 * @version 1.0.0
 */
function isValidTaxBracket(bracket: TaxBracket): boolean {
  return (
    typeof bracket.rate === 'number' &&
    bracket.rate >= 0 &&
    bracket.rate <= 1 &&
    typeof bracket.minimumIncome === 'number' &&
    bracket.minimumIncome >= 0 &&
    typeof bracket.maximumIncome === 'number' &&
    bracket.maximumIncome > bracket.minimumIncome
  );
}