import { APIResponse } from './api.types';
import { CalculationResult, FilingStatus } from './calculation.types';
import { User } from './auth.types';

/**
 * Enumeration of supported validation rule types for scenario data
 */
export enum ValidationRuleType {
  MIN = 'MIN',
  MAX = 'MAX',
  REQUIRED = 'REQUIRED',
  PATTERN = 'PATTERN',
  CUSTOM = 'CUSTOM'
}

/**
 * Interface for validation rules with detailed constraints
 */
export interface ValidationRules {
  traditionalIRABalance: {
    min: number;
    max: number;
    required: boolean;
  };
  rothIRABalance: {
    min: number;
    max: number;
    required: boolean;
  };
  capitalGains: {
    min: number;
    max: number;
    required: boolean;
  };
  taxState: {
    required: boolean;
    pattern: RegExp;
  };
}

/**
 * Core scenario interface with comprehensive audit and versioning support
 */
export interface Scenario {
  /** Unique identifier for the scenario */
  id: string;
  /** Reference to the user who owns this scenario */
  userId: string;
  /** User-friendly name for the scenario */
  name: string;
  /** Detailed description of the scenario */
  description: string;
  /** Traditional IRA balance amount */
  traditionalIRABalance: number;
  /** Roth IRA balance amount */
  rothIRABalance: number;
  /** Capital gains amount */
  capitalGains: number;
  /** State for tax calculations */
  taxState: string;
  /** Tax filing status */
  filingStatus: FilingStatus;
  /** Calculation results, null if not yet calculated */
  calculationResult: CalculationResult | null;
  /** Timestamp of scenario creation */
  createdAt: Date;
  /** Timestamp of last update */
  updatedAt: Date;
  /** Timestamp of last calculation, null if never calculated */
  lastCalculatedAt: Date | null;
  /** Version number for optimistic concurrency */
  version: number;
}

/**
 * Interface for scenario form data with validation support
 */
export interface ScenarioFormData {
  /** User-friendly name for the scenario */
  name: string;
  /** Detailed description of the scenario */
  description: string;
  /** Traditional IRA balance amount */
  traditionalIRABalance: number;
  /** Roth IRA balance amount */
  rothIRABalance: number;
  /** Capital gains amount */
  capitalGains: number;
  /** State for tax calculations */
  taxState: string;
  /** Tax filing status */
  filingStatus: FilingStatus;
  /** Validation rules for form fields */
  validationRules: ValidationRules;
}

/**
 * Interface for tracking differences between scenarios
 */
export interface ScenarioDifferences {
  /** Changes in financial values */
  financialChanges: {
    traditionalIRABalance: number;
    rothIRABalance: number;
    capitalGains: number;
  };
  /** Changes in tax impact */
  taxImpactChanges: {
    federalTax: number;
    stateTax: number;
    effectiveRate: number;
  };
  /** Changes in optimization recommendations */
  recommendationChanges: {
    rothConversion: number;
    capitalGainsHarvesting: number;
  };
}

/**
 * Interface for scenario comparison metrics
 */
export interface ComparisonMetrics {
  /** Net present value difference */
  npvDifference: number;
  /** Tax savings difference */
  taxSavingsDifference: number;
  /** Risk level change */
  riskLevelChange: number;
  /** Confidence score difference */
  confidenceScoreDifference: number;
}

/**
 * Interface for detailed scenario comparisons with metrics
 */
export interface ScenarioComparison {
  /** Base scenario for comparison */
  baseScenario: Scenario;
  /** Scenario being compared */
  comparisonScenario: Scenario;
  /** Detailed differences between scenarios */
  differences: ScenarioDifferences;
  /** Comparison metrics */
  metrics: ComparisonMetrics;
  /** Timestamp of comparison */
  timestamp: Date;
}

/**
 * Type alias for single scenario API responses
 */
export type ScenarioAPIResponse = APIResponse<Scenario>;

/**
 * Type alias for multiple scenarios API responses
 */
export type ScenariosAPIResponse = APIResponse<Scenario[]>;