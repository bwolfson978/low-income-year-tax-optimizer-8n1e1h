import { Request, Response, NextFunction } from 'express';
import { RequestValidator } from 'express-validator';
import { CalculationService } from '../services/calculation.service';
import { CalculationParameters } from '../types/calculation.types';
import { ValidationError } from '../utils/errors';
import { formatCurrency } from '../utils/formatters/currency';
import { SYSTEM_CONFIG, VALIDATION_RULES } from '../config/constants';

/**
 * Controller handling tax optimization calculation requests with enhanced validation
 * and performance monitoring
 * @version 1.0.0
 */
export class CalculationController {
    private readonly calculationService: CalculationService;
    private readonly requestValidator: RequestValidator;
    private readonly requestTimeout: number = 500; // 500ms timeout as per requirements
    private readonly maxRetries: number = SYSTEM_CONFIG.ERROR_RETRY_ATTEMPTS;

    constructor(calculationService: CalculationService) {
        this.calculationService = calculationService;
        this.requestValidator = new RequestValidator();
        this.setupValidation();
    }

    /**
     * Handles POST request to calculate optimal tax strategy
     * Implements comprehensive validation and monitoring
     */
    public calculateOptimalStrategy = async (
        req: Request,
        res: Response,
        next: NextFunction
    ): Promise<void> => {
        const startTime = Date.now();

        try {
            // Validate request parameters
            const errors = await this.requestValidator.validate(req);
            if (errors.length > 0) {
                throw new ValidationError('Invalid calculation parameters', errors);
            }

            // Extract and validate calculation parameters
            const params: CalculationParameters = {
                traditionalIRABalance: Number(req.body.traditionalIRABalance),
                rothIRABalance: Number(req.body.rothIRABalance),
                capitalGains: Number(req.body.capitalGains),
                taxState: req.body.taxState.toUpperCase(),
                filingStatus: req.body.filingStatus
            };

            // Set request timeout
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Calculation request timed out')), this.requestTimeout);
            });

            // Execute calculation with timeout
            const calculationPromise = this.executeCalculation(params);
            const results = await Promise.race([calculationPromise, timeoutPromise]);

            // Log performance metrics
            const duration = Date.now() - startTime;
            this.logPerformanceMetrics(duration, params);

            // Send successful response
            res.status(200).json({
                success: true,
                data: results,
                duration: duration
            });

        } catch (error) {
            const duration = Date.now() - startTime;
            this.handleCalculationError(error, res, duration);
        }
    };

    /**
     * Handles GET request to retrieve calculation status
     * Implements caching and error handling
     */
    public getCalculationStatus = async (
        req: Request,
        res: Response,
        next: NextFunction
    ): Promise<void> => {
        const calculationId = req.params.id;

        try {
            const status = await this.calculationService.getCalculationStatus(calculationId);
            res.status(200).json({
                success: true,
                data: status
            });
        } catch (error) {
            this.handleCalculationError(error, res);
        }
    };

    /**
     * Sets up request validation rules
     * @private
     */
    private setupValidation(): void {
        this.requestValidator
            .check('traditionalIRABalance')
            .isFloat({ min: 0, max: VALIDATION_RULES.MAX_TRAD_BALANCE })
            .withMessage(`Traditional IRA balance must be between ${formatCurrency(0)} and ${formatCurrency(VALIDATION_RULES.MAX_TRAD_BALANCE)}`);

        this.requestValidator
            .check('rothIRABalance')
            .isFloat({ min: 0, max: VALIDATION_RULES.MAX_ROTH_BALANCE })
            .withMessage(`Roth IRA balance must be between ${formatCurrency(0)} and ${formatCurrency(VALIDATION_RULES.MAX_ROTH_BALANCE)}`);

        this.requestValidator
            .check('capitalGains')
            .isFloat({ min: 0, max: VALIDATION_RULES.MAX_CAPITAL_GAINS })
            .withMessage(`Capital gains must be between ${formatCurrency(0)} and ${formatCurrency(VALIDATION_RULES.MAX_CAPITAL_GAINS)}`);

        this.requestValidator
            .check('taxState')
            .isLength({ min: 2, max: 2 })
            .isAlpha()
            .withMessage('Tax state must be a valid two-letter state code');

        this.requestValidator
            .check('filingStatus')
            .isIn(['SINGLE', 'MARRIED_JOINT', 'HEAD_OF_HOUSEHOLD'])
            .withMessage('Invalid filing status');
    }

    /**
     * Executes calculation with retry logic
     * @private
     */
    private async executeCalculation(params: CalculationParameters): Promise<any> {
        let lastError: Error | null = null;
        
        for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
            try {
                return await this.calculationService.calculateOptimalStrategy(params);
            } catch (error) {
                lastError = error as Error;
                if (attempt < this.maxRetries) {
                    await new Promise(resolve => 
                        setTimeout(resolve, SYSTEM_CONFIG.ERROR_RETRY_DELAY_MS * attempt)
                    );
                }
            }
        }

        throw lastError || new Error('Calculation failed after retries');
    }

    /**
     * Handles calculation errors with specific error types
     * @private
     */
    private handleCalculationError(error: any, res: Response, duration?: number): void {
        const errorResponse = {
            success: false,
            error: error.message || 'Internal server error',
            duration
        };

        if (error instanceof ValidationError) {
            res.status(400).json(errorResponse);
        } else if (error.message.includes('timed out')) {
            res.status(503).json(errorResponse);
        } else {
            res.status(500).json(errorResponse);
        }

        // Log error for monitoring
        console.error('Calculation error:', {
            error: error.message,
            stack: error.stack,
            duration
        });
    }

    /**
     * Logs performance metrics for monitoring
     * @private
     */
    private logPerformanceMetrics(duration: number, params: CalculationParameters): void {
        console.info('Calculation performance:', {
            duration,
            traditionalBalance: params.traditionalIRABalance,
            rothBalance: params.rothIRABalance,
            capitalGains: params.capitalGains,
            state: params.taxState,
            timestamp: new Date().toISOString()
        });

        // Alert if duration exceeds warning threshold
        if (duration > 400) { // 80% of timeout
            console.warn('Calculation performance warning:', {
                duration,
                threshold: 400,
                timestamp: new Date().toISOString()
            });
        }
    }
}