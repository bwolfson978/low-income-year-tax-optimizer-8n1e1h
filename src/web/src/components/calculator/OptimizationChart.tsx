import React, { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'; // v2.9.0
import { CalculationResult } from '../../types/calculation.types';
import {
  generateOptimizationChartData,
  generateTaxImpactChartData
} from '../../utils/chart-helpers';
import { formatCurrency } from '../../utils/currency-helpers';
import { UI_CONSTANTS } from '../../lib/constants';

/**
 * Props interface for the OptimizationChart component
 */
interface OptimizationChartProps {
  calculationResult: CalculationResult;
  chartType: 'optimization' | 'taxImpact';
  height?: number;
}

/**
 * Props interface for the custom tooltip component
 */
interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
}

/**
 * Custom tooltip component with accessibility support
 */
const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;

  const currentValue = payload[0].value;
  const optimizedValue = payload[1].value;
  const percentageChange = ((optimizedValue - currentValue) / Math.abs(currentValue)) * 100;

  return (
    <div 
      className="bg-white dark:bg-gray-800 p-4 border rounded shadow-lg"
      role="tooltip"
      aria-live="polite"
    >
      <p className="font-semibold mb-2">{label}</p>
      <div className="space-y-1">
        <p>Current: {formatCurrency(currentValue)}</p>
        <p>Optimized: {formatCurrency(optimizedValue)}</p>
        <p className={`font-medium ${percentageChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          Change: {percentageChange.toFixed(1)}%
        </p>
      </div>
    </div>
  );
};

/**
 * OptimizationChart component for visualizing tax optimization results
 */
export const OptimizationChart: React.FC<OptimizationChartProps> = ({
  calculationResult,
  chartType,
  height = 400
}) => {
  // Generate chart data based on chart type
  const chartData = useMemo(() => {
    try {
      if (chartType === 'optimization') {
        return generateOptimizationChartData(
          calculationResult.rothConversion,
          calculationResult.capitalGainsHarvesting
        );
      } else {
        // Create a mock current tax impact for comparison
        const currentTaxImpact = {
          ...calculationResult.taxImpact,
          federalTax: calculationResult.taxImpact.federalTax * 1.2,
          stateTax: calculationResult.taxImpact.stateTax * 1.2
        };
        return generateTaxImpactChartData(currentTaxImpact, calculationResult.taxImpact);
      }
    } catch (error) {
      console.error('Error generating chart data:', error);
      return [];
    }
  }, [calculationResult, chartType]);

  // Chart configuration
  const chartConfig = {
    barGap: 8,
    barSize: 40,
    margin: { top: 20, right: 30, left: 60, bottom: 20 }
  };

  // Handle empty data state
  if (!chartData.length) {
    return (
      <div 
        className="flex items-center justify-center h-[400px] bg-gray-50 dark:bg-gray-800 rounded"
        role="alert"
      >
        <p className="text-gray-500 dark:text-gray-400">
          No data available for visualization
        </p>
      </div>
    );
  }

  return (
    <div 
      className="w-full"
      style={{ height: `${height}px` }}
      role="region"
      aria-label={`${chartType === 'optimization' ? 'Optimization' : 'Tax Impact'} Chart`}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          {...chartConfig}
        >
          <XAxis
            dataKey="name"
            tick={{ fill: 'currentColor' }}
            axisLine={{ stroke: 'currentColor' }}
            tickLine={{ stroke: 'currentColor' }}
          />
          <YAxis
            tickFormatter={(value) => formatCurrency(value, { decimals: 0 })}
            tick={{ fill: 'currentColor' }}
            axisLine={{ stroke: 'currentColor' }}
            tickLine={{ stroke: 'currentColor' }}
          />
          <Tooltip
            content={<CustomTooltip />}
            cursor={{ fill: 'rgba(0, 0, 0, 0.1)' }}
          />
          <Legend
            wrapperStyle={{ paddingTop: '20px' }}
            formatter={(value) => <span className="text-sm">{value}</span>}
          />
          <Bar
            dataKey="current"
            name="Current"
            fill="#94a3b8"
            radius={[4, 4, 0, 0]}
            aria-label="Current values"
          />
          <Bar
            dataKey="optimized"
            name="Optimized"
            fill="#0ea5e9"
            radius={[4, 4, 0, 0]}
            aria-label="Optimized values"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

// Enable reduced motion based on user preference
if (typeof window !== 'undefined') {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReducedMotion) {
    const style = document.createElement('style');
    style.innerHTML = `
      .recharts-bar-rectangle {
        transition: none !important;
      }
    `;
    document.head.appendChild(style);
  }
}

export default OptimizationChart;