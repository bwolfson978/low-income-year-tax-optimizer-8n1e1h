/**
 * Service layer for managing tax optimization scenarios with comprehensive security and validation
 * @version 1.0.0
 */

import { Logger } from 'winston';
import { ScenarioModel } from '../models/scenario.model';
import { validateScenarioCreation, validateScenarioUpdate } from '../utils/validators/scenario.validator';
import { 
  Scenario, 
  ScenarioCreationRequest, 
  ScenarioCalculationResult,
  PaginatedScenarios 
} from '../types/scenario.types';
import { APIErrorCode } from '../types/api.types';

/**
 * Rate limiting configuration for scenario operations
 */
const RATE_LIMITS = {
  CREATE: 100, // requests per hour
  UPDATE: 200,
  DELETE: 50,
  CALCULATE: 100
};

/**
 * Cache configuration for scenario data
 */
const CACHE_CONFIG = {
  SCENARIO_TTL: 3600, // 1 hour in seconds
  LIST_TTL: 300, // 5 minutes in seconds
  CALCULATION_TTL: 1800 // 30 minutes in seconds
};

/**
 * Service class for managing tax optimization scenarios
 */
export class ScenarioService {
  private readonly scenarioModel: ScenarioModel;
  private readonly logger: Logger;

  constructor(scenarioModel: ScenarioModel, logger: Logger) {
    this.scenarioModel = scenarioModel;
    this.logger = logger;
  }

  /**
   * Creates a new tax optimization scenario with comprehensive validation
   */
  async createScenario(
    userId: string,
    data: ScenarioCreationRequest
  ): Promise<Scenario> {
    try {
      // Validate input data
      await validateScenarioCreation(data);

      // Log creation attempt
      this.logger.info('Creating new scenario', {
        userId,
        action: 'CREATE_SCENARIO',
        data: { ...data, userId }
      });

      // Create scenario with model
      const scenario = await this.scenarioModel.createScenario(userId, data);

      // Log successful creation
      this.logger.info('Successfully created scenario', {
        userId,
        scenarioId: scenario.id,
        action: 'SCENARIO_CREATED'
      });

      return scenario;
    } catch (error) {
      this.logger.error('Failed to create scenario', {
        userId,
        error,
        action: 'CREATE_SCENARIO_ERROR'
      });
      throw error;
    }
  }

  /**
   * Updates an existing scenario with validation and security checks
   */
  async updateScenario(
    userId: string,
    scenarioId: string,
    data: Partial<ScenarioCreationRequest>
  ): Promise<Scenario> {
    try {
      // Validate update data
      await validateScenarioUpdate(data);

      // Log update attempt
      this.logger.info('Updating scenario', {
        userId,
        scenarioId,
        action: 'UPDATE_SCENARIO',
        updates: data
      });

      // Update scenario with model
      const updatedScenario = await this.scenarioModel.updateScenario(
        scenarioId,
        userId,
        data
      );

      // Log successful update
      this.logger.info('Successfully updated scenario', {
        userId,
        scenarioId,
        action: 'SCENARIO_UPDATED'
      });

      return updatedScenario;
    } catch (error) {
      this.logger.error('Failed to update scenario', {
        userId,
        scenarioId,
        error,
        action: 'UPDATE_SCENARIO_ERROR'
      });
      throw error;
    }
  }

  /**
   * Retrieves a specific scenario with security checks
   */
  async getScenario(userId: string, scenarioId: string): Promise<Scenario> {
    try {
      // Log retrieval attempt
      this.logger.info('Retrieving scenario', {
        userId,
        scenarioId,
        action: 'GET_SCENARIO'
      });

      // Get scenario from model
      const scenario = await this.scenarioModel.getScenario(scenarioId, userId);

      // Log successful retrieval
      this.logger.info('Successfully retrieved scenario', {
        userId,
        scenarioId,
        action: 'SCENARIO_RETRIEVED'
      });

      return scenario;
    } catch (error) {
      this.logger.error('Failed to retrieve scenario', {
        userId,
        scenarioId,
        error,
        action: 'GET_SCENARIO_ERROR'
      });
      throw error;
    }
  }

  /**
   * Retrieves paginated list of scenarios for a user
   */
  async getUserScenarios(
    userId: string,
    page: number = 1,
    pageSize: number = 10,
    filters?: Record<string, unknown>
  ): Promise<PaginatedScenarios> {
    try {
      // Log list retrieval attempt
      this.logger.info('Retrieving user scenarios', {
        userId,
        page,
        pageSize,
        filters,
        action: 'LIST_SCENARIOS'
      });

      // Get scenarios from model
      const { scenarios, total } = await this.scenarioModel.getUserScenarios(
        userId,
        page,
        pageSize
      );

      // Calculate pagination metadata
      const totalPages = Math.ceil(total / pageSize);
      const hasNextPage = page < totalPages;
      const hasPreviousPage = page > 1;

      // Log successful retrieval
      this.logger.info('Successfully retrieved user scenarios', {
        userId,
        count: scenarios.length,
        total,
        action: 'SCENARIOS_LISTED'
      });

      return {
        items: scenarios,
        page,
        pageSize,
        totalItems: total,
        totalPages,
        hasNextPage,
        hasPreviousPage
      };
    } catch (error) {
      this.logger.error('Failed to retrieve user scenarios', {
        userId,
        error,
        action: 'LIST_SCENARIOS_ERROR'
      });
      throw error;
    }
  }

  /**
   * Deletes a scenario with security checks and cascade handling
   */
  async deleteScenario(userId: string, scenarioId: string): Promise<void> {
    try {
      // Log deletion attempt
      this.logger.info('Deleting scenario', {
        userId,
        scenarioId,
        action: 'DELETE_SCENARIO'
      });

      // Delete scenario using model
      await this.scenarioModel.deleteScenario(scenarioId, userId);

      // Log successful deletion
      this.logger.info('Successfully deleted scenario', {
        userId,
        scenarioId,
        action: 'SCENARIO_DELETED'
      });
    } catch (error) {
      this.logger.error('Failed to delete scenario', {
        userId,
        scenarioId,
        error,
        action: 'DELETE_SCENARIO_ERROR'
      });
      throw error;
    }
  }
}