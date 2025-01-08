/**
 * Enhanced model class for secure scenario data management with comprehensive validation and audit logging
 * @version 1.0.0
 */

import { PrismaClient } from '@prisma/client';
import { ValidationError } from 'class-validator';
import { SecurityError, AuditLogger } from '@nestjs/common';
import { 
  Scenario, 
  ScenarioCreationRequest 
} from '../types/scenario.types';
import { FilingStatus } from '../types/tax.types';

/**
 * Constants for validation and security
 */
const VALIDATION_CONSTANTS = {
  MIN_BALANCE: 0,
  MAX_BALANCE: 5_000_000,
  MIN_TIME_HORIZON: 1,
  MAX_TIME_HORIZON: 40,
  MIN_RISK_TOLERANCE: 1,
  MAX_RISK_TOLERANCE: 5,
  VALID_STATE_CODES: new Set([
    'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
    'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
    'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
    'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
    'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
  ])
};

export class ScenarioModel {
  private readonly prisma: PrismaClient;
  private readonly auditLogger: AuditLogger;

  constructor(prisma: PrismaClient, auditLogger: AuditLogger) {
    this.prisma = prisma;
    this.auditLogger = auditLogger;
  }

  /**
   * Validates numeric ranges for scenario data
   * @throws ValidationError if validation fails
   */
  private validateNumericRanges(data: Partial<ScenarioCreationRequest>): void {
    const {
      trad_ira_balance,
      roth_ira_balance,
      capital_gains,
      time_horizon,
      risk_tolerance
    } = data;

    if (trad_ira_balance !== undefined && 
        (trad_ira_balance < VALIDATION_CONSTANTS.MIN_BALANCE || 
         trad_ira_balance > VALIDATION_CONSTANTS.MAX_BALANCE)) {
      throw new ValidationError('Traditional IRA balance out of valid range');
    }

    if (roth_ira_balance !== undefined && 
        (roth_ira_balance < VALIDATION_CONSTANTS.MIN_BALANCE || 
         roth_ira_balance > VALIDATION_CONSTANTS.MAX_BALANCE)) {
      throw new ValidationError('Roth IRA balance out of valid range');
    }

    if (capital_gains !== undefined && 
        (capital_gains < VALIDATION_CONSTANTS.MIN_BALANCE || 
         capital_gains > VALIDATION_CONSTANTS.MAX_BALANCE)) {
      throw new ValidationError('Capital gains amount out of valid range');
    }

    if (time_horizon !== undefined && 
        (time_horizon < VALIDATION_CONSTANTS.MIN_TIME_HORIZON || 
         time_horizon > VALIDATION_CONSTANTS.MAX_TIME_HORIZON)) {
      throw new ValidationError('Time horizon out of valid range');
    }

    if (risk_tolerance !== undefined && 
        (risk_tolerance < VALIDATION_CONSTANTS.MIN_RISK_TOLERANCE || 
         risk_tolerance > VALIDATION_CONSTANTS.MAX_RISK_TOLERANCE)) {
      throw new ValidationError('Risk tolerance out of valid range');
    }
  }

  /**
   * Validates state code format and existence
   * @throws ValidationError if validation fails
   */
  private validateStateCode(stateCode: string): void {
    if (!VALIDATION_CONSTANTS.VALID_STATE_CODES.has(stateCode.toUpperCase())) {
      throw new ValidationError('Invalid state code');
    }
  }

  /**
   * Sanitizes input data to prevent injection attacks
   */
  private sanitizeInput<T extends object>(data: T): T {
    return Object.entries(data).reduce((acc, [key, value]) => ({
      ...acc,
      [key]: typeof value === 'string' ? 
        value.replace(/[<>]/g, '').trim() : value
    }), {} as T);
  }

  /**
   * Creates a new scenario with comprehensive validation and security checks
   */
  async createScenario(
    userId: string, 
    data: ScenarioCreationRequest
  ): Promise<Scenario> {
    // Sanitize input
    const sanitizedData = this.sanitizeInput(data);

    // Validate all numeric ranges
    this.validateNumericRanges(sanitizedData);

    // Validate state code
    this.validateStateCode(sanitizedData.tax_state);

    // Validate filing status
    if (!Object.values(FilingStatus).includes(sanitizedData.filing_status)) {
      throw new ValidationError('Invalid filing status');
    }

    try {
      // Start transaction
      const result = await this.prisma.$transaction(async (tx) => {
        // Create scenario
        const scenario = await tx.scenario.create({
          data: {
            user_id: userId,
            ...sanitizedData,
            created_at: new Date(),
            updated_at: new Date(),
            version: 1
          }
        });

        // Log audit entry
        await this.auditLogger.log({
          action: 'CREATE_SCENARIO',
          userId,
          resourceId: scenario.id,
          details: {
            scenarioData: sanitizedData
          }
        });

        return scenario;
      });

      return result;
    } catch (error) {
      throw new SecurityError('Failed to create scenario securely');
    }
  }

  /**
   * Updates an existing scenario with security checks and audit logging
   */
  async updateScenario(
    scenarioId: string,
    userId: string,
    data: Partial<ScenarioCreationRequest>
  ): Promise<Scenario> {
    // Verify scenario exists and belongs to user
    const existingScenario = await this.prisma.scenario.findFirst({
      where: {
        id: scenarioId,
        user_id: userId
      }
    });

    if (!existingScenario) {
      throw new SecurityError('Scenario not found or access denied');
    }

    // Sanitize input
    const sanitizedData = this.sanitizeInput(data);

    // Validate updates
    if (Object.keys(sanitizedData).length > 0) {
      this.validateNumericRanges(sanitizedData);
      if (sanitizedData.tax_state) {
        this.validateStateCode(sanitizedData.tax_state);
      }
      if (sanitizedData.filing_status && 
          !Object.values(FilingStatus).includes(sanitizedData.filing_status)) {
        throw new ValidationError('Invalid filing status');
      }
    }

    try {
      // Start transaction
      const result = await this.prisma.$transaction(async (tx) => {
        // Update scenario
        const updatedScenario = await tx.scenario.update({
          where: { id: scenarioId },
          data: {
            ...sanitizedData,
            updated_at: new Date(),
            version: existingScenario.version + 1
          }
        });

        // Log audit entry
        await this.auditLogger.log({
          action: 'UPDATE_SCENARIO',
          userId,
          resourceId: scenarioId,
          details: {
            previousVersion: existingScenario.version,
            newVersion: updatedScenario.version,
            changes: sanitizedData
          }
        });

        return updatedScenario;
      });

      return result;
    } catch (error) {
      throw new SecurityError('Failed to update scenario securely');
    }
  }

  /**
   * Retrieves a scenario with security checks
   */
  async getScenario(scenarioId: string, userId: string): Promise<Scenario> {
    const scenario = await this.prisma.scenario.findFirst({
      where: {
        id: scenarioId,
        user_id: userId
      }
    });

    if (!scenario) {
      throw new SecurityError('Scenario not found or access denied');
    }

    await this.auditLogger.log({
      action: 'READ_SCENARIO',
      userId,
      resourceId: scenarioId
    });

    return scenario;
  }

  /**
   * Retrieves all scenarios for a user with pagination
   */
  async getUserScenarios(
    userId: string,
    page: number = 1,
    pageSize: number = 10
  ): Promise<{ scenarios: Scenario[]; total: number }> {
    const skip = (page - 1) * pageSize;

    const [scenarios, total] = await Promise.all([
      this.prisma.scenario.findMany({
        where: { user_id: userId },
        skip,
        take: pageSize,
        orderBy: { created_at: 'desc' }
      }),
      this.prisma.scenario.count({
        where: { user_id: userId }
      })
    ]);

    await this.auditLogger.log({
      action: 'LIST_SCENARIOS',
      userId,
      details: { page, pageSize }
    });

    return { scenarios, total };
  }

  /**
   * Deletes a scenario with security checks and audit logging
   */
  async deleteScenario(scenarioId: string, userId: string): Promise<void> {
    const scenario = await this.prisma.scenario.findFirst({
      where: {
        id: scenarioId,
        user_id: userId
      }
    });

    if (!scenario) {
      throw new SecurityError('Scenario not found or access denied');
    }

    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.scenario.delete({
          where: { id: scenarioId }
        });

        await this.auditLogger.log({
          action: 'DELETE_SCENARIO',
          userId,
          resourceId: scenarioId,
          details: {
            deletedScenario: scenario
          }
        });
      });
    } catch (error) {
      throw new SecurityError('Failed to delete scenario securely');
    }
  }
}