import { format, parseISO, isValid, addYears, subYears } from 'date-fns'; // v2.30.0

// Constants for date formatting and tax year calculations
const DEFAULT_DATE_FORMAT = 'yyyy-MM-dd';
const DEFAULT_DATETIME_FORMAT = 'yyyy-MM-dd HH:mm:ss';
const TAX_YEAR_START_MONTH = 0; // January (0-based)
const TAX_YEAR_START_DAY = 1;
const CURRENT_TAX_YEAR = new Date().getFullYear();
const MAX_TAX_YEAR_OFFSET = 10;

/**
 * Custom error class for date formatting errors
 */
class DateFormattingError extends Error {
  constructor(message: string) {
    super(`Date Formatting Error: ${message}`);
    this.name = 'DateFormattingError';
  }
}

/**
 * Formats a date using the specified format string or default format
 * @param date - Date object or ISO date string to format
 * @param formatStr - Optional format string (defaults to DEFAULT_DATE_FORMAT)
 * @returns Formatted date string
 * @throws {DateFormattingError} If date is invalid or formatting fails
 */
export function formatDate(date: Date | string, formatStr?: string): string {
  try {
    if (!date) {
      throw new DateFormattingError('Date input is required');
    }

    const parsedDate = typeof date === 'string' ? parseISO(date) : date;
    
    if (!isValid(parsedDate)) {
      throw new DateFormattingError('Invalid date provided');
    }

    const dateFormat = formatStr || DEFAULT_DATE_FORMAT;
    
    if (!dateFormat.trim()) {
      throw new DateFormattingError('Format string cannot be empty');
    }

    return format(parsedDate, dateFormat);
  } catch (error) {
    if (error instanceof DateFormattingError) {
      throw error;
    }
    throw new DateFormattingError(`Failed to format date: ${error.message}`);
  }
}

/**
 * Formats a date with time using the specified format or default datetime format
 * @param date - Date object or ISO date string to format
 * @param formatStr - Optional format string (defaults to DEFAULT_DATETIME_FORMAT)
 * @returns Formatted datetime string
 * @throws {DateFormattingError} If date is invalid or formatting fails
 */
export function formatDateTime(date: Date | string, formatStr?: string): string {
  try {
    if (!date) {
      throw new DateFormattingError('Date input is required');
    }

    const parsedDate = typeof date === 'string' ? parseISO(date) : date;
    
    if (!isValid(parsedDate)) {
      throw new DateFormattingError('Invalid date provided');
    }

    const dateFormat = formatStr || DEFAULT_DATETIME_FORMAT;
    
    if (!dateFormat.trim()) {
      throw new DateFormattingError('Format string cannot be empty');
    }

    return format(parsedDate, dateFormat);
  } catch (error) {
    if (error instanceof DateFormattingError) {
      throw error;
    }
    throw new DateFormattingError(`Failed to format datetime: ${error.message}`);
  }
}

/**
 * Gets the tax year for a given date based on fiscal year rules
 * @param date - Date object or ISO date string
 * @returns Tax year number
 * @throws {DateFormattingError} If date is invalid or calculation fails
 */
export function getTaxYear(date: Date | string): number {
  try {
    if (!date) {
      throw new DateFormattingError('Date input is required');
    }

    const parsedDate = typeof date === 'string' ? parseISO(date) : date;
    
    if (!isValid(parsedDate)) {
      throw new DateFormattingError('Invalid date provided');
    }

    const month = parsedDate.getMonth();
    const day = parsedDate.getDate();
    const year = parsedDate.getFullYear();

    // Calculate tax year based on fiscal year start
    const taxYear = (month < TAX_YEAR_START_MONTH || 
      (month === TAX_YEAR_START_MONTH && day < TAX_YEAR_START_DAY)) 
      ? year - 1 
      : year;

    if (!isValidTaxYear(taxYear)) {
      throw new DateFormattingError('Calculated tax year is outside valid range');
    }

    return taxYear;
  } catch (error) {
    if (error instanceof DateFormattingError) {
      throw error;
    }
    throw new DateFormattingError(`Failed to calculate tax year: ${error.message}`);
  }
}

/**
 * Gets the start and end dates for a given tax year
 * @param taxYear - Tax year number
 * @returns Object containing start and end dates of the tax year
 * @throws {DateFormattingError} If tax year is invalid or calculation fails
 */
export function getTaxYearRange(taxYear: number): { start: Date; end: Date } {
  try {
    if (!isValidTaxYear(taxYear)) {
      throw new DateFormattingError('Invalid tax year provided');
    }

    const start = new Date(taxYear, TAX_YEAR_START_MONTH, TAX_YEAR_START_DAY);
    const end = subYears(addYears(start, 1), 0);
    end.setDate(end.getDate() - 1);

    if (!isValid(start) || !isValid(end)) {
      throw new DateFormattingError('Failed to calculate valid date range');
    }

    return { start, end };
  } catch (error) {
    if (error instanceof DateFormattingError) {
      throw error;
    }
    throw new DateFormattingError(`Failed to calculate tax year range: ${error.message}`);
  }
}

/**
 * Validates if a given year is a valid tax year for calculations
 * @param year - Year number to validate
 * @returns Boolean indicating if the year is valid
 * @throws {DateFormattingError} If year is invalid or validation fails
 */
export function isValidTaxYear(year: number): boolean {
  try {
    if (typeof year !== 'number' || isNaN(year)) {
      throw new DateFormattingError('Tax year must be a valid number');
    }

    const minYear = CURRENT_TAX_YEAR - MAX_TAX_YEAR_OFFSET;
    const maxYear = CURRENT_TAX_YEAR + MAX_TAX_YEAR_OFFSET;

    return year >= minYear && year <= maxYear;
  } catch (error) {
    if (error instanceof DateFormattingError) {
      throw error;
    }
    throw new DateFormattingError(`Failed to validate tax year: ${error.message}`);
  }
}

/**
 * Formats a tax year as a fiscal year range string
 * @param taxYear - Tax year number
 * @returns Formatted tax year range string (e.g., "2024-2025")
 * @throws {DateFormattingError} If tax year is invalid or formatting fails
 */
export function formatTaxYearRange(taxYear: number): string {
  try {
    if (!isValidTaxYear(taxYear)) {
      throw new DateFormattingError('Invalid tax year provided');
    }

    const nextYear = taxYear + 1;

    if (!isValidTaxYear(nextYear)) {
      throw new DateFormattingError('Tax year range exceeds valid bounds');
    }

    return `${taxYear}-${nextYear}`;
  } catch (error) {
    if (error instanceof DateFormattingError) {
      throw error;
    }
    throw new DateFormattingError(`Failed to format tax year range: ${error.message}`);
  }
}