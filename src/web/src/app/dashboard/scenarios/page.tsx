'use client';

import React, { useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { track } from '@vercel/analytics';
import { ErrorBoundary } from 'react-error-boundary';
import { ScenarioList } from '../../../components/scenarios/ScenarioList';
import { Button } from '../../../components/ui/Button';
import useScenario from '../../../hooks/useScenario';
import useToast from '../../../hooks/useToast';

/**
 * Error fallback component for scenario page errors
 */
const ErrorFallback = ({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) => {
  const toast = useToast();

  useEffect(() => {
    toast.toast({
      message: 'An error occurred while loading scenarios. Please try again.',
      type: 'error',
      duration: 5000,
    });
  }, [toast]);

  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <h2 className="text-xl font-semibold mb-4">Something went wrong</h2>
      <Button onClick={resetErrorBoundary} variant="default">
        Try again
      </Button>
    </div>
  );
};

/**
 * ScenariosPage component displays a list of user's tax optimization scenarios
 * with comprehensive management capabilities.
 */
const ScenariosPage: React.FC = () => {
  const router = useRouter();
  const { scenarios, isLoading, error, deleteScenario } = useScenario();
  const toast = useToast();

  // Track page view
  useEffect(() => {
    track('scenarios_page_view', {
      scenarioCount: scenarios.length,
      timestamp: new Date().toISOString(),
    });
  }, [scenarios.length]);

  /**
   * Handles navigation to new scenario creation
   */
  const handleNewScenario = useCallback(() => {
    track('new_scenario_click', {
      source: 'scenarios_page',
      timestamp: new Date().toISOString(),
    });
    router.push('/dashboard/scenarios/new');
  }, [router]);

  /**
   * Handles navigation to scenario details view
   */
  const handleViewScenario = useCallback((id: string) => {
    track('view_scenario_click', {
      scenarioId: id,
      timestamp: new Date().toISOString(),
    });
    router.push(`/dashboard/scenarios/${id}`);
  }, [router]);

  /**
   * Handles navigation to scenario comparison view
   */
  const handleCompareScenarios = useCallback((scenarioIds: string[]) => {
    track('compare_scenarios_click', {
      scenarioIds,
      count: scenarioIds.length,
      timestamp: new Date().toISOString(),
    });
    const queryParams = scenarioIds.map(id => `ids=${id}`).join('&');
    router.push(`/dashboard/scenarios/compare?${queryParams}`);
  }, [router]);

  /**
   * Handles scenario deletion with confirmation
   */
  const handleDeleteScenario = useCallback(async (id: string) => {
    try {
      await deleteScenario(id);
      track('delete_scenario_success', {
        scenarioId: id,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      track('delete_scenario_error', {
        scenarioId: id,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });
      throw error; // Let ScenarioList handle the error display
    }
  }, [deleteScenario]);

  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onReset={() => {
        // Reset error boundary state and retry data fetch
        router.refresh();
      }}
    >
      <main className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="space-y-8">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold tracking-tight">
              Tax Optimization Scenarios
            </h1>
            <Button
              onClick={handleNewScenario}
              className="flex items-center gap-2"
              aria-label="Create new scenario"
            >
              Create New Scenario
            </Button>
          </div>

          <ScenarioList
            onNewScenario={handleNewScenario}
            onViewScenario={handleViewScenario}
            onCompareScenario={handleCompareScenarios}
            onDeleteScenario={handleDeleteScenario}
            className="min-h-[400px]"
            ariaLabel="List of tax optimization scenarios"
            analyticsContext={{
              page: 'scenarios',
              totalScenarios: scenarios.length,
            }}
          />
        </div>
      </main>
    </ErrorBoundary>
  );
};

export default ScenariosPage;

// Force dynamic rendering to ensure fresh data
export const dynamic = 'force-dynamic';
export const revalidate = 0;