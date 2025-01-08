import React, { useCallback, useMemo } from 'react';
import { useRouter } from 'next/router'; // v14.0.0
import { toast } from 'react-hot-toast'; // v2.4.0
import { ErrorBoundary } from 'react-error-boundary'; // v4.0.0
import { LoadingSpinner } from '@/components/ui'; // v1.0.0
import { Scenario } from '../../types/scenario.types';
import useScenario from '../../hooks/useScenario';
import { TAX_CONSTANTS, VALIDATION_RULES } from '../../lib/constants';
import { formatCurrency, formatDate } from '../../utils/formatters';

interface ScenarioDetailsProps {
  scenario: Scenario;
  className?: string;
  onError?: (error: Error) => void;
  testId?: string;
}

const ErrorFallback: React.FC<{ error: Error; resetErrorBoundary: () => void }> = ({
  error,
  resetErrorBoundary,
}) => (
  <div 
    className="p-4 border border-red-200 rounded-lg bg-red-50 dark:bg-red-900/20"
    role="alert"
  >
    <h3 className="text-lg font-semibold text-red-800 dark:text-red-200">
      Error Loading Scenario Details
    </h3>
    <p className="mt-2 text-red-700 dark:text-red-300">{error.message}</p>
    <button
      onClick={resetErrorBoundary}
      className="mt-4 px-4 py-2 bg-red-100 hover:bg-red-200 dark:bg-red-800 dark:hover:bg-red-700 rounded-md transition-colors"
      aria-label="Retry loading scenario details"
    >
      Retry
    </button>
  </div>
);

export const ScenarioDetails: React.FC<ScenarioDetailsProps> = ({
  scenario,
  className = '',
  onError,
  testId = 'scenario-details',
}) => {
  const router = useRouter();
  const { updateScenario, deleteScenario, isLoading, error } = useScenario();

  // Memoized formatting of financial values
  const financialDetails = useMemo(() => ({
    traditionalIRA: formatCurrency(scenario.traditionalIRABalance),
    rothIRA: formatCurrency(scenario.rothIRABalance),
    capitalGains: formatCurrency(scenario.capitalGains),
    lastModified: formatDate(scenario.lastModified),
  }), [scenario]);

  // Handle scenario deletion with confirmation
  const handleDelete = useCallback(async () => {
    if (!window.confirm('Are you sure you want to delete this scenario?')) {
      return;
    }

    try {
      await deleteScenario(scenario.id);
      toast.success('Scenario deleted successfully');
      router.push('/scenarios');
    } catch (error) {
      toast.error('Failed to delete scenario');
      onError?.(error as Error);
    }
  }, [scenario.id, deleteScenario, router, onError]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8" aria-live="polite">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return <ErrorFallback error={error} resetErrorBoundary={() => router.reload()} />;
  }

  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onError={onError}
      onReset={() => router.reload()}
    >
      <div 
        className={`bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 ${className}`}
        data-testid={testId}
      >
        {/* Scenario Header */}
        <header className="border-b border-gray-200 dark:border-gray-700 pb-4 mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {scenario.name}
          </h2>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            {scenario.description}
          </p>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-500">
            Last modified: {financialDetails.lastModified}
          </p>
        </header>

        {/* Financial Information */}
        <section 
          aria-labelledby="financial-info-heading"
          className="mb-6"
        >
          <h3 
            id="financial-info-heading"
            className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100"
          >
            Financial Information
          </h3>
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg">
              <dt className="text-sm text-gray-600 dark:text-gray-400">Traditional IRA Balance</dt>
              <dd className="mt-1 text-lg font-semibold text-gray-900 dark:text-gray-100">
                {financialDetails.traditionalIRA}
              </dd>
            </div>
            <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg">
              <dt className="text-sm text-gray-600 dark:text-gray-400">Roth IRA Balance</dt>
              <dd className="mt-1 text-lg font-semibold text-gray-900 dark:text-gray-100">
                {financialDetails.rothIRA}
              </dd>
            </div>
            <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg">
              <dt className="text-sm text-gray-600 dark:text-gray-400">Capital Gains</dt>
              <dd className="mt-1 text-lg font-semibold text-gray-900 dark:text-gray-100">
                {financialDetails.capitalGains}
              </dd>
            </div>
          </dl>
        </section>

        {/* Tax Filing Information */}
        <section 
          aria-labelledby="tax-info-heading"
          className="mb-6"
        >
          <h3 
            id="tax-info-heading"
            className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100"
          >
            Tax Filing Information
          </h3>
          <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg">
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <dt className="text-sm text-gray-600 dark:text-gray-400">Filing Status</dt>
                <dd className="mt-1 font-medium text-gray-900 dark:text-gray-100">
                  {TAX_CONSTANTS.FILING_STATUS_LABELS[scenario.filingStatus]}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gray-600 dark:text-gray-400">Tax State</dt>
                <dd className="mt-1 font-medium text-gray-900 dark:text-gray-100">
                  {scenario.taxState}
                </dd>
              </div>
            </dl>
          </div>
        </section>

        {/* Optimization Results */}
        {scenario.calculationResult && (
          <section 
            aria-labelledby="results-heading"
            className="mb-6"
          >
            <h3 
              id="results-heading"
              className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100"
            >
              Optimization Results
            </h3>
            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
              <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <dt className="text-sm text-green-700 dark:text-green-400">
                    Recommended Roth Conversion
                  </dt>
                  <dd className="mt-1 text-lg font-semibold text-green-900 dark:text-green-100">
                    {formatCurrency(scenario.calculationResult.rothConversion.amount)}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-green-700 dark:text-green-400">
                    Potential Tax Savings
                  </dt>
                  <dd className="mt-1 text-lg font-semibold text-green-900 dark:text-green-100">
                    {formatCurrency(scenario.calculationResult.rothConversion.taxSavings)}
                  </dd>
                </div>
              </dl>
            </div>
          </section>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end gap-4 mt-8">
          <button
            onClick={() => router.push(`/scenarios/${scenario.id}/edit`)}
            className="px-4 py-2 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900 dark:hover:bg-blue-800 rounded-md transition-colors"
            aria-label="Edit scenario"
          >
            Edit
          </button>
          <button
            onClick={handleDelete}
            className="px-4 py-2 bg-red-100 hover:bg-red-200 dark:bg-red-900 dark:hover:bg-red-800 rounded-md transition-colors"
            aria-label="Delete scenario"
          >
            Delete
          </button>
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default ScenarioDetails;