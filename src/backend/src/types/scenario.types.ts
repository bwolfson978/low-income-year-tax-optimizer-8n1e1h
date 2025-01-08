/**
 * Core TypeScript interfaces and types for tax optimization scenarios
 * @version 1.0.0
 */

import { FilingStatus, TaxCalculationResult, OptimizationResult } from './tax.types';
import { UserProfile } from './user.types';
import { APIResponse } from './api.types';

/**
 * Interface representing a tax bracket information for scenario analysis
 */
interface TaxBracketInfo {
  /** Tax rate as a percentage */
  rate: number;
  /** Minimum income for the bracket */
  minIncome: number;
  /** Maximum income for the bracket */
  maxIncome: number;
  /** Projected tax amount for this bracket */
  projectedTax: number;
}

/**
 * Interface for NPV (Net Present Value) analysis results
 */
interface NPVResult {
  /** Net present value of the optimization strategy */
  npvValue: number;
  /** Discount rate used in calculations */
  discountRate: number;
  /** Analysis period in years */
  timeHorizonYears: number;
  /** Year-by-year cash flow projections */
  yearlyProjections: Array<{
    year: number;
    cashFlow: number;
    presentValue: number;
  }>;
}

/**
 * Interface for alternative scenario analysis
 */
interface AlternativeScenario {
  /** Description of the alternative scenario */
  description: string;
  /** Modified input parameters */
  modifiedParams: Partial<ScenarioCreationRequest>;
  /** Calculated results for this alternative */
  results: OptimizationResult;
  /** Comparison with base scenario */
  comparison: {
    /** Difference in NPV */
    npvDifference: number;
    /** Difference in total tax impact */
    taxImpactDifference: number;
    /** Percentage improvement/decline */
    percentageChange: number;
  };
}

/**
 * Core scenario data structure with comprehensive tracking and versioning
 */
export interface Scenario {
  /** Unique identifier for the scenario */
  id: string;
  /** Reference to the user who owns this scenario */
  user_id: string;
  /** Scenario version for tracking changes */
  version: number;
  /** Traditional IRA balance */
  trad_ira_balance: number;
  /** Roth IRA balance */
  roth_ira_balance: number;
  /** Capital gains amount */
  capital_gains: number;
  /** State for tax calculations */
  tax_state: string;
  /** Tax filing status */
  filing_status: FilingStatus;
  /** Analysis time horizon in years */
  time_horizon: number;
  /** Risk tolerance level (1-5) */
  risk_tolerance: number;
  /** Scenario creation timestamp */
  created_at: Date;
  /** Last update timestamp */
  updated_at: Date;
}

/**
 * Request structure for creating new scenarios
 */
export interface ScenarioCreationRequest {
  /** Traditional IRA balance */
  trad_ira_balance: number;
  /** Roth IRA balance */
  roth_ira_balance: number;
  /** Capital gains amount */
  capital_gains: number;
  /** State for tax calculations */
  tax_state: string;
  /** Tax filing status */
  filing_status: FilingStatus;
  /** Analysis time horizon in years (1-40) */
  time_horizon: number;
  /** Risk tolerance level (1-5) */
  risk_tolerance: number;
}

/**
 * Comprehensive calculation results for a scenario
 */
export interface ScenarioCalculationResult {
  /** Reference to the source scenario */
  scenario_id: string;
  /** Roth conversion optimization results */
  roth_conversion: OptimizationResult;
  /** Capital gains optimization results */
  capital_gains: OptimizationResult;
  /** Net Present Value analysis */
  npv_analysis: NPVResult;
  /** Applicable tax brackets */
  tax_brackets: TaxBracketInfo[];
  /** Total potential tax savings */
  potential_savings: number;
  /** Alternative scenario analyses */
  alternative_scenarios: AlternativeScenario[];
  /** Calculation timestamp */
  calculated_at: Date;
}

/**
 * Type alias for scenario API response
 */
export type ScenarioResponse = APIResponse<Scenario>;

/**
 * Type alias for scenario calculation API response
 */
export type ScenarioCalculationResponse = APIResponse<ScenarioCalculationResult>;

/**
 * Type alias for batch scenario operations
 */
export type BatchScenarioResponse = APIResponse<Scenario[]>;