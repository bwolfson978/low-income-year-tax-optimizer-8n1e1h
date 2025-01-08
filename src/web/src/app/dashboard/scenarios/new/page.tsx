'use client'

import React, { useCallback, useState } from 'react'
import { useRouter } from 'next/navigation' // v14.0.0
import { ErrorBoundary } from 'react-error-boundary' // v4.0.0
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import ScenarioForm from '@/components/scenarios/ScenarioForm'
import useScenario from '@/hooks/useScenario'
import useToast from '@/hooks/useToast'
import { analytics } from '@segment/analytics-next' // v1.5.0

// Error fallback component for error boundary
const ErrorFallback = ({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) => {
  const toast = useToast()

  React.useEffect(() => {
    // Track error in analytics
    analytics.track('Scenario Creation Error', {
      error: error.message,
      timestamp: new Date().toISOString()
    })

    // Show error toast
    toast.toast({
      message: 'An error occurred while creating the scenario. Please try again.',
      type: 'error',
      duration: 5000
    })
  }, [error, toast])

  return (
    <div className="p-6 text-center" role="alert">
      <h2 className="text-lg font-semibold text-destructive mb-2">Something went wrong</h2>
      <p className="text-sm text-muted-foreground mb-4">{error.message}</p>
      <button
        onClick={resetErrorBoundary}
        className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary/90"
      >
        Try again
      </button>
    </div>
  )
}

const NewScenarioPage = () => {
  const router = useRouter()
  const { createScenario } = useScenario()
  const toast = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  // Handle successful scenario creation
  const handleSuccess = useCallback(async (createdScenario) => {
    try {
      // Track successful creation
      analytics.track('Scenario Created', {
        scenarioId: createdScenario.id,
        timestamp: new Date().toISOString()
      })

      // Show success message
      toast.toast({
        message: 'Scenario created successfully',
        type: 'success',
        duration: 3000
      })

      // Navigate to the new scenario
      router.push(`/dashboard/scenarios/${createdScenario.id}`)
    } catch (err) {
      console.error('Navigation error:', err)
      setError(err instanceof Error ? err : new Error('Failed to navigate after scenario creation'))
    }
  }, [router, toast])

  // Handle form cancellation
  const handleCancel = useCallback(() => {
    analytics.track('Scenario Creation Cancelled')
    router.push('/dashboard/scenarios')
  }, [router])

  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onReset={() => {
        setError(null)
        setIsSubmitting(false)
      }}
    >
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <Card theme="system" elevation="low">
          <CardHeader spacing="normal">
            <CardTitle as="h1" className="text-3xl font-bold">
              Create New Scenario
            </CardTitle>
          </CardHeader>
          <CardContent padding="normal">
            <ScenarioForm
              onSuccess={handleSuccess}
              onCancel={handleCancel}
              isSubmitting={isSubmitting}
              error={error}
            />
          </CardContent>
        </Card>
      </div>
    </ErrorBoundary>
  )
}

export default NewScenarioPage