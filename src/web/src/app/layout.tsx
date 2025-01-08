import React from 'react';
import { Metadata } from 'next';
import { ErrorBoundary } from 'react-error-boundary';
import { Navbar } from '../components/layout/Navbar';
import { Footer } from '../components/layout/Footer';
import { ThemeProvider } from '../context/ThemeContext';
import { ToastProvider } from '../context/ToastContext';

/**
 * Static metadata configuration for SEO optimization
 */
export const metadata: Metadata = {
  title: 'Tax Optimizer - Low Income Year Planning',
  description: 'Optimize your tax strategies during low income years with AI-powered recommendations',
  keywords: 'tax optimization, roth conversion, capital gains, low income year, tax planning, financial optimization',
  authors: [{ name: 'Tax Optimizer Team' }],
  viewport: 'width=device-width, initial-scale=1',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: 'white' },
    { media: '(prefers-color-scheme: dark)', color: 'black' }
  ],
  manifest: '/manifest.json',
  icons: [
    { rel: 'icon', type: 'image/x-icon', url: '/favicon.ico' },
    { rel: 'apple-touch-icon', url: '/apple-touch-icon.png' }
  ]
};

/**
 * Error fallback component for graceful error handling
 */
const ErrorFallback: React.FC<{ error: Error }> = ({ error }) => (
  <div className="flex min-h-screen items-center justify-center bg-background" role="alert">
    <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center dark:border-red-800 dark:bg-red-900/20">
      <h2 className="mb-2 text-lg font-semibold text-red-800 dark:text-red-200">
        Something went wrong
      </h2>
      <p className="text-sm text-red-600 dark:text-red-400">
        {error.message || 'An unexpected error occurred'}
      </p>
    </div>
  </div>
);

/**
 * Props interface for RootLayout component
 */
interface RootLayoutProps {
  children: React.ReactNode;
}

/**
 * Root layout component that provides the application shell
 * Implements global providers, navigation, and footer
 */
export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans antialiased">
        <ErrorBoundary FallbackComponent={ErrorFallback}>
          <ThemeProvider>
            <ToastProvider>
              <div className="flex min-h-screen flex-col">
                {/* Navigation */}
                <Navbar />

                {/* Main Content */}
                <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-6">
                  {children}
                </main>

                {/* Footer */}
                <Footer />
              </div>
            </ToastProvider>
          </ThemeProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}