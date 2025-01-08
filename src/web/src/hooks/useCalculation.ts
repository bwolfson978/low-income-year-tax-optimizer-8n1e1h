import { useState, useCallback, useRef } from 'react'; // v18.0.0
import { CalculationFormData, CalculationResult, CalculationAPIResponse, ValidationError } from '../types/calculation.types';
import { api } from '../lib/api';
import { useToast } from './useToast';
import { VALIDATION_RULES, API_ENDPOINTS } from '../lib/constants';

// Cache duration in milliseconds (5 minutes)
const CACHE_DURATION = 300000;

// Maximum retry attempts for failed calculations
const MAX_RETRY_ATTEMPTS = 3;

// Debounce delay for calculation requests (500ms)
const DEBOUNCE_DELAY = 500;

// Error messages
const ERROR_MESSAGES = {
  VALIDATION: 'Please check your input values and try again.',
  CALCULATION: 'An error occurred while processing your calculation. Please try again.',
  NETWORK: 'Network error occurred. Please check your connection and try again.',
  SERVER: 'Server error occurred. Our team has been notified.',
} as const;

interface CalculationCache {
  result: CalculationResult;
  timestamp: number;
}

interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

/**
 * Custom hook for managing tax optimization calculations with enhanced error handling
 * and performance optimizations.
 */
export const useCalculation = () => {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CalculationResult | null>(null);
  
  const calculationCache = useRef<Map<string, CalculationCache>>(new Map());
  const debounceTimeout = useRef<NodeJS.Timeout>();
  const retryCount = useRef<number>(0);
  const { toast } = useToast();

  /**
   * Validates calculation input data against defined rules
   */
  const validateCalculationData = (data: CalculationFormData): ValidationResult => {
    const errors: ValidationError[] = [];

    // Validate Traditional IRA Balance
    if (data.traditionalIRABalance < VALIDATION_RULES.IRA_BALANCE.MIN || 
        data.traditionalIRABalance > VALIDATION_RULES.IRA_BALANCE.MAX) {
      errors.push({
        field: 'traditionalIRABalance',
        message: data.traditionalIRABalance < VALIDATION_RULES.IRA_BALANCE.MIN 
          ? VALIDATION_RULES.IRA_BALANCE.ERROR_MESSAGES.MIN 
          : VALIDATION_RULES.IRA_BALANCE.ERROR_MESSAGES.MAX
      });
    }

    // Validate Roth IRA Balance
    if (data.rothIRABalance < VALIDATION_RULES.IRA_BALANCE.MIN || 
        data.rothIRABalance > VALIDATION_RULES.IRA_BALANCE.MAX) {
      errors.push({
        field: 'rothIRABalance',
        message: data.rothIRABalance < VALIDATION_RULES.IRA_BALANCE.MIN 
          ? VALIDATION_RULES.IRA_BALANCE.ERROR_MESSAGES.MIN 
          : VALIDATION_RULES.IRA_BALANCE.ERROR_MESSAGES.MAX
      });
    }

    // Validate Capital Gains
    if (data.capitalGains < VALIDATION_RULES.CAPITAL_GAINS.MIN || 
        data.capitalGains > VALIDATION_RULES.CAPITAL_GAINS.MAX) {
      errors.push({
        field: 'capitalGains',
        message: data.capitalGains < VALIDATION_RULES.CAPITAL_GAINS.MIN 
          ? VALIDATION_RULES.CAPITAL_GAINS.ERROR_MESSAGES.MIN 
          : VALIDATION_RULES.CAPITAL_GAINS.ERROR_MESSAGES.MAX
      });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  };

  /**
   * Generates a cache key for calculation data
   */
  const generateCacheKey = (data: CalculationFormData): string => {
    return JSON.stringify({
      trad: data.traditionalIRABalance,
      roth: data.rothIRABalance,
      gains: data.capitalGains,
      state: data.taxState
    });
  };

  /**
   * Checks if cached result is valid
   */
  const isCacheValid = (cache: CalculationCache): boolean => {
    return Date.now() - cache.timestamp < CACHE_DURATION;
  };

  /**
   * Handles calculation errors with retry logic
   */
  const handleCalculationError = async (
    error: any, 
    formData: CalculationFormData
  ): Promise<void> => {
    if (retryCount.current < MAX_RETRY_ATTEMPTS) {
      retryCount.current++;
      await calculateOptimization(formData);
    } else {
      retryCount.current = 0;
      const errorMessage = error.message || ERROR_MESSAGES.CALCULATION;
      setError(errorMessage);
      toast({
        message: errorMessage,
        type: 'error',
        duration: 5000
      });
    }
  };

  /**
   * Submits calculation data to the API with validation and error handling
   */
  const calculateOptimization = useCallback(async (formData: CalculationFormData): Promise<void> => {
    // Clear any existing errors
    setError(null);

    // Validate input data
    const validation = validateCalculationData(formData);
    if (!validation.isValid) {
      setError(ERROR_MESSAGES.VALIDATION);
      toast({
        message: ERROR_MESSAGES.VALIDATION,
        type: 'error',
        duration: 5000
      });
      return;
    }

    // Check cache
    const cacheKey = generateCacheKey(formData);
    const cachedResult = calculationCache.current.get(cacheKey);
    if (cachedResult && isCacheValid(cachedResult)) {
      setResult(cachedResult.result);
      return;
    }

    // Clear existing timeout if it exists
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }

    // Debounce the calculation request
    debounceTimeout.current = setTimeout(async () => {
      try {
        setLoading(true);

        const response = await api.post<CalculationAPIResponse>(
          API_ENDPOINTS.CALCULATIONS.OPTIMIZE,
          formData
        );

        if (!response.success || !response.data) {
          throw new Error(response.error?.message || ERROR_MESSAGES.CALCULATION);
        }

        // Cache the successful result
        calculationCache.current.set(cacheKey, {
          result: response.data,
          timestamp: Date.now()
        });

        setResult(response.data);
        retryCount.current = 0;

        toast({
          message: 'Calculation completed successfully',
          type: 'success',
          duration: 3000
        });

      } catch (error: any) {
        await handleCalculationError(error, formData);
      } finally {
        setLoading(false);
      }
    }, DEBOUNCE_DELAY);
  }, [toast]);

  /**
   * Resets calculation state
   */
  const resetCalculation = useCallback((): void => {
    setResult(null);
    setError(null);
    setLoading(false);
    retryCount.current = 0;
  }, []);

  return {
    loading,
    error,
    result,
    calculateOptimization,
    resetCalculation
  };
};

export default useCalculation;