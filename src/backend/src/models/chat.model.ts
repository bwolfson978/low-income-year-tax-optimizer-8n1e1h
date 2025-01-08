import { PrismaClient } from '@prisma/client';
import { ChatMessage, ChatRole, ChatThread, ChatThreadStatus, ChatMessageStatus, ChatContextType } from '../types/chat.types';
import { APIErrorCode } from '../types/api.types';
import NodeCache from 'node-cache';
import winston from 'winston';
import { z } from 'zod';

// Validation schemas
const messageSchema = z.object({
  content: z.string().min(1).max(4000),
  role: z.nativeEnum(ChatRole),
  metadata: z.record(z.unknown()).optional(),
});

const threadSchema = z.object({
  userId: z.string().uuid(),
  calculationId: z.string().uuid(),
  metadata: z.record(z.unknown()).optional(),
});

/**
 * ChatModel class handles all chat-related database operations with enhanced security,
 * caching, and performance optimizations.
 * @version 1.0.0
 */
export class ChatModel {
  private readonly prisma: PrismaClient;
  private readonly cache: NodeCache;
  private readonly logger: winston.Logger;
  private readonly MESSAGE_CACHE_TTL = 3600; // 1 hour
  private readonly THREAD_CACHE_TTL = 7200; // 2 hours
  private readonly MAX_MESSAGES_PER_THREAD = 100;
  private readonly RATE_LIMIT_WINDOW = 60000; // 1 minute
  private readonly MAX_REQUESTS_PER_WINDOW = 50;

  constructor(prisma: PrismaClient, cache: NodeCache) {
    this.prisma = prisma;
    this.cache = cache;
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.json(),
      transports: [
        new winston.transports.File({ filename: 'chat-error.log', level: 'error' }),
        new winston.transports.File({ filename: 'chat-combined.log' })
      ]
    });
  }

  /**
   * Creates a new chat thread with validation and security checks
   */
  async createThread(
    userId: string,
    calculationId: string,
    metadata: Record<string, unknown> = {}
  ): Promise<ChatThread> {
    try {
      // Validate input
      const validatedData = threadSchema.parse({ userId, calculationId, metadata });

      // Check rate limits
      const userKey = `thread_creation_${userId}`;
      const requestCount = (this.cache.get(userKey) as number) || 0;
      if (requestCount >= this.MAX_REQUESTS_PER_WINDOW) {
        throw new Error('RATE_LIMIT_EXCEEDED');
      }
      this.cache.set(userKey, requestCount + 1, this.RATE_LIMIT_WINDOW);

      // Create thread with transaction
      const thread = await this.prisma.$transaction(async (tx) => {
        // Verify calculation exists and belongs to user
        const calculation = await tx.calculation.findUnique({
          where: { id: validatedData.calculationId },
          include: { scenario: true }
        });
        
        if (!calculation || calculation.scenario.user_id !== validatedData.userId) {
          throw new Error('UNAUTHORIZED');
        }

        return tx.chatThread.create({
          data: {
            user_id: validatedData.userId,
            calculation_id: validatedData.calculationId,
            status: ChatThreadStatus.ACTIVE,
            metadata: {
              message_count: 0,
              last_activity: new Date(),
              total_tokens: 0,
              primary_context: ChatContextType.CALCULATION,
              ...validatedData.metadata
            },
            version: 1
          }
        });
      });

      // Cache thread data
      const cacheKey = `thread_${thread.id}`;
      this.cache.set(cacheKey, thread, this.THREAD_CACHE_TTL);

      this.logger.info('Chat thread created', {
        threadId: thread.id,
        userId: validatedData.userId
      });

      return thread;
    } catch (error) {
      this.logger.error('Error creating chat thread', { error, userId, calculationId });
      throw this.handleError(error);
    }
  }

  /**
   * Adds a new message to an existing thread with security and validation
   */
  async addMessage(
    threadId: string,
    content: string,
    role: ChatRole,
    metadata: Record<string, unknown> = {}
  ): Promise<ChatMessage> {
    try {
      // Validate input
      const validatedData = messageSchema.parse({ content, role, metadata });

      // Check thread message limit
      const messageCount = await this.prisma.chatMessage.count({
        where: { thread_id: threadId }
      });
      if (messageCount >= this.MAX_MESSAGES_PER_THREAD) {
        throw new Error('THREAD_MESSAGE_LIMIT_EXCEEDED');
      }

      // Add message with transaction
      const message = await this.prisma.$transaction(async (tx) => {
        // Verify thread exists and is active
        const thread = await tx.chatThread.findUnique({
          where: { id: threadId }
        });
        
        if (!thread || thread.status !== ChatThreadStatus.ACTIVE) {
          throw new Error('INVALID_THREAD');
        }

        const newMessage = await tx.chatMessage.create({
          data: {
            thread_id: threadId,
            content: validatedData.content,
            role: validatedData.role,
            status: ChatMessageStatus.COMPLETED,
            metadata: {
              tokens: this.calculateTokens(validatedData.content),
              model: 'gpt-4',
              context_type: ChatContextType.CALCULATION,
              processing_completed: new Date(),
              ...validatedData.metadata
            },
            version: 1
          }
        });

        // Update thread metadata
        await tx.chatThread.update({
          where: { id: threadId },
          data: {
            metadata: {
              ...thread.metadata,
              message_count: (thread.metadata as any).message_count + 1,
              last_activity: new Date(),
              total_tokens: (thread.metadata as any).total_tokens + 
                this.calculateTokens(validatedData.content)
            },
            version: thread.version + 1
          }
        });

        return newMessage;
      });

      // Update cache
      const messageCacheKey = `message_${message.id}`;
      this.cache.set(messageCacheKey, message, this.MESSAGE_CACHE_TTL);
      this.cache.del(`thread_${threadId}`); // Invalidate thread cache

      this.logger.info('Chat message added', {
        messageId: message.id,
        threadId
      });

      return message;
    } catch (error) {
      this.logger.error('Error adding chat message', { error, threadId });
      throw this.handleError(error);
    }
  }

  /**
   * Retrieves a chat thread with caching
   */
  async getThread(threadId: string, userId: string): Promise<ChatThread> {
    try {
      // Check cache first
      const cacheKey = `thread_${threadId}`;
      const cachedThread = this.cache.get(cacheKey) as ChatThread;
      if (cachedThread) {
        return cachedThread;
      }

      // Fetch from database with authorization check
      const thread = await this.prisma.chatThread.findUnique({
        where: { id: threadId },
        include: {
          messages: {
            orderBy: { created_at: 'asc' }
          }
        }
      });

      if (!thread || thread.user_id !== userId) {
        throw new Error('UNAUTHORIZED');
      }

      // Cache the result
      this.cache.set(cacheKey, thread, this.THREAD_CACHE_TTL);

      return thread;
    } catch (error) {
      this.logger.error('Error retrieving chat thread', { error, threadId });
      throw this.handleError(error);
    }
  }

  /**
   * Retrieves all chat threads for a calculation
   */
  async getThreadsByCalculation(
    calculationId: string,
    userId: string,
    page: number = 1,
    pageSize: number = 10
  ): Promise<{ threads: ChatThread[]; total: number }> {
    try {
      const skip = (page - 1) * pageSize;
      
      const [threads, total] = await this.prisma.$transaction([
        this.prisma.chatThread.findMany({
          where: {
            calculation_id: calculationId,
            user_id: userId,
            status: ChatThreadStatus.ACTIVE
          },
          include: {
            messages: {
              orderBy: { created_at: 'desc' },
              take: 1
            }
          },
          orderBy: {
            created_at: 'desc'
          },
          skip,
          take: pageSize
        }),
        this.prisma.chatThread.count({
          where: {
            calculation_id: calculationId,
            user_id: userId,
            status: ChatThreadStatus.ACTIVE
          }
        })
      ]);

      return { threads, total };
    } catch (error) {
      this.logger.error('Error retrieving calculation threads', { error, calculationId });
      throw this.handleError(error);
    }
  }

  /**
   * Calculates approximate token count for rate limiting and metadata
   */
  private calculateTokens(content: string): number {
    // Approximate token count based on GPT-4 tokenization
    return Math.ceil(content.length / 4);
  }

  /**
   * Standardized error handling
   */
  private handleError(error: unknown): Error {
    if (error instanceof z.ZodError) {
      return new Error(APIErrorCode.VALIDATION_ERROR);
    }
    if (error instanceof Error) {
      switch (error.message) {
        case 'RATE_LIMIT_EXCEEDED':
          return new Error(APIErrorCode.RATE_LIMIT_EXCEEDED);
        case 'UNAUTHORIZED':
          return new Error(APIErrorCode.UNAUTHORIZED);
        case 'INVALID_THREAD':
          return new Error(APIErrorCode.NOT_FOUND);
        default:
          return new Error(APIErrorCode.INTERNAL_ERROR);
      }
    }
    return new Error(APIErrorCode.INTERNAL_ERROR);
  }
}