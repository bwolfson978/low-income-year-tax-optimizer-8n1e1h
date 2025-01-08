import { describe, it, expect } from 'jest';
import { calculateFederalTax } from '../../../src/utils/tax-calculator/federal';
import { calculateStateTax } from '../../../src/utils/tax-calculator/state';
import { calculateCapitalGainsTax } from '../../../src/utils/tax-calculator/capital-gains';
import { calculateRothConversionTax } from '../../../src/utils/tax-calculator/roth-conversion';
import { FilingStatus, CapitalGainsType } from '../../../src/types/tax.types';

describe('Tax Calculator Utilities', () => {
  describe('Federal Tax Calculations', () => {
    it('should calculate correct federal tax for single filer in 2024', () => {
      const result = calculateFederalTax(50000, FilingStatus.SINGLE);
      expect(result.federalTaxImpact).toBeCloseTo(6617.00, 2);
      expect(result.marginalTaxRate).toBe(0.22);
      expect(result.effectiveTaxRate).toBeCloseTo(0.1323, 4);
    });

    it('should calculate tax correctly at bracket boundaries', () => {
      const result = calculateFederalTax(11600, FilingStatus.SINGLE);
      expect(result.federalTaxImpact).toBeCloseTo(1160.00, 2);
      expect(result.marginalTaxRate).toBe(0.12);
    });

    it('should handle high income scenarios correctly', () => {
      const result = calculateFederalTax(1000000, FilingStatus.SINGLE);
      expect(result.marginalTaxRate).toBe(0.37);
      expect(result.federalTaxImpact).toBeGreaterThan(0);
    });

    it('should validate inputs properly', () => {
      expect(() => calculateFederalTax(-1000, FilingStatus.SINGLE))
        .toThrow('Income must be a positive finite number');
    });
  });

  describe('State Tax Calculations', () => {
    it('should calculate California state tax correctly', () => {
      const result = calculateStateTax(75000, 'CA', FilingStatus.SINGLE);
      expect(result).toBeCloseTo(4180.50, 2);
    });

    it('should return 0 for states without income tax', () => {
      const result = calculateStateTax(50000, 'TX', FilingStatus.SINGLE);
      expect(result).toBe(0);
    });

    it('should handle special deductions correctly', () => {
      const result = calculateStateTax(100000, 'CA', FilingStatus.SINGLE);
      expect(result).toBeGreaterThan(0);
      expect(result).toBeLessThan(100000);
    });

    it('should validate state codes properly', () => {
      expect(() => calculateStateTax(50000, 'XX', FilingStatus.SINGLE))
        .toThrow('Tax information not found for state');
    });
  });

  describe('Capital Gains Tax Calculations', () => {
    it('should calculate long-term capital gains tax correctly', () => {
      const result = calculateCapitalGainsTax(
        50000,
        CapitalGainsType.LONG_TERM,
        75000,
        FilingStatus.SINGLE,
        'CA'
      );
      expect(result.federalTaxImpact).toBeGreaterThan(0);
      expect(result.stateTaxImpact).toBeGreaterThan(0);
      expect(result.effectiveTaxRate).toBeGreaterThan(0);
      expect(result.effectiveTaxRate).toBeLessThan(1);
    });

    it('should calculate short-term capital gains tax correctly', () => {
      const result = calculateCapitalGainsTax(
        25000,
        CapitalGainsType.SHORT_TERM,
        50000,
        FilingStatus.SINGLE,
        'CA'
      );
      expect(result.federalTaxImpact).toBeGreaterThan(0);
      expect(result.marginalTaxRate).toBeGreaterThan(0);
    });

    it('should handle zero gains correctly', () => {
      const result = calculateCapitalGainsTax(
        0,
        CapitalGainsType.LONG_TERM,
        50000,
        FilingStatus.SINGLE,
        'CA'
      );
      expect(result.federalTaxImpact).toBe(0);
      expect(result.stateTaxImpact).toBe(0);
      expect(result.effectiveTaxRate).toBe(0);
    });

    it('should validate gains amount properly', () => {
      expect(() => calculateCapitalGainsTax(
        -1000,
        CapitalGainsType.LONG_TERM,
        50000,
        FilingStatus.SINGLE,
        'CA'
      )).toThrow('Invalid gains amount');
    });
  });

  describe('Roth Conversion Tax Calculations', () => {
    it('should calculate basic conversion tax impact correctly', () => {
      const result = calculateRothConversionTax(
        50000,
        25000,
        FilingStatus.SINGLE,
        'CA'
      );
      expect(result.federalTaxImpact).toBeGreaterThan(0);
      expect(result.stateTaxImpact).toBeGreaterThan(0);
      expect(result.effectiveTaxRate).toBeGreaterThan(0);
      expect(result.effectiveTaxRate).toBeLessThan(1);
    });

    it('should calculate NPV and future value correctly', () => {
      const result = calculateRothConversionTax(
        75000,
        50000,
        FilingStatus.SINGLE,
        'CA',
        20,
        0.07
      );
      expect(result.futureValue).toBeGreaterThan(50000);
      expect(result.npv).toBeGreaterThan(0);
      expect(result.npv).toBeLessThan(result.futureValue);
    });

    it('should handle minimum conversion amount correctly', () => {
      const result = calculateRothConversionTax(
        50000,
        1000,
        FilingStatus.SINGLE,
        'CA'
      );
      expect(result.federalTaxImpact).toBeGreaterThan(0);
      expect(result.federalTaxImpact).toBeLessThan(1000);
    });

    it('should validate conversion amount properly', () => {
      expect(() => calculateRothConversionTax(
        50000,
        -1000,
        FilingStatus.SINGLE,
        'CA'
      )).toThrow('Conversion amount must be between');
    });
  });

  describe('Filing Status Edge Cases', () => {
    it('should handle married filing jointly correctly', () => {
      const result = calculateFederalTax(100000, FilingStatus.MARRIED_JOINT);
      expect(result.federalTaxImpact).toBeGreaterThan(0);
      expect(result.marginalTaxRate).toBe(0.22);
    });

    it('should handle head of household correctly', () => {
      const result = calculateFederalTax(75000, FilingStatus.HEAD_OF_HOUSEHOLD);
      expect(result.federalTaxImpact).toBeGreaterThan(0);
      expect(result.marginalTaxRate).toBe(0.22);
    });
  });

  describe('High Precision Validation', () => {
    it('should maintain 4 decimal precision for tax rates', () => {
      const result = calculateFederalTax(123456.78, FilingStatus.SINGLE);
      expect(result.effectiveTaxRate.toString()).toMatch(/^\d+\.\d{4}$/);
    });

    it('should maintain 2 decimal precision for currency amounts', () => {
      const result = calculateStateTax(98765.43, 'CA', FilingStatus.SINGLE);
      expect(result.toString()).toMatch(/^\d+\.\d{2}$/);
    });
  });

  describe('Combined Scenarios', () => {
    it('should calculate combined federal and state impact correctly', () => {
      const income = 150000;
      const federalResult = calculateFederalTax(income, FilingStatus.SINGLE);
      const stateResult = calculateStateTax(income, 'CA', FilingStatus.SINGLE);
      
      expect(federalResult.federalTaxImpact + stateResult).toBeGreaterThan(0);
      expect(federalResult.federalTaxImpact).toBeGreaterThan(stateResult);
    });

    it('should handle complex scenario with multiple components', () => {
      const baseIncome = 100000;
      const gainsAmount = 25000;
      const conversionAmount = 50000;
      
      const gainsResult = calculateCapitalGainsTax(
        gainsAmount,
        CapitalGainsType.LONG_TERM,
        baseIncome,
        FilingStatus.SINGLE,
        'CA'
      );
      
      const conversionResult = calculateRothConversionTax(
        baseIncome + gainsAmount,
        conversionAmount,
        FilingStatus.SINGLE,
        'CA'
      );
      
      expect(gainsResult.federalTaxImpact).toBeGreaterThan(0);
      expect(conversionResult.federalTaxImpact).toBeGreaterThan(0);
      expect(conversionResult.effectiveTaxRate).toBeGreaterThan(gainsResult.effectiveTaxRate);
    });
  });
});