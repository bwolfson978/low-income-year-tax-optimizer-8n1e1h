'use client';

import React, { useEffect } from 'react';
import { Metadata } from 'next';
import { ErrorBoundary } from 'react-error-boundary';
import SignupForm from '../../../components/auth/SignupForm';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../components/ui/Card';
import { useAuthContext } from '../../../context/AuthContext';
import { useTheme } from '../../../context/ThemeContext';

// SEO and accessibility metadata
export const metadata: Metadata = {
  title: 'Sign Up - Tax Optimizer',
  description: 'Create an account to start optimizing your tax strategy during low income years',
  robots: 'noindex',
  openGraph: {
    title: 'Sign Up - Tax Optimizer',
    description: 'Create an account to start optimizing your tax strategy during low income years',
    type: 'website'
  },
  twitter: {
    card: 'summary',
    title: 'Sign Up - Tax Optimizer',
    description: 'Create an account to start optimizing your tax strategy during low income years'
  }
};

// Error fallback component
const ErrorFallback = ({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) => (
  <div 
    role="alert" 
    className="p-4 rounded-md bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-200"
  >
    <h2 className="text-lg font-semibold mb-2">Something went wrong</h2>
    <p className="mb-4">{error.message}</p>
    <button
      onClick={resetErrorBoundary}
      className="px-4 py-2 rounded-md bg-red-100 dark:bg-red-800 hover:bg-red-200 dark:hover:bg-red-700 transition-colors"
      aria-label="Try again"
    >
      Try again
    </button>
  </div>
);

const SignupPage = () => {
  const { authState } = useAuthContext();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // Redirect if already authenticated
  useEffect(() => {
    if (authState.isAuthenticated) {
      window.location.href = '/dashboard';
    }
  }, [authState.isAuthenticated]);

  // Handle analytics tracking
  useEffect(() => {
    try {
      // Track page view
      window.gtag?.('event', 'page_view', {
        page_title: 'Signup',
        page_path: '/auth/signup'
      });
    } catch (error) {
      console.error('Analytics error:', error);
    }
  }, []);

  return (
    <main 
      className="min-h-screen flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8"
      role="main"
      aria-labelledby="signup-title"
    >
      <div className="w-full max-w-md space-y-8">
        <ErrorBoundary FallbackComponent={ErrorFallback}>
          <Card 
            elevation="medium"
            theme={isDark ? 'dark' : 'light'}
            className="w-full"
          >
            <CardHeader spacing="normal">
              <CardTitle 
                as="h1"
                id="signup-title"
                className="text-center"
              >
                Create your account
              </CardTitle>
              <CardDescription 
                color="muted"
                className="text-center"
              >
                Start optimizing your tax strategy during low income years
              </CardDescription>
            </CardHeader>

            <CardContent padding="normal">
              <SignupForm />
              
              <div className="mt-6 text-center text-sm">
                <span className="text-gray-600 dark:text-gray-400">
                  Already have an account?{' '}
                </span>
                <a
                  href="/auth/login"
                  className="font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300 transition-colors"
                  aria-label="Sign in to your existing account"
                >
                  Sign in
                </a>
              </div>

              <p className="mt-4 text-xs text-center text-gray-500 dark:text-gray-400">
                By signing up, you agree to our{' '}
                <a
                  href="/terms"
                  className="underline hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Terms of Service
                </a>
                {' '}and{' '}
                <a
                  href="/privacy"
                  className="underline hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Privacy Policy
                </a>
              </p>
            </CardContent>
          </Card>
        </ErrorBoundary>
      </div>
    </main>
  );
};

export default SignupPage;