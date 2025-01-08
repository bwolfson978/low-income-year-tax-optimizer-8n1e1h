import { Request, Response, NextFunction } from 'express'; // ^4.18.2
import { rateLimit } from 'express-rate-limit'; // ^6.7.0
import validator from 'validator'; // ^13.9.0
import { ExplanationService } from '../services/explanation.service';
import { CacheService } from '../services/cache.service';
import { APIResponse } from '../types/api.types';
import { ChatMessage, ChatContextType } from '../types/chat.types';
import { SYSTEM_CONFIG } from '../config/constants';

/**
 * Enhanced controller class for handling explanation-related HTTP requests
 * Implements comprehensive validation, caching, and rate limiting
 * @version 1.0.0
 */
export class ExplanationController {
  private explanationService: ExplanationService;
  private cacheService: CacheService;
  private rateLimiter: any;

  constructor(explanationService: ExplanationService, cacheService: CacheService) {
    this.explanationService = explanationService;
    this.cacheService = cacheService;

    // Configure rate limiting middleware
    this.rateLimiter = rateLimit({
      windowMs: 60 * 60 * 1000, // 1 hour window
      max: 100, // 100 requests per window
      message: 'Too many explanation requests, please try again later',
      standardHeaders: true,
      legacyHeaders: false
    });
  }

  /**
   * Generates AI-powered explanation for tax optimization results
   * Implements rate limiting and enhanced validation
   */
  public generateExplanation = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      // Apply rate limiting
      await new Promise((resolve) => this.rateLimiter(req, res, resolve));

      // Validate required parameters
      const { calculationId, result } = req.body;
      if (!calculationId || !result) {
        res.status(400).json({
          success: false,
          data: null,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Missing required parameters',
            details: null,
            stack: null
          },
          metadata: null
        });
        return;
      }

      // Validate calculation ID format
      if (!validator.isUUID(calculationId)) {
        res.status(400).json({
          success: false,
          data: null,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid calculation ID format',
            details: null,
            stack: null
          },
          metadata: null
        });
        return;
      }

      // Check cache first
      const cachedExplanation = await this.cacheService.get(`explanation:${calculationId}`);
      if (cachedExplanation) {
        res.status(200).json({
          success: true,
          data: cachedExplanation,
          error: null,
          metadata: { cached: true, timestamp: new Date() }
        });
        return;
      }

      // Generate new explanation
      const explanation = await this.explanationService.generateExplanation(
        calculationId,
        result
      );

      // Cache the result
      if (explanation.success && explanation.data) {
        await this.cacheService.set(
          `explanation:${calculationId}`,
          explanation.data,
          { ttl: SYSTEM_CONFIG.CACHE_STRATEGIES.CALCULATIONS === 'cache-first' ? 3600 : 1800 }
        );
      }

      res.status(explanation.success ? 200 : 500).json({
        ...explanation,
        metadata: {
          cached: false,
          timestamp: new Date(),
          processingTime: Date.now() - req.startTime
        }
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Retrieves existing explanation by ID with caching
   */
  public getExplanation = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { id } = req.params;

      // Validate explanation ID
      if (!validator.isUUID(id)) {
        res.status(400).json({
          success: false,
          data: null,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid explanation ID format',
            details: null,
            stack: null
          },
          metadata: null
        });
        return;
      }

      // Check cache
      const cachedExplanation = await this.cacheService.get(`explanation:${id}`);
      if (cachedExplanation) {
        res.status(200).json({
          success: true,
          data: cachedExplanation,
          error: null,
          metadata: { cached: true, timestamp: new Date() }
        });
        return;
      }

      const explanation = await this.explanationService.getExplanation(id);

      // Cache successful responses
      if (explanation.success && explanation.data) {
        await this.cacheService.set(
          `explanation:${id}`,
          explanation.data,
          { ttl: 3600 }
        );
      }

      res.status(explanation.success ? 200 : explanation.error?.code === 'NOT_FOUND' ? 404 : 500)
        .json({
          ...explanation,
          metadata: {
            cached: false,
            timestamp: new Date(),
            processingTime: Date.now() - req.startTime
          }
        });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Retrieves all explanations for a calculation with pagination
   */
  public getCalculationExplanations = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { calculationId } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      // Validate parameters
      if (!validator.isUUID(calculationId)) {
        res.status(400).json({
          success: false,
          data: null,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid calculation ID format',
            details: null,
            stack: null
          },
          metadata: null
        });
        return;
      }

      if (page < 1 || limit < 1 || limit > 100) {
        res.status(400).json({
          success: false,
          data: null,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid pagination parameters',
            details: null,
            stack: null
          },
          metadata: null
        });
        return;
      }

      const cacheKey = `explanation:calc:${calculationId}:${page}:${limit}`;
      const cachedResults = await this.cacheService.get(cacheKey);
      if (cachedResults) {
        res.status(200).json({
          success: true,
          data: cachedResults,
          error: null,
          metadata: { cached: true, timestamp: new Date() }
        });
        return;
      }

      const explanations = await this.explanationService.getExplanationsByCalculation(
        calculationId,
        page,
        limit
      );

      if (explanations.success && explanations.data) {
        await this.cacheService.set(cacheKey, explanations.data, { ttl: 1800 });
      }

      res.status(explanations.success ? 200 : 500).json({
        ...explanations,
        metadata: {
          cached: false,
          timestamp: new Date(),
          processingTime: Date.now() - req.startTime,
          pagination: {
            page,
            limit,
            hasMore: explanations.data ? explanations.data.length === limit : false
          }
        }
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Handles follow-up questions about explanations with context awareness
   */
  public handleFollowUpQuestion = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { explanationId, question, context } = req.body;

      // Validate input
      if (!explanationId || !validator.isUUID(explanationId) || !question) {
        res.status(400).json({
          success: false,
          data: null,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input parameters',
            details: null,
            stack: null
          },
          metadata: null
        });
        return;
      }

      // Validate question length and content
      if (!validator.isLength(question, { min: 3, max: 500 })) {
        res.status(400).json({
          success: false,
          data: null,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Question must be between 3 and 500 characters',
            details: null,
            stack: null
          },
          metadata: null
        });
        return;
      }

      const response = await this.explanationService.handleFollowUpQuestion(
        explanationId,
        question,
        {
          type: ChatContextType.TAX_ADVICE,
          ...context
        }
      );

      res.status(response.success ? 200 : 500).json({
        ...response,
        metadata: {
          timestamp: new Date(),
          processingTime: Date.now() - req.startTime,
          questionContext: {
            explanationId,
            contextType: ChatContextType.TAX_ADVICE
          }
        }
      });
    } catch (error) {
      next(error);
    }
  };
}