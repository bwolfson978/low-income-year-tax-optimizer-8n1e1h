import { saveAs } from 'file-saver'; // v2.0.5
import { format } from 'date-fns';
import { Scenario } from '../types/scenario.types';
import { api } from '../lib/api';
import { APIErrorCode } from '../types/api.types';

// Constants for export configuration
const EXPORT_API_ENDPOINT = '/api/export';
const FILE_NAME_DATE_FORMAT = 'yyyy-MM-dd';
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;
const MAX_FILENAME_LENGTH = 255;
const PDF_MIME_TYPE = 'application/pdf';

/**
 * Error messages for export operations
 */
const ExportErrorMessages = {
  MISSING_DATA: 'Scenario is missing required calculation results',
  INVALID_RESPONSE: 'Invalid PDF data received from server',
  DOWNLOAD_FAILED: 'Failed to download PDF file',
  SERVER_ERROR: 'Server error occurred during export',
  NETWORK_ERROR: 'Network error occurred during export',
  TIMEOUT: 'Export request timed out',
  RATE_LIMIT: 'Export rate limit exceeded, please try again later',
} as const;

/**
 * Interface for export progress updates
 */
interface ExportProgress {
  status: 'generating' | 'downloading' | 'complete' | 'error';
  progress: number;
  message?: string;
}

/**
 * Generates a standardized, sanitized file name for the exported PDF
 * @param scenario The scenario to generate a filename for
 * @returns Sanitized filename with date stamp
 */
export const generateFileName = (scenario: Scenario): string => {
  // Get base name from scenario name or ID
  const baseName = scenario.name || `scenario-${scenario.id}`;
  
  // Add date stamp
  const datestamp = format(new Date(), FILE_NAME_DATE_FORMAT);
  
  // Generate initial filename
  let filename = `${baseName}-${datestamp}`;
  
  // Sanitize filename by removing invalid characters
  filename = filename
    .replace(/[<>:"/\\|?*]/g, '') // Remove invalid file characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .toLowerCase();
  
  // Ensure filename length limit
  if (filename.length > MAX_FILENAME_LENGTH - 4) { // -4 for .pdf
    filename = filename.slice(0, MAX_FILENAME_LENGTH - 4);
  }
  
  // Add extension
  return `${filename}.pdf`;
};

/**
 * Handles and formats export errors with specific context
 * @param error The error to handle
 * @returns Formatted error message
 */
const handleExportError = (error: any): string => {
  if (error?.code === APIErrorCode.RATE_LIMIT_EXCEEDED) {
    return ExportErrorMessages.RATE_LIMIT;
  }
  
  if (error?.code === APIErrorCode.GATEWAY_TIMEOUT) {
    return ExportErrorMessages.TIMEOUT;
  }
  
  if (error?.code === APIErrorCode.SERVICE_UNAVAILABLE) {
    return ExportErrorMessages.SERVER_ERROR;
  }
  
  if (error instanceof Error) {
    return error.message;
  }
  
  return ExportErrorMessages.DOWNLOAD_FAILED;
};

/**
 * Validates the PDF data received from the server
 * @param data The data to validate
 * @returns boolean indicating if data is valid
 */
const isValidPDFData = (data: any): boolean => {
  return data instanceof Blob && 
         data.type === PDF_MIME_TYPE && 
         data.size > 0;
};

/**
 * Exports a tax optimization scenario as a PDF file
 * @param scenario The scenario to export
 * @param onProgress Optional callback for progress updates
 * @returns Promise that resolves when export is complete
 */
export const exportScenarioAsPDF = async (
  scenario: Scenario,
  onProgress?: (progress: ExportProgress) => void
): Promise<void> => {
  // Validate scenario has required data
  if (!scenario.id || !scenario.calculationResult) {
    throw new Error(ExportErrorMessages.MISSING_DATA);
  }

  try {
    // Generate filename
    const filename = generateFileName(scenario);
    
    // Update progress
    onProgress?.({
      status: 'generating',
      progress: 0,
      message: 'Generating PDF...'
    });

    // Request PDF generation with retry logic
    const response = await api.get(
      `${EXPORT_API_ENDPOINT}/${scenario.id}`,
      {
        responseType: 'blob',
        timeout: 30000,
        retryConfig: {
          maxRetries: MAX_RETRIES,
          backoffMs: RETRY_DELAY
        },
        headers: {
          Accept: PDF_MIME_TYPE
        }
      }
    );

    // Update progress
    onProgress?.({
      status: 'downloading',
      progress: 50,
      message: 'Downloading PDF...'
    });

    // Validate PDF data
    if (!response.data || !isValidPDFData(response.data)) {
      throw new Error(ExportErrorMessages.INVALID_RESPONSE);
    }

    // Save file using FileSaver
    saveAs(response.data, filename);

    // Update progress
    onProgress?.({
      status: 'complete',
      progress: 100,
      message: 'Export complete'
    });
  } catch (error) {
    // Update progress with error
    onProgress?.({
      status: 'error',
      progress: 0,
      message: handleExportError(error)
    });

    throw error;
  }
};