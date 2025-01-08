import Big from 'big.js';
import { CalculationModel } from '../models/calculation.model';
import { optimizeTaxStrategy } from '../utils/tax-calculator/optimization';
import { CalculationParameters } from '../types/calculation.types';
import { ValidationError } from '../utils/errors';
import { VALIDATION_RULES, OPTIMIZATION_PARAMS } from '../config/constants';

/**
 * Enhanced service class for handling tax optimization calculations
 * Implements core business logic with high precision and comprehensive validation
 * @version 1.0.0
 */
export class CalculationService {
    private readonly calculationModel: CalculationModel;
    private readonly calculationCache: Map<string, any>;
    private readonly MINIMUM_BALANCE = 1000;
    private readonly MAXIMUM_BALANCE = 5000000;
    private readonly CALCULATION_PRECISION = 20;
    private readonly RETRY_ATTEMPTS = 3;
    private readonly CACHE_DURATION = 3600000; // 1 hour in milliseconds

    constructor(calculationModel: CalculationModel) {
        this.calculationModel = calculationModel;
        this.calculationCache = new Map();
        
        // Configure Big.js for financial calculations
        Big.DP = this.CALCULATION_PRECISION;
        Big.RM = Big.roundDown;
    }

    /**
     * Performs tax optimization calculation with enhanced precision and validation
     * 
     * @param scenarioId - Unique identifier for the calculation scenario
     * @param params - Calculation parameters including account balances and tax info
     * @returns Promise resolving to calculation results
     * @throws ValidationError if parameters are invalid
     * @version 1.0.0
     */
    async calculateOptimalStrategy(
        scenarioId: string,
        params: CalculationParameters
    ): Promise<any> {
        // Validate input parameters
        this.validateCalculationParams(params);

        // Check calculation cache
        const cacheKey = `${scenarioId}-${JSON.stringify(params)}`;
        const cachedResult = this.calculationCache.get(cacheKey);
        if (cachedResult && Date.now() - cachedResult.timestamp < this.CACHE_DURATION) {
            return cachedResult.result;
        }

        try {
            // Create calculation record
            const calculationId = await this.calculationModel.createCalculation(
                scenarioId,
                params
            );

            // Update calculation status
            await this.calculationModel.updateCalculationStatus(calculationId, 'IN_PROGRESS');

            // Convert inputs to Big.js for precise calculations
            const traditionalBalance = new Big(params.traditionalIRABalance);
            const rothBalance = new Big(params.rothIRABalance);
            const capitalGains = new Big(params.capitalGains);

            // Execute optimization algorithm
            const optimizationResult = optimizeTaxStrategy(
                new Big(0), // current income
                traditionalBalance,
                capitalGains,
                params.filingStatus,
                params.taxState,
                {
                    timeHorizon: OPTIMIZATION_PARAMS.TIME_HORIZON.DEFAULT,
                    discountRate: OPTIMIZATION_PARAMS.DISCOUNT_RATE.DEFAULT,
                    riskTolerance: OPTIMIZATION_PARAMS.RISK_TOLERANCE.DEFAULT,
                    stateTaxWeight: OPTIMIZATION_PARAMS.STATE_TAX_WEIGHT.DEFAULT
                }
            );

            // Format results with high precision
            const results = {
                rothConversion: {
                    recommendedAmount: optimizationResult.rothConversion.amount.toNumber(),
                    taxImpact: optimizationResult.rothConversion.taxImpact,
                    npv: optimizationResult.rothConversion.npv.toNumber()
                },
                capitalGains: {
                    recommendedAmount: optimizationResult.capitalGains.amount.toNumber(),
                    taxImpact: optimizationResult.capitalGains.taxImpact,
                    npv: optimizationResult.capitalGains.npv.toNumber()
                },
                combinedSavings: optimizationResult.combinedSavings.toNumber(),
                riskAdjustedScore: optimizationResult.riskAdjustedScore.toNumber(),
                timestamp: new Date().toISOString()
            };

            // Save calculation results
            await this.calculationModel.saveResults(calculationId, results);

            // Update cache
            this.calculationCache.set(cacheKey, {
                result: results,
                timestamp: Date.now()
            });

            return results;

        } catch (error) {
            throw new Error(`Calculation failed: ${error.message}`);
        }
    }

    /**
     * Validates calculation parameters with comprehensive checks
     * 
     * @param params - Calculation parameters to validate
     * @throws ValidationError if parameters are invalid
     * @version 1.0.0
     */
    private validateCalculationParams(params: CalculationParameters): void {
        const {
            traditionalIRABalance,
            rothIRABalance,
            capitalGains,
            taxState,
            filingStatus
        } = params;

        // Validate Traditional IRA Balance
        if (!isFinite(traditionalIRABalance) || 
            traditionalIRABalance < this.MINIMUM_BALANCE || 
            traditionalIRABalance > this.MAXIMUM_BALANCE) {
            throw new ValidationError(
                `Traditional IRA balance must be between ${this.MINIMUM_BALANCE} and ${this.MAXIMUM_BALANCE}`
            );
        }

        // Validate Roth IRA Balance
        if (!isFinite(rothIRABalance) || 
            rothIRABalance < 0 || 
            rothIRABalance > VALIDATION_RULES.MAX_ROTH_BALANCE) {
            throw new ValidationError(
                `Roth IRA balance must be between 0 and ${VALIDATION_RULES.MAX_ROTH_BALANCE}`
            );
        }

        // Validate Capital Gains
        if (!isFinite(capitalGains) || 
            capitalGains < 0 || 
            capitalGains > VALIDATION_RULES.MAX_CAPITAL_GAINS) {
            throw new ValidationError(
                `Capital gains must be between 0 and ${VALIDATION_RULES.MAX_CAPITAL_GAINS}`
            );
        }

        // Validate Tax State
        if (!taxState || taxState.length !== 2 || !STATE_TAX_INFO[taxState.toUpperCase()]) {
            throw new ValidationError('Invalid state code');
        }

        // Validate Filing Status
        if (!Object.values(FilingStatus).includes(filingStatus)) {
            throw new ValidationError('Invalid filing status');
        }
    }
}