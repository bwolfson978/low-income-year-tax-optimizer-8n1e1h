'use client';

import React, { useEffect, useState } from 'react';
import { Alert } from '../components/ui/Alert';
import { Button } from '../components/ui/Button';

/**
 * Next.js Error Page Component
 * Handles and displays application-level errors with a user-friendly interface
 * and automatic recovery options.
 */
const Error = ({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}): React.ReactElement => {
  // Track reset attempt state
  const [isResetting, setIsResetting] = useState<boolean>(false);

  // Log error to monitoring system on mount
  useEffect(() => {
    // Log error details for monitoring
    console.error('Application error:', {
      message: error.message,
      stack: error.stack,
      digest: error.digest,
      timestamp: new Date().toISOString(),
    });
  }, [error]);

  // Attempt automatic reset after timeout
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      handleReset();
    }, 5000);

    return () => clearTimeout(timeoutId);
  }, [reset]);

  // Handle reset attempt with loading state
  const handleReset = async () => {
    setIsResetting(true);
    try {
      await reset();
    } catch (resetError) {
      console.error('Reset attempt failed:', resetError);
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center gap-8 px-4">
      {/* Error Alert */}
      <Alert 
        variant="error"
        className="max-w-md"
        role="alert"
        ariaLive="assertive"
      >
        <div className="flex flex-col gap-2">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
            Something went wrong
          </h2>
          <p className="text-gray-600 dark:text-gray-400 text-center">
            {error.message || 'An unexpected error occurred. Please try again.'}
          </p>
        </div>
      </Alert>

      {/* Reset Button */}
      <Button
        variant="default"
        size="lg"
        onClick={handleReset}
        isLoading={isResetting}
        loadingText="Retrying..."
        disabled={isResetting}
        ariaLabel="Try again"
        className="min-w-[200px]"
      >
        Try again
      </Button>

      {/* Error Details (Development Only) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-4 max-w-md text-sm text-gray-500 dark:text-gray-400">
          <details>
            <summary className="cursor-pointer">Error Details</summary>
            <pre className="mt-2 whitespace-pre-wrap break-words">
              {error.stack}
            </pre>
          </details>
        </div>
      )}
    </div>
  );
};

export default Error;