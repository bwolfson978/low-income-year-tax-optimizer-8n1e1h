"use client"

import * as React from "react"
import { Skeleton } from "../components/ui/Skeleton"
import { Progress } from "../components/ui/Progress"

// Constants for loading component configuration
const LOADING_PROGRESS_VALUE = 80 // Fixed progress value for loading state
const SKELETON_COUNT = 6 // Number of skeleton placeholders to display
const ANIMATION_DURATION = 1500 // Duration for loading animations in ms

/**
 * Global loading component for Next.js app directory that provides visual feedback
 * during page transitions and data loading states.
 * 
 * Features:
 * - Accessible progress indicator
 * - Responsive skeleton placeholders
 * - Theme-aware styling
 * - Reduced motion support
 * - ARIA labels for screen readers
 * 
 * @version 1.0.0
 */
const Loading = React.memo(function Loading() {
  return (
    <div 
      role="status"
      aria-label="Loading content"
      className="w-full max-w-7xl mx-auto px-4 py-8 space-y-8"
    >
      {/* Progress indicator at the top */}
      <Progress 
        value={LOADING_PROGRESS_VALUE}
        max={100}
        aria-label="Page loading progress"
        className="w-full h-1"
      />

      {/* Main content area with skeleton placeholders */}
      <div className="space-y-6">
        {/* Header skeleton */}
        <Skeleton 
          className="h-12 w-3/4 max-w-2xl"
          aria-label="Loading header"
        />

        {/* Content grid with responsive layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: SKELETON_COUNT }).map((_, index) => (
            <Skeleton
              key={`skeleton-${index}`}
              className="h-48 rounded-lg"
              aria-label={`Loading content item ${index + 1}`}
              style={{
                animationDelay: `${(index * ANIMATION_DURATION) / SKELETON_COUNT}ms`
              }}
            />
          ))}
        </div>

        {/* Footer skeleton */}
        <div className="flex flex-col space-y-4">
          <Skeleton 
            className="h-4 w-full max-w-lg"
            aria-label="Loading footer content"
          />
          <Skeleton 
            className="h-4 w-full max-w-md"
            aria-label="Loading footer content"
          />
        </div>
      </div>
    </div>
  )
})

// Set display name for debugging
Loading.displayName = "Loading"

export default Loading