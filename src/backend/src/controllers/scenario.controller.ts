/**
 * Controller class for handling tax optimization scenario management with enhanced security
 * @version 1.0.0
 */

import { Request, Response } from 'express';
import { Logger } from 'winston';
import { rateLimit } from 'express-rate-limit';
import { RequestValidator } from 'express-validator';
import { ScenarioService } from '../services/scenario.service';
import { 
  Scenario,
  ScenarioCreationRequest,
  PaginatedScenarios,
  ScenarioResponse 
} from '../types/scenario.types';
import { APIErrorCode, APIResponse } from '../types/api.types';

// Rate limiting configuration
const RATE_LIMITS = {
  CREATE: 100, // requests per hour
  READ: 1000,
  UPDATE: 200,
  DELETE: 50,
  LIST: 500
};

/**
 * Controller class for handling scenario-related HTTP requests with enhanced security
 */
export class ScenarioController {
  private readonly scenarioService: ScenarioService;
  private readonly logger: Logger;
  private readonly validator: RequestValidator;

  constructor(
    scenarioService: ScenarioService,
    logger: Logger,
    validator: RequestValidator
  ) {
    this.scenarioService = scenarioService;
    this.logger = logger;
    this.validator = validator;
  }

  /**
   * Creates a new tax optimization scenario with comprehensive validation
   */
  public async createScenario(
    req: Request<{}, {}, ScenarioCreationRequest>,
    res: Response<APIResponse<Scenario>>
  ): Promise<Response> {
    const requestId = req.headers['x-request-id'] as string;
    const startTime = Date.now();

    try {
      // Validate user authentication
      const userId = req.user?.id;
      if (!userId) {
        return this.sendErrorResponse(res, APIErrorCode.UNAUTHORIZED, 'Authentication required');
      }

      // Log request attempt
      this.logger.info('Creating new scenario', {
        userId,
        requestId,
        action: 'CREATE_SCENARIO_REQUEST'
      });

      // Create scenario
      const scenario = await this.scenarioService.createScenario(userId, req.body);

      // Calculate processing time
      const processingTime = Date.now() - startTime;

      // Return success response
      return res.status(201).json({
        success: true,
        data: scenario,
        error: null,
        metadata: {
          timestamp: new Date(),
          requestId,
          processingTime,
          version: '1.0.0'
        }
      });
    } catch (error) {
      return this.handleError(res, error, requestId);
    }
  }

  /**
   * Retrieves a specific scenario with security checks
   */
  public async getScenario(
    req: Request<{ id: string }>,
    res: Response<APIResponse<Scenario>>
  ): Promise<Response> {
    const requestId = req.headers['x-request-id'] as string;
    const startTime = Date.now();

    try {
      const userId = req.user?.id;
      if (!userId) {
        return this.sendErrorResponse(res, APIErrorCode.UNAUTHORIZED, 'Authentication required');
      }

      const scenarioId = req.params.id;
      
      this.logger.info('Retrieving scenario', {
        userId,
        scenarioId,
        requestId,
        action: 'GET_SCENARIO_REQUEST'
      });

      const scenario = await this.scenarioService.getScenario(userId, scenarioId);
      const processingTime = Date.now() - startTime;

      return res.status(200).json({
        success: true,
        data: scenario,
        error: null,
        metadata: {
          timestamp: new Date(),
          requestId,
          processingTime,
          version: '1.0.0'
        }
      });
    } catch (error) {
      return this.handleError(res, error, requestId);
    }
  }

  /**
   * Retrieves paginated list of scenarios for a user
   */
  public async getUserScenarios(
    req: Request<{}, {}, {}, { page?: string; pageSize?: string }>,
    res: Response<APIResponse<PaginatedScenarios>>
  ): Promise<Response> {
    const requestId = req.headers['x-request-id'] as string;
    const startTime = Date.now();

    try {
      const userId = req.user?.id;
      if (!userId) {
        return this.sendErrorResponse(res, APIErrorCode.UNAUTHORIZED, 'Authentication required');
      }

      const page = parseInt(req.query.page || '1');
      const pageSize = parseInt(req.query.pageSize || '10');

      this.logger.info('Retrieving user scenarios', {
        userId,
        requestId,
        page,
        pageSize,
        action: 'LIST_SCENARIOS_REQUEST'
      });

      const scenarios = await this.scenarioService.getUserScenarios(userId, page, pageSize);
      const processingTime = Date.now() - startTime;

      return res.status(200).json({
        success: true,
        data: scenarios,
        error: null,
        metadata: {
          timestamp: new Date(),
          requestId,
          processingTime,
          version: '1.0.0'
        }
      });
    } catch (error) {
      return this.handleError(res, error, requestId);
    }
  }

  /**
   * Updates an existing scenario with validation
   */
  public async updateScenario(
    req: Request<{ id: string }, {}, Partial<ScenarioCreationRequest>>,
    res: Response<APIResponse<Scenario>>
  ): Promise<Response> {
    const requestId = req.headers['x-request-id'] as string;
    const startTime = Date.now();

    try {
      const userId = req.user?.id;
      if (!userId) {
        return this.sendErrorResponse(res, APIErrorCode.UNAUTHORIZED, 'Authentication required');
      }

      const scenarioId = req.params.id;

      this.logger.info('Updating scenario', {
        userId,
        scenarioId,
        requestId,
        action: 'UPDATE_SCENARIO_REQUEST',
        updates: req.body
      });

      const scenario = await this.scenarioService.updateScenario(userId, scenarioId, req.body);
      const processingTime = Date.now() - startTime;

      return res.status(200).json({
        success: true,
        data: scenario,
        error: null,
        metadata: {
          timestamp: new Date(),
          requestId,
          processingTime,
          version: '1.0.0'
        }
      });
    } catch (error) {
      return this.handleError(res, error, requestId);
    }
  }

  /**
   * Deletes a scenario with security checks
   */
  public async deleteScenario(
    req: Request<{ id: string }>,
    res: Response<APIResponse<void>>
  ): Promise<Response> {
    const requestId = req.headers['x-request-id'] as string;
    const startTime = Date.now();

    try {
      const userId = req.user?.id;
      if (!userId) {
        return this.sendErrorResponse(res, APIErrorCode.UNAUTHORIZED, 'Authentication required');
      }

      const scenarioId = req.params.id;

      this.logger.info('Deleting scenario', {
        userId,
        scenarioId,
        requestId,
        action: 'DELETE_SCENARIO_REQUEST'
      });

      await this.scenarioService.deleteScenario(userId, scenarioId);
      const processingTime = Date.now() - startTime;

      return res.status(200).json({
        success: true,
        data: null,
        error: null,
        metadata: {
          timestamp: new Date(),
          requestId,
          processingTime,
          version: '1.0.0'
        }
      });
    } catch (error) {
      return this.handleError(res, error, requestId);
    }
  }

  /**
   * Handles errors and generates appropriate error responses
   */
  private handleError(res: Response, error: any, requestId: string): Response {
    this.logger.error('Request failed', {
      error,
      requestId,
      stack: error.stack
    });

    let errorCode = APIErrorCode.INTERNAL_ERROR;
    let statusCode = 500;
    let message = 'An unexpected error occurred';

    if (error.name === 'ValidationError') {
      errorCode = APIErrorCode.VALIDATION_ERROR;
      statusCode = 422;
      message = error.message;
    } else if (error.name === 'SecurityError') {
      errorCode = APIErrorCode.FORBIDDEN;
      statusCode = 403;
      message = 'Access denied';
    } else if (error.name === 'NotFoundError') {
      errorCode = APIErrorCode.NOT_FOUND;
      statusCode = 404;
      message = 'Resource not found';
    }

    return this.sendErrorResponse(res, errorCode, message, statusCode);
  }

  /**
   * Sends standardized error response
   */
  private sendErrorResponse(
    res: Response,
    code: APIErrorCode,
    message: string,
    status: number = 400
  ): Response {
    return res.status(status).json({
      success: false,
      data: null,
      error: {
        code,
        message,
        details: null,
        stack: process.env.NODE_ENV === 'development' ? new Error().stack : null
      },
      metadata: {
        timestamp: new Date(),
        requestId: res.locals.requestId,
        processingTime: Date.now() - res.locals.startTime,
        version: '1.0.0'
      }
    });
  }
}