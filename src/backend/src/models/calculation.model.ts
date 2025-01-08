import { PrismaClient } from '@prisma/client';
import NodeCache from 'node-cache';
import { CalculationParameters, CalculationStatus } from '../types/calculation.types';
import { OptimizationResult } from '../types/tax.types';
import { createLogger } from '../utils/logger';
import { ValidationError, DatabaseError } from '../utils/errors';

/**
 * Enhanced model class for managing tax optimization calculations
 * Implements robust error handling, validation, and performance optimization
 * @version 1.0.0
 */
export class CalculationModel {
    private prisma: PrismaClient;
    private cache: NodeCache;
    private logger = createLogger('CalculationModel');
    private readonly CACHE_TTL = 3600; // 1 hour cache TTL
    private readonly MAX_RETRY_ATTEMPTS = 3;

    constructor(prisma: PrismaClient) {
        this.prisma = prisma;
        this.cache = new NodeCache({
            stdTTL: this.CACHE_TTL,
            checkperiod: 120,
            useClones: false
        });
    }

    /**
     * Creates a new calculation record with enhanced validation
     * @param scenarioId - ID of the parent scenario
     * @param params - Calculation parameters
     * @returns Promise resolving to the calculation ID
     * @throws ValidationError if parameters are invalid
     * @throws DatabaseError if creation fails
     */
    async createCalculation(scenarioId: string, params: CalculationParameters): Promise<string> {
        try {
            this.validateCalculationParams(params);

            const calculation = await this.prisma.$transaction(async (prisma) => {
                const created = await prisma.calculation.create({
                    data: {
                        scenarioId,
                        status: CalculationStatus.PENDING,
                        parameters: params,
                        createdAt: new Date(),
                        updatedAt: new Date()
                    }
                });

                this.logger.info('Calculation created', {
                    calculationId: created.id,
                    scenarioId,
                    status: CalculationStatus.PENDING
                });

                return created;
            });

            return calculation.id;
        } catch (error) {
            this.logger.error('Failed to create calculation', { error, scenarioId });
            throw new DatabaseError('Failed to create calculation record');
        }
    }

    /**
     * Updates calculation status with enhanced logging and error handling
     * @param calculationId - ID of the calculation to update
     * @param status - New calculation status
     * @throws DatabaseError if update fails
     */
    async updateCalculationStatus(calculationId: string, status: CalculationStatus): Promise<void> {
        try {
            await this.prisma.$transaction(async (prisma) => {
                await prisma.calculation.update({
                    where: { id: calculationId },
                    data: {
                        status,
                        updatedAt: new Date()
                    }
                });

                this.logger.info('Calculation status updated', {
                    calculationId,
                    status
                });

                // Invalidate cache
                this.cache.del(calculationId);
            });
        } catch (error) {
            this.logger.error('Failed to update calculation status', { error, calculationId });
            throw new DatabaseError('Failed to update calculation status');
        }
    }

    /**
     * Saves calculation results with transaction support and caching
     * @param calculationId - ID of the calculation
     * @param results - Optimization results to save
     * @throws DatabaseError if save fails
     */
    async saveResults(calculationId: string, results: OptimizationResult): Promise<void> {
        try {
            await this.prisma.$transaction(async (prisma) => {
                await prisma.calculation.update({
                    where: { id: calculationId },
                    data: {
                        results,
                        status: CalculationStatus.COMPLETED,
                        updatedAt: new Date()
                    }
                });

                this.logger.info('Calculation results saved', {
                    calculationId,
                    status: CalculationStatus.COMPLETED
                });

                // Update cache with new results
                this.cache.set(calculationId, results);
            });
        } catch (error) {
            this.logger.error('Failed to save calculation results', { error, calculationId });
            throw new DatabaseError('Failed to save calculation results');
        }
    }

    /**
     * Retrieves calculation with caching and retry logic
     * @param calculationId - ID of the calculation to retrieve
     * @returns Promise resolving to the calculation record
     * @throws DatabaseError if retrieval fails
     */
    async getCalculation(calculationId: string): Promise<any> {
        // Check cache first
        const cached = this.cache.get(calculationId);
        if (cached) {
            return cached;
        }

        let retryCount = 0;
        while (retryCount < this.MAX_RETRY_ATTEMPTS) {
            try {
                const calculation = await this.prisma.calculation.findUnique({
                    where: { id: calculationId },
                    include: {
                        results: true,
                        scenario: true
                    }
                });

                if (!calculation) {
                    throw new ValidationError('Calculation not found');
                }

                // Cache the result
                this.cache.set(calculationId, calculation);
                return calculation;
            } catch (error) {
                retryCount++;
                if (retryCount === this.MAX_RETRY_ATTEMPTS) {
                    this.logger.error('Failed to retrieve calculation', { error, calculationId });
                    throw new DatabaseError('Failed to retrieve calculation');
                }
                await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
            }
        }
    }

    /**
     * Retrieves calculations for a scenario with optimization and caching
     * @param scenarioId - ID of the scenario
     * @returns Promise resolving to array of calculations
     * @throws DatabaseError if retrieval fails
     */
    async getCalculationsByScenario(scenarioId: string): Promise<any[]> {
        const cacheKey = `scenario_${scenarioId}_calculations`;
        const cached = this.cache.get(cacheKey);
        if (cached) {
            return cached as any[];
        }

        try {
            const calculations = await this.prisma.calculation.findMany({
                where: { scenarioId },
                orderBy: { createdAt: 'desc' },
                include: {
                    results: true
                }
            });

            // Cache the results
            this.cache.set(cacheKey, calculations);
            return calculations;
        } catch (error) {
            this.logger.error('Failed to retrieve scenario calculations', { error, scenarioId });
            throw new DatabaseError('Failed to retrieve scenario calculations');
        }
    }

    /**
     * Validates calculation parameters against schema
     * @param params - Calculation parameters to validate
     * @throws ValidationError if parameters are invalid
     */
    private validateCalculationParams(params: CalculationParameters): void {
        const { traditionalIRABalance, rothIRABalance, capitalGains, taxState } = params;

        if (traditionalIRABalance < 0) {
            throw new ValidationError('Traditional IRA balance cannot be negative');
        }

        if (rothIRABalance < 0) {
            throw new ValidationError('Roth IRA balance cannot be negative');
        }

        if (capitalGains < 0) {
            throw new ValidationError('Capital gains cannot be negative');
        }

        if (!taxState || taxState.length !== 2) {
            throw new ValidationError('Invalid tax state code');
        }
    }
}