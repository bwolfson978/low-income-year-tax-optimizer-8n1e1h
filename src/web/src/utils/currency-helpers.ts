import { TAX_CONSTANTS } from '../lib/constants';

// Global constants for currency formatting
const DEFAULT_LOCALE = 'en-US';
const DEFAULT_CURRENCY = 'USD';
const DEFAULT_CURRENCY_DECIMALS = 2;
const CURRENCY_CACHE_SIZE = 100;
const CURRENCY_CACHE_TTL = 3600000; // 1 hour in milliseconds

// LRU cache for formatted currency values
const currencyCache = new Map<string, { value: string; timestamp: number }>();

/**
 * Interface for currency formatting options
 */
interface CurrencyFormatOptions {
  locale?: string;
  currency?: string;
  decimals?: number;
  useCache?: boolean;
  addAriaLabel?: boolean;
}

/**
 * Interface for currency validation constraints
 */
interface CurrencyValidationConstraints {
  min?: number;
  max?: number;
  allowNegative?: boolean;
  taxYear?: number;
  stateCode?: string;
  accountType?: string;
}

/**
 * Formats a number as a currency string with proper symbol, grouping, and decimal places
 * @param value - The number to format
 * @param options - Formatting options
 * @returns Formatted currency string with optional ARIA label
 */
export function formatCurrency(
  value: number,
  options: CurrencyFormatOptions = {}
): string {
  const {
    locale = DEFAULT_LOCALE,
    currency = DEFAULT_CURRENCY,
    decimals = DEFAULT_CURRENCY_DECIMALS,
    useCache = true,
    addAriaLabel = true
  } = options;

  // Validate input
  if (!Number.isFinite(value)) {
    return 'Invalid amount';
  }

  // Generate cache key if caching is enabled
  const cacheKey = useCache
    ? `${value}-${locale}-${currency}-${decimals}-${addAriaLabel}`
    : '';

  // Check cache
  if (useCache && currencyCache.has(cacheKey)) {
    const cached = currencyCache.get(cacheKey)!;
    if (Date.now() - cached.timestamp < CURRENCY_CACHE_TTL) {
      return cached.value;
    }
    currencyCache.delete(cacheKey);
  }

  // Format the currency
  const formatter = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });

  let formatted = formatter.format(value);

  // Add ARIA label if requested
  if (addAriaLabel) {
    const ariaLabel = `${Math.abs(value)} ${currency}`;
    formatted = `<span aria-label="${ariaLabel}">${formatted}</span>`;
  }

  // Cache the result if caching is enabled
  if (useCache) {
    if (currencyCache.size >= CURRENCY_CACHE_SIZE) {
      const oldestKey = currencyCache.keys().next().value;
      currencyCache.delete(oldestKey);
    }
    currencyCache.set(cacheKey, { value: formatted, timestamp: Date.now() });
  }

  return formatted;
}

/**
 * Parses a currency string into a number with robust error handling
 * @param value - The currency string to parse
 * @returns Parsed number value
 */
export function parseCurrency(value: string): number {
  // Remove currency symbols and formatting
  const cleanValue = value
    .replace(/[^\d.-]/g, '')
    .replace(/^\./, '0.')
    .replace(/^-\./, '-0.');

  // Handle parentheses for negative values
  const isNegative = value.includes('(') && value.includes(')');
  const numberValue = parseFloat(cleanValue);

  if (!Number.isFinite(numberValue)) {
    throw new Error('Invalid currency format');
  }

  // Apply negative value if parentheses were used
  const finalValue = isNegative ? -Math.abs(numberValue) : numberValue;

  // Round to nearest cent
  return Math.round(finalValue * 100) / 100;
}

/**
 * Formats currency specifically for tax calculations with IRS-compliant rounding
 * @param value - The number to format
 * @param showPositiveSign - Whether to show + for positive values
 * @param options - Tax-specific formatting options
 * @returns Tax-formatted currency string
 */
export function formatTaxableCurrency(
  value: number,
  showPositiveSign: boolean = false,
  options: {
    useParentheses?: boolean;
    taxYear?: number;
    stateCode?: string;
  } = {}
): string {
  const {
    useParentheses = true,
    taxYear = TAX_CONSTANTS.DEFAULT_TAX_YEAR,
    stateCode
  } = options;

  // Round to nearest cent per IRS regulations
  const roundedValue = Math.round(value * 100) / 100;

  // Handle negative values
  const isNegative = roundedValue < 0;
  const absValue = Math.abs(roundedValue);

  // Format with basic currency formatting
  let formatted = formatCurrency(absValue, {
    addAriaLabel: true,
    useCache: false
  });

  // Apply sign formatting
  if (isNegative) {
    formatted = useParentheses ? `(${formatted})` : `-${formatted}`;
  } else if (showPositiveSign) {
    formatted = `+${formatted}`;
  }

  // Add state-specific formatting if required
  if (stateCode && TAX_CONSTANTS.SUPPORTED_STATES.includes(stateCode)) {
    formatted = `${formatted} [${stateCode}]`;
  }

  return formatted;
}

/**
 * Validates user input for currency fields with comprehensive business rule enforcement
 * @param value - The input value to validate
 * @param constraints - Validation constraints
 * @returns Validation result object
 */
export function validateCurrencyInput(
  value: string,
  constraints: CurrencyValidationConstraints = {}
): {
  valid: boolean;
  error?: string;
  warnings?: string[];
  formattedValue?: string;
} {
  const {
    min = 0,
    max = TAX_CONSTANTS.MAX_IRA_BALANCE,
    allowNegative = false,
    taxYear = TAX_CONSTANTS.DEFAULT_TAX_YEAR,
    accountType
  } = constraints;

  const warnings: string[] = [];
  
  try {
    // Parse the input value
    const numericValue = parseCurrency(value);

    // Validate numeric constraints
    if (!allowNegative && numericValue < 0) {
      return {
        valid: false,
        error: 'Negative values are not allowed'
      };
    }

    if (numericValue < min) {
      return {
        valid: false,
        error: `Value cannot be less than ${formatCurrency(min)}`
      };
    }

    if (numericValue > max) {
      return {
        valid: false,
        error: `Value cannot exceed ${formatCurrency(max)}`
      };
    }

    // Account-specific validations
    if (accountType === 'IRA' && numericValue > TAX_CONSTANTS.MAX_IRA_BALANCE) {
      return {
        valid: false,
        error: 'IRA balance cannot exceed maximum allowed amount'
      };
    }

    if (accountType === 'CAPITAL_GAINS' && numericValue > TAX_CONSTANTS.MAX_CAPITAL_GAINS) {
      return {
        valid: false,
        error: 'Capital gains amount exceeds maximum allowed'
      };
    }

    // Add warnings for high values
    if (numericValue > max * 0.9) {
      warnings.push('Value is approaching maximum limit');
    }

    // Format the valid value
    const formattedValue = formatCurrency(numericValue);

    return {
      valid: true,
      formattedValue,
      warnings: warnings.length > 0 ? warnings : undefined
    };
  } catch (error) {
    return {
      valid: false,
      error: 'Invalid currency format'
    };
  }
}