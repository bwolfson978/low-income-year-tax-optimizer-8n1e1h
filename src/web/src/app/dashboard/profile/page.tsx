"use client"

import React, { useCallback, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { ErrorBoundary } from 'react-error-boundary'
import { 
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'

// Analytics tracking hook
const useProfileAnalytics = () => {
  const trackEvent = useCallback((eventName: string, data?: Record<string, any>) => {
    // Analytics implementation would go here
    console.log('Analytics:', eventName, data)
  }, [])

  return { trackEvent }
}

// Loading skeleton component
const ProfileSkeleton: React.FC = () => (
  <Card className="w-full max-w-2xl mx-auto" elevation="low">
    <CardHeader>
      <Skeleton className="h-8 w-48" ariaLabel="Loading profile title" />
    </CardHeader>
    <CardContent>
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" ariaLabel="Loading profile field" />
        <Skeleton className="h-12 w-full" ariaLabel="Loading profile field" />
        <Skeleton className="h-12 w-full" ariaLabel="Loading profile field" />
      </div>
    </CardContent>
  </Card>
)

// Error state component
const ProfileErrorState: React.FC<{ error: Error }> = ({ error }) => (
  <Card className="w-full max-w-2xl mx-auto bg-red-50 dark:bg-red-900/10" elevation="low">
    <CardHeader>
      <CardTitle as="h2" className="text-red-600 dark:text-red-400">
        Profile Error
      </CardTitle>
    </CardHeader>
    <CardContent>
      <p className="text-red-600 dark:text-red-400">
        {error.message || 'An error occurred while loading your profile'}
      </p>
      <button 
        onClick={() => window.location.reload()}
        className="mt-4 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
        aria-label="Reload page"
      >
        Retry
      </button>
    </CardContent>
  </Card>
)

// Main profile page component
const ProfilePage: React.FC = () => {
  const { user, loading } = useAuth()
  const { trackEvent } = useProfileAnalytics()

  // Track page view
  useEffect(() => {
    trackEvent('profile_view')
  }, [trackEvent])

  // Handle keyboard navigation
  const handleKeyNavigation = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      // Handle escape key press
      document.getElementById('profile-header')?.focus()
    }
  }, [])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyNavigation)
    return () => document.removeEventListener('keydown', handleKeyNavigation)
  }, [handleKeyNavigation])

  if (loading) {
    return <ProfileSkeleton />
  }

  return (
    <ErrorBoundary FallbackComponent={ProfileErrorState}>
      <main 
        className="p-4 sm:p-6 md:p-8 w-full"
        role="main"
        aria-labelledby="profile-header"
      >
        <Card 
          className="w-full max-w-2xl mx-auto"
          elevation="low"
          theme="system"
        >
          <CardHeader spacing="normal">
            <CardTitle 
              as="h1"
              id="profile-header"
              className="text-2xl font-bold tracking-tight"
              tabIndex={0}
            >
              Profile Settings
            </CardTitle>
          </CardHeader>
          <CardContent padding="normal">
            <div className="space-y-6">
              {/* Email Section */}
              <section 
                aria-labelledby="email-label"
                className="space-y-2"
              >
                <h2 
                  id="email-label"
                  className="text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Email Address
                </h2>
                <p 
                  className="text-base text-gray-900 dark:text-gray-100"
                  aria-label="Your email address"
                >
                  {user?.email}
                </p>
              </section>

              {/* Created Date Section */}
              <section 
                aria-labelledby="created-label"
                className="space-y-2"
              >
                <h2 
                  id="created-label"
                  className="text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Member Since
                </h2>
                <p 
                  className="text-base text-gray-900 dark:text-gray-100"
                  aria-label="Account creation date"
                >
                  {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                </p>
              </section>

              {/* Last Updated Section */}
              <section 
                aria-labelledby="updated-label"
                className="space-y-2"
              >
                <h2 
                  id="updated-label"
                  className="text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Last Updated
                </h2>
                <p 
                  className="text-base text-gray-900 dark:text-gray-100"
                  aria-label="Profile last update date"
                >
                  {user?.updated_at ? new Date(user.updated_at).toLocaleDateString() : 'N/A'}
                </p>
              </section>
            </div>
          </CardContent>
        </Card>
      </main>
    </ErrorBoundary>
  )
}

export default ProfilePage