"use client"

import React, { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import ScenarioDetails from '@/components/scenarios/ScenarioDetails';
import useScenario from '@/hooks/useScenario';
import Skeleton from '@/components/ui/Skeleton';
import Alert from '@/components/ui/Alert';

// Constants for configuration
const REFETCH_INTERVAL = 60000; // 1 minute
const ERROR_MESSAGES = {
  NOT_FOUND: 'Scenario not found',
  FETCH_ERROR: 'Error loading scenario',
  GENERIC_ERROR: 'An unexpected error occurred'
} as const;

// Props interface for the page component
interface PageProps {
  params: {
    id: string;
  };
}

/**
 * Loading skeleton component for scenario details
 */
const ScenarioSkeleton: React.FC = () => (
  <div className="space-y-6">
    {/* Header skeleton */}
    <Skeleton className="h-10 w-3/4 mb-4" />
    <Skeleton className="h-6 w-1/2" />
    
    {/* Financial details skeleton */}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
      <Skeleton className="h-24" />
      <Skeleton className="h-24" />
      <Skeleton className="h-24" />
    </div>
    
    {/* Tax information skeleton */}
    <div className="mt-8">
      <Skeleton className="h-32" />
    </div>
    
    {/* Results skeleton */}
    <div className="mt-8">
      <Skeleton className="h-40" />
    </div>
  </div>
);

/**
 * Error component for scenario loading failures
 */
const ErrorDisplay: React.FC<{ error: Error }> = ({ error }) => (
  <Alert
    variant="error"
    className="mt-4"
    role="alert"
    ariaLive="assertive"
  >
    {error.message || ERROR_MESSAGES.GENERIC_ERROR}
  </Alert>
);

/**
 * Generates metadata for the scenario page
 */
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  return {
    title: `Scenario Details - Tax Optimizer`,
    description: 'View detailed tax optimization recommendations and analysis for your financial scenario.',
    openGraph: {
      title: 'Tax Optimization Scenario Details',
      description: 'Comprehensive tax optimization analysis and recommendations.',
      type: 'website',
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

/**
 * Main page component for displaying scenario details
 */
export default function ScenarioPage({ params }: PageProps) {
  const { id } = params;
  
  const {
    scenarios,
    isLoading,
    error
  } = useScenario();

  // Find the specific scenario
  const scenario = scenarios.find(s => s.id === id);

  // Handle loading state
  if (isLoading) {
    return (
      <Suspense fallback={<ScenarioSkeleton />}>
        <ScenarioSkeleton />
      </Suspense>
    );
  }

  // Handle error state
  if (error) {
    return <ErrorDisplay error={error} />;
  }

  // Handle not found state
  if (!scenario) {
    notFound();
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Suspense fallback={<ScenarioSkeleton />}>
        <ScenarioDetails
          scenario={scenario}
          className="animate-fadeIn"
          onError={(error) => {
            console.error('Scenario details error:', error);
          }}
          testId="scenario-details-page"
        />
      </Suspense>
    </div>
  );
}