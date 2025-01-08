/**
 * Comprehensive validation utility for tax optimization scenarios
 * Ensures data integrity, security compliance, and business rule enforcement
 * @version 1.0.0
 */

import { object, number, string } from 'yup';
import {
  ScenarioCreationRequest,
  ScenarioUpdateRequest
} from '../../types/scenario.types';
import { FilingStatus } from '../../types/tax.types';

// Constants for validation rules
const MAX_IRA_BALANCE = 5000000;
const MAX_CAPITAL_GAINS = 5000000;
const MIN_TIME_HORIZON = 1;
const MAX_TIME_HORIZON = 40;
const MIN_RISK_TOLERANCE = 1;
const MAX_RISK_TOLERANCE = 5;

// Valid US state codes
const US_STATE_CODES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
];

/**
 * Validation schema for scenario creation with comprehensive security checks
 */
export const scenarioCreationSchema = object({
  trad_ira_balance: number()
    .required('Traditional IRA balance is required')
    .min(0, 'Traditional IRA balance cannot be negative')
    .max(MAX_IRA_BALANCE, `Traditional IRA balance cannot exceed $${MAX_IRA_BALANCE.toLocaleString()}`)
    .test('is-finite', 'Invalid balance value', value => Number.isFinite(value)),

  roth_ira_balance: number()
    .required('Roth IRA balance is required')
    .min(0, 'Roth IRA balance cannot be negative')
    .max(MAX_IRA_BALANCE, `Roth IRA balance cannot exceed $${MAX_IRA_BALANCE.toLocaleString()}`)
    .test('is-finite', 'Invalid balance value', value => Number.isFinite(value)),

  capital_gains: number()
    .required('Capital gains amount is required')
    .min(0, 'Capital gains cannot be negative')
    .max(MAX_CAPITAL_GAINS, `Capital gains cannot exceed $${MAX_CAPITAL_GAINS.toLocaleString()}`)
    .test('is-finite', 'Invalid capital gains value', value => Number.isFinite(value)),

  tax_state: string()
    .required('Tax state is required')
    .uppercase()
    .length(2, 'State code must be 2 characters')
    .oneOf(US_STATE_CODES, 'Invalid state code')
    .trim(),

  filing_status: string()
    .required('Filing status is required')
    .oneOf(
      [FilingStatus.SINGLE, FilingStatus.MARRIED_JOINT, FilingStatus.HEAD_OF_HOUSEHOLD],
      'Invalid filing status'
    ),

  time_horizon: number()
    .required('Time horizon is required')
    .integer('Time horizon must be a whole number')
    .min(MIN_TIME_HORIZON, `Time horizon must be at least ${MIN_TIME_HORIZON} year`)
    .max(MAX_TIME_HORIZON, `Time horizon cannot exceed ${MAX_TIME_HORIZON} years`),

  risk_tolerance: number()
    .required('Risk tolerance is required')
    .integer('Risk tolerance must be a whole number')
    .min(MIN_RISK_TOLERANCE, `Risk tolerance must be at least ${MIN_RISK_TOLERANCE}`)
    .max(MAX_RISK_TOLERANCE, `Risk tolerance cannot exceed ${MAX_RISK_TOLERANCE}`)
}).test(
  'total-balance-limit',
  'Combined IRA balances cannot exceed maximum limit',
  function(values) {
    if (!values) return false;
    const totalBalance = (values.trad_ira_balance || 0) + (values.roth_ira_balance || 0);
    return totalBalance <= MAX_IRA_BALANCE;
  }
);

/**
 * Validation schema for scenario updates with partial validation support
 */
export const scenarioUpdateSchema = object({
  trad_ira_balance: number()
    .optional()
    .min(0, 'Traditional IRA balance cannot be negative')
    .max(MAX_IRA_BALANCE, `Traditional IRA balance cannot exceed $${MAX_IRA_BALANCE.toLocaleString()}`)
    .test('is-finite', 'Invalid balance value', value => 
      value === undefined || Number.isFinite(value)
    ),

  roth_ira_balance: number()
    .optional()
    .min(0, 'Roth IRA balance cannot be negative')
    .max(MAX_IRA_BALANCE, `Roth IRA balance cannot exceed $${MAX_IRA_BALANCE.toLocaleString()}`)
    .test('is-finite', 'Invalid balance value', value => 
      value === undefined || Number.isFinite(value)
    ),

  capital_gains: number()
    .optional()
    .min(0, 'Capital gains cannot be negative')
    .max(MAX_CAPITAL_GAINS, `Capital gains cannot exceed $${MAX_CAPITAL_GAINS.toLocaleString()}`)
    .test('is-finite', 'Invalid capital gains value', value => 
      value === undefined || Number.isFinite(value)
    ),

  tax_state: string()
    .optional()
    .uppercase()
    .length(2, 'State code must be 2 characters')
    .oneOf(US_STATE_CODES, 'Invalid state code')
    .trim(),

  filing_status: string()
    .optional()
    .oneOf(
      [FilingStatus.SINGLE, FilingStatus.MARRIED_JOINT, FilingStatus.HEAD_OF_HOUSEHOLD],
      'Invalid filing status'
    ),

  time_horizon: number()
    .optional()
    .integer('Time horizon must be a whole number')
    .min(MIN_TIME_HORIZON, `Time horizon must be at least ${MIN_TIME_HORIZON} year`)
    .max(MAX_TIME_HORIZON, `Time horizon cannot exceed ${MAX_TIME_HORIZON} years`),

  risk_tolerance: number()
    .optional()
    .integer('Risk tolerance must be a whole number')
    .min(MIN_RISK_TOLERANCE, `Risk tolerance must be at least ${MIN_RISK_TOLERANCE}`)
    .max(MAX_RISK_TOLERANCE, `Risk tolerance cannot exceed ${MAX_RISK_TOLERANCE}`)
}).test(
  'total-balance-limit',
  'Combined IRA balances cannot exceed maximum limit',
  function(values) {
    if (!values) return true;
    if (values.trad_ira_balance === undefined && values.roth_ira_balance === undefined) {
      return true;
    }
    const totalBalance = (values.trad_ira_balance || 0) + (values.roth_ira_balance || 0);
    return totalBalance <= MAX_IRA_BALANCE;
  }
);