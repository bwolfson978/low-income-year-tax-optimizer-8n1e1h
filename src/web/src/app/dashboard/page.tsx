'use client';

import React, { useCallback, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ErrorBoundary } from 'react-error-boundary';
import CalculationForm from '../../components/calculator/CalculationForm';
import ScenarioList from '../../components/scenarios/ScenarioList';
import { useCalculation } from '../../hooks/useCalculation';
import { useScenario } from '../../hooks/useScenario';
import type { CalculationResult } from '../../types/calculation.types';

/**
 * Error fallback component for graceful error handling
 */
const ErrorFallback = ({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) => (
  <div className="p-6 rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800">
    <h3 className="text-lg font-semibold text-red-800 dark:text-red-200 mb-2">
      Something went wrong
    </h3>
    <p className="text-red-600 dark:text-red-300 mb-4">{error.message}</p>
    <button
      onClick={resetErrorBoundary}
      className="px-4 py-2 rounded-md bg-red-100 text-red-800 hover:bg-red-200 dark:bg-red-800 dark:text-red-100 dark:hover:bg-red-700 transition-colors"
    >
      Try again
    </button>
  </div>
);

/**
 * Main dashboard page component that serves as the primary interface for tax optimization
 */
export default function DashboardPage() {
  const router = useRouter();
  const [activeScenarioId, setActiveScenarioId] = useState<string | null>(null);
  
  const { 
    calculateOptimization, 
    loading: calculationLoading, 
    error: calculationError,
    resetCalculation 
  } = useCalculation();
  
  const {
    scenarios,
    isLoading: scenariosLoading,
    error: scenariosError,
    createScenario,
    deleteScenario
  } = useScenario();

  /**
   * Handles successful calculation completion and scenario creation
   */
  const handleCalculationComplete = useCallback(async (result: CalculationResult) => {
    try {
      const scenario = await createScenario({
        name: `Scenario ${scenarios.length + 1}`,
        description: `Tax optimization scenario created on ${new Date().toLocaleDateString()}`,
        traditionalIRABalance: result.rothConversion.amount,
        rothIRABalance: result.rothConversion.amount,
        capitalGains: result.capitalGainsHarvesting.amount,
        taxState: result.userPreferences.preferredTaxState,
        filingStatus: 'SINGLE',
        calculationResult: result
      });

      setActiveScenarioId(scenario.id);
      router.push(`/scenarios/${scenario.id}`);
    } catch (error) {
      console.error('Failed to create scenario:', error);
    }
  }, [scenarios.length, createScenario, router]);

  /**
   * Handles creation of new scenario
   */
  const handleNewScenario = useCallback(() => {
    resetCalculation();
    setActiveScenarioId(null);
    router.push('/scenarios/new');
  }, [resetCalculation, router]);

  /**
   * Handles viewing a specific scenario
   */
  const handleViewScenario = useCallback((id: string) => {
    setActiveScenarioId(id);
    router.push(`/scenarios/${id}`);
  }, [router]);

  /**
   * Handles comparing scenarios
   */
  const handleCompareScenario = useCallback((id: string) => {
    if (activeScenarioId) {
      router.push(`/scenarios/compare/${activeScenarioId}/${id}`);
    } else {
      setActiveScenarioId(id);
    }
  }, [activeScenarioId, router]);

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <h1 className="text-3xl font-bold tracking-tight mb-8">
        Tax Optimization Dashboard
      </h1>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Calculation Form Section */}
        <ErrorBoundary
          FallbackComponent={ErrorFallback}
          onReset={resetCalculation}
        >
          <section className="space-y-6">
            <h2 className="text-2xl font-semibold tracking-tight">
              New Calculation
            </h2>
            <CalculationForm
              onCalculationComplete={handleCalculationComplete}
              className="p-6 rounded-lg border bg-card"
            />
          </section>
        </ErrorBoundary>

        {/* Scenarios List Section */}
        <ErrorBoundary
          FallbackComponent={ErrorFallback}
          onReset={() => window.location.reload()}
        >
          <section className="space-y-6">
            <h2 className="text-2xl font-semibold tracking-tight">
              Saved Scenarios
            </h2>
            <ScenarioList
              onNewScenario={handleNewScenario}
              onViewScenario={handleViewScenario}
              onCompareScenario={handleCompareScenario}
              className="rounded-lg border bg-card p-6"
            />
          </section>
        </ErrorBoundary>
      </div>

      {/* Accessibility announcements */}
      <div className="sr-only" role="status" aria-live="polite">
        {calculationLoading && 'Calculating optimization...'}
        {scenariosLoading && 'Loading scenarios...'}
        {calculationError && 'Calculation error occurred'}
        {scenariosError && 'Error loading scenarios'}
      </div>
    </div>
  );
}