import { ChatMessage, ChatThread, ChatRole, ChatContextType, ChatMessageStatus } from '../types/chat.types';
import { ChatModel } from '../models/chat.model';
import { OpenAIService } from './openai.service';
import winston from 'winston';
import { RateLimiterRedis } from 'rate-limiter-flexible';
import { ApplicationError } from '../middleware/error.middleware';
import { APIErrorCode } from '../types/api.types';

/**
 * Service class for managing chat functionality and AI interactions
 * @version 1.0.0
 */
export class ChatService {
  private readonly RATE_LIMIT_POINTS = 100;
  private readonly RATE_LIMIT_DURATION = 3600; // 1 hour
  private readonly MAX_MESSAGE_LENGTH = 4000;
  private readonly MAX_CONTEXT_SIZE = 10;

  constructor(
    private readonly chatModel: ChatModel,
    private readonly openAIService: OpenAIService,
    private readonly logger: winston.Logger,
    private readonly rateLimiter: RateLimiterRedis
  ) {
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.json(),
      defaultMeta: { service: 'chat-service' },
      transports: [
        new winston.transports.File({ filename: 'error.log', level: 'error' }),
        new winston.transports.File({ filename: 'combined.log' })
      ]
    });
  }

  /**
   * Creates a new chat thread with security validation and error handling
   */
  public async createChatThread(
    userId: string,
    calculationId: string
  ): Promise<ChatThread> {
    try {
      // Validate inputs
      if (!userId || !calculationId) {
        throw new ApplicationError(
          'Invalid request parameters',
          APIErrorCode.VALIDATION_ERROR,
          422
        );
      }

      // Check rate limit
      await this.checkRateLimit(userId);

      // Create initial system message context
      const systemMessage = {
        content: 'I am your tax optimization assistant. I can help explain tax strategies and calculations.',
        role: ChatRole.SYSTEM,
        metadata: {
          context_type: ChatContextType.CALCULATION,
          model: 'gpt-4'
        }
      };

      // Create thread with initial system message
      const thread = await this.chatModel.createThread(
        userId,
        calculationId,
        {
          initial_context: ChatContextType.CALCULATION,
          system_message: systemMessage
        }
      );

      this.logger.info('Chat thread created', {
        threadId: thread.id,
        userId,
        calculationId
      });

      return thread;
    } catch (error) {
      this.logger.error('Error creating chat thread', {
        error,
        userId,
        calculationId
      });
      throw this.handleError(error);
    }
  }

  /**
   * Processes user message and generates AI response with rate limiting
   */
  public async sendMessage(
    threadId: string,
    content: string,
    userId: string
  ): Promise<ChatMessage> {
    try {
      // Validate inputs
      if (!threadId || !content || !userId) {
        throw new ApplicationError(
          'Invalid message parameters',
          APIErrorCode.VALIDATION_ERROR,
          422
        );
      }

      // Validate message length
      if (content.length > this.MAX_MESSAGE_LENGTH) {
        throw new ApplicationError(
          'Message exceeds maximum length',
          APIErrorCode.VALIDATION_ERROR,
          422
        );
      }

      // Check rate limit
      await this.checkRateLimit(userId);

      // Get thread context
      const thread = await this.chatModel.getThread(threadId, userId);
      if (!thread) {
        throw new ApplicationError(
          'Thread not found',
          APIErrorCode.NOT_FOUND,
          404
        );
      }

      // Add user message to thread
      const userMessage = await this.chatModel.addMessage(
        threadId,
        content,
        ChatRole.USER,
        {
          context_type: ChatContextType.CALCULATION
        }
      );

      // Generate AI response
      const aiResponse = await this.openAIService.handleChatMessage(
        userMessage,
        {
          type: ChatContextType.CALCULATION,
          calculation_id: thread.calculation_id
        }
      );

      if (!aiResponse.success || !aiResponse.data) {
        throw new ApplicationError(
          'Failed to generate AI response',
          APIErrorCode.INTERNAL_ERROR,
          500
        );
      }

      // Add AI response to thread
      const assistantMessage = await this.chatModel.addMessage(
        threadId,
        aiResponse.data.content,
        ChatRole.ASSISTANT,
        aiResponse.data.metadata
      );

      this.logger.info('Message processed successfully', {
        threadId,
        userId,
        messageId: assistantMessage.id
      });

      return assistantMessage;
    } catch (error) {
      this.logger.error('Error processing message', {
        error,
        threadId,
        userId
      });
      throw this.handleError(error);
    }
  }

  /**
   * Retrieves chat thread with security checks and caching
   */
  public async getChatThread(
    threadId: string,
    userId: string
  ): Promise<ChatThread> {
    try {
      // Validate inputs
      if (!threadId || !userId) {
        throw new ApplicationError(
          'Invalid request parameters',
          APIErrorCode.VALIDATION_ERROR,
          422
        );
      }

      // Retrieve thread with access check
      const thread = await this.chatModel.getThread(threadId, userId);
      if (!thread) {
        throw new ApplicationError(
          'Thread not found',
          APIErrorCode.NOT_FOUND,
          404
        );
      }

      return thread;
    } catch (error) {
      this.logger.error('Error retrieving chat thread', {
        error,
        threadId,
        userId
      });
      throw this.handleError(error);
    }
  }

  /**
   * Checks rate limit for user actions
   */
  private async checkRateLimit(userId: string): Promise<void> {
    try {
      await this.rateLimiter.consume(userId, 1);
    } catch (error) {
      throw new ApplicationError(
        'Rate limit exceeded',
        APIErrorCode.RATE_LIMIT_EXCEEDED,
        429
      );
    }
  }

  /**
   * Standardized error handling
   */
  private handleError(error: unknown): Error {
    if (error instanceof ApplicationError) {
      return error;
    }
    if (error instanceof Error) {
      return new ApplicationError(
        error.message,
        APIErrorCode.INTERNAL_ERROR,
        500
      );
    }
    return new ApplicationError(
      'An unexpected error occurred',
      APIErrorCode.INTERNAL_ERROR,
      500
    );
  }
}