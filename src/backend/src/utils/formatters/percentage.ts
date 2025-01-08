/**
 * Default formatting options for percentage values using Intl.NumberFormat
 * Provides consistent percentage formatting across the application
 */
export const DEFAULT_PERCENTAGE_FORMAT_OPTIONS: Intl.NumberFormatOptions = {
  style: 'percent',
  minimumFractionDigits: 1,
  maximumFractionDigits: 2,
  locale: 'en-US',
  useGrouping: true,
};

/**
 * Formats a decimal value as a percentage string with proper formatting and localization
 * @param value - Decimal value to format as percentage
 * @param options - Optional Intl.NumberFormatOptions to override defaults
 * @returns Formatted percentage string with % symbol and proper decimal places
 * @throws Error if value is invalid
 */
export const formatPercentage = (
  value: number,
  options: Partial<Intl.NumberFormatOptions> = {}
): string => {
  // Validate input value
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error('Invalid percentage value: must be a finite number');
  }

  // Merge options with defaults
  const formatOptions = {
    ...DEFAULT_PERCENTAGE_FORMAT_OPTIONS,
    ...options,
  };

  try {
    // Create formatter instance
    const formatter = new Intl.NumberFormat(formatOptions.locale, formatOptions);
    return formatter.format(value);
  } catch (error) {
    throw new Error(`Failed to format percentage: ${error.message}`);
  }
};

/**
 * Converts a percentage string into a decimal value
 * @param percentageString - String containing percentage value (e.g. "42.5%", "42,5%")
 * @returns Decimal value (e.g. 0.425)
 * @throws Error if string is invalid or improperly formatted
 */
export const parsePercentage = (percentageString: string): number => {
  if (!percentageString || typeof percentageString !== 'string') {
    throw new Error('Invalid percentage string: must be a non-empty string');
  }

  // Normalize string format
  const normalized = percentageString
    .trim()
    .replace(/\s/g, '')
    .replace(',', '.')
    .replace('%', '');

  // Parse to number
  const value = Number(normalized);

  if (!Number.isFinite(value)) {
    throw new Error('Invalid percentage string: unable to parse to number');
  }

  // Convert percentage to decimal
  const decimal = value / 100;

  // Validate range
  if (decimal < 0 || decimal > 1) {
    throw new Error('Invalid percentage: must be between 0% and 100%');
  }

  return decimal;
};

/**
 * Validates if a percentage value is within valid range and properly formatted
 * @param value - Number to validate as percentage
 * @returns True if percentage is valid, false otherwise
 */
export const validatePercentage = (value: number): boolean => {
  // Check if value is a valid number
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return false;
  }

  // Check range (0-100 for percentage values)
  if (value < 0 || value > 100) {
    return false;
  }

  // Check decimal precision
  const decimalPlaces = value.toString().split('.')[1]?.length || 0;
  if (decimalPlaces > DEFAULT_PERCENTAGE_FORMAT_OPTIONS.maximumFractionDigits) {
    return false;
  }

  return true;
};