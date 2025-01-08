import { FilingStatus, TaxBracket, StateTaxInfo } from '../../types/tax.types';
import { STATE_TAX_INFO } from '../../config/constants';
import { formatCurrency } from '../formatters/currency';

/**
 * Cache for state tax calculations to optimize performance
 * @version 1.0.0
 */
const stateTaxCache = new Map<string, {
    result: number;
    timestamp: number;
}>();

/**
 * Cache TTL in milliseconds (1 hour)
 */
const CACHE_TTL = 3600000;

/**
 * Cache key generator for state tax calculations
 */
function generateCacheKey(income: number, stateCode: string, filingStatus: FilingStatus): string {
    return `${income}-${stateCode}-${filingStatus}`;
}

/**
 * Validates state tax calculation inputs
 * @throws Error if inputs are invalid
 */
function validateInputs(income: number, stateCode: string, filingStatus: FilingStatus): void {
    if (!isFinite(income) || income < 0) {
        throw new Error(`Invalid income amount: ${formatCurrency(income)}`);
    }

    if (!stateCode || stateCode.length !== 2) {
        throw new Error('Invalid state code');
    }

    if (!Object.values(FilingStatus).includes(filingStatus)) {
        throw new Error('Invalid filing status');
    }
}

/**
 * Calculates the total state tax liability with caching optimization and comprehensive validation
 * 
 * @param income - Taxable income amount
 * @param stateCode - Two-letter state code
 * @param filingStatus - Tax filing status
 * @returns Total state tax liability amount
 * @throws Error if calculation fails or inputs are invalid
 * @version 1.0.0
 */
export function calculateStateTax(
    income: number,
    stateCode: string,
    filingStatus: FilingStatus
): number {
    // Validate inputs
    validateInputs(income, stateCode, filingStatus);

    // Check cache
    const cacheKey = generateCacheKey(income, stateCode, filingStatus);
    const cachedResult = stateTaxCache.get(cacheKey);
    if (cachedResult && (Date.now() - cachedResult.timestamp) < CACHE_TTL) {
        return cachedResult.result;
    }

    // Get state tax info
    const stateInfo = STATE_TAX_INFO[stateCode.toUpperCase()];
    if (!stateInfo) {
        throw new Error(`Tax information not found for state: ${stateCode}`);
    }

    // Return 0 for states without income tax
    if (!stateInfo.hasIncomeTax) {
        return 0;
    }

    let totalTax = 0;
    let remainingIncome = income;

    // Calculate tax for each bracket
    for (const bracket of stateInfo.brackets) {
        const bracketIncome = Math.min(
            remainingIncome,
            bracket.maximumIncome - bracket.minimumIncome
        );

        if (bracketIncome <= 0) break;

        totalTax += bracketIncome * bracket.rate;
        remainingIncome -= bracketIncome;
    }

    // Apply special deductions if available
    if (stateInfo.specialDeductions) {
        for (const [_, deduction] of Object.entries(stateInfo.specialDeductions)) {
            totalTax = Math.max(0, totalTax - deduction);
        }
    }

    // Cache result
    stateTaxCache.set(cacheKey, {
        result: totalTax,
        timestamp: Date.now()
    });

    return totalTax;
}

/**
 * Determines the marginal state tax rate with enhanced validation and caching
 * 
 * @param income - Taxable income amount
 * @param stateCode - Two-letter state code
 * @param filingStatus - Tax filing status
 * @returns Marginal tax rate as decimal
 * @throws Error if calculation fails or inputs are invalid
 * @version 1.0.0
 */
export function getStateMarginalRate(
    income: number,
    stateCode: string,
    filingStatus: FilingStatus
): number {
    // Validate inputs
    validateInputs(income, stateCode, filingStatus);

    // Get state tax info
    const stateInfo = STATE_TAX_INFO[stateCode.toUpperCase()];
    if (!stateInfo) {
        throw new Error(`Tax information not found for state: ${stateCode}`);
    }

    // Return 0 for states without income tax
    if (!stateInfo.hasIncomeTax) {
        return 0;
    }

    // Find applicable bracket
    const applicableBracket = stateInfo.brackets.find(bracket => 
        income >= bracket.minimumIncome && income <= bracket.maximumIncome
    );

    if (!applicableBracket) {
        throw new Error('Unable to determine applicable tax bracket');
    }

    return applicableBracket.rate;
}

/**
 * Calculates the effective state tax rate with special deductions support
 * 
 * @param income - Taxable income amount
 * @param stateCode - Two-letter state code
 * @param filingStatus - Tax filing status
 * @returns Effective tax rate as decimal
 * @throws Error if calculation fails or inputs are invalid
 * @version 1.0.0
 */
export function getStateEffectiveRate(
    income: number,
    stateCode: string,
    filingStatus: FilingStatus
): number {
    // Validate inputs
    validateInputs(income, stateCode, filingStatus);

    if (income === 0) {
        return 0;
    }

    const totalTax = calculateStateTax(income, stateCode, filingStatus);
    return totalTax / income;
}

/**
 * Clears the state tax calculation cache
 * @version 1.0.0
 */
export function clearStateTaxCache(): void {
    stateTaxCache.clear();
}