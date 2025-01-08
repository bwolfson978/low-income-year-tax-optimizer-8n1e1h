"use client"

import * as React from "react" // ^18.0.0
import { forwardRef } from "react" // ^18.0.0
import { clsx } from "clsx" // ^2.0.0

// Types for props
type CardBaseProps = React.HTMLAttributes<HTMLDivElement> & {
  elevation?: "low" | "medium" | "high"
  theme?: "light" | "dark" | "system"
}

type CardHeaderProps = React.HTMLAttributes<HTMLDivElement> & {
  spacing?: "compact" | "normal" | "relaxed"
}

type CardTitleProps = React.HTMLAttributes<HTMLHeadingElement> & {
  as?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6"
}

type CardDescriptionProps = React.HTMLAttributes<HTMLParagraphElement> & {
  color?: "default" | "muted" | "accent"
}

type CardContentProps = React.HTMLAttributes<HTMLDivElement> & {
  padding?: "none" | "normal" | "large"
}

type CardFooterProps = React.HTMLAttributes<HTMLDivElement> & {
  align?: "start" | "center" | "end" | "between"
}

// Card component
const Card = forwardRef<HTMLDivElement, CardBaseProps>(
  ({ className, elevation = "low", theme = "system", ...props }, ref) => {
    const elevationClasses = {
      low: "shadow-sm",
      medium: "shadow-md",
      high: "shadow-lg"
    }

    const themeClasses = {
      light: "border-gray-200 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.08)]",
      dark: "border-gray-800 bg-gray-950 shadow-[0_2px_8px_rgba(0,0,0,0.25)]",
      system: "border-gray-200 bg-card dark:border-gray-800 dark:bg-gray-950"
    }

    return (
      <div
        ref={ref}
        className={clsx(
          "rounded-lg border bg-card text-card-foreground transition-colors duration-200",
          elevationClasses[elevation],
          themeClasses[theme],
          "hover:shadow-md transition-shadow duration-200",
          "focus-within:ring-2 focus-within:ring-primary/50",
          className
        )}
        {...props}
      />
    )
  }
)
Card.displayName = "Card"

// CardHeader component
const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className, spacing = "normal", ...props }, ref) => {
    const spacingClasses = {
      compact: "p-4 space-y-1",
      normal: "p-6 space-y-1.5",
      relaxed: "p-8 space-y-2"
    }

    return (
      <div
        ref={ref}
        className={clsx("flex flex-col", spacingClasses[spacing], className)}
        {...props}
      />
    )
  }
)
CardHeader.displayName = "CardHeader"

// CardTitle component
const CardTitle = forwardRef<HTMLHeadingElement, CardTitleProps>(
  ({ className, as: Comp = "h3", ...props }, ref) => {
    return React.createElement(
      Comp,
      {
        ref,
        className: clsx(
          "text-2xl font-semibold leading-none tracking-tight",
          "sm:text-xl md:text-2xl lg:text-3xl",
          className
        ),
        ...props
      }
    )
  }
)
CardTitle.displayName = "CardTitle"

// CardDescription component
const CardDescription = forwardRef<HTMLParagraphElement, CardDescriptionProps>(
  ({ className, color = "default", ...props }, ref) => {
    const colorClasses = {
      default: "text-muted-foreground",
      muted: "text-muted-foreground/80",
      accent: "text-primary/90"
    }

    return (
      <p
        ref={ref}
        className={clsx("text-sm", colorClasses[color], className)}
        {...props}
      />
    )
  }
)
CardDescription.displayName = "CardDescription"

// CardContent component
const CardContent = forwardRef<HTMLDivElement, CardContentProps>(
  ({ className, padding = "normal", ...props }, ref) => {
    const paddingClasses = {
      none: "p-0",
      normal: "p-6 pt-0 sm:p-4 sm:pt-0 md:p-6 md:pt-0 lg:p-8 lg:pt-0",
      large: "p-8 pt-0"
    }

    return (
      <div
        ref={ref}
        className={clsx(paddingClasses[padding], className)}
        {...props}
      />
    )
  }
)
CardContent.displayName = "CardContent"

// CardFooter component
const CardFooter = forwardRef<HTMLDivElement, CardFooterProps>(
  ({ className, align = "start", ...props }, ref) => {
    const alignmentClasses = {
      start: "justify-start",
      center: "justify-center",
      end: "justify-end",
      between: "justify-between"
    }

    return (
      <div
        ref={ref}
        className={clsx(
          "flex items-center p-6 pt-0",
          alignmentClasses[align],
          className
        )}
        {...props}
      />
    )
  }
)
CardFooter.displayName = "CardFooter"

export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  type CardBaseProps,
  type CardHeaderProps,
  type CardTitleProps,
  type CardDescriptionProps,
  type CardContentProps,
  type CardFooterProps
}