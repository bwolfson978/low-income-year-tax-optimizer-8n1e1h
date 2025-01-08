"use client"

import * as React from "react"
import { clsx } from "clsx"

// Interface for Progress component props
interface ProgressProps {
  /**
   * Current progress value
   * @required
   */
  value: number
  /**
   * Maximum progress value
   * @default 100
   */
  max?: number
  /**
   * Optional custom CSS classes
   */
  className?: string
}

/**
 * Calculates and validates the percentage completion
 * @param value Current progress value
 * @param max Maximum progress value
 * @returns Validated percentage between 0 and 100
 */
const calculatePercentage = (value: number, max: number): number => {
  // Ensure value is non-negative
  const validValue = Math.max(0, value)
  // Ensure max is greater than 0
  const validMax = Math.max(1, max)
  // Calculate and clamp percentage between 0 and 100
  return Math.min(Math.max((validValue / validMax) * 100, 0), 100)
}

/**
 * Progress component for displaying an accessible progress bar
 * Supports customizable styles, animations, and accessibility features
 */
export const Progress: React.FC<ProgressProps> = ({
  value,
  max = 100,
  className,
}) => {
  // Calculate progress percentage
  const percentage = calculatePercentage(value, max)

  return (
    <div
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-label="Progress indicator"
      className={clsx(
        // Base styles
        "relative h-2 w-full overflow-hidden rounded-full",
        // Theme-aware background
        "bg-gray-200 dark:bg-gray-700",
        className
      )}
    >
      <div
        className={clsx(
          // Base styles for progress indicator
          "h-full flex-1 rounded-full",
          // Theme-aware foreground
          "bg-primary",
          // Smooth animation
          "transition-all duration-200 ease-in-out"
        )}
        style={{
          width: `${percentage}%`,
          // Ensure smooth animation from 0
          transform: `translateX(${percentage === 0 ? "-100%" : "0%"})`,
        }}
      />
    </div>
  )
}

// Default export for the Progress component
export default Progress