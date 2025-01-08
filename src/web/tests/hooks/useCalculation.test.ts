import { renderHook, act } from '@testing-library/react-hooks'; // v8.0.1
import { describe, it, expect, jest } from '@jest/globals'; // v29.7.0
import { useCalculation } from '../../src/hooks/useCalculation';
import { CalculationFormData, FilingStatus } from '../../src/types/calculation.types';
import { api } from '../../src/lib/api';
import { VALIDATION_RULES } from '../../src/lib/constants';

// Mock the API module
jest.mock('../../src/lib/api');

// Mock the useToast hook
jest.mock('../../src/hooks/useToast', () => ({
  useToast: () => ({
    toast: jest.fn(),
  }),
}));

describe('useCalculation', () => {
  // Test data setup
  const mockCalculationFormData: CalculationFormData = {
    traditionalIRABalance: 100000,
    rothIRABalance: 50000,
    capitalGains: 25000,
    taxState: 'CA',
    filingStatus: FilingStatus.SINGLE,
    riskTolerance: 3,
    timeHorizon: 20,
  };

  const mockCalculationResult = {
    rothConversion: {
      amount: 25000,
      taxSavings: 5000,
      npv: 7500,
      margintalTaxRate: 0.22,
      effectiveTaxRate: 0.15,
      riskLevel: 2,
      confidenceScore: 0.85,
      alternativeStrategies: [],
    },
    capitalGainsHarvesting: {
      amount: 10000,
      taxSavings: 2000,
      npv: 3000,
      margintalTaxRate: 0.15,
      effectiveTaxRate: 0.12,
      riskLevel: 1,
      confidenceScore: 0.92,
      alternativeStrategies: [],
    },
    taxImpact: {
      federalTax: 3000,
      stateTax: 1000,
      effectiveRate: 0.15,
      marginalRate: 0.22,
      totalTax: 4000,
      yearlyProjection: [],
    },
    timestamp: new Date(),
    scenarioId: 'test-scenario-123',
    userPreferences: {
      defaultRiskLevel: 3,
      defaultTimeHorizon: 20,
      preferredTaxState: 'CA',
      notificationPreferences: {
        emailUpdates: true,
        savingsThreshold: 1000,
      },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should initialize with default values', () => {
    const { result } = renderHook(() => useCalculation());

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.result).toBeNull();
  });

  it('should handle successful calculation', async () => {
    // Mock successful API response
    (api.post as jest.Mock).mockResolvedValueOnce({
      success: true,
      data: mockCalculationResult,
      error: null,
    });

    const { result } = renderHook(() => useCalculation());

    await act(async () => {
      await result.current.calculateOptimization(mockCalculationFormData);
      jest.runAllTimers(); // Run debounce timer
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.result).toEqual(mockCalculationResult);
  });

  it('should handle validation errors', async () => {
    const invalidData = {
      ...mockCalculationFormData,
      traditionalIRABalance: -1000, // Invalid negative balance
    };

    const { result } = renderHook(() => useCalculation());

    await act(async () => {
      await result.current.calculateOptimization(invalidData);
    });

    expect(result.current.error).toBe('Please check your input values and try again.');
    expect(result.current.loading).toBe(false);
    expect(result.current.result).toBeNull();
  });

  it('should handle API errors with retry logic', async () => {
    // Mock API failure
    (api.post as jest.Mock).mockRejectedValue(new Error('API Error'));

    const { result } = renderHook(() => useCalculation());

    await act(async () => {
      await result.current.calculateOptimization(mockCalculationFormData);
      jest.runAllTimers();
    });

    // Should have attempted retries
    expect(api.post).toHaveBeenCalledTimes(3); // Initial + 2 retries
    expect(result.current.error).toBe('API Error');
    expect(result.current.loading).toBe(false);
  });

  it('should handle calculation caching', async () => {
    // Mock successful API response
    (api.post as jest.Mock).mockResolvedValueOnce({
      success: true,
      data: mockCalculationResult,
      error: null,
    });

    const { result } = renderHook(() => useCalculation());

    // First calculation
    await act(async () => {
      await result.current.calculateOptimization(mockCalculationFormData);
      jest.runAllTimers();
    });

    // Second calculation with same data
    await act(async () => {
      await result.current.calculateOptimization(mockCalculationFormData);
      jest.runAllTimers();
    });

    // API should only be called once due to caching
    expect(api.post).toHaveBeenCalledTimes(1);
  });

  it('should reset calculation state', () => {
    const { result } = renderHook(() => useCalculation());

    act(() => {
      result.current.resetCalculation();
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.result).toBeNull();
  });

  it('should validate calculation inputs against defined rules', async () => {
    const invalidData = {
      ...mockCalculationFormData,
      traditionalIRABalance: VALIDATION_RULES.IRA_BALANCE.MAX + 1,
    };

    const { result } = renderHook(() => useCalculation());

    await act(async () => {
      await result.current.calculateOptimization(invalidData);
    });

    expect(result.current.error).toBe('Please check your input values and try again.');
  });

  it('should handle debounced calculations', async () => {
    (api.post as jest.Mock).mockResolvedValue({
      success: true,
      data: mockCalculationResult,
      error: null,
    });

    const { result } = renderHook(() => useCalculation());

    await act(async () => {
      // Multiple rapid calculations
      result.current.calculateOptimization(mockCalculationFormData);
      result.current.calculateOptimization(mockCalculationFormData);
      result.current.calculateOptimization(mockCalculationFormData);
      jest.runAllTimers();
    });

    // Should only make one API call due to debouncing
    expect(api.post).toHaveBeenCalledTimes(1);
  });

  it('should maintain calculation precision', async () => {
    const preciseData = {
      ...mockCalculationResult,
      rothConversion: {
        ...mockCalculationResult.rothConversion,
        amount: 25000.50,
        taxSavings: 5000.75,
      },
    };

    (api.post as jest.Mock).mockResolvedValueOnce({
      success: true,
      data: preciseData,
      error: null,
    });

    const { result } = renderHook(() => useCalculation());

    await act(async () => {
      await result.current.calculateOptimization(mockCalculationFormData);
      jest.runAllTimers();
    });

    expect(result.current.result?.rothConversion.amount).toBe(25000.50);
    expect(result.current.result?.rothConversion.taxSavings).toBe(5000.75);
  });
});