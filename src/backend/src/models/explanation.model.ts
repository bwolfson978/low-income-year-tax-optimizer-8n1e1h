import { PrismaClient, Explanation, Prisma } from '@prisma/client';
import { CalculationResult } from '../types/calculation.types';
import { ChatMessage, ChatRole } from '../types/chat.types';
import { APIErrorCode } from '../types/api.types';

// Constants for configuration and validation
const MAX_EXPLANATION_LENGTH = 10000;
const MAX_RETRY_ATTEMPTS = 3;
const CACHE_TTL_SECONDS = 3600;

/**
 * Interface for explanation version history
 * @version 1.0.0
 */
interface ExplanationVersion {
  id: string;
  explanationId: string;
  content: string;
  version: number;
  createdAt: Date;
  createdBy: string;
}

/**
 * Interface for explanation audit logs
 * @version 1.0.0
 */
interface ExplanationAudit {
  id: string;
  explanationId: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  timestamp: Date;
  userId: string;
  metadata: Record<string, unknown>;
}

/**
 * Interface for explanation context data
 * @version 1.0.0
 */
interface ExplanationContext {
  calculationResult: CalculationResult;
  confidenceScore: number;
  modelVersion: string;
  timestamp: Date;
}

/**
 * Interface for explanation with complete history
 * @version 1.0.0
 */
export interface ExplanationWithHistory {
  id: string;
  calculationId: string;
  content: string;
  context: ExplanationContext;
  version: number;
  versionHistory: ExplanationVersion[];
  auditLog: ExplanationAudit[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Configuration options for explanation model
 * @version 1.0.0
 */
interface ExplanationConfig {
  maxRetryAttempts?: number;
  cacheTTLSeconds?: number;
  maxExplanationLength?: number;
}

/**
 * Enhanced model class for managing tax optimization explanations
 * with security, versioning, and audit support
 * @version 1.0.0
 */
export class ExplanationModel {
  private prisma: PrismaClient;
  private retryAttempts: number;
  private cacheTTL: number;
  private maxLength: number;

  constructor(prisma: PrismaClient, config?: ExplanationConfig) {
    this.prisma = prisma;
    this.retryAttempts = config?.maxRetryAttempts || MAX_RETRY_ATTEMPTS;
    this.cacheTTL = config?.cacheTTLSeconds || CACHE_TTL_SECONDS;
    this.maxLength = config?.maxExplanationLength || MAX_EXPLANATION_LENGTH;
  }

  /**
   * Creates a new explanation record with versioning and validation
   * @param calculationId - ID of the associated calculation
   * @param content - Explanation content
   * @param context - Calculation context for the explanation
   * @returns Created explanation record with version info
   */
  async createExplanation(
    calculationId: string,
    content: string,
    context: ExplanationContext,
    userId: string
  ): Promise<ExplanationWithHistory> {
    // Validate input parameters
    if (!calculationId || !content || !context) {
      throw new Error('Missing required parameters');
    }

    if (content.length > this.maxLength) {
      throw new Error(`Explanation content exceeds maximum length of ${this.maxLength}`);
    }

    // Create explanation with versioning in a transaction
    try {
      return await this.prisma.$transaction(async (tx) => {
        // Create the explanation record
        const explanation = await tx.explanation.create({
          data: {
            calculationId,
            content,
            context: context as Prisma.JsonObject,
            version: 1,
            createdBy: userId,
            updatedBy: userId
          }
        });

        // Create initial version history
        const version = await tx.explanationVersion.create({
          data: {
            explanationId: explanation.id,
            content,
            version: 1,
            createdBy: userId
          }
        });

        // Create audit log entry
        const audit = await tx.explanationAudit.create({
          data: {
            explanationId: explanation.id,
            action: 'CREATE',
            userId,
            metadata: {
              version: 1,
              context: context
            }
          }
        });

        return this.mapToExplanationWithHistory(explanation, [version], [audit]);
      });
    } catch (error) {
      throw new Error(`Failed to create explanation: ${error.message}`);
    }
  }

  /**
   * Retrieves an explanation with its complete version history
   * @param id - Explanation ID to retrieve
   * @returns Retrieved explanation with version history
   */
  async getExplanationWithHistory(id: string): Promise<ExplanationWithHistory | null> {
    try {
      const explanation = await this.prisma.explanation.findUnique({
        where: { id }
      });

      if (!explanation) {
        return null;
      }

      const versions = await this.prisma.explanationVersion.findMany({
        where: { explanationId: id },
        orderBy: { version: 'desc' }
      });

      const audits = await this.prisma.explanationAudit.findMany({
        where: { explanationId: id },
        orderBy: { timestamp: 'desc' }
      });

      return this.mapToExplanationWithHistory(explanation, versions, audits);
    } catch (error) {
      throw new Error(`Failed to retrieve explanation: ${error.message}`);
    }
  }

  /**
   * Efficiently retrieves multiple explanations with caching
   * @param calculationIds - Array of calculation IDs
   * @returns Map of calculation IDs to explanations
   */
  async bulkRetrieveExplanations(
    calculationIds: string[]
  ): Promise<Map<string, ExplanationWithHistory[]>> {
    if (!calculationIds.length) {
      return new Map();
    }

    try {
      const explanations = await this.prisma.explanation.findMany({
        where: {
          calculationId: {
            in: calculationIds
          }
        },
        include: {
          versions: {
            orderBy: { version: 'desc' }
          },
          audits: {
            orderBy: { timestamp: 'desc' }
          }
        }
      });

      return this.groupExplanationsByCalculation(explanations);
    } catch (error) {
      throw new Error(`Failed to bulk retrieve explanations: ${error.message}`);
    }
  }

  /**
   * Maps database entities to ExplanationWithHistory interface
   * @private
   */
  private mapToExplanationWithHistory(
    explanation: any,
    versions: any[],
    audits: any[]
  ): ExplanationWithHistory {
    return {
      id: explanation.id,
      calculationId: explanation.calculationId,
      content: explanation.content,
      context: explanation.context as ExplanationContext,
      version: explanation.version,
      versionHistory: versions,
      auditLog: audits,
      createdAt: explanation.createdAt,
      updatedAt: explanation.updatedAt
    };
  }

  /**
   * Groups explanations by calculation ID
   * @private
   */
  private groupExplanationsByCalculation(
    explanations: any[]
  ): Map<string, ExplanationWithHistory[]> {
    const grouped = new Map<string, ExplanationWithHistory[]>();

    for (const explanation of explanations) {
      const mapped = this.mapToExplanationWithHistory(
        explanation,
        explanation.versions,
        explanation.audits
      );

      const existing = grouped.get(explanation.calculationId) || [];
      existing.push(mapped);
      grouped.set(explanation.calculationId, existing);
    }

    return grouped;
  }
}