import { z } from 'zod'; // v3.22.0
import type { CalculationFormData } from '../types/calculation.types';
import type { ScenarioFormData } from '../types/scenario.types';
import type { LoginCredentials } from '../types/auth.types';

// Global constants for validation rules
const MAX_BALANCE = 5_000_000;
const MIN_PASSWORD_LENGTH = 8;
const MAX_SCENARIO_NAME_LENGTH = 100;
const MAX_SCENARIO_DESCRIPTION_LENGTH = 500;

// US state code regex pattern
const STATE_CODE_PATTERN = /^[A-Z]{2}$/;

/**
 * Enhanced login validation schema with strict email format checking
 */
export const loginSchema = z.object({
  email: z
    .string()
    .email('Invalid email format')
    .min(1, 'Email is required')
    .max(255, 'Email is too long'),
  password: z
    .string()
    .min(MIN_PASSWORD_LENGTH, 'Password must be at least 8 characters')
    .max(100, 'Password is too long'),
  rememberMe: z.boolean().optional()
});

/**
 * Comprehensive signup validation schema with password strength requirements
 */
export const signupSchema = z.object({
  email: z
    .string()
    .email('Invalid email format')
    .min(1, 'Email is required')
    .max(255, 'Email is too long'),
  password: z
    .string()
    .min(MIN_PASSWORD_LENGTH, 'Password must be at least 8 characters')
    .max(100, 'Password is too long')
    .regex(
      /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/,
      'Password must contain letters, numbers, and special characters'
    ),
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name is too long'),
  acceptedTerms: z
    .boolean()
    .refine((val) => val === true, 'Must accept terms and conditions')
});

/**
 * Precise calculation form validation schema with financial accuracy requirements
 */
export const calculationSchema = z.object({
  traditionalIRABalance: z
    .number()
    .min(0, 'Traditional IRA balance cannot be negative')
    .max(MAX_BALANCE, 'Traditional IRA balance exceeds maximum limit')
    .multipleOf(0.01, 'Amount must be in dollars and cents'),
  
  rothIRABalance: z
    .number()
    .min(0, 'Roth IRA balance cannot be negative')
    .max(MAX_BALANCE, 'Roth IRA balance exceeds maximum limit')
    .multipleOf(0.01, 'Amount must be in dollars and cents'),
  
  capitalGains: z
    .number()
    .min(0, 'Capital gains cannot be negative')
    .max(MAX_BALANCE, 'Capital gains exceed maximum limit')
    .multipleOf(0.01, 'Amount must be in dollars and cents'),
  
  taxState: z
    .string()
    .length(2, 'State code must be 2 characters')
    .regex(STATE_CODE_PATTERN, 'Must be valid state code')
    .toUpperCase(),
  
  filingStatus: z.enum(['SINGLE', 'MARRIED_JOINT', 'HEAD_OF_HOUSEHOLD'], {
    required_error: 'Filing status is required',
    invalid_type_error: 'Invalid filing status'
  }),

  riskTolerance: z.enum(['1', '2', '3'], {
    required_error: 'Risk tolerance is required',
    invalid_type_error: 'Invalid risk tolerance level'
  }).transform(Number),

  timeHorizon: z
    .number()
    .int('Time horizon must be a whole number')
    .min(1, 'Time horizon must be at least 1 year')
    .max(40, 'Time horizon cannot exceed 40 years')
});

/**
 * Scenario validation schema with optional description support
 */
export const scenarioSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(MAX_SCENARIO_NAME_LENGTH, 'Name is too long')
    .trim(),
  description: z
    .string()
    .max(MAX_SCENARIO_DESCRIPTION_LENGTH, 'Description is too long')
    .trim()
    .optional(),
  calculationData: calculationSchema
});

/**
 * Validates calculation form data with comprehensive error handling
 * @param data The calculation form data to validate
 * @returns Promise resolving to boolean indicating validation success
 * @throws ZodError with detailed validation failures
 */
export async function validateCalculationForm(
  data: CalculationFormData
): Promise<boolean> {
  try {
    await calculationSchema.parseAsync(data);
    return true;
  } catch (error) {
    throw error;
  }
}

/**
 * Validates scenario form data with optional field support
 * @param data The scenario form data to validate
 * @returns Promise resolving to boolean indicating validation success
 * @throws ZodError with validation details
 */
export async function validateScenarioForm(
  data: ScenarioFormData
): Promise<boolean> {
  try {
    await scenarioSchema.parseAsync(data);
    return true;
  } catch (error) {
    throw error;
  }
}

/**
 * Type inference helpers for runtime validation
 */
export type LoginFormData = z.infer<typeof loginSchema>;
export type SignupFormData = z.infer<typeof signupSchema>;
export type CalculationFormData = z.infer<typeof calculationSchema>;
export type ScenarioFormData = z.infer<typeof scenarioSchema>;