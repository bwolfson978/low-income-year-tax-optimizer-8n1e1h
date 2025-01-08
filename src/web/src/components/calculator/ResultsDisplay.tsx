"use client"

import React, { memo, useState, useCallback } from 'react';
import { cn } from 'class-variance-authority'; // v0.7.0
import OptimizationChart from './OptimizationChart';
import RecommendationCard from './RecommendationCard';
import ExplanationCard from '../chat/ExplanationCard';
import { CalculationResult } from '../../types/calculation.types';
import { ChatMessage, ChatRole } from '../../types/chat.types';

interface ResultsDisplayProps {
  calculationResult: CalculationResult;
  onImplement: () => Promise<void>;
  onSaveScenario: () => Promise<void>;
  className?: string;
}

const ResultsDisplay = memo<ResultsDisplayProps>(({
  calculationResult,
  onImplement,
  onSaveScenario,
  className
}) => {
  // State for managing expanded explanations
  const [expandedExplanations, setExpandedExplanations] = useState<boolean[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Generate AI explanations for the optimization results
  const explanations: ChatMessage[] = [
    {
      id: 'roth-explanation',
      content: `Based on your current tax situation, we recommend converting ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(calculationResult.rothConversion.amount)} from your Traditional IRA to Roth IRA. This optimization could save you ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(calculationResult.rothConversion.taxSavings)} in taxes.`,
      role: ChatRole.ASSISTANT,
      created_at: new Date(),
      user_id: 'system',
      metadata: {
        confidence: calculationResult.rothConversion.confidenceScore,
        npv: calculationResult.rothConversion.npv
      },
      status: 'sent'
    },
    {
      id: 'gains-explanation',
      content: `We also recommend realizing ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(calculationResult.capitalGainsHarvesting.amount)} in capital gains. This strategic harvesting could result in ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(calculationResult.capitalGainsHarvesting.taxSavings)} of tax savings.`,
      role: ChatRole.ASSISTANT,
      created_at: new Date(),
      user_id: 'system',
      metadata: {
        confidence: calculationResult.capitalGainsHarvesting.confidenceScore,
        npv: calculationResult.capitalGainsHarvesting.npv
      },
      status: 'sent'
    }
  ];

  // Handle implementation with loading state
  const handleImplement = async () => {
    try {
      setIsLoading(true);
      setError(null);
      await onImplement();
    } catch (err) {
      setError('Failed to implement recommendations. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle saving scenario with loading state
  const handleSaveScenario = async () => {
    try {
      setIsLoading(true);
      setError(null);
      await onSaveScenario();
    } catch (err) {
      setError('Failed to save scenario. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Toggle explanation expansion
  const handleExplanationToggle = useCallback((index: number) => {
    setExpandedExplanations(prev => {
      const newState = [...prev];
      newState[index] = !newState[index];
      return newState;
    });
  }, []);

  return (
    <div 
      className={cn(
        "space-y-8 animate-in fade-in-50",
        className
      )}
      role="region"
      aria-label="Tax Optimization Results"
    >
      {/* Charts Section */}
      <section 
        className="space-y-6"
        aria-label="Optimization Charts"
      >
        <OptimizationChart
          calculationResult={calculationResult}
          chartType="optimization"
          height={400}
        />
        <OptimizationChart
          calculationResult={calculationResult}
          chartType="taxImpact"
          height={400}
        />
      </section>

      {/* Recommendations Section */}
      <section 
        className="space-y-4"
        aria-label="Optimization Recommendations"
      >
        <RecommendationCard
          result={calculationResult}
          onImplement={handleImplement}
          onExplain={() => handleExplanationToggle(0)}
          className="w-full"
        />
      </section>

      {/* AI Explanations Section */}
      <section 
        className="space-y-4"
        aria-label="AI-Powered Explanations"
      >
        {explanations.map((explanation, index) => (
          <ExplanationCard
            key={explanation.id}
            explanation={explanation}
            className={cn(
              "transition-all duration-200",
              expandedExplanations[index] ? "ring-2 ring-primary/50" : ""
            )}
          />
        ))}
      </section>

      {/* Action Buttons */}
      <div className="flex justify-end space-x-4">
        {error && (
          <p 
            role="alert" 
            className="text-sm text-destructive"
          >
            {error}
          </p>
        )}
        <button
          onClick={handleSaveScenario}
          disabled={isLoading}
          className={cn(
            "px-4 py-2 text-sm font-medium rounded-md",
            "bg-secondary text-secondary-foreground",
            "hover:bg-secondary/90",
            "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary",
            "disabled:opacity-50 disabled:cursor-not-allowed"
          )}
          aria-label="Save current scenario"
        >
          Save Scenario
        </button>
      </div>
    </div>
  );
});

ResultsDisplay.displayName = 'ResultsDisplay';

export default ResultsDisplay;