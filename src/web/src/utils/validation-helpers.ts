import { z } from 'zod'; // v3.22.0
import type { CalculationFormData } from '../types/calculation.types';
import type { ScenarioFormData } from '../types/scenario.types';
import { calculationSchema, scenarioSchema } from '../lib/validators';

// Constants for validation rules
export const MAX_BALANCE = 5000000;
export const MIN_DESCRIPTION_LENGTH = 1;
export const MAX_DESCRIPTION_LENGTH = 500;

// Validation error messages
export const ERROR_MESSAGES = {
  INVALID_AMOUNT: 'Please enter a valid amount between $0 and $5,000,000',
  REQUIRED_FIELD: 'This field is required to proceed',
  INVALID_STATE: 'Please select a valid U.S. state',
  INVALID_FILING_STATUS: 'Please select a valid tax filing status',
  INVALID_FORMAT: 'Please enter a valid number without special characters',
  DESCRIPTION_LENGTH: 'Description must be between 1 and 500 characters'
} as const;

/**
 * Validates calculation form input data with comprehensive error handling
 * @param data The calculation form data to validate
 * @returns Promise with validation result containing success status, optional error, and sanitized data
 */
export async function validateCalculationInput(
  data: CalculationFormData
): Promise<{ success: boolean; error?: string; data?: CalculationFormData }> {
  try {
    // Sanitize numeric inputs
    const sanitizedData = {
      ...data,
      traditionalIRABalance: sanitizeNumericInput(String(data.traditionalIRABalance)),
      rothIRABalance: sanitizeNumericInput(String(data.rothIRABalance)),
      capitalGains: sanitizeNumericInput(String(data.capitalGains))
    };

    // Validate against schema
    const validatedData = await calculationSchema.parseAsync(sanitizedData);

    return {
      success: true,
      data: validatedData
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: formatValidationError(error)
      };
    }
    return {
      success: false,
      error: 'An unexpected validation error occurred'
    };
  }
}

/**
 * Validates scenario form input data with enhanced string validation
 * @param data The scenario form data to validate
 * @returns Promise with validation result containing success status, optional error, and sanitized data
 */
export async function validateScenarioInput(
  data: ScenarioFormData
): Promise<{ success: boolean; error?: string; data?: ScenarioFormData }> {
  try {
    // Trim string inputs
    const sanitizedData = {
      ...data,
      name: data.name.trim(),
      description: data.description?.trim()
    };

    // Validate string lengths
    if (sanitizedData.description && 
        (sanitizedData.description.length < MIN_DESCRIPTION_LENGTH || 
         sanitizedData.description.length > MAX_DESCRIPTION_LENGTH)) {
      return {
        success: false,
        error: ERROR_MESSAGES.DESCRIPTION_LENGTH
      };
    }

    // Validate against schema
    const validatedData = await scenarioSchema.parseAsync(sanitizedData);

    return {
      success: true,
      data: validatedData
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: formatValidationError(error)
      };
    }
    return {
      success: false,
      error: 'An unexpected validation error occurred'
    };
  }
}

/**
 * Formats Zod validation errors into user-friendly messages with accessibility support
 * @param error The Zod validation error to format
 * @returns Formatted error message string with ARIA attributes
 */
export function formatValidationError(error: z.ZodError): string {
  const firstError = error.errors[0];
  if (!firstError) return 'Validation failed';

  // Map error codes to user-friendly messages
  const fieldName = firstError.path.join('.');
  const baseMessage = firstError.message;

  // Format for screen readers
  const ariaMessage = `Error in ${fieldName}: ${baseMessage}`;
  
  // Return message with ARIA support
  return `<span role="alert" aria-live="polite">${ariaMessage}</span>`;
}

/**
 * Sanitizes and validates numeric input with comprehensive formatting handling
 * @param value The string value to sanitize
 * @returns Sanitized number value
 * @throws Error if value cannot be sanitized to a valid number
 */
export function sanitizeNumericInput(value: string): number {
  try {
    // Remove currency symbols and formatting
    const cleanValue = value
      .replace(/[$,]/g, '')
      .replace(/\s/g, '')
      .trim();

    // Handle international number formats
    const normalizedValue = cleanValue
      .replace(/[^\d.-]/g, '')
      .replace(/\.(?=.*\.)/g, '');

    // Convert to number and validate
    const numericValue = Number(normalizedValue);

    if (isNaN(numericValue)) {
      throw new Error(ERROR_MESSAGES.INVALID_FORMAT);
    }

    if (numericValue < 0 || numericValue > MAX_BALANCE) {
      throw new Error(ERROR_MESSAGES.INVALID_AMOUNT);
    }

    // Return with 2 decimal precision for currency
    return Number(numericValue.toFixed(2));
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : ERROR_MESSAGES.INVALID_FORMAT);
  }
}