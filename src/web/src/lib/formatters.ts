import { formatCurrency, parseCurrency } from '../utils/currency-helpers';
import { formatDate, formatTaxYearRange } from '../utils/date-helpers';
import { TAX_CONSTANTS } from './constants';

// Global constants for formatting
const DEFAULT_LOCALE = 'en-US';
const DEFAULT_PERCENTAGE_DECIMALS = 2;
const DEFAULT_NUMBER_DECIMALS = 0;
const MAX_SAFE_INTEGER = Number.MAX_SAFE_INTEGER;

/**
 * Formats a number as a percentage with proper decimal places and accessibility support
 * @param value - Number to format as percentage
 * @param options - Formatting options for precision control
 * @returns Formatted percentage string with ARIA label
 * @version Intl@latest
 */
export function formatPercentage(
  value: number,
  options: {
    decimals?: number;
    minimumFraction?: number;
    maximumFraction?: number;
  } = {}
): string {
  // Validate input
  if (!Number.isFinite(value)) {
    throw new Error('Invalid number provided for percentage formatting');
  }

  // Validate percentage range
  if (value < 0 || value > 100) {
    throw new Error('Percentage must be between 0 and 100');
  }

  const {
    decimals = DEFAULT_PERCENTAGE_DECIMALS,
    minimumFraction = decimals,
    maximumFraction = decimals
  } = options;

  // Format percentage using Intl
  const formatter = new Intl.NumberFormat(DEFAULT_LOCALE, {
    style: 'percent',
    minimumFractionDigits: minimumFraction,
    maximumFractionDigits: maximumFraction
  });

  const formatted = formatter.format(value / 100);

  // Add ARIA label for accessibility
  return `<span aria-label="${value} percent">${formatted}</span>`;
}

/**
 * Formats a number with proper grouping and support for large values
 * @param value - Number to format
 * @param options - Formatting options for notation and grouping
 * @returns Formatted number string with proper grouping
 * @version Intl@latest
 */
export function formatNumber(
  value: number,
  options: {
    decimals?: number;
    useGrouping?: boolean;
    notation?: 'standard' | 'scientific' | 'engineering' | 'compact';
  } = {}
): string {
  // Validate input
  if (!Number.isFinite(value)) {
    throw new Error('Invalid number provided for formatting');
  }

  // Validate against MAX_SAFE_INTEGER
  if (Math.abs(value) > MAX_SAFE_INTEGER) {
    throw new Error('Number exceeds maximum safe integer value');
  }

  const {
    decimals = DEFAULT_NUMBER_DECIMALS,
    useGrouping = true,
    notation = 'standard'
  } = options;

  // Format number using Intl
  const formatter = new Intl.NumberFormat(DEFAULT_LOCALE, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    useGrouping,
    notation
  });

  const formatted = formatter.format(value);

  // Add ARIA label for large numbers
  if (Math.abs(value) >= 1000000) {
    return `<span aria-label="${value.toLocaleString(DEFAULT_LOCALE)}">${formatted}</span>`;
  }

  return formatted;
}

/**
 * Formats a tax amount with proper currency formatting and sign handling
 * @param amount - Tax amount to format
 * @param showPositiveSign - Whether to show + for positive values
 * @param options - Formatting options for tax amounts
 * @returns Formatted tax amount string with proper currency notation
 */
export function formatTaxAmount(
  amount: number,
  showPositiveSign: boolean = false,
  options: {
    useParentheses?: boolean;
    showCents?: boolean;
  } = {}
): string {
  // Validate amount against supported range
  if (Math.abs(amount) > TAX_CONSTANTS.MAX_SUPPORTED_AMOUNT) {
    throw new Error('Tax amount exceeds maximum supported value');
  }

  const { useParentheses = true, showCents = true } = options;

  // Format base amount
  const formatted = formatCurrency(Math.abs(amount), {
    decimals: showCents ? 2 : 0,
    addAriaLabel: true
  });

  // Handle negative values and sign display
  if (amount < 0) {
    return useParentheses ? `(${formatted})` : `-${formatted}`;
  }

  // Add positive sign if requested
  return showPositiveSign ? `+${formatted}` : formatted;
}

/**
 * Formats a tax year with proper fiscal year notation
 * @param year - Tax year to format
 * @param options - Formatting options for tax year display
 * @returns Formatted tax year string with optional fiscal year notation
 */
export function formatTaxYear(
  year: number,
  options: {
    showFiscalYear?: boolean;
    includeRange?: boolean;
  } = {}
): string {
  // Validate tax year
  if (year < TAX_CONSTANTS.DEFAULT_TAX_YEAR - 3 || year > TAX_CONSTANTS.DEFAULT_TAX_YEAR + 1) {
    throw new Error('Tax year outside supported range');
  }

  const { showFiscalYear = false, includeRange = false } = options;

  // Format tax year
  let formatted = year.toString();

  // Add fiscal year notation if requested
  if (showFiscalYear) {
    formatted = `FY ${formatted}`;
  }

  // Add year range if requested
  if (includeRange) {
    formatted = formatTaxYearRange(year);
  }

  // Add ARIA label for screen readers
  return `<span aria-label="Tax Year ${year}">${formatted}</span>`;
}