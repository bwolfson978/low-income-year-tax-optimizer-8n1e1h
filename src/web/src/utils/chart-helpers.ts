import { OptimizationResult, TaxImpact } from '../types/calculation.types';
import type { ChartData } from 'recharts'; // v2.9.0

/**
 * Interface for enhanced chart data points with metadata support
 */
interface ChartDataPoint {
  name: string;
  current: number;
  optimized: number;
  metadata: {
    description?: string;
    percentageChange: number;
    currentFormatted: string;
    optimizedFormatted: string;
    ariaLabel?: string;
  };
}

/**
 * Currency formatter for consistent number formatting
 */
const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0
});

/**
 * Percentage formatter for consistent number formatting
 */
const percentFormatter = new Intl.NumberFormat('en-US', {
  style: 'percent',
  minimumFractionDigits: 1,
  maximumFractionDigits: 1
});

/**
 * Calculates percentage change between two numbers
 */
const calculatePercentageChange = (current: number, optimized: number): number => {
  if (current === 0) return 0;
  return ((optimized - current) / Math.abs(current)) * 100;
};

/**
 * Transforms optimization results into chart-ready format with enhanced accessibility
 */
export const generateOptimizationChartData = (
  rothConversion: OptimizationResult,
  capitalGains: OptimizationResult
): ChartDataPoint[] => {
  const data: ChartDataPoint[] = [];

  // Roth Conversion Data Point
  const rothPercentageChange = calculatePercentageChange(
    rothConversion.amount,
    rothConversion.amount + rothConversion.taxSavings
  );

  data.push({
    name: 'Roth Conversion',
    current: rothConversion.amount,
    optimized: rothConversion.amount + rothConversion.taxSavings,
    metadata: {
      description: 'Comparison of Roth conversion amounts before and after optimization',
      percentageChange: rothPercentageChange,
      currentFormatted: currencyFormatter.format(rothConversion.amount),
      optimizedFormatted: currencyFormatter.format(rothConversion.amount + rothConversion.taxSavings),
      ariaLabel: `Roth conversion optimization showing ${percentFormatter.format(rothPercentageChange / 100)} improvement`
    }
  });

  // Capital Gains Data Point
  const gainsPercentageChange = calculatePercentageChange(
    capitalGains.amount,
    capitalGains.amount + capitalGains.taxSavings
  );

  data.push({
    name: 'Capital Gains',
    current: capitalGains.amount,
    optimized: capitalGains.amount + capitalGains.taxSavings,
    metadata: {
      description: 'Comparison of capital gains amounts before and after optimization',
      percentageChange: gainsPercentageChange,
      currentFormatted: currencyFormatter.format(capitalGains.amount),
      optimizedFormatted: currencyFormatter.format(capitalGains.amount + capitalGains.taxSavings),
      ariaLabel: `Capital gains optimization showing ${percentFormatter.format(gainsPercentageChange / 100)} improvement`
    }
  });

  return data;
};

/**
 * Transforms tax impact data into chart-ready format with comprehensive analysis
 */
export const generateTaxImpactChartData = (
  currentTaxImpact: TaxImpact,
  optimizedTaxImpact: TaxImpact
): ChartDataPoint[] => {
  const data: ChartDataPoint[] = [];

  // Federal Tax Data Point
  const federalPercentageChange = calculatePercentageChange(
    currentTaxImpact.federalTax,
    optimizedTaxImpact.federalTax
  );

  data.push({
    name: 'Federal Tax',
    current: currentTaxImpact.federalTax,
    optimized: optimizedTaxImpact.federalTax,
    metadata: {
      description: 'Comparison of federal tax liability before and after optimization',
      percentageChange: federalPercentageChange,
      currentFormatted: currencyFormatter.format(currentTaxImpact.federalTax),
      optimizedFormatted: currencyFormatter.format(optimizedTaxImpact.federalTax),
      ariaLabel: `Federal tax reduction of ${percentFormatter.format(Math.abs(federalPercentageChange) / 100)}`
    }
  });

  // State Tax Data Point
  const statePercentageChange = calculatePercentageChange(
    currentTaxImpact.stateTax,
    optimizedTaxImpact.stateTax
  );

  data.push({
    name: 'State Tax',
    current: currentTaxImpact.stateTax,
    optimized: optimizedTaxImpact.stateTax,
    metadata: {
      description: 'Comparison of state tax liability before and after optimization',
      percentageChange: statePercentageChange,
      currentFormatted: currencyFormatter.format(currentTaxImpact.stateTax),
      optimizedFormatted: currencyFormatter.format(optimizedTaxImpact.stateTax),
      ariaLabel: `State tax reduction of ${percentFormatter.format(Math.abs(statePercentageChange) / 100)}`
    }
  });

  // Total Tax Data Point
  const totalCurrent = currentTaxImpact.federalTax + currentTaxImpact.stateTax;
  const totalOptimized = optimizedTaxImpact.federalTax + optimizedTaxImpact.stateTax;
  const totalPercentageChange = calculatePercentageChange(totalCurrent, totalOptimized);

  data.push({
    name: 'Total Tax',
    current: totalCurrent,
    optimized: totalOptimized,
    metadata: {
      description: 'Comparison of total tax liability before and after optimization',
      percentageChange: totalPercentageChange,
      currentFormatted: currencyFormatter.format(totalCurrent),
      optimizedFormatted: currencyFormatter.format(totalOptimized),
      ariaLabel: `Total tax reduction of ${percentFormatter.format(Math.abs(totalPercentageChange) / 100)}`
    }
  });

  return data;
};

/**
 * Transforms NPV data into chart-ready format with detailed financial comparison
 */
export const generateNPVChartData = (
  currentNPV: number,
  optimizedNPV: number
): ChartDataPoint[] => {
  const percentageChange = calculatePercentageChange(currentNPV, optimizedNPV);

  return [{
    name: 'Net Present Value',
    current: currentNPV,
    optimized: optimizedNPV,
    metadata: {
      description: 'Comparison of net present value before and after optimization',
      percentageChange: percentageChange,
      currentFormatted: currencyFormatter.format(currentNPV),
      optimizedFormatted: currencyFormatter.format(optimizedNPV),
      ariaLabel: `Net present value improvement of ${percentFormatter.format(percentageChange / 100)}`
    }
  }];
};