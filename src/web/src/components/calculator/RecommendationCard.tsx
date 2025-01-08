"use client"

import * as React from "react"
import { useTheme } from "next-themes"
import { ArrowRight } from "lucide-react"
import { clsx } from "clsx"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter
} from "../ui/Card"
import { Button, buttonVariants } from "../ui/Button"
import { Tooltip } from "../ui/Tooltip"
import { CalculationResult } from "../../types/calculation.types"

// Format currency with proper localization
const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value)
}

interface RecommendationCardProps {
  result: CalculationResult
  onImplement: () => Promise<void>
  onExplain: () => Promise<void>
  className?: string
}

const RecommendationCard: React.FC<RecommendationCardProps> = ({
  result,
  onImplement,
  onExplain,
  className
}) => {
  const { theme } = useTheme()
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  // Derived values for recommendations
  const rothConversionAmount = result.rothConversion.amount
  const capitalGainsAmount = result.capitalGainsHarvesting.amount
  const totalSavings = result.rothConversion.taxSavings + result.capitalGainsHarvesting.taxSavings

  // Handle implementation with loading state and error handling
  const handleImplement = async () => {
    try {
      setIsLoading(true)
      setError(null)
      await onImplement()
    } catch (err) {
      setError("Failed to implement recommendation. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  // Handle explanation with loading state and error handling
  const handleExplain = async () => {
    try {
      setIsLoading(true)
      setError(null)
      await onExplain()
    } catch (err) {
      setError("Failed to load explanation. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card
      className={clsx(
        "transition-all duration-200",
        "hover:shadow-lg",
        "focus-within:ring-2 focus-within:ring-primary/50",
        theme === "dark" ? "border-gray-800" : "border-gray-200",
        className
      )}
    >
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Optimization Recommendations</span>
          <Tooltip content="Based on your current tax situation and risk tolerance">
            <span className="text-sm text-muted-foreground cursor-help">
              {result.rothConversion.confidenceScore}% Confidence
            </span>
          </Tooltip>
        </CardTitle>
        <CardDescription>
          Potential tax savings: {formatCurrency(totalSavings)}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Roth Conversion Recommendation */}
        <div className="space-y-2">
          <h4 className="font-medium">Roth Conversion</h4>
          <p className="text-sm text-muted-foreground">
            Convert {formatCurrency(rothConversionAmount)} from Traditional to Roth IRA
          </p>
          <div className="flex items-center text-sm">
            <span className="text-green-600 dark:text-green-400">
              Save {formatCurrency(result.rothConversion.taxSavings)}
            </span>
            <Tooltip content="Net Present Value of tax savings">
              <span className="ml-2 text-muted-foreground cursor-help">
                (NPV: {formatCurrency(result.rothConversion.npv)})
              </span>
            </Tooltip>
          </div>
        </div>

        {/* Capital Gains Recommendation */}
        <div className="space-y-2">
          <h4 className="font-medium">Capital Gains Harvesting</h4>
          <p className="text-sm text-muted-foreground">
            Realize {formatCurrency(capitalGainsAmount)} in capital gains
          </p>
          <div className="flex items-center text-sm">
            <span className="text-green-600 dark:text-green-400">
              Save {formatCurrency(result.capitalGainsHarvesting.taxSavings)}
            </span>
            <Tooltip content="Net Present Value of tax savings">
              <span className="ml-2 text-muted-foreground cursor-help">
                (NPV: {formatCurrency(result.capitalGainsHarvesting.npv)})
              </span>
            </Tooltip>
          </div>
        </div>

        {error && (
          <div
            role="alert"
            className="text-sm text-red-600 dark:text-red-400"
            aria-live="polite"
          >
            {error}
          </div>
        )}
      </CardContent>

      <CardFooter className="flex justify-between space-x-4">
        <Button
          onClick={handleExplain}
          variant="outline"
          disabled={isLoading}
          className={clsx(
            buttonVariants({ variant: "outline" }),
            "flex-1"
          )}
          aria-label="Get detailed explanation of recommendations"
        >
          Explain Details
        </Button>
        <Button
          onClick={handleImplement}
          disabled={isLoading}
          className={clsx(
            buttonVariants({ variant: "default" }),
            "flex-1"
          )}
          aria-label="Implement these recommendations"
        >
          {isLoading ? (
            "Processing..."
          ) : (
            <>
              Implement
              <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  )
}

export default RecommendationCard