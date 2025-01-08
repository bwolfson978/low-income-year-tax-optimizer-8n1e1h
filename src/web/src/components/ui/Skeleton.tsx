"use client"

import * as React from "react"
import { cn } from "class-variance-authority"

// Define props interface for the Skeleton component
interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Additional CSS classes to apply to the skeleton
   */
  className?: string
  /**
   * Optional children to render within the skeleton
   */
  children?: React.ReactNode
  /**
   * Optional ARIA label for accessibility
   * @default "Loading..."
   */
  ariaLabel?: string
}

/**
 * Skeleton component that provides an animated loading placeholder
 * with theme awareness and accessibility support.
 * 
 * @version 1.0.0
 * @since 1.0.0
 * @example
 * ```tsx
 * <Skeleton className="h-12 w-12" />
 * <Skeleton className="h-4 w-[250px]" />
 * ```
 */
export function Skeleton({
  className,
  children,
  ariaLabel = "Loading...",
  ...props
}: SkeletonProps) {
  // Base skeleton styles with theme support and animation
  const baseSkeletonClasses = cn(
    // Theme-aware background colors
    "bg-muted/15 dark:bg-muted-dark/15",
    // Rounded corners and overflow handling
    "relative overflow-hidden rounded-md",
    // Animation with reduced motion support
    "animate-pulse motion-reduce:animate-none",
    // Allow custom classes to override defaults
    className
  )

  return (
    <div
      role="progressbar"
      aria-label={ariaLabel}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-busy="true"
      className={baseSkeletonClasses}
      {...props}
    >
      {/* Optional children content */}
      {children}
      
      {/* Animated gradient overlay for enhanced visual effect */}
      <div 
        className={cn(
          "absolute inset-0",
          "bg-gradient-to-r from-transparent",
          "via-muted/10 dark:via-muted-dark/10",
          "to-transparent",
          "animate-[shimmer_2s_infinite] motion-reduce:animate-none"
        )}
        style={{
          backgroundSize: "200% 100%"
        }}
      />
    </div>
  )
}

/**
 * Utility function to generate skeleton placeholder styles
 * for consistent usage across the application
 */
export const getSkeletonStyles = {
  // Common dimensions
  text: "h-4 w-full",
  heading: "h-8 w-3/4",
  avatar: "h-12 w-12 rounded-full",
  thumbnail: "h-24 w-24 rounded-md",
  button: "h-10 w-28 rounded-md",
  card: "h-48 w-full rounded-lg"
}

export type { SkeletonProps }