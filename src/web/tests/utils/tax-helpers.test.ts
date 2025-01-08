import { describe, test, expect } from '@jest/globals';
import Decimal from 'decimal.js'; // v10.4.3
import {
  calculateMarginalRate,
  calculateEffectiveTaxRate,
  calculateRothConversionTax,
  calculateCapitalGainsTax,
  validateTaxInput
} from '../../src/utils/tax-helpers';
import { FilingStatus } from '../../src/types/calculation.types';

// Configure Decimal.js for test precision
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

describe('validateTaxInput', () => {
  test('validates positive numbers correctly', () => {
    expect(validateTaxInput(1000)).toEqual({ isValid: true });
    expect(validateTaxInput(0)).toEqual({ isValid: true });
    expect(validateTaxInput(5000000)).toEqual({ isValid: true });
  });

  test('rejects invalid inputs', () => {
    expect(validateTaxInput(-1000)).toEqual({
      isValid: false,
      error: 'Value cannot be less than $0.00'
    });
    expect(validateTaxInput(NaN)).toEqual({
      isValid: false,
      error: 'Invalid numeric value'
    });
    expect(validateTaxInput(Infinity)).toEqual({
      isValid: false,
      error: 'Invalid numeric value'
    });
  });

  test('respects custom constraints', () => {
    expect(validateTaxInput(5000, { min: 1000, max: 10000 })).toEqual({ isValid: true });
    expect(validateTaxInput(500, { min: 1000 })).toEqual({
      isValid: false,
      error: 'Value cannot be less than $1,000.00'
    });
    expect(validateTaxInput(15000, { max: 10000 })).toEqual({
      isValid: false,
      error: 'Value cannot exceed $10,000.00'
    });
  });
});

describe('calculateMarginalRate', () => {
  test('calculates correct marginal rates for single filer', () => {
    expect(calculateMarginalRate(10000, FilingStatus.SINGLE).toNumber()).toBe(0.10);
    expect(calculateMarginalRate(40000, FilingStatus.SINGLE).toNumber()).toBe(0.12);
    expect(calculateMarginalRate(90000, FilingStatus.SINGLE).toNumber()).toBe(0.22);
    expect(calculateMarginalRate(180000, FilingStatus.SINGLE).toNumber()).toBe(0.24);
    expect(calculateMarginalRate(230000, FilingStatus.SINGLE).toNumber()).toBe(0.32);
    expect(calculateMarginalRate(550000, FilingStatus.SINGLE).toNumber()).toBe(0.35);
    expect(calculateMarginalRate(600000, FilingStatus.SINGLE).toNumber()).toBe(0.37);
  });

  test('calculates correct marginal rates for married filing jointly', () => {
    expect(calculateMarginalRate(20000, FilingStatus.MARRIED_JOINT).toNumber()).toBe(0.10);
    expect(calculateMarginalRate(80000, FilingStatus.MARRIED_JOINT).toNumber()).toBe(0.12);
    expect(calculateMarginalRate(180000, FilingStatus.MARRIED_JOINT).toNumber()).toBe(0.22);
    expect(calculateMarginalRate(360000, FilingStatus.MARRIED_JOINT).toNumber()).toBe(0.24);
    expect(calculateMarginalRate(460000, FilingStatus.MARRIED_JOINT).toNumber()).toBe(0.32);
    expect(calculateMarginalRate(690000, FilingStatus.MARRIED_JOINT).toNumber()).toBe(0.35);
    expect(calculateMarginalRate(700000, FilingStatus.MARRIED_JOINT).toNumber()).toBe(0.37);
  });

  test('handles edge cases correctly', () => {
    expect(() => calculateMarginalRate(-1000, FilingStatus.SINGLE)).toThrow();
    expect(() => calculateMarginalRate(NaN, FilingStatus.SINGLE)).toThrow();
    expect(calculateMarginalRate(0, FilingStatus.SINGLE).toNumber()).toBe(0.10);
  });
});

describe('calculateEffectiveTaxRate', () => {
  test('calculates effective tax rate with precise decimal arithmetic', () => {
    const totalTax = new Decimal('10000');
    const totalIncome = new Decimal('50000');
    expect(calculateEffectiveTaxRate(totalTax, totalIncome).toNumber()).toBe(0.2);
  });

  test('handles zero income correctly', () => {
    const totalTax = new Decimal('0');
    const totalIncome = new Decimal('0');
    expect(calculateEffectiveTaxRate(totalTax, totalIncome).toNumber()).toBe(0);
  });

  test('maintains 6 decimal precision', () => {
    const totalTax = new Decimal('1234.56');
    const totalIncome = new Decimal('10000.00');
    expect(calculateEffectiveTaxRate(totalTax, totalIncome).toDP(6).toString()).toBe('0.123456');
  });

  test('throws error for negative values', () => {
    expect(() => calculateEffectiveTaxRate(new Decimal(-1000), new Decimal(5000))).toThrow();
    expect(() => calculateEffectiveTaxRate(new Decimal(1000), new Decimal(-5000))).toThrow();
  });
});

describe('calculateRothConversionTax', () => {
  const mockFormData = {
    traditionalIRABalance: 100000,
    rothIRABalance: 50000,
    capitalGains: 25000,
    taxState: 'CA',
    filingStatus: FilingStatus.SINGLE,
  };

  test('calculates Roth conversion tax correctly for taxable state', () => {
    const result = calculateRothConversionTax(new Decimal('50000'), mockFormData);
    expect(result.federalTax.toNumber()).toBeGreaterThan(0);
    expect(result.stateTax.toNumber()).toBeGreaterThan(0);
    expect(result.totalTax.equals(result.federalTax.plus(result.stateTax))).toBe(true);
    expect(result.effectiveRate.toNumber()).toBeGreaterThan(0);
  });

  test('handles no-income-tax states correctly', () => {
    const noTaxStateForm = { ...mockFormData, taxState: 'TX' };
    const result = calculateRothConversionTax(new Decimal('50000'), noTaxStateForm);
    expect(result.stateTax.toNumber()).toBe(0);
    expect(result.totalTax.equals(result.federalTax)).toBe(true);
  });

  test('validates conversion amount', () => {
    expect(() => calculateRothConversionTax(new Decimal(-1000), mockFormData)).toThrow();
    expect(() => calculateRothConversionTax(new Decimal('NaN'), mockFormData)).toThrow();
  });
});

describe('calculateCapitalGainsTax', () => {
  const mockFormData = {
    traditionalIRABalance: 100000,
    rothIRABalance: 50000,
    capitalGains: 25000,
    taxState: 'CA',
    filingStatus: FilingStatus.SINGLE,
  };

  test('calculates capital gains tax correctly for different brackets', () => {
    // 0% bracket
    const lowGains = calculateCapitalGainsTax(new Decimal('30000'), mockFormData);
    expect(lowGains.federalTax.toNumber()).toBe(0);

    // 15% bracket
    const mediumGains = calculateCapitalGainsTax(new Decimal('100000'), mockFormData);
    expect(mediumGains.federalTax.toNumber()).toBeGreaterThan(0);

    // 20% bracket
    const highGains = calculateCapitalGainsTax(new Decimal('500000'), mockFormData);
    expect(highGains.federalTax.toNumber()).toBeGreaterThan(mediumGains.federalTax.toNumber());
  });

  test('handles state tax calculations correctly', () => {
    const withStateTax = calculateCapitalGainsTax(new Decimal('100000'), mockFormData);
    expect(withStateTax.stateTax.toNumber()).toBeGreaterThan(0);

    const noTaxStateForm = { ...mockFormData, taxState: 'TX' };
    const withoutStateTax = calculateCapitalGainsTax(new Decimal('100000'), noTaxStateForm);
    expect(withoutStateTax.stateTax.toNumber()).toBe(0);
  });

  test('validates gain amount', () => {
    expect(() => calculateCapitalGainsTax(new Decimal(-1000), mockFormData)).toThrow();
    expect(() => calculateCapitalGainsTax(new Decimal('NaN'), mockFormData)).toThrow();
  });

  test('calculates effective rate correctly', () => {
    const result = calculateCapitalGainsTax(new Decimal('100000'), mockFormData);
    expect(result.effectiveRate.toNumber()).toBeLessThan(1);
    expect(result.effectiveRate.toNumber()).toBeGreaterThan(0);
  });
});