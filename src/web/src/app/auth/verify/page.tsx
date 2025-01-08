'use client';

import React, { useEffect } from 'react';
import { redirect } from 'next/navigation';
import { VerifyEmailForm } from '@/components/auth/VerifyEmailForm';
import { useAuth } from '@/hooks/useAuth';

/**
 * Static metadata for the verification page with security headers
 */
export const metadata = {
  title: 'Verify Email | Tax Optimizer',
  description: 'Verify your email address to complete registration and access your tax optimization tools',
  robots: 'noindex, nofollow',
  openGraph: {
    title: 'Email Verification - Tax Optimizer',
    description: 'Complete your registration by verifying your email address',
    type: 'website'
  },
  headers: {
    'Content-Security-Policy': "default-src 'self'; frame-ancestors 'none';",
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff'
  }
};

/**
 * Email verification page component with enhanced security and accessibility features.
 * Handles the verification process and provides user feedback.
 */
export default function VerifyPage() {
  const { isAuthenticated, isLoading } = useAuth();

  // Redirect to dashboard if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      redirect('/dashboard');
    }
  }, [isAuthenticated]);

  // Show loading state
  if (isLoading) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center bg-background"
        role="status"
        aria-label="Loading verification page"
      >
        <div className="animate-pulse space-y-4 w-full max-w-md p-6">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mx-auto" />
          <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <main 
      className="min-h-screen flex flex-col items-center justify-center bg-background px-4"
      role="main"
      aria-labelledby="verify-title"
    >
      <div className="w-full max-w-md space-y-8">
        {/* Page Header */}
        <div className="text-center">
          <h1 
            id="verify-title"
            className="text-2xl font-bold tracking-tight text-foreground"
          >
            Verify Your Email
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Please verify your email address to continue using the Tax Optimizer
          </p>
        </div>

        {/* Verification Form */}
        <div 
          className="bg-card rounded-lg shadow-sm border p-6"
          role="region"
          aria-label="Email verification form"
        >
          <VerifyEmailForm 
            onVerificationComplete={() => {
              // Redirect to dashboard after successful verification
              redirect('/dashboard');
            }}
          />
        </div>

        {/* Help Text */}
        <p 
          className="text-center text-sm text-muted-foreground"
          role="complementary"
        >
          Having trouble? Contact our{' '}
          <a 
            href="/support"
            className="font-medium text-primary hover:text-primary/90 transition-colors"
            aria-label="Contact support for verification help"
          >
            support team
          </a>
        </p>
      </div>
    </main>
  );
}