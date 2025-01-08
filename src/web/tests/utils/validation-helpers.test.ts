import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'; // v29.0.0
import { z } from 'zod'; // v3.22.0
import { 
  validateCalculationInput,
  validateScenarioInput,
  formatValidationError,
  ERROR_MESSAGES,
  MAX_BALANCE
} from '../../src/utils/validation-helpers';
import type { CalculationFormData, FilingStatus } from '../../src/types/calculation.types';
import type { ScenarioFormData } from '../../src/types/scenario.types';

// Test constants
const VALID_CALCULATION_INPUT: CalculationFormData = {
  traditionalIRABalance: 100000,
  rothIRABalance: 50000,
  capitalGains: 25000,
  taxState: 'CA',
  filingStatus: FilingStatus.SINGLE,
  riskTolerance: 2,
  timeHorizon: 20
};

const VALID_SCENARIO_INPUT: ScenarioFormData = {
  name: 'Test Scenario',
  description: 'Test description',
  traditionalIRABalance: 100000,
  rothIRABalance: 50000,
  capitalGains: 25000,
  taxState: 'CA',
  filingStatus: FilingStatus.SINGLE,
  validationRules: {
    traditionalIRABalance: { min: 0, max: MAX_BALANCE, required: true },
    rothIRABalance: { min: 0, max: MAX_BALANCE, required: true },
    capitalGains: { min: 0, max: MAX_BALANCE, required: true },
    taxState: { required: true, pattern: /^[A-Z]{2}$/ }
  }
};

describe('validateCalculationInput', () => {
  it('should validate valid calculation input', async () => {
    const result = await validateCalculationInput(VALID_CALCULATION_INPUT);
    expect(result.success).toBe(true);
    expect(result.data).toEqual(VALID_CALCULATION_INPUT);
  });

  it('should validate numeric precision for financial values', async () => {
    const input = {
      ...VALID_CALCULATION_INPUT,
      traditionalIRABalance: 100000.55,
      rothIRABalance: 50000.99
    };
    const result = await validateCalculationInput(input);
    expect(result.success).toBe(true);
    expect(result.data?.traditionalIRABalance).toBe(100000.55);
    expect(result.data?.rothIRABalance).toBe(50000.99);
  });

  it('should reject values exceeding maximum balance', async () => {
    const input = {
      ...VALID_CALCULATION_INPUT,
      traditionalIRABalance: MAX_BALANCE + 1
    };
    const result = await validateCalculationInput(input);
    expect(result.success).toBe(false);
    expect(result.error).toContain(ERROR_MESSAGES.INVALID_AMOUNT);
  });

  it('should reject negative values', async () => {
    const input = {
      ...VALID_CALCULATION_INPUT,
      rothIRABalance: -1000
    };
    const result = await validateCalculationInput(input);
    expect(result.success).toBe(false);
    expect(result.error).toContain(ERROR_MESSAGES.INVALID_AMOUNT);
  });

  it('should validate tax state format', async () => {
    const input = {
      ...VALID_CALCULATION_INPUT,
      taxState: 'invalid'
    };
    const result = await validateCalculationInput(input);
    expect(result.success).toBe(false);
    expect(result.error).toContain(ERROR_MESSAGES.INVALID_STATE);
  });

  it('should handle international number formats', async () => {
    const input = {
      ...VALID_CALCULATION_INPUT,
      traditionalIRABalance: '1,000,000.00' as any,
      rothIRABalance: '500,000.00' as any
    };
    const result = await validateCalculationInput(input);
    expect(result.success).toBe(true);
    expect(result.data?.traditionalIRABalance).toBe(1000000.00);
    expect(result.data?.rothIRABalance).toBe(500000.00);
  });
});

describe('validateScenarioInput', () => {
  it('should validate valid scenario input', async () => {
    const result = await validateScenarioInput(VALID_SCENARIO_INPUT);
    expect(result.success).toBe(true);
    expect(result.data).toEqual(VALID_SCENARIO_INPUT);
  });

  it('should validate scenario name length', async () => {
    const input = {
      ...VALID_SCENARIO_INPUT,
      name: 'a'.repeat(101) // Exceeds max length
    };
    const result = await validateScenarioInput(input);
    expect(result.success).toBe(false);
    expect(result.error).toContain('name');
  });

  it('should validate description length', async () => {
    const input = {
      ...VALID_SCENARIO_INPUT,
      description: 'a'.repeat(501) // Exceeds max length
    };
    const result = await validateScenarioInput(input);
    expect(result.success).toBe(false);
    expect(result.error).toContain(ERROR_MESSAGES.DESCRIPTION_LENGTH);
  });

  it('should handle empty description', async () => {
    const input = {
      ...VALID_SCENARIO_INPUT,
      description: ''
    };
    const result = await validateScenarioInput(input);
    expect(result.success).toBe(true);
    expect(result.data?.description).toBe('');
  });

  it('should trim whitespace from text fields', async () => {
    const input = {
      ...VALID_SCENARIO_INPUT,
      name: '  Test Name  ',
      description: '  Test Description  '
    };
    const result = await validateScenarioInput(input);
    expect(result.success).toBe(true);
    expect(result.data?.name).toBe('Test Name');
    expect(result.data?.description).toBe('Test Description');
  });
});

describe('formatValidationError', () => {
  it('should format single validation error', () => {
    const error = new z.ZodError([{
      code: 'custom',
      path: ['traditionalIRABalance'],
      message: 'Invalid amount'
    }]);
    const formatted = formatValidationError(error);
    expect(formatted).toContain('role="alert"');
    expect(formatted).toContain('traditionalIRABalance');
    expect(formatted).toContain('Invalid amount');
  });

  it('should handle missing error details', () => {
    const error = new z.ZodError([]);
    const formatted = formatValidationError(error);
    expect(formatted).toBe('<span role="alert" aria-live="polite">Validation failed</span>');
  });

  it('should include ARIA attributes for accessibility', () => {
    const error = new z.ZodError([{
      code: 'custom',
      path: ['rothIRABalance'],
      message: 'Invalid amount'
    }]);
    const formatted = formatValidationError(error);
    expect(formatted).toMatch(/role="alert"/);
    expect(formatted).toMatch(/aria-live="polite"/);
  });

  it('should format nested field paths', () => {
    const error = new z.ZodError([{
      code: 'custom',
      path: ['calculation', 'amount'],
      message: 'Invalid value'
    }]);
    const formatted = formatValidationError(error);
    expect(formatted).toContain('calculation.amount');
  });
});