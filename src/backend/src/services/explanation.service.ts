import { OpenAI } from 'openai'; // ^4.0.0
import { APIResponse } from '../types/api.types';
import { openaiConfig, OPENAI_MODELS, OPENAI_SETTINGS } from '../config/openai';
import { ExplanationModel, ExplanationWithHistory } from '../models/explanation.model';
import { CalculationResult } from '../types/calculation.types';
import { ChatMessage, ChatRole, ChatContextType } from '../types/chat.types';
import CircuitBreaker from 'opossum'; // ^6.0.0
import { Redis } from 'ioredis'; // ^5.0.0

// Constants for configuration
const EXPLANATION_CACHE_TTL = 3600; // 1 hour cache TTL
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second
const CIRCUIT_BREAKER_THRESHOLD = 5;
const CIRCUIT_BREAKER_RESET_TIMEOUT = 30000; // 30 seconds
const RATE_LIMIT_REQUESTS = 100;
const RATE_LIMIT_WINDOW = 60000; // 1 minute

/**
 * Service class for generating and managing AI-powered tax optimization explanations
 * Implements comprehensive error handling, caching, and performance optimization
 * @version 1.0.0
 */
export class ExplanationService {
  private openaiClient: OpenAI;
  private explanationModel: ExplanationModel;
  private cache: Redis;
  private circuitBreaker: CircuitBreaker;

  constructor(
    explanationModel: ExplanationModel,
    cache: Redis
  ) {
    // Initialize OpenAI client with configuration
    this.openaiClient = new OpenAI(openaiConfig);
    this.explanationModel = explanationModel;
    this.cache = cache;

    // Configure circuit breaker for API resilience
    this.circuitBreaker = new CircuitBreaker(this.generateAIExplanation.bind(this), {
      timeout: OPENAI_SETTINGS.timeout,
      resetTimeout: CIRCUIT_BREAKER_RESET_TIMEOUT,
      errorThresholdPercentage: 50,
      volumeThreshold: CIRCUIT_BREAKER_THRESHOLD
    });

    this.setupCircuitBreakerEvents();
  }

  /**
   * Generates an AI-powered explanation for tax optimization results
   * @param calculationId - Unique identifier for the calculation
   * @param result - Calculation results to explain
   * @returns Promise resolving to explanation response
   */
  async generateExplanation(
    calculationId: string,
    result: CalculationResult
  ): Promise<APIResponse<ExplanationWithHistory>> {
    try {
      // Check cache first
      const cachedExplanation = await this.getCachedExplanation(calculationId);
      if (cachedExplanation) {
        return {
          success: true,
          data: cachedExplanation,
          error: null,
          metadata: { cached: true }
        };
      }

      // Generate explanation using circuit breaker pattern
      const explanation = await this.circuitBreaker.fire(calculationId, result);

      // Store in cache
      await this.cacheExplanation(calculationId, explanation);

      return {
        success: true,
        data: explanation,
        error: null,
        metadata: { cached: false }
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Retrieves an existing explanation by ID with caching
   * @param explanationId - Unique identifier for the explanation
   */
  async getExplanation(explanationId: string): Promise<APIResponse<ExplanationWithHistory>> {
    try {
      const cachedExplanation = await this.getCachedExplanation(explanationId);
      if (cachedExplanation) {
        return {
          success: true,
          data: cachedExplanation,
          error: null,
          metadata: { cached: true }
        };
      }

      const explanation = await this.explanationModel.getExplanationWithHistory(explanationId);
      if (!explanation) {
        return {
          success: false,
          data: null,
          error: { code: 'NOT_FOUND', message: 'Explanation not found' },
          metadata: null
        };
      }

      await this.cacheExplanation(explanationId, explanation);
      return {
        success: true,
        data: explanation,
        error: null,
        metadata: { cached: false }
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Generates an AI explanation using OpenAI with retries and validation
   * @private
   */
  private async generateAIExplanation(
    calculationId: string,
    result: CalculationResult
  ): Promise<ExplanationWithHistory> {
    const prompt = this.buildExplanationPrompt(result);
    let attempts = 0;
    let lastError: Error | null = null;

    while (attempts < MAX_RETRIES) {
      try {
        const completion = await this.openaiClient.chat.completions.create({
          model: OPENAI_MODELS.GPT4,
          messages: [
            {
              role: 'system',
              content: 'You are a tax optimization expert providing clear explanations.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          ...OPENAI_SETTINGS
        });

        const explanation = completion.choices[0]?.message?.content;
        if (!explanation) {
          throw new Error('No explanation generated');
        }

        // Create explanation record with context
        return await this.explanationModel.createExplanation(
          calculationId,
          explanation,
          {
            calculationResult: result,
            confidenceScore: this.calculateConfidenceScore(completion),
            modelVersion: OPENAI_MODELS.GPT4,
            timestamp: new Date()
          },
          'system'
        );
      } catch (error) {
        lastError = error as Error;
        attempts++;
        if (attempts < MAX_RETRIES) {
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * attempts));
        }
      }
    }

    throw lastError || new Error('Failed to generate explanation after retries');
  }

  /**
   * Builds a detailed prompt for the AI model based on calculation results
   * @private
   */
  private buildExplanationPrompt(result: CalculationResult): string {
    return `Please explain the following tax optimization recommendations:

1. Roth Conversion:
Amount: $${result.rothConversion.recommendedAmount}
Tax Savings: $${result.rothConversion.taxSavings}

2. Capital Gains Harvesting:
Amount: $${result.capitalGainsHarvesting.recommendedAmount}
Tax Savings: $${result.capitalGainsHarvesting.taxSavings}

Please provide a clear, detailed explanation of:
- Why these specific amounts were recommended
- The tax implications and benefits
- Any important considerations or caveats
- The long-term impact on wealth accumulation

Use simple language and break down complex concepts.`;
  }

  /**
   * Calculates confidence score based on AI model response
   * @private
   */
  private calculateConfidenceScore(completion: any): number {
    const baseScore = 0.85; // Base confidence for GPT-4
    const tokenRatio = completion.usage.completion_tokens / completion.usage.total_tokens;
    return Math.min(baseScore * (1 + tokenRatio), 0.99);
  }

  /**
   * Handles caching of explanations
   * @private
   */
  private async cacheExplanation(
    key: string,
    explanation: ExplanationWithHistory
  ): Promise<void> {
    try {
      await this.cache.setex(
        `explanation:${key}`,
        EXPLANATION_CACHE_TTL,
        JSON.stringify(explanation)
      );
    } catch (error) {
      console.error('Cache error:', error);
      // Non-blocking cache errors
    }
  }

  /**
   * Retrieves cached explanation
   * @private
   */
  private async getCachedExplanation(
    key: string
  ): Promise<ExplanationWithHistory | null> {
    try {
      const cached = await this.cache.get(`explanation:${key}`);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      console.error('Cache retrieval error:', error);
      return null;
    }
  }

  /**
   * Sets up circuit breaker event handlers
   * @private
   */
  private setupCircuitBreakerEvents(): void {
    this.circuitBreaker.on('open', () => {
      console.error('Circuit breaker opened - API errors detected');
    });

    this.circuitBreaker.on('halfOpen', () => {
      console.log('Circuit breaker half-open - attempting reset');
    });

    this.circuitBreaker.on('close', () => {
      console.log('Circuit breaker closed - API healthy');
    });
  }

  /**
   * Standardized error handling
   * @private
   */
  private handleError(error: any): APIResponse<ExplanationWithHistory> {
    console.error('Explanation service error:', error);

    return {
      success: false,
      data: null,
      error: {
        code: error.code || 'INTERNAL_ERROR',
        message: error.message || 'An unexpected error occurred',
        details: error.details || null
      },
      metadata: null
    };
  }
}