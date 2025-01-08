import { APIResponse } from './api.types';

/**
 * Enumeration of supported tax filing statuses
 */
export enum FilingStatus {
  SINGLE = 'SINGLE',
  MARRIED_JOINT = 'MARRIED_JOINT',
  HEAD_OF_HOUSEHOLD = 'HEAD_OF_HOUSEHOLD'
}

/**
 * Risk tolerance levels for optimization strategies
 */
export enum RiskLevel {
  CONSERVATIVE = 1,
  MODERATE = 2,
  AGGRESSIVE = 3
}

/**
 * Interface for alternative tax optimization strategies
 */
interface Strategy {
  name: string;
  description: string;
  potentialSavings: number;
  riskLevel: RiskLevel;
  implementationComplexity: number;
}

/**
 * Interface for user calculation preferences
 */
interface UserPreferences {
  defaultRiskLevel: RiskLevel;
  defaultTimeHorizon: number;
  preferredTaxState: string;
  notificationPreferences: {
    emailUpdates: boolean;
    savingsThreshold: number;
  };
}

/**
 * Comprehensive interface for calculation form input data
 */
export interface CalculationFormData {
  traditionalIRABalance: number;
  rothIRABalance: number;
  capitalGains: number;
  taxState: string;
  filingStatus: FilingStatus;
  riskTolerance: RiskLevel;
  timeHorizon: number;
}

/**
 * Interface for yearly tax projections
 */
export interface TaxProjection {
  year: number;
  projectedTax: number;
  savingsOpportunity: number;
}

/**
 * Enhanced interface for optimization results with risk assessment
 */
export interface OptimizationResult {
  amount: number;
  taxSavings: number;
  npv: number;
  riskLevel: RiskLevel;
  confidenceScore: number;
  alternativeStrategies: Strategy[];
}

/**
 * Comprehensive interface for tax impact calculations
 */
export interface TaxImpact {
  federalTax: number;
  stateTax: number;
  effectiveRate: number;
  marginalRate: number;
  totalTax: number;
  yearlyProjection: TaxProjection[];
}

/**
 * Complete interface for calculation results with metadata
 */
export interface CalculationResult {
  rothConversion: OptimizationResult;
  capitalGainsHarvesting: OptimizationResult;
  taxImpact: TaxImpact;
  timestamp: Date;
  scenarioId: string;
  userPreferences: UserPreferences;
}

/**
 * Type alias for calculation API responses
 */
export type CalculationAPIResponse = APIResponse<CalculationResult>;