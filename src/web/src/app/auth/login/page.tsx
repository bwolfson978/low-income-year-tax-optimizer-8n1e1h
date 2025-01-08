'use client';

import { useEffect } from 'react';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import LoginForm from '../../../components/auth/LoginForm';
import { useAuth } from '../../../hooks/useAuth';

// SEO and page metadata configuration
export const metadata: Metadata = {
  title: 'Login - Tax Optimizer',
  description: 'Login to your Tax Optimizer account to manage your tax optimization scenarios',
  robots: 'noindex, nofollow',
  viewport: 'width=device-width, initial-scale=1.0',
  themeColor: '#ffffff',
  openGraph: {
    title: 'Login - Tax Optimizer',
    description: 'Access your Tax Optimizer account',
    type: 'website',
  }
};

/**
 * Login page component with authentication state management and secure routing
 * Implements user authentication requirements from technical specification
 */
export default function LoginPage() {
  const { isAuthenticated, loading } = useAuth();

  // Redirect authenticated users to dashboard
  useEffect(() => {
    if (isAuthenticated && !loading) {
      redirect('/dashboard');
    }
  }, [isAuthenticated, loading]);

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center bg-background dark:bg-background-dark"
        role="status"
        aria-label="Loading authentication state"
      >
        <div className="animate-pulse flex space-x-4">
          <div className="rounded-full bg-slate-200 dark:bg-slate-700 h-10 w-10"></div>
          <div className="space-y-3">
            <div className="h-2 w-24 bg-slate-200 dark:bg-slate-700 rounded"></div>
            <div className="h-2 w-32 bg-slate-200 dark:bg-slate-700 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  // Prevent authenticated users from seeing login page
  if (isAuthenticated) {
    return null;
  }

  return (
    <main
      className="min-h-screen flex items-center justify-center bg-background dark:bg-background-dark transition-colors duration-200"
      role="main"
      aria-labelledby="login-heading"
    >
      <div className="w-full max-w-md px-4 py-8 space-y-6">
        <h1 
          id="login-heading"
          className="text-2xl font-bold text-center text-gray-900 dark:text-gray-100"
        >
          Welcome Back
        </h1>
        <div 
          className="bg-card dark:bg-card-dark rounded-lg shadow-lg p-6"
          aria-label="Login form container"
        >
          <LoginForm />
        </div>
        <p className="text-center text-sm text-gray-600 dark:text-gray-400">
          By logging in, you agree to our{' '}
          <a 
            href="/terms" 
            className="text-primary hover:text-primary/90 dark:text-primary-dark"
            target="_blank"
            rel="noopener noreferrer"
          >
            Terms of Service
          </a>
          {' '}and{' '}
          <a 
            href="/privacy" 
            className="text-primary hover:text-primary/90 dark:text-primary-dark"
            target="_blank"
            rel="noopener noreferrer"
          >
            Privacy Policy
          </a>
        </p>
      </div>
    </main>
  );
}