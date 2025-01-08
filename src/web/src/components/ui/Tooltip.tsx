"use client"

import * as React from 'react'
import * as TooltipPrimitive from '@radix-ui/react-tooltip' // v1.0.0
import { cn } from 'class-variance-authority' // v0.7.0
import { UI_CONSTANTS } from '../../lib/constants'

// Type definitions for enhanced tooltip functionality
type TooltipPlacement = 'top' | 'right' | 'bottom' | 'left'
type TooltipAlign = 'start' | 'center' | 'end'

interface TooltipProps {
  children: React.ReactNode
  content: React.ReactNode
  side?: TooltipPlacement
  align?: TooltipAlign
  delayDuration?: number
  skipDelayDuration?: number
  className?: string
  ariaLabel?: string
  disableHoverableContent?: boolean
  forceMount?: boolean
}

interface TooltipRootProps extends TooltipPrimitive.TooltipProps {
  children: React.ReactNode
  defaultOpen?: boolean
  delayDuration?: number
  disableHoverableContent?: boolean
  onOpenChange?: (open: boolean) => void
}

interface ViewportOptions {
  rtl?: boolean
  boundaryPadding?: number
}

// Utility function to calculate optimal tooltip position
const getTooltipPosition = (
  triggerRect: DOMRect,
  tooltipRect: DOMRect,
  options: ViewportOptions = { boundaryPadding: 8, rtl: false }
) => {
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight
  const scrollX = window.scrollX
  const scrollY = window.scrollY

  const { boundaryPadding = 8, rtl = false } = options

  // Calculate available space in all directions
  const spaceAbove = triggerRect.top - scrollY
  const spaceBelow = viewportHeight - (triggerRect.bottom - scrollY)
  const spaceLeft = triggerRect.left - scrollX
  const spaceRight = viewportWidth - (triggerRect.right - scrollX)

  // Default position (top center)
  let placement: TooltipPlacement = 'top'
  let x = triggerRect.left + (triggerRect.width - tooltipRect.width) / 2
  let y = triggerRect.top - tooltipRect.height - 8
  let arrowOffset = 0

  // Determine optimal placement
  if (spaceAbove < tooltipRect.height && spaceBelow > tooltipRect.height) {
    placement = 'bottom'
    y = triggerRect.bottom + 8
  } else if (spaceLeft > tooltipRect.width && spaceRight < tooltipRect.width) {
    placement = 'left'
    x = triggerRect.left - tooltipRect.width - 8
    y = triggerRect.top + (triggerRect.height - tooltipRect.height) / 2
  } else if (spaceRight > tooltipRect.width && spaceLeft < tooltipRect.width) {
    placement = 'right'
    x = triggerRect.right + 8
    y = triggerRect.top + (triggerRect.height - tooltipRect.height) / 2
  }

  // Boundary detection and adjustment
  if (x < boundaryPadding) {
    x = boundaryPadding
    arrowOffset = triggerRect.left + triggerRect.width / 2 - x - 13
  } else if (x + tooltipRect.width > viewportWidth - boundaryPadding) {
    x = viewportWidth - tooltipRect.width - boundaryPadding
    arrowOffset = triggerRect.left + triggerRect.width / 2 - x - 13
  }

  // RTL support
  if (rtl) {
    x = viewportWidth - x - tooltipRect.width
    arrowOffset = -arrowOffset
  }

  return { x, y, placement, arrowOffset }
}

// Provider component for tooltip context
const TooltipProvider = TooltipPrimitive.Provider

// Root component with enhanced accessibility
const TooltipRoot = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Root>,
  TooltipRootProps
>(({ children, ...props }, ref) => (
  <TooltipPrimitive.Root
    ref={ref}
    delayDuration={props.delayDuration ?? UI_CONSTANTS.ANIMATION_DURATION}
    {...props}
  >
    {children}
  </TooltipPrimitive.Root>
))
TooltipRoot.displayName = 'TooltipRoot'

// Trigger component with accessibility enhancements
const TooltipTrigger = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TooltipPrimitive.Trigger
    ref={ref}
    className={cn(
      'inline-flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
      className
    )}
    {...props}
  />
))
TooltipTrigger.displayName = 'TooltipTrigger'

// Content component with theme support and animations
const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <TooltipPrimitive.Content
    ref={ref}
    sideOffset={sideOffset}
    className={cn(
      'z-50 overflow-hidden rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2',
      'dark:bg-primary-dark dark:text-primary-dark-foreground',
      className
    )}
    {...props}
  />
))
TooltipContent.displayName = 'TooltipContent'

// Main Tooltip component with compound components pattern
const Tooltip = React.forwardRef<HTMLDivElement, TooltipProps>(
  (
    {
      children,
      content,
      side = 'top',
      align = 'center',
      delayDuration,
      skipDelayDuration,
      className,
      ariaLabel,
      disableHoverableContent = false,
      forceMount = false,
      ...props
    },
    ref
  ) => {
    return (
      <TooltipProvider>
        <TooltipRoot
          delayDuration={delayDuration}
          disableHoverableContent={disableHoverableContent}
        >
          <TooltipTrigger asChild>{children}</TooltipTrigger>
          <TooltipContent
            ref={ref}
            side={side}
            align={align}
            className={className}
            aria-label={ariaLabel}
            forceMount={forceMount}
            {...props}
          >
            {content}
            <TooltipPrimitive.Arrow className="fill-primary dark:fill-primary-dark" />
          </TooltipContent>
        </TooltipRoot>
      </TooltipProvider>
    )
  }
)
Tooltip.displayName = 'Tooltip'

// Export compound components
export {
  Tooltip,
  TooltipRoot,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
  type TooltipProps,
  type TooltipRootProps,
}