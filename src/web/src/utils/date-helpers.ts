import { format, parseISO, isValid, addYears, subYears } from 'date-fns';
import { TAX_CONSTANTS } from '../lib/constants';

// Default date format constants
const DEFAULT_DATE_FORMAT = 'MM/dd/yyyy';
const DEFAULT_DATETIME_FORMAT = 'MM/dd/yyyy hh:mm a';

// Tax year fiscal period constants
const TAX_YEAR_START_MONTH = 0; // January (0-based)
const TAX_YEAR_START_DAY = 1;

/**
 * Formats a date using the specified format string or default format
 * @param date - Date object or ISO date string to format
 * @param formatStr - Optional format string (defaults to MM/dd/yyyy)
 * @returns Formatted date string or error message for invalid dates
 * @version date-fns@2.30.0
 */
export const formatDate = (date: Date | string, formatStr?: string): string => {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    
    if (!isValid(dateObj)) {
      throw new Error('Invalid date provided');
    }
    
    return format(dateObj, formatStr || DEFAULT_DATE_FORMAT);
  } catch (error) {
    console.error('Date formatting error:', error);
    return 'Invalid date';
  }
};

/**
 * Formats a date with time using the specified format or default datetime format
 * @param date - Date object or ISO date string to format
 * @param formatStr - Optional format string (defaults to MM/dd/yyyy hh:mm a)
 * @returns Formatted datetime string or error message
 * @version date-fns@2.30.0
 */
export const formatDateTime = (date: Date | string, formatStr?: string): string => {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    
    if (!isValid(dateObj)) {
      throw new Error('Invalid datetime provided');
    }
    
    return format(dateObj, formatStr || DEFAULT_DATETIME_FORMAT);
  } catch (error) {
    console.error('Datetime formatting error:', error);
    return 'Invalid datetime';
  }
};

/**
 * Gets the current tax year based on today's date with fiscal year consideration
 * @returns Current tax year number
 */
export const getCurrentTaxYear = (): number => {
  const today = new Date();
  const currentYear = today.getFullYear();
  
  // Check if we're before the start of the tax year
  if (
    today.getMonth() < TAX_YEAR_START_MONTH || 
    (today.getMonth() === TAX_YEAR_START_MONTH && today.getDate() < TAX_YEAR_START_DAY)
  ) {
    return currentYear - 1;
  }
  
  return currentYear;
};

/**
 * Gets the start and end dates for a given tax year with fiscal year handling
 * @param taxYear - Tax year to get range for
 * @returns Object containing start and end dates of the tax year
 */
export const getTaxYearRange = (taxYear: number): { start: Date; end: Date } => {
  if (!isValidTaxYear(taxYear)) {
    throw new Error(`Invalid tax year: ${taxYear}`);
  }

  const start = new Date(taxYear, TAX_YEAR_START_MONTH, TAX_YEAR_START_DAY);
  const end = subYears(addYears(start, 1), 0);
  end.setDate(end.getDate() - 1); // Last day of the tax year

  return { start, end };
};

/**
 * Validates if a given year is a valid tax year for calculations
 * @param year - Year to validate
 * @returns Boolean indicating if the year is valid for tax calculations
 */
export const isValidTaxYear = (year: number): boolean => {
  // Basic number validation
  if (!Number.isInteger(year) || year < 1900) {
    return false;
  }

  const currentYear = getCurrentTaxYear();
  const defaultYear = TAX_CONSTANTS.DEFAULT_TAX_YEAR;

  // Validate year is within reasonable range
  if (year < defaultYear - 3 || year > currentYear + 1) {
    return false;
  }

  return true;
};

/**
 * Formats a tax year as a fiscal year range string
 * @param taxYear - Tax year to format
 * @returns Formatted tax year range string (e.g., "2024-2025")
 */
export const formatTaxYearRange = (taxYear: number): string => {
  if (!isValidTaxYear(taxYear)) {
    throw new Error(`Invalid tax year for formatting: ${taxYear}`);
  }

  return `${taxYear}-${taxYear + 1}`;
};