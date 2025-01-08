import { Router } from 'express'; // v4.18.2
import compression from 'compression'; // v1.7.4
import cors from 'cors'; // v2.8.5
import { ChatController } from '../controllers/chat.controller';
import { authenticateRequest } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import { rateLimitMiddleware } from '../middleware/rate-limit.middleware';
import errorMiddleware from '../middleware/error.middleware';
import { z } from 'zod';
import { API_RATE_LIMITS } from '../config/constants';

/**
 * Validation schemas for chat routes
 */
const createThreadSchema = z.object({
  calculationId: z.string().uuid()
});

const sendMessageSchema = z.object({
  content: z.string().min(1).max(4000),
  threadId: z.string().uuid()
});

const getThreadSchema = z.object({
  threadId: z.string().uuid()
});

/**
 * Initializes and configures chat routes with comprehensive middleware chain
 * @version 1.0.0
 */
const initializeChatRoutes = (chatController: ChatController): Router => {
  const router = Router();

  // Apply global middleware
  router.use(compression({
    level: 6,
    threshold: 1024
  }));

  router.use(cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining'],
    credentials: true,
    maxAge: 86400 // 24 hours
  }));

  // Apply authentication to all routes
  router.use(authenticateRequest);

  // Apply rate limiting
  const chatRateLimit = API_RATE_LIMITS['chat'] || {
    requests: 100,
    windowSeconds: 3600
  };

  router.use(rateLimitMiddleware);

  // Create new chat thread
  router.post('/threads',
    validateRequest(createThreadSchema),
    async (req, res, next) => {
      try {
        await chatController.createThread(req, res);
      } catch (error) {
        next(error);
      }
    }
  );

  // Send message in thread
  router.post('/messages',
    validateRequest(sendMessageSchema),
    async (req, res, next) => {
      try {
        await chatController.sendMessage(req, res);
      } catch (error) {
        next(error);
      }
    }
  );

  // Get thread details
  router.get('/threads/:threadId',
    validateRequest(getThreadSchema, 'params'),
    async (req, res, next) => {
      try {
        await chatController.getThread(req, res);
      } catch (error) {
        next(error);
      }
    }
  );

  // Apply error handling middleware last
  router.use(errorMiddleware);

  return router;
};

// Create and export configured router
const chatRouter = initializeChatRoutes(new ChatController());
export default chatRouter;