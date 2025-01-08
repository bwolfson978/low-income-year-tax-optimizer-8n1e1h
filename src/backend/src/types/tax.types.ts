/**
 * Enumeration of supported tax filing statuses
 * @version 1.0.0
 */
export enum FilingStatus {
    SINGLE = "SINGLE",
    MARRIED_JOINT = "MARRIED_JOINT",
    HEAD_OF_HOUSEHOLD = "HEAD_OF_HOUSEHOLD"
}

/**
 * Enumeration of capital gains types for tax calculations
 * @version 1.0.0
 */
export enum CapitalGainsType {
    SHORT_TERM = "SHORT_TERM",
    LONG_TERM = "LONG_TERM"
}

/**
 * Interface defining the structure of a tax bracket
 * Includes rate, income ranges, filing status, and applicable year
 */
export interface TaxBracket {
    /** Tax rate as a decimal (e.g., 0.22 for 22%) */
    rate: number;
    /** Minimum income for this bracket in dollars */
    minimumIncome: number;
    /** Maximum income for this bracket in dollars */
    maximumIncome: number;
    /** Filing status this bracket applies to */
    filingStatus: FilingStatus;
    /** Tax year this bracket is applicable for */
    year: number;
}

/**
 * Interface for state-specific tax information including brackets,
 * special deductions, and capital gains treatment
 */
export interface StateTaxInfo {
    /** Two-letter state code (e.g., "CA", "NY") */
    stateCode: string;
    /** Whether the state has an income tax */
    hasIncomeTax: boolean;
    /** Array of state-specific tax brackets */
    brackets: TaxBracket[];
    /** Record of special deductions available in the state */
    specialDeductions: Record<string, number>;
    /** Capital gains rates by type for the state */
    capitalGainsRates: Record<CapitalGainsType, number>;
}

/**
 * Interface for detailed tax calculation results including federal
 * and state impacts, rates, and applicable deductions
 */
export interface TaxCalculationResult {
    /** Total federal tax impact in dollars */
    federalTaxImpact: number;
    /** Total state tax impact in dollars */
    stateTaxImpact: number;
    /** Combined effective tax rate as a decimal */
    effectiveTaxRate: number;
    /** Marginal tax rate as a decimal */
    marginalTaxRate: number;
    /** Record of all applicable deductions */
    deductions: Record<string, number>;
    /** Final taxable income after deductions */
    taxableIncome: number;
    /** Array of applicable tax brackets */
    applicableBrackets: TaxBracket[];
}

/**
 * Interface for optimization calculation results including recommended
 * actions and NPV analysis of potential savings
 */
export interface OptimizationResult {
    /** Recommended conversion or realization amount */
    recommendedAmount: number;
    /** Detailed tax calculation results */
    taxImpact: TaxCalculationResult;
    /** Total potential tax savings in dollars */
    potentialSavings: number;
    /** Analysis time horizon in years */
    timeHorizon: number;
    /** Discount rate used for NPV calculations */
    discountRate: number;
    /** Net present value of total savings */
    npvSavings: number;
    /** Alternative scenarios with different amounts and corresponding savings */
    alternativeScenarios: Array<{
        amount: number;
        savings: number;
    }>;
}