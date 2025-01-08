import { object, number, string } from 'yup';
import { 
  CalculationParameters, 
  OptimizationConfig 
} from '../../types/calculation.types';
import { FilingStatus } from '../../types/tax.types';

/**
 * Validation schema for calculation parameters
 * Ensures 99.9% calculation accuracy through strict input validation
 * @version 1.0.0
 */
export const calculationParametersSchema = object({
  traditionalIRABalance: number()
    .required('Traditional IRA balance is required')
    .min(0, 'Traditional IRA balance cannot be negative')
    .max(5000000, 'Traditional IRA balance cannot exceed $5,000,000')
    .test(
      'decimal-places',
      'Traditional IRA balance cannot have more than 2 decimal places',
      (value) => value === undefined || Number.isInteger(value * 100)
    ),

  rothIRABalance: number()
    .required('Roth IRA balance is required')
    .min(0, 'Roth IRA balance cannot be negative')
    .max(5000000, 'Roth IRA balance cannot exceed $5,000,000')
    .test(
      'decimal-places',
      'Roth IRA balance cannot have more than 2 decimal places',
      (value) => value === undefined || Number.isInteger(value * 100)
    ),

  capitalGains: number()
    .required('Capital gains amount is required')
    .min(0, 'Capital gains cannot be negative')
    .max(5000000, 'Capital gains cannot exceed $5,000,000')
    .test(
      'decimal-places',
      'Capital gains cannot have more than 2 decimal places',
      (value) => value === undefined || Number.isInteger(value * 100)
    ),

  taxState: string()
    .required('Tax state is required')
    .length(2, 'Tax state must be a 2-letter state code')
    .matches(/^[A-Z]{2}$/, 'Tax state must be a valid 2-letter state code')
    .uppercase(),

  filingStatus: string()
    .required('Filing status is required')
    .oneOf(
      Object.values(FilingStatus),
      'Filing status must be one of: SINGLE, MARRIED_JOINT, HEAD_OF_HOUSEHOLD'
    )
});

/**
 * Validation schema for optimization configuration
 * Based on technical specifications A.1.2
 * @version 1.0.0
 */
export const optimizationConfigSchema = object({
  timeHorizon: number()
    .required('Time horizon is required')
    .integer('Time horizon must be a whole number')
    .min(1, 'Time horizon must be at least 1 year')
    .max(40, 'Time horizon cannot exceed 40 years'),

  discountRate: number()
    .required('Discount rate is required')
    .min(0.01, 'Discount rate must be at least 1%')
    .max(0.10, 'Discount rate cannot exceed 10%')
    .test(
      'decimal-places',
      'Discount rate cannot have more than 4 decimal places',
      (value) => value === undefined || Number.isInteger(value * 10000)
    ),

  riskTolerance: number()
    .required('Risk tolerance is required')
    .integer('Risk tolerance must be a whole number')
    .min(1, 'Risk tolerance must be at least 1')
    .max(5, 'Risk tolerance cannot exceed 5'),

  stateTaxWeight: number()
    .required('State tax weight is required')
    .min(0, 'State tax weight cannot be negative')
    .max(1, 'State tax weight cannot exceed 100%')
    .test(
      'decimal-places',
      'State tax weight cannot have more than 2 decimal places',
      (value) => value === undefined || Number.isInteger(value * 100)
    )
});

/**
 * Validates calculation parameters with enhanced error handling
 * @param data The calculation parameters to validate
 * @returns Promise<boolean> True if validation passes, throws ValidationError if fails
 */
export async function validateCalculationParameters(
  data: CalculationParameters
): Promise<boolean> {
  try {
    // Sanitize input data
    const sanitizedData = {
      ...data,
      taxState: data.taxState?.toUpperCase(),
      filingStatus: data.filingStatus?.toString()
    };

    await calculationParametersSchema.validate(sanitizedData, { 
      abortEarly: false,
      stripUnknown: true 
    });
    return true;
  } catch (error) {
    console.error('[Validation Error] Calculation Parameters:', error);
    throw error;
  }
}

/**
 * Validates optimization configuration with enhanced error handling
 * @param config The optimization configuration to validate
 * @returns Promise<boolean> True if validation passes, throws ValidationError if fails
 */
export async function validateOptimizationConfig(
  config: OptimizationConfig
): Promise<boolean> {
  try {
    await optimizationConfigSchema.validate(config, {
      abortEarly: false,
      stripUnknown: true
    });
    return true;
  } catch (error) {
    console.error('[Validation Error] Optimization Config:', error);
    throw error;
  }
}