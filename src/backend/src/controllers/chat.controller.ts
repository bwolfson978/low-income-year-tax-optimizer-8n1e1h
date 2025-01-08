import { Request, Response } from 'express'; // v4.18.2
import { RateLimiter } from 'express-rate-limit'; // v7.1.5
import compression from 'compression'; // v1.7.4
import { ChatService } from '../services/chat.service';
import { ChatMessage } from '../types/chat.types';
import { authenticateRequest } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import { ApplicationError } from '../middleware/error.middleware';
import { APIErrorCode } from '../types/api.types';
import winston from 'winston';
import { z } from 'zod';

/**
 * Validation schemas for chat operations
 */
const createThreadSchema = z.object({
  calculationId: z.string().uuid(),
});

const sendMessageSchema = z.object({
  content: z.string().min(1).max(4000),
  threadId: z.string().uuid(),
});

const getThreadSchema = z.object({
  threadId: z.string().uuid(),
  page: z.number().int().min(1).optional(),
  pageSize: z.number().int().min(1).max(100).optional(),
});

/**
 * Controller class for handling secure chat-related HTTP requests
 * @version 1.0.0
 */
export class ChatController {
  private readonly logger: winston.Logger;
  private readonly rateLimiter: RateLimiter;

  constructor(private readonly chatService: ChatService) {
    // Initialize logger
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.json(),
      defaultMeta: { service: 'chat-controller' },
      transports: [
        new winston.transports.File({ filename: 'error.log', level: 'error' }),
        new winston.transports.File({ filename: 'combined.log' })
      ]
    });

    // Configure rate limiter
    this.rateLimiter = new RateLimiter({
      windowMs: 60 * 1000, // 1 minute
      max: 50, // 50 requests per minute
      message: { 
        error: 'Too many requests', 
        code: APIErrorCode.RATE_LIMIT_EXCEEDED 
      }
    });
  }

  /**
   * Creates a new chat thread with security validation
   */
  @authenticateRequest
  @validateRequest(createThreadSchema)
  public async createThread(req: Request, res: Response): Promise<void> {
    try {
      const { calculationId } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        throw new ApplicationError(
          'User not authenticated',
          APIErrorCode.UNAUTHORIZED,
          401
        );
      }

      const thread = await this.chatService.createChatThread(
        userId,
        calculationId
      );

      this.logger.info('Chat thread created', {
        threadId: thread.id,
        userId,
        calculationId
      });

      res.status(201)
        .json({
          success: true,
          data: thread,
          error: null,
          metadata: {
            timestamp: new Date(),
            requestId: req.headers['x-request-id'],
            processingTime: Date.now() - (req as any).startTime,
            version: '1.0.0'
          }
        });
    } catch (error) {
      this.logger.error('Error creating chat thread', { error });
      next(error);
    }
  }

  /**
   * Processes user messages with content validation
   */
  @authenticateRequest
  @validateRequest(sendMessageSchema)
  public async sendMessage(req: Request, res: Response): Promise<void> {
    try {
      const { content, threadId } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        throw new ApplicationError(
          'User not authenticated',
          APIErrorCode.UNAUTHORIZED,
          401
        );
      }

      // Update typing indicator
      await this.chatService.updateTypingStatus(threadId, true);

      // Process message with timeout handling
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), 30000);
      });

      const messagePromise = this.chatService.sendMessage(
        threadId,
        content,
        userId
      );

      const message = await Promise.race([messagePromise, timeoutPromise]) as ChatMessage;

      // Clear typing indicator
      await this.chatService.updateTypingStatus(threadId, false);

      this.logger.info('Message processed', {
        threadId,
        messageId: message.id,
        userId
      });

      res.status(200)
        .json({
          success: true,
          data: message,
          error: null,
          metadata: {
            timestamp: new Date(),
            requestId: req.headers['x-request-id'],
            processingTime: Date.now() - (req as any).startTime,
            version: '1.0.0'
          }
        });
    } catch (error) {
      this.logger.error('Error processing message', { error });
      next(error);
    }
  }

  /**
   * Retrieves chat thread with pagination and caching
   */
  @authenticateRequest
  @validateRequest(getThreadSchema)
  public async getThread(req: Request, res: Response): Promise<void> {
    try {
      const { threadId } = req.params;
      const { page = 1, pageSize = 50 } = req.query;
      const userId = req.user?.id;

      if (!userId) {
        throw new ApplicationError(
          'User not authenticated',
          APIErrorCode.UNAUTHORIZED,
          401
        );
      }

      const thread = await this.chatService.getChatThread(
        threadId,
        userId
      );

      // Enable response compression
      compression()(req, res, () => {});

      this.logger.info('Thread retrieved', {
        threadId,
        userId
      });

      res.status(200)
        .json({
          success: true,
          data: thread,
          error: null,
          metadata: {
            timestamp: new Date(),
            requestId: req.headers['x-request-id'],
            processingTime: Date.now() - (req as any).startTime,
            version: '1.0.0'
          }
        });
    } catch (error) {
      this.logger.error('Error retrieving thread', { error });
      next(error);
    }
  }
}

export default ChatController;