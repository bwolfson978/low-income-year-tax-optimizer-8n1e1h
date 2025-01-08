'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ErrorBoundary } from 'react-error-boundary'; // ^4.0.0
import { Spinner } from '@radix-ui/react-spinner'; // ^1.0.0
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import { useAuthContext } from '@/context/AuthContext';

/**
 * Error fallback component for dashboard layout errors
 */
const ErrorFallback: React.FC<{ error: Error }> = ({ error }) => (
  <div 
    role="alert" 
    className="flex h-screen items-center justify-center p-4 text-red-600"
    aria-live="assertive"
  >
    <div className="text-center">
      <h2 className="text-lg font-semibold">Something went wrong</h2>
      <p className="mt-2 text-sm">{error.message}</p>
      <button
        onClick={() => window.location.reload()}
        className="mt-4 rounded-md bg-red-100 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-200"
      >
        Try again
      </button>
    </div>
  </div>
);

/**
 * Protected dashboard layout component that provides common structure for all dashboard pages.
 * Implements authentication protection, responsive layout, and accessibility features.
 */
const DashboardLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const router = useRouter();
  const { authState } = useAuthContext();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authState.loading && !authState.isAuthenticated) {
      router.push('/login');
    }
  }, [authState.isAuthenticated, authState.loading, router]);

  // Handle sidebar state persistence
  useEffect(() => {
    const savedState = localStorage.getItem('sidebarCollapsed');
    if (savedState) {
      setIsSidebarCollapsed(savedState === 'true');
    }
  }, []);

  const handleSidebarCollapse = (collapsed: boolean) => {
    setIsSidebarCollapsed(collapsed);
    localStorage.setItem('sidebarCollapsed', String(collapsed));
  };

  // Show loading state while checking authentication
  if (authState.loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner 
          className="h-8 w-8 animate-spin text-primary" 
          aria-label="Loading dashboard"
        />
      </div>
    );
  }

  // Only render layout if authenticated
  if (!authState.isAuthenticated) {
    return null;
  }

  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      {/* Skip navigation link for accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:p-4 focus:bg-background focus:ring-2 focus:ring-primary"
      >
        Skip to main content
      </a>

      <div className="min-h-screen bg-background">
        {/* Top navigation bar */}
        <Navbar />

        <div className="flex">
          {/* Sidebar navigation */}
          <Sidebar
            className="hidden md:block"
            isCollapsed={isSidebarCollapsed}
            onCollapse={handleSidebarCollapse}
          />

          {/* Main content area */}
          <main
            id="main-content"
            className={`flex-1 transition-all duration-200 ${
              isSidebarCollapsed ? 'md:ml-[70px]' : 'md:ml-[240px]'
            }`}
            role="main"
            aria-label="Dashboard content"
          >
            <div className="container mx-auto px-4 py-8">
              {children}
            </div>
          </main>
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default DashboardLayout;