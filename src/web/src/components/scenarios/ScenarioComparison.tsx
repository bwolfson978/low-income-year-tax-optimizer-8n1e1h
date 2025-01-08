"use client"

import React, { useMemo } from 'react';
import { clsx } from 'clsx'; // v2.0.0
import { Scenario } from '../../types/scenario.types';
import { OptimizationChart } from '../calculator/OptimizationChart';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { formatCurrency } from '../../utils/currency-helpers';
import { TAX_CONSTANTS } from '../../lib/constants';

interface ScenarioComparisonProps {
  baseScenario: Scenario;
  comparisonScenario: Scenario;
  onMetricSelect?: (metric: string) => void;
}

interface DifferenceMetric {
  absolute: number;
  percentage: number;
  trend: 'up' | 'down' | 'neutral';
}

type DifferenceMap = Record<string, DifferenceMetric>;

const ScenarioComparison: React.FC<ScenarioComparisonProps> = ({
  baseScenario,
  comparisonScenario,
  onMetricSelect
}) => {
  // Calculate differences between scenarios with memoization
  const differences = useMemo(() => {
    const calculateDifference = (base: number, comparison: number): DifferenceMetric => {
      const absolute = comparison - base;
      const percentage = base !== 0 ? (absolute / Math.abs(base)) * 100 : 0;
      const trend = absolute > 0 ? 'up' : absolute < 0 ? 'down' : 'neutral';
      return { absolute, percentage, trend };
    };

    const metrics: DifferenceMap = {
      traditionalIRA: calculateDifference(
        baseScenario.traditionalIRABalance,
        comparisonScenario.traditionalIRABalance
      ),
      rothIRA: calculateDifference(
        baseScenario.rothIRABalance,
        comparisonScenario.rothIRABalance
      ),
      capitalGains: calculateDifference(
        baseScenario.capitalGains,
        comparisonScenario.capitalGains
      )
    };

    // Add tax impact differences if calculation results exist
    if (baseScenario.calculationResult && comparisonScenario.calculationResult) {
      metrics.federalTax = calculateDifference(
        baseScenario.calculationResult.taxImpact.federalTax,
        comparisonScenario.calculationResult.taxImpact.federalTax
      );
      metrics.stateTax = calculateDifference(
        baseScenario.calculationResult.taxImpact.stateTax,
        comparisonScenario.calculationResult.taxImpact.stateTax
      );
      metrics.totalTax = calculateDifference(
        baseScenario.calculationResult.taxImpact.totalTax,
        comparisonScenario.calculationResult.taxImpact.totalTax
      );
    }

    return metrics;
  }, [baseScenario, comparisonScenario]);

  // Render difference indicator with proper styling and accessibility
  const renderDifference = (metric: DifferenceMetric) => {
    const trendColors = {
      up: 'text-green-600 dark:text-green-400',
      down: 'text-red-600 dark:text-red-400',
      neutral: 'text-gray-600 dark:text-gray-400'
    };

    const trendIcons = {
      up: '↑',
      down: '↓',
      neutral: '→'
    };

    return (
      <span
        className={clsx(
          'inline-flex items-center gap-1 font-medium',
          trendColors[metric.trend]
        )}
        role="status"
        aria-label={`${Math.abs(metric.percentage).toFixed(1)}% ${metric.trend}`}
      >
        <span aria-hidden="true">{trendIcons[metric.trend]}</span>
        {metric.percentage.toFixed(1)}%
      </span>
    );
  };

  // Render comparison section with proper semantic structure
  const renderComparisonSection = (
    title: string,
    baseValue: number,
    comparisonValue: number,
    metric: DifferenceMetric
  ) => (
    <div className="space-y-2" role="group" aria-labelledby={`${title}-comparison`}>
      <h4 
        id={`${title}-comparison`}
        className="text-sm font-medium text-gray-700 dark:text-gray-300"
      >
        {title}
      </h4>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div>
          <p className="text-sm text-gray-500">Base</p>
          <p className="text-lg font-medium">{formatCurrency(baseValue)}</p>
        </div>
        <div>
          <p className="text-sm text-gray-500">Comparison</p>
          <p className="text-lg font-medium">{formatCurrency(comparisonValue)}</p>
        </div>
        <div className="col-span-2 sm:col-span-1">
          <p className="text-sm text-gray-500">Difference</p>
          <div className="flex items-center gap-2">
            <p className="text-lg font-medium">
              {formatCurrency(metric.absolute)}
            </p>
            {renderDifference(metric)}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Scenario Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Financial Inputs Comparison */}
            <section className="space-y-4" aria-labelledby="financial-inputs">
              <h3 
                id="financial-inputs"
                className="text-lg font-semibold"
              >
                Financial Inputs
              </h3>
              {renderComparisonSection(
                'Traditional IRA Balance',
                baseScenario.traditionalIRABalance,
                comparisonScenario.traditionalIRABalance,
                differences.traditionalIRA
              )}
              {renderComparisonSection(
                'Roth IRA Balance',
                baseScenario.rothIRABalance,
                comparisonScenario.rothIRABalance,
                differences.rothIRA
              )}
              {renderComparisonSection(
                'Capital Gains',
                baseScenario.capitalGains,
                comparisonScenario.capitalGains,
                differences.capitalGains
              )}
            </section>

            {/* Tax Impact Comparison */}
            {baseScenario.calculationResult && comparisonScenario.calculationResult && (
              <section className="space-y-4" aria-labelledby="tax-impact">
                <h3 
                  id="tax-impact"
                  className="text-lg font-semibold"
                >
                  Tax Impact
                </h3>
                {renderComparisonSection(
                  'Federal Tax',
                  baseScenario.calculationResult.taxImpact.federalTax,
                  comparisonScenario.calculationResult.taxImpact.federalTax,
                  differences.federalTax
                )}
                {!TAX_CONSTANTS.STATE_TAX_INFO.NO_INCOME_TAX_STATES.includes(baseScenario.taxState) && (
                  renderComparisonSection(
                    'State Tax',
                    baseScenario.calculationResult.taxImpact.stateTax,
                    comparisonScenario.calculationResult.taxImpact.stateTax,
                    differences.stateTax
                  )
                )}
                {renderComparisonSection(
                  'Total Tax',
                  baseScenario.calculationResult.taxImpact.totalTax,
                  comparisonScenario.calculationResult.taxImpact.totalTax,
                  differences.totalTax
                )}
              </section>
            )}

            {/* Optimization Charts */}
            {baseScenario.calculationResult && comparisonScenario.calculationResult && (
              <section className="space-y-4" aria-labelledby="optimization-charts">
                <h3 
                  id="optimization-charts"
                  className="text-lg font-semibold"
                >
                  Optimization Comparison
                </h3>
                <div className="space-y-6">
                  <OptimizationChart
                    calculationResult={baseScenario.calculationResult}
                    chartType="optimization"
                    comparisonMode={true}
                  />
                  <OptimizationChart
                    calculationResult={comparisonScenario.calculationResult}
                    chartType="taxImpact"
                    comparisonMode={true}
                  />
                </div>
              </section>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ScenarioComparison;