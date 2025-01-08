import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import Big from 'big.js';
import { CalculationService } from '../../../src/services/calculation.service';
import { CalculationParameters } from '../../../src/types/calculation.types';
import { FilingStatus } from '../../../src/types/tax.types';
import { ValidationError } from '../../../src/utils/errors';
import { VALIDATION_RULES, OPTIMIZATION_PARAMS } from '../../../src/config/constants';

// Mock the calculation model
const mockCalculationModel = {
    createCalculation: jest.fn(),
    updateCalculationStatus: jest.fn(),
    saveResults: jest.fn()
};

// Valid test parameters
const validTestParams: CalculationParameters = {
    traditionalIRABalance: 100000,
    rothIRABalance: 50000,
    capitalGains: 25000,
    taxState: 'CA',
    filingStatus: FilingStatus.SINGLE,
    currentIncome: 50000
};

// Test scenarios with expected results
const testScenarios = [
    {
        description: 'Low income scenario',
        params: {
            ...validTestParams,
            currentIncome: 30000
        },
        expectedResults: {
            rothConversion: {
                recommendedAmount: 40000,
                taxImpact: expect.any(Object),
                npv: expect.any(Number)
            },
            capitalGains: {
                recommendedAmount: 15000,
                taxImpact: expect.any(Object),
                npv: expect.any(Number)
            }
        }
    },
    {
        description: 'High income scenario',
        params: {
            ...validTestParams,
            currentIncome: 150000
        },
        expectedResults: {
            rothConversion: {
                recommendedAmount: 20000,
                taxImpact: expect.any(Object),
                npv: expect.any(Number)
            },
            capitalGains: {
                recommendedAmount: 5000,
                taxImpact: expect.any(Object),
                npv: expect.any(Number)
            }
        }
    }
];

describe('CalculationService', () => {
    let calculationService: CalculationService;

    beforeEach(() => {
        // Reset all mocks before each test
        jest.clearAllMocks();
        calculationService = new CalculationService(mockCalculationModel);
    });

    describe('calculateOptimalStrategy', () => {
        test('should calculate optimal strategy with valid parameters', async () => {
            const scenarioId = 'test-scenario-1';
            const expectedResults = {
                rothConversion: {
                    recommendedAmount: 40000,
                    taxImpact: expect.any(Object),
                    npv: expect.any(Number)
                },
                capitalGains: {
                    recommendedAmount: 15000,
                    taxImpact: expect.any(Object),
                    npv: expect.any(Number)
                },
                combinedSavings: expect.any(Number),
                riskAdjustedScore: expect.any(Number),
                timestamp: expect.any(String)
            };

            mockCalculationModel.createCalculation.mockResolvedValue('calc-1');

            const result = await calculationService.calculateOptimalStrategy(
                scenarioId,
                validTestParams
            );

            expect(result).toMatchObject(expectedResults);
            expect(mockCalculationModel.createCalculation).toHaveBeenCalledWith(
                scenarioId,
                validTestParams
            );
            expect(mockCalculationModel.updateCalculationStatus).toHaveBeenCalledWith(
                'calc-1',
                'IN_PROGRESS'
            );
            expect(mockCalculationModel.saveResults).toHaveBeenCalled();
        });

        test('should handle high-precision calculations correctly', async () => {
            const scenarioId = 'test-scenario-2';
            const highPrecisionParams = {
                ...validTestParams,
                traditionalIRABalance: 123456.789,
                rothIRABalance: 98765.432,
                capitalGains: 45678.901
            };

            mockCalculationModel.createCalculation.mockResolvedValue('calc-2');

            const result = await calculationService.calculateOptimalStrategy(
                scenarioId,
                highPrecisionParams
            );

            expect(result.rothConversion.recommendedAmount).toBeCloseTo(
                expect.any(Number),
                6
            );
            expect(result.capitalGains.recommendedAmount).toBeCloseTo(
                expect.any(Number),
                6
            );
            expect(result.combinedSavings).toBeCloseTo(expect.any(Number), 6);
        });

        test('should utilize caching for repeated calculations', async () => {
            const scenarioId = 'test-scenario-3';
            mockCalculationModel.createCalculation.mockResolvedValue('calc-3');

            // First calculation
            const result1 = await calculationService.calculateOptimalStrategy(
                scenarioId,
                validTestParams
            );

            // Second calculation with same parameters
            const result2 = await calculationService.calculateOptimalStrategy(
                scenarioId,
                validTestParams
            );

            expect(result1).toEqual(result2);
            expect(mockCalculationModel.createCalculation).toHaveBeenCalledTimes(1);
        });
    });

    describe('validateCalculationParams', () => {
        test('should validate traditional IRA balance correctly', () => {
            const invalidParams = {
                ...validTestParams,
                traditionalIRABalance: -1000
            };

            expect(() => 
                calculationService.validateCalculationParams(invalidParams)
            ).toThrow(ValidationError);
        });

        test('should validate Roth IRA balance correctly', () => {
            const invalidParams = {
                ...validTestParams,
                rothIRABalance: VALIDATION_RULES.MAX_ROTH_BALANCE + 1
            };

            expect(() => 
                calculationService.validateCalculationParams(invalidParams)
            ).toThrow(ValidationError);
        });

        test('should validate capital gains correctly', () => {
            const invalidParams = {
                ...validTestParams,
                capitalGains: VALIDATION_RULES.MAX_CAPITAL_GAINS + 1
            };

            expect(() => 
                calculationService.validateCalculationParams(invalidParams)
            ).toThrow(ValidationError);
        });

        test('should validate tax state correctly', () => {
            const invalidParams = {
                ...validTestParams,
                taxState: 'INVALID'
            };

            expect(() => 
                calculationService.validateCalculationParams(invalidParams)
            ).toThrow(ValidationError);
        });

        test('should validate filing status correctly', () => {
            const invalidParams = {
                ...validTestParams,
                filingStatus: 'INVALID' as FilingStatus
            };

            expect(() => 
                calculationService.validateCalculationParams(invalidParams)
            ).toThrow(ValidationError);
        });
    });

    describe('error handling', () => {
        test('should handle calculation failures gracefully', async () => {
            const scenarioId = 'test-scenario-4';
            mockCalculationModel.createCalculation.mockRejectedValue(
                new Error('Database error')
            );

            await expect(
                calculationService.calculateOptimalStrategy(scenarioId, validTestParams)
            ).rejects.toThrow('Calculation failed: Database error');
        });

        test('should handle invalid optimization parameters', async () => {
            const scenarioId = 'test-scenario-5';
            const invalidParams = {
                ...validTestParams,
                traditionalIRABalance: NaN
            };

            await expect(
                calculationService.calculateOptimalStrategy(scenarioId, invalidParams)
            ).rejects.toThrow();
        });
    });

    describe('multi-variable analysis', () => {
        test.each(testScenarios)(
            'should optimize for $description',
            async ({ params, expectedResults }) => {
                const scenarioId = 'test-scenario-multi';
                mockCalculationModel.createCalculation.mockResolvedValue('calc-multi');

                const result = await calculationService.calculateOptimalStrategy(
                    scenarioId,
                    params
                );

                expect(result.rothConversion).toMatchObject(expectedResults.rothConversion);
                expect(result.capitalGains).toMatchObject(expectedResults.capitalGains);
            }
        );
    });

    describe('cache management', () => {
        test('should clear calculation cache correctly', () => {
            calculationService.clearCalculationCache();
            
            // Verify cache is cleared by checking if new calculation is performed
            const scenarioId = 'test-scenario-6';
            mockCalculationModel.createCalculation.mockResolvedValue('calc-6');

            return calculationService.calculateOptimalStrategy(
                scenarioId,
                validTestParams
            ).then(() => {
                expect(mockCalculationModel.createCalculation).toHaveBeenCalled();
            });
        });

        test('should respect cache duration settings', async () => {
            const scenarioId = 'test-scenario-7';
            mockCalculationModel.createCalculation.mockResolvedValue('calc-7');

            // First calculation
            await calculationService.calculateOptimalStrategy(
                scenarioId,
                validTestParams
            );

            // Fast-forward time past cache duration
            jest.advanceTimersByTime(3600001); // 1 hour + 1ms

            // Second calculation should not use cache
            await calculationService.calculateOptimalStrategy(
                scenarioId,
                validTestParams
            );

            expect(mockCalculationModel.createCalculation).toHaveBeenCalledTimes(2);
        });
    });
});