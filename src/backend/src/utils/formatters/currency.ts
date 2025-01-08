import { VALIDATION_RULES } from '../../config/constants';

/**
 * Default currency formatting options using Intl.NumberFormat
 * @version 1.0.0
 */
const DEFAULT_CURRENCY_FORMAT_OPTIONS: Intl.NumberFormatOptions = {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  locale: 'en-US',
  useGrouping: true,
};

/**
 * Cache for NumberFormat instances to improve performance
 */
const numberFormatCache = new Map<string, Intl.NumberFormat>();

/**
 * Interface for extended currency formatting options
 */
interface CurrencyFormatOptions extends Intl.NumberFormatOptions {
  addAccessibilityLabel?: boolean;
  compactDisplay?: boolean;
}

/**
 * Formats a numeric value as a USD currency string with proper locale formatting
 * and accessibility considerations.
 * 
 * @param amount - The numeric amount to format
 * @param options - Optional formatting configuration
 * @returns Formatted currency string
 * @throws Error if amount is invalid
 * @version 1.0.0
 */
export function formatCurrency(
  amount: number,
  options: Partial<CurrencyFormatOptions> = {}
): string {
  if (!isFinite(amount)) {
    throw new Error('Invalid currency amount: must be a finite number');
  }

  const formatOptions = {
    ...DEFAULT_CURRENCY_FORMAT_OPTIONS,
    ...options,
  };

  // Generate cache key based on options
  const cacheKey = JSON.stringify(formatOptions);

  // Get or create NumberFormat instance
  let formatter = numberFormatCache.get(cacheKey);
  if (!formatter) {
    formatter = new Intl.NumberFormat(formatOptions.locale, formatOptions);
    numberFormatCache.set(cacheKey, formatter);
  }

  const formattedValue = formatter.format(amount);

  // Add accessibility attributes if requested
  if (options.addAccessibilityLabel) {
    return `<span aria-label="${amount} dollars">${formattedValue}</span>`;
  }

  return formattedValue;
}

/**
 * Safely converts a currency string into a numeric value with comprehensive
 * error handling and validation.
 * 
 * @param currencyString - The currency string to parse
 * @returns Parsed and validated numeric value
 * @throws Error if parsing fails or value is invalid
 * @version 1.0.0
 */
export function parseCurrency(currencyString: string): number {
  if (!currencyString) {
    throw new Error('Currency string cannot be empty');
  }

  // Remove currency symbol, whitespace, and thousand separators
  const cleanedString = currencyString
    .replace(/[$,\s]/g, '')
    .trim();

  // Validate format using regex
  const currencyRegex = /^-?\d*\.?\d{0,2}$/;
  if (!currencyRegex.test(cleanedString)) {
    throw new Error('Invalid currency format');
  }

  const parsedAmount = parseFloat(cleanedString);

  if (!isFinite(parsedAmount)) {
    throw new Error('Invalid currency value: parsing resulted in non-finite number');
  }

  // Validate against system limits
  if (!validateCurrencyAmount(parsedAmount)) {
    throw new Error(`Currency amount must be between ${formatCurrency(VALIDATION_RULES.MIN_INCOME)} and ${formatCurrency(VALIDATION_RULES.MAX_INCOME)}`);
  }

  return parsedAmount;
}

/**
 * Validates if a currency amount meets all system requirements and constraints.
 * 
 * @param amount - The amount to validate
 * @returns True if amount is valid, false otherwise
 * @version 1.0.0
 */
export function validateCurrencyAmount(amount: number): boolean {
  // Check if amount is a valid number
  if (!isFinite(amount)) {
    return false;
  }

  // Check system-defined limits
  if (amount < VALIDATION_RULES.MIN_INCOME || 
      amount > VALIDATION_RULES.MAX_INCOME) {
    return false;
  }

  // Validate decimal precision (max 2 decimal places)
  const decimalPlaces = (amount.toString().split('.')[1] || '').length;
  if (decimalPlaces > 2) {
    return false;
  }

  // Check for potential floating-point precision issues
  const roundedAmount = Number(amount.toFixed(2));
  if (roundedAmount !== amount) {
    return false;
  }

  return true;
}

/**
 * Type guard to check if a value is a valid currency amount
 * 
 * @param value - The value to check
 * @returns Type predicate indicating if value is a valid currency amount
 * @version 1.0.0
 */
export function isValidCurrencyAmount(value: unknown): value is number {
  return typeof value === 'number' && validateCurrencyAmount(value);
}