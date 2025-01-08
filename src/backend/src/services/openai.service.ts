import OpenAI from 'openai'; // ^4.0.0
import { openaiConfig, OPENAI_MODELS, OPENAI_SETTINGS } from '../config/openai';
import { ChatMessage, ChatContext, ChatRole, ChatMessageStatus, ChatResponse } from '../types/chat.types';
import { ApplicationError } from '../middleware/error.middleware';
import { APIErrorCode } from '../types/api.types';

/**
 * Interface for tax optimization explanation request context
 */
interface OptimizationContext {
  scenarioId: string;
  tradBalance: number;
  rothBalance: number;
  capitalGains: number;
  taxState: string;
  filingStatus: string;
}

/**
 * Interface for explanation response with metadata
 */
interface ExplanationResponse {
  explanation: string;
  metadata: {
    tokens: number;
    model: string;
    processingTime: number;
  };
}

/**
 * Service class for handling OpenAI interactions with robust error handling and retries
 */
export class OpenAIService {
  private client: OpenAI;
  private tokenUsage: Map<string, number>;
  private readonly maxRetries: number;
  private readonly backoffFactor: number;

  constructor() {
    this.client = new OpenAI({
      apiKey: openaiConfig.apiKey,
      organization: openaiConfig.organization,
      maxRetries: OPENAI_SETTINGS.maxRetries,
      timeout: OPENAI_SETTINGS.timeout,
    });

    this.tokenUsage = new Map();
    this.maxRetries = OPENAI_SETTINGS.maxRetries;
    this.backoffFactor = 1.5;
  }

  /**
   * Generates AI-powered explanation for tax optimization recommendations
   */
  public async generateTaxExplanation(
    context: OptimizationContext
  ): Promise<ExplanationResponse> {
    const prompt = this.buildTaxExplanationPrompt(context);
    const startTime = Date.now();

    try {
      const response = await this.retryOperation(async () => {
        return await this.client.chat.completions.create({
          model: OPENAI_MODELS.GPT4,
          messages: [
            {
              role: 'system',
              content: 'You are an expert tax advisor specializing in optimizing low-income years for long-term tax advantages. Provide clear, actionable advice with specific tax code references.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: OPENAI_SETTINGS.maxTokens,
          temperature: OPENAI_SETTINGS.temperature,
          presence_penalty: OPENAI_SETTINGS.presencePenalty,
          frequency_penalty: OPENAI_SETTINGS.frequencyPenalty
        });
      });

      const explanation = response.choices[0]?.message?.content;
      if (!explanation) {
        throw new ApplicationError(
          'Failed to generate explanation',
          APIErrorCode.INTERNAL_ERROR
        );
      }

      this.updateTokenUsage('explanation', response.usage?.total_tokens || 0);

      return {
        explanation,
        metadata: {
          tokens: response.usage?.total_tokens || 0,
          model: OPENAI_MODELS.GPT4,
          processingTime: Date.now() - startTime
        }
      };
    } catch (error) {
      throw this.handleOpenAIError(error);
    }
  }

  /**
   * Handles chat messages with context preservation and streaming
   */
  public async handleChatMessage(
    message: ChatMessage,
    context: ChatContext
  ): Promise<ChatResponse> {
    const startTime = Date.now();

    try {
      const response = await this.retryOperation(async () => {
        return await this.client.chat.completions.create({
          model: OPENAI_MODELS.GPT4,
          messages: this.buildChatMessages(message, context),
          max_tokens: OPENAI_SETTINGS.maxTokens,
          temperature: OPENAI_SETTINGS.temperature,
          presence_penalty: OPENAI_SETTINGS.presencePenalty,
          frequency_penalty: OPENAI_SETTINGS.frequencyPenalty
        });
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new ApplicationError(
          'Failed to generate chat response',
          APIErrorCode.INTERNAL_ERROR
        );
      }

      this.updateTokenUsage('chat', response.usage?.total_tokens || 0);

      return {
        success: true,
        data: {
          id: crypto.randomUUID(),
          content,
          role: ChatRole.ASSISTANT,
          created_at: new Date(),
          updated_at: new Date(),
          user_id: message.user_id,
          metadata: {
            tokens: response.usage?.total_tokens || 0,
            model: OPENAI_MODELS.GPT4,
            context_type: context.type,
            processing_started: new Date(startTime),
            processing_completed: new Date()
          },
          status: ChatMessageStatus.COMPLETED,
          thread_id: message.thread_id,
          version: 1
        },
        error: null,
        metadata: {
          timestamp: new Date(),
          requestId: crypto.randomUUID(),
          processingTime: Date.now() - startTime,
          version: '1.0.0'
        }
      };
    } catch (error) {
      throw this.handleOpenAIError(error);
    }
  }

  /**
   * Retrieves current token usage statistics
   */
  public getTokenUsage(): Map<string, number> {
    return new Map(this.tokenUsage);
  }

  /**
   * Implements retry logic with exponential backoff
   */
  private async retryOperation<T>(
    operation: () => Promise<T>,
    attempt: number = 1
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (attempt >= this.maxRetries || !this.isRetryableError(error)) {
        throw error;
      }

      const delay = Math.min(
        1000 * Math.pow(this.backoffFactor, attempt - 1),
        5000
      );
      await new Promise(resolve => setTimeout(resolve, delay));

      return this.retryOperation(operation, attempt + 1);
    }
  }

  /**
   * Builds prompt for tax optimization explanation
   */
  private buildTaxExplanationPrompt(context: OptimizationContext): string {
    return `Please provide a detailed tax optimization strategy for the following scenario:
      - Traditional IRA Balance: $${context.tradBalance.toLocaleString()}
      - Roth IRA Balance: $${context.rothBalance.toLocaleString()}
      - Capital Gains: $${context.capitalGains.toLocaleString()}
      - State: ${context.taxState}
      - Filing Status: ${context.filingStatus}

      Focus on:
      1. Optimal Roth conversion amount
      2. Strategic capital gains realization
      3. Tax bracket optimization
      4. State tax considerations
      5. Long-term wealth accumulation impact`;
  }

  /**
   * Builds chat messages array with context
   */
  private buildChatMessages(
    message: ChatMessage,
    context: ChatContext
  ): Array<{ role: string; content: string }> {
    return [
      {
        role: 'system',
        content: 'You are an expert tax advisor specializing in optimizing low-income years for long-term tax advantages.'
      },
      {
        role: 'user',
        content: `Context: ${context.type}\n${message.content}`
      }
    ];
  }

  /**
   * Updates token usage tracking
   */
  private updateTokenUsage(type: string, tokens: number): void {
    const current = this.tokenUsage.get(type) || 0;
    this.tokenUsage.set(type, current + tokens);
  }

  /**
   * Determines if an error is retryable
   */
  private isRetryableError(error: unknown): boolean {
    if (error instanceof Error) {
      return [
        'rate_limit_exceeded',
        'timeout',
        'service_unavailable'
      ].some(code => error.message.toLowerCase().includes(code));
    }
    return false;
  }

  /**
   * Handles OpenAI API errors with proper error mapping
   */
  private handleOpenAIError(error: unknown): never {
    if (error instanceof Error) {
      const message = error.message;
      if (message.includes('rate_limit_exceeded')) {
        throw new ApplicationError(
          'Rate limit exceeded. Please try again later.',
          APIErrorCode.RATE_LIMIT_EXCEEDED,
          429
        );
      }
      if (message.includes('invalid_api_key')) {
        throw new ApplicationError(
          'Authentication failed',
          APIErrorCode.UNAUTHORIZED,
          401
        );
      }
      throw new ApplicationError(
        `OpenAI API error: ${message}`,
        APIErrorCode.INTERNAL_ERROR,
        500
      );
    }
    throw new ApplicationError(
      'Unknown error occurred',
      APIErrorCode.INTERNAL_ERROR,
      500
    );
  }
}

export default OpenAIService;