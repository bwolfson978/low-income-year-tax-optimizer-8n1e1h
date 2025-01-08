"use client"

import React from "react" // ^18.0.0
import { Card, CardHeader, CardTitle, CardContent } from "../ui/Card"
import { TaxImpact } from "../../types/calculation.types"
import { formatTaxableCurrency } from "../../utils/currency-helpers"

/**
 * Props interface for the TaxBreakdown component with comprehensive type safety
 */
interface TaxBreakdownProps {
  /** Tax impact data containing federal, state, and effective rate information */
  taxImpact: TaxImpact
  /** Optional className for custom styling */
  className?: string
  /** Optional ARIA label for enhanced accessibility */
  ariaLabel?: string
  /** Optional test ID for automated testing */
  testId?: string
}

/**
 * TaxBreakdown component displays a detailed breakdown of tax calculations
 * with enhanced accessibility and theme support
 */
const TaxBreakdown: React.FC<TaxBreakdownProps> = ({
  taxImpact,
  className = "",
  ariaLabel = "Tax calculation breakdown",
  testId = "tax-breakdown"
}) => {
  // Error boundary for invalid tax values
  if (!taxImpact || typeof taxImpact.federalTax !== "number" || typeof taxImpact.stateTax !== "number") {
    return (
      <Card className="bg-destructive/10 p-4" data-testid={`${testId}-error`}>
        <CardContent>
          <p className="text-destructive" role="alert">
            Invalid tax calculation data
          </p>
        </CardContent>
      </Card>
    )
  }

  // Format tax amounts with IRS-compliant formatting
  const formattedFederalTax = formatTaxableCurrency(taxImpact.federalTax, false, {
    useParentheses: true
  })

  const formattedStateTax = formatTaxableCurrency(taxImpact.stateTax, false, {
    useParentheses: true
  })

  // Format effective rate as percentage with proper precision
  const formattedEffectiveRate = `${(taxImpact.effectiveRate * 100).toFixed(2)}%`

  // Calculate total tax for display
  const totalTax = taxImpact.federalTax + taxImpact.stateTax
  const formattedTotalTax = formatTaxableCurrency(totalTax, false, {
    useParentheses: true
  })

  return (
    <Card 
      className={`w-full transition-shadow hover:shadow-md ${className}`}
      aria-label={ariaLabel}
      data-testid={testId}
    >
      <CardHeader className="space-y-1.5">
        <CardTitle className="text-xl font-semibold">
          Tax Breakdown
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Federal Tax Display */}
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">Federal Tax:</span>
          <span 
            className="font-medium tabular-nums"
            aria-label={`Federal tax amount ${taxImpact.federalTax}`}
          >
            {formattedFederalTax}
          </span>
        </div>

        {/* State Tax Display */}
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">State Tax:</span>
          <span 
            className="font-medium tabular-nums"
            aria-label={`State tax amount ${taxImpact.stateTax}`}
          >
            {formattedStateTax}
          </span>
        </div>

        {/* Separator Line */}
        <div className="border-t border-border my-2" role="separator" />

        {/* Total Tax Display */}
        <div className="flex justify-between items-center">
          <span className="font-semibold">Total Tax:</span>
          <span 
            className="font-semibold tabular-nums"
            aria-label={`Total tax amount ${totalTax}`}
          >
            {formattedTotalTax}
          </span>
        </div>

        {/* Effective Tax Rate Display */}
        <div className="flex justify-between items-center bg-muted/50 p-2 rounded-md">
          <span className="text-muted-foreground">Effective Tax Rate:</span>
          <span 
            className="font-medium tabular-nums"
            aria-label={`Effective tax rate ${formattedEffectiveRate}`}
          >
            {formattedEffectiveRate}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}

export default TaxBreakdown