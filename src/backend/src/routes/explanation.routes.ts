/**
 * Express router configuration for AI-powered tax optimization explanation endpoints
 * Implements secure routes with authentication, validation, and rate limiting
 * @version 1.0.0
 */

import { Router } from 'express'; // ^4.18.2
import { ExplanationController } from '../controllers/explanation.controller';
import { authenticateRequest } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import rateLimitMiddleware from '../middleware/rate-limit.middleware';
import { object, string } from 'yup';

// Initialize router
const router = Router();

/**
 * Validation schemas for explanation endpoints
 */
const explanationGenerationSchema = object({
  calculationId: string()
    .required('Calculation ID is required')
    .uuid('Invalid calculation ID format'),
  result: object()
    .required('Calculation result is required')
    .test('is-valid-result', 'Invalid calculation result format', (value) => {
      return value && 
        typeof value.rothConversion === 'object' && 
        typeof value.capitalGainsHarvesting === 'object';
    })
});

const explanationIdSchema = object({
  id: string()
    .required('Explanation ID is required')
    .uuid('Invalid explanation ID format')
});

const calculationIdSchema = object({
  calculationId: string()
    .required('Calculation ID is required')
    .uuid('Invalid calculation ID format'),
  page: string()
    .optional()
    .matches(/^\d+$/, 'Page must be a number'),
  limit: string()
    .optional()
    .matches(/^\d+$/, 'Limit must be a number')
});

const followUpQuestionSchema = object({
  explanationId: string()
    .required('Explanation ID is required')
    .uuid('Invalid explanation ID format'),
  question: string()
    .required('Question is required')
    .min(3, 'Question must be at least 3 characters')
    .max(500, 'Question cannot exceed 500 characters'),
  context: object()
    .optional()
    .default({})
});

/**
 * Generate explanation for tax optimization results
 * Rate limited to 10 requests per minute per user
 * @route POST /api/v1/explanations/generate
 * @authenticate JWT
 */
router.post(
  '/generate',
  authenticateRequest,
  validateRequest(explanationGenerationSchema),
  rateLimitMiddleware({ windowMs: 60000, max: 10 }),
  ExplanationController.prototype.generateExplanation
);

/**
 * Retrieve specific explanation by ID
 * @route GET /api/v1/explanations/:id
 * @authenticate JWT
 */
router.get(
  '/:id',
  authenticateRequest,
  validateRequest(explanationIdSchema, 'params'),
  ExplanationController.prototype.getExplanation
);

/**
 * Retrieve paginated explanations for a calculation
 * @route GET /api/v1/explanations/calculation/:calculationId
 * @authenticate JWT
 */
router.get(
  '/calculation/:calculationId',
  authenticateRequest,
  validateRequest(calculationIdSchema, 'params'),
  ExplanationController.prototype.getCalculationExplanations
);

/**
 * Handle follow-up questions about explanations
 * Rate limited to 20 requests per minute per user
 * @route POST /api/v1/explanations/followup
 * @authenticate JWT
 */
router.post(
  '/followup',
  authenticateRequest,
  validateRequest(followUpQuestionSchema),
  rateLimitMiddleware({ windowMs: 60000, max: 20 }),
  ExplanationController.prototype.handleFollowUpQuestion
);

export default router;